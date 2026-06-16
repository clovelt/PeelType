const state = globalThis.__tiritaState || (globalThis.__tiritaState = {});
import { getLetterLineHeight } from './layout.js';
import { applyCrossBlockIdleArcs } from './peel-segments.js';
import { applyTieConstraints, simulateTieRopes } from './ties.js';
import { simulateTangledLines, applyTangledConstraints } from './tangled-lines.js';
import { getForceFieldAcceleration } from './force-fields.js';
import { renderEffects, simulateEffects } from './effects.js';

function getBlockConfig(blockIdx) { return state.pieceConfig?.blocks?.[blockIdx] || state.activeBlocks?.[blockIdx] || {}; }

function getMotionItemsForBlock(blockIdx) {
  const motion = getBlockConfig(blockIdx).letterMotion || state.pieceConfig.letterMotion;
  return Array.isArray(motion) ? motion : (motion ? [motion] : []);
}

// Peel modes whose chain order is non-linear; they get a higher unlock threshold
// to prevent "chain plucking" (see unlock propagation in simulate()).
const UNSTRUCTURED_PEEL_MODES = new Set([
  'random', 'drunken', 'outward', 'inward', 'random-neighbors', 'center', 'spiral', 'spiral-center', 'random-walk',
  'alternating-ends', 'vowels-first', 'punctuation-last', 'odd-even', 'first-letters', 'syllables-in-order',
  'first-syllables', 'last-syllables'
]);

// Mirror-line motion: target slot is the horizontal mirror of the letter's
// original slot within its layout line, offsetLines below. The chain rest
// lengths already match the mirrored slot spacing (neighbors land on adjacent
// slots), so the strip stays taut and slides into place without fighting the
// constraint solver. Cached per letter; invalidated when the block relayouts
// (positions array identity changes).
function getMirrorLineTarget(letter, item) {
  const layout = state.positions?.[letter.blockIdx];
  const positions = layout?.positions;
  if (!positions) return null;
  if (letter._mirrorLayout === positions) return letter._mirrorTarget;
  const line = layout.lineIndices?.find(l => l.includes(letter.readingIdx));
  let target = null;
  if (line?.length) {
    let left = Infinity, right = -Infinity, lineBaseY = Infinity, lineH = 0;
    for (const ri of line) {
      const p = positions[ri];
      if (!p) continue;
      if (p.x < left) left = p.x;
      if (p.x + p.w > right) right = p.x + p.w;
      if (p.y < lineBaseY) lineBaseY = p.y;
      if ((p.lineHeight || 0) > lineH) lineH = p.lineHeight || 0;
    }
    const p = positions[letter.readingIdx];
    if (p && left < right && lineBaseY < Infinity) {
      const lh = lineH || getLetterLineHeight(letter);
      target = {
        x: left + right - p.x - p.w,
        y: lineBaseY + lh * Number(item.offsetLines ?? 1)
      };
    }
  }
  letter._mirrorLayout = positions;
  letter._mirrorTarget = target;
  return target;
}

let prevSimMaxY = null;
const MAX_STEPS = 4;
let accumulator = 0;
let lastTime = -1;

function getFixedDt() {
  return 1 / (state.SIM_HZ || 60);
}

export function applyLetterMotion(idx, letter, velocity, fieldForce) {
  const motions = getMotionItemsForBlock(letter.blockIdx);
  if (letter.starterIdle && !motions.some(item => item?.applyToStarters)) {
    return {
      x: velocity.x,
      y: velocity.y + (state.gravityOn ? state.TICK_GRAVITY : 0)
    };
  }
  let vx = velocity.x + (fieldForce?.x || 0);
  let vy = velocity.y + (state.gravityOn ? state.TICK_GRAVITY : 0) + (fieldForce?.y || 0);
  let extraAngle = 0;
  for (const item of motions) {
    if (!item || item.enabled === false) continue;
    const type = item.type || 'drift';
    const centerX = Number(item.cx ?? item.x ?? (state.frameViewport.width * 0.5 - state.frameViewport.containerLeft));
    const centerY = Number(item.cy ?? item.y ?? (state.frameViewport.height * 0.5 - state.frameViewport.containerTop));
    const lx = letter.x + letter.w / 2;
    const ly = letter.y + getLetterLineHeight(letter) / 2;
    const dx = centerX - lx;
    const dy = centerY - ly;
    const dist = Math.hypot(dx, dy) || 1;
    const radius = Number(item.radius ?? 280);
    const strength = Number(item.strength ?? 0.04) * state.SIM_STEP_SCALE;
    const age = Math.max(0, state.unlockClock - (letter.unlockedAt || state.unlockClock));
    if (type === 'orbit') {
      const pull = (dist - radius * Number(item.band ?? 0.48)) / Math.max(1, radius);
      const spin = Number(item.spin ?? 0.9) * strength;
      vx += (dx / dist) * strength * pull + (-dy / dist) * spin;
      vy += (dy / dist) * strength * pull + (dx / dist) * spin;
      extraAngle += spin * 0.22;
    } else if (type === 'sediment') {
      const targetY = Number(item.y ?? centerY);
      const lane = Number(item.lane ?? 18);
      const laneOffset = ((letter.readingIdx % 7) - 3) * lane * 0.12;
      vx *= Number(item.damping ?? 0.62);
      vy *= Number(item.damping ?? 0.62);
      vy += (targetY + laneOffset - ly) * strength;
      vx += Math.sin((letter.readingIdx + age) * 0.11) * strength * 1.4;
    } else if (type === 'snap-line') {
      const targetY = Number(item.y ?? centerY);
      const targetX = Number(item.x ?? lx);
      const axis = item.axis || 'y';
      const damping = Number(item.damping ?? 0.76);
      vx *= damping;
      vy *= damping;
      if (axis !== 'x') vy += (targetY - ly) * strength;
      if (axis !== 'y') vx += (targetX - lx) * strength;
    } else if (type === 'line-lock') {
      const targetY = letter.lineLockY ?? letter.oy;
      vx *= Number(item.damping ?? 0.9);
      vy = (targetY - letter.y) * Number(item.strength ?? 0.45);
    } else if (type === 'buoyancy') {
      const wave = Math.sin(age * Number(item.frequency ?? 0.16) + letter.readingIdx * 0.71);
      vy -= strength * (Number(item.lift ?? 7) + wave * Number(item.wave ?? 4));
      vx += wave * strength * Number(item.drift ?? 2);
      extraAngle += wave * 0.012;
    } else if (type === 'brake-zone') {
      const inRadius = dist <= radius;
      const inRect = Number.isFinite(item.width) && Number.isFinite(item.height)
        && lx >= Number(item.x ?? 0) && lx <= Number(item.x ?? 0) + Number(item.width)
        && ly >= Number(item.y ?? 0) && ly <= Number(item.y ?? 0) + Number(item.height);
      if (inRadius || inRect) {
        const damping = Number(item.damping ?? 0.28);
        vx *= damping;
        vy *= damping;
        vx += (dx / dist) * strength * Number(item.pull ?? 0);
        vy += (dy / dist) * strength * Number(item.pull ?? 0);
      }
    } else if (type === 'grid-snap') {
      // Spring each letter toward its original (ox, oy) position.
      // Once displaced past escapeThreshold the spring releases permanently
      // and the cascade callback fires so the column above slides down.
      const snapStrength = Number(item.strength ?? 0.4) * state.SIM_STEP_SCALE;
      const damp = Number(item.damping ?? 0.76);
      const escape = Number(item.escapeThreshold ?? 36);
      const ddx = letter.x - letter.ox;
      const ddy = letter.y - letter.oy;
      if (!letter.escapedGrid) {
        if (ddx * ddx + ddy * ddy > escape * escape) {
          letter.escapedGrid = true;
          state.onLetterEscapedGrid?.(idx);
        } else {
          vx = vx * damp - ddx * snapStrength;
          vy = vy * damp - ddy * snapStrength;
        }
      }
    } else if (type === 'mirror-line') {
      // Peeled letters lay themselves down one line below, each at the
      // horizontal mirror of its original slot — the line rebuilds itself in
      // reverse reading order (a palindrome literally re-writes itself).
      // Zipper from the chain's free end: a letter springs to its slot only
      // once the already-docked neighbor (idx+1) is within dockRadius of its
      // own target. While waiting, velocity is killed so the letter doesn't
      // drift. Gravity is always fully cancelled so abrupt peeling can never
      // send a letter past its target and onto the floor.
      const target = getMirrorLineTarget(letter, item);
      if (target) {
        let active = true;
        const next = state.letters[idx + 1];
        if (next && !next.deleted && next.blockIdx === letter.blockIdx && state.restLengths?.[idx] !== null) {
          const nextTarget = getMirrorLineTarget(next, item);
          if (nextTarget) {
            // Permissive radius: fires early so fast peeling never stalls the zipper
            const dockRadius = Number(item.dockRadius ?? 3.0) * Math.max(14, next.w + 6);
            active = !next.locked && Math.hypot(next.x - nextTarget.x, next.y - nextTarget.y) < dockRadius;
          }
        }
        if (active) {
          const damping = Number(item.damping ?? 0.86);
          // Higher cap so the spring can recover a letter dropped far below target
          const maxPull = Number(item.maxPull ?? 2.0) * state.SIM_STEP_SCALE;
          let fx = (target.x - letter.x) * strength;
          let fy = (target.y - letter.y) * strength;
          const f = Math.hypot(fx, fy);
          if (f > maxPull) { fx = fx / f * maxPull; fy = fy / f * maxPull; }
          vx = vx * damping + fx;
          vy = vy * damping + fy;
          // Realign restLength to mirror target spacing so the chain constraint
          // doesn't fight the spring (rest lengths were set during drag and can
          // be 2-3px longer than the settled mirror spacing)
          if (state.restLengths?.[idx] != null) {
            const nextL = state.letters[idx + 1];
            if (nextL && !nextL.deleted && nextL.blockIdx === letter.blockIdx) {
              const nt = getMirrorLineTarget(nextL, item);
              if (nt) {
                state.restLengths[idx] = Math.hypot(
                  (target.x + (letter.w || 0) / 2) - (nt.x + (nextL.w || 0) / 2),
                  target.y - nt.y
                );
              }
            }
          }
          // Snap when close and nearly still to prevent residual scatter
          if (Math.hypot(target.x - letter.x, target.y - letter.y) < 1.5 && Math.hypot(vx, vy) < 0.3) {
            vx = 0; vy = 0;
            letter.x = target.x; letter.y = target.y;
          }
        } else {
          // Zipper not yet fired: bleed off release velocity so the letter
          // parks near where it was dropped rather than flying away
          vx *= 0.55;
          vy *= 0.55;
        }
        // Always cancel gravity — the spring provides the full restoring
        // force, so letters can't fall past their target regardless of peel speed
        if (state.gravityOn) vy -= state.TICK_GRAVITY;
        // Settle flat: bleed off any rotation as the letter beds in
        if (letter.angle) letter.angle *= 0.94;
      }
    }
  }
  if (extraAngle) letter.angle = (letter.angle || 0) + extraAngle;
  return { x: vx, y: vy };
}

// Walk the drag grip one step toward the frontier (called after each unlock).
// When the strip is longer than MIGRATION_TARGET_DEPTH the grip drifts at
// exactly the same rate as the tearing, so it never falls too far behind.
export function migrateGripOneStep(blockIdx, frontierIdx) {
  for (const d of state.drags.values()) {
    const dl = state.letters[d.idx];
    if (!dl || dl.blockIdx !== blockIdx) continue;
    // Steps scale linearly with cursor speed: 0 when slow, MIGRATION_STEPS_MAX when fast
    const speed = d.speed || 0;
    const t = Math.max(0, Math.min(1, (speed - state.MIGRATION_VELOCITY_MIN) / (state.MIGRATION_VELOCITY_MAX - state.MIGRATION_VELOCITY_MIN)));
    const steps = Math.round(t * state.MIGRATION_STEPS_MAX);
    if (steps === 0) continue;
    for (let s = 0; s < steps; s++) {
      const cur = state.letters[d.idx];
      if (!cur || cur.blockIdx !== blockIdx || d.idx - frontierIdx < state.MIGRATION_TARGET_DEPTH) break;
      const newIdx = d.idx - 1;
      const nl = state.letters[newIdx];
      if (!nl || nl.deleted || nl.locked || newIdx <= frontierIdx) break;
      const cursorX = cur.x + d.offsetX;
      const cursorY = cur.y + d.offsetY + state.getLetterRenderOffsetY(d.idx);
      // Teleport new letter to cursor so the grab always feels immediate
      nl.x  = cursorX;
      nl.y  = cursorY - state.getLetterRenderOffsetY(newIdx);
      nl.px = nl.x;
      nl.py = nl.y;
      state.els[d.idx].classList.remove('dragging');
      d.offsetX = 0;
      d.offsetY = 0;
      d.grabX   = nl.x;
      d.grabY   = nl.y;
      d.idx     = newIdx;
      state.els[newIdx].classList.add('dragging');
      state.markDragStateDirty();
    }
  }
}

function stepReflowLetter(l, target, rate, motionMode) {
  const dx = target.x - l.x;
  const dy = target.y - l.y;
  if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) return false;
  if (motionMode === 'pathfind') {
    if (Math.abs(dx) > 0.45) {
      l.x += dx * Math.min(0.3, rate * 5);
    } else {
      l.x = target.x;
      l.y += dy * rate;
    }
  } else {
    l.x += dx * rate;
    l.y += dy * rate;
  }
  l.px = l.x; l.py = l.y; l.ox = l.x; l.oy = l.y;
  return true;
}

// Physics
export function simulate() {
  if (state.simulationPaused) return;
  // When the viewport floor moves (scroll), silently carry floor-resting letters with it.
  // This runs once per frame (prevSimMaxY guards against multi-step accumulator calls).
  const curMaxY = state.frameViewport.height - state.frameViewport.containerTop;
  if (prevSimMaxY !== null && prevSimMaxY !== curMaxY) {
    for (let i = 0; i < state.letters.length; i++) {
      const l = state.letters[i];
      if (!l || l.deleted || l.locked || state.isDragged(i)) continue;
      const offsetY = state.getLetterRenderOffsetY(i);
      const floor = state.getPileFloor(l.x + state.frameViewport.containerLeft, l.w);
      const lineH = getLetterLineHeight(l);
      const oldFloorY = prevSimMaxY - floor - lineH - offsetY;
      // Only carry letters resting at the old floor; skip clearly mid-air letters.
      if (l.y < oldFloorY - 4) continue;
      l.y = curMaxY - floor - lineH - offsetY;
      l.py = l.y;
    }
  }
  prevSimMaxY = curMaxY;
  // Unravel step (one letter per fixed tick)
  if (state.unraveling) {
    if (!state.gravityOn || state.isUnravelDone()) { state.unraveling = false; }
    else if (state.isLetterFrozen(state.unravelIdx)) {
      state.advanceUnravelQueue();
    }
    else if (state.letters[state.unravelIdx].locked) {
      state.unlockLetter(state.unravelIdx);
      state.letters[state.unravelIdx].px = state.letters[state.unravelIdx].x;
      state.letters[state.unravelIdx].py = state.letters[state.unravelIdx].y - 0.5;
      state.advanceUnravelQueue();
    } else {
      state.advanceUnravelQueue();
    }
  }
  applyCrossBlockIdleArcs();
  simulateTieRopes();
  state.updateForceFieldVisualOffsets();

  // Unlock propagation. Keep the original mechanic: unlocked tail pulls
  // the previous locked particle loose. PEEL_FROM_BEGINNING only changes
  // the chain order, not this physics path.
  for (let i = Math.min(state.frameLetterRange.end - 1, state.letters.length - 2); i >= state.frameLetterRange.start; i--) {
    if (state.restLengths[i] === null) continue;
    if (state.isLetterFrozen(i) || state.isLetterFrozen(i + 1)) continue;
    if (state.letters[i].locked && !state.letters[i + 1].locked) {
      if (state.letters[i + 1].starterIdle) continue; // gravity drift must not trigger unlock
      const a = state.letters[i], b = state.letters[i + 1];
      const aCenter = state.getLetterConstraintCenter(i);
      const bCenter = state.getLetterConstraintCenter(i + 1);
      const dx = bCenter.x - aCenter.x;
      const dy = bCenter.y - aCenter.y;
      const dist = Math.hypot(dx, dy);

      const blockConfig = getBlockConfig(a.blockIdx);
      const peelMode = blockConfig.peel?.mode || state.pieceConfig.peel.mode || 'zigzag';
      const isUnstructured = UNSTRUCTURED_PEEL_MODES.has(peelMode);
      // Sensitivity fix: increase threshold for unstructured modes to prevent "chain plucking"
      const baseUnlockThreshold = Math.max(0, Number(blockConfig.peel?.unlockThreshold ?? state.UNLOCK_THRESHOLD));
      let thresh = isUnstructured ? (baseUnlockThreshold + 4 * a.scale) : baseUnlockThreshold;

      // Special "Random Walk" logic to favor cursor direction
      if (peelMode === 'random-walk' && state.drags.size > 0) {
        let vx = 0, vy = 0;
        for (const d of state.drags.values()) {
          const l = state.letters[d.idx];
          if (l.blockIdx === a.blockIdx) { vx = l.x - l.px; vy = l.y - l.py; break; }
        }
        if (vx*vx + vy*vy > 0.01) {
          const dx = (b.x - a.x), dy = (b.y - a.y);
          const dot = vx * dx + vy * dy;
          // If pulling in direction of chain, it's easier. If pulling away, it's harder.
          if (dot < 0) thresh += 40 * a.scale;
        }
      }

      // Seam (breakPoint): blocks normal propagation; snaps permanently if overstretched
      const seamThreshold = state.breakThresholds?.get(i);
      if (seamThreshold !== undefined) {
        if (dist > state.restLengths[i] + seamThreshold) {
          state.restLengths[i] = null;
          state.unlockLetter(i);
          state.hint.style.opacity = '0';
          migrateGripOneStep(a.blockIdx, i);
        }
        continue;
      }
      if (dist > state.restLengths[i] + thresh) {
        state.unlockLetter(i);
        state.hint.style.opacity = '0';
        migrateGripOneStep(a.blockIdx, i);
      } else if (state.drags.size > 0 && blockConfig.peel?.longStripAssist !== false) {
        // Long-strip assist: constraint solver can't propagate drag force through
        // a long chain, so check analytically. Only applies once the strip is at
        // least LONG_STRIP_MIN_LETTERS long. Faster cursor speed lowers the bar.
        for (const d of state.drags.values()) {
          const dl = state.letters[d.idx];
          if (!dl || dl.blockIdx !== a.blockIdx || d.idx <= i + 1) continue;
          const stripLen = Math.max(1, d.idx - (i + 1));
          if (stripLen < state.LONG_STRIP_MIN_LETTERS) break;
          const dragDisplacement = Math.hypot(dl.x - d.grabX, dl.y - d.grabY);
          const speed = Math.hypot(dl.x - dl.px, dl.y - dl.py);
          const velocityFactor = Math.max(1, speed / state.LONG_STRIP_VELOCITY_REF);
          if (dragDisplacement > (stripLen * state.LONG_STRIP_SENSITIVITY) / velocityFactor) {
            state.unlockLetter(i);
            state.hint.style.opacity = '0';
            migrateGripOneStep(a.blockIdx, i);
          }
          break;
        }
      }
    }
  }

  // Verlet
  state.forEachFrameLetter((i, l) => {
    if (l.deleted || l.locked || state.isDragged(i) || state.isLetterFrozen(i)) return;
    const vxRaw = l.x - l.px;
    const vyRaw = l.y - l.py;
    const speed = Math.hypot(vxRaw, vyRaw);
    const vScale = speed > 80 ? 80 / speed : 1;
    const vx = vxRaw * vScale * state.TICK_DAMPING;
    const vy = vyRaw * vScale * state.TICK_DAMPING;
    const fieldForce = l.starterIdle ? null : getForceFieldAcceleration(i, l, { FORCE_FIELDS: state.FORCE_FIELDS, textBlocks: state.textBlocks, getRenderedY: state.getRenderedY, LINE_HEIGHT: state.LINE_HEIGHT, cursorForcePointers: state.cursorForcePointers });
    const motion = applyLetterMotion(i, l, { x: vx, y: vy }, fieldForce);
    l.px = l.x;
    l.py = l.y;
    l.x += motion.x;
    l.y += motion.y;
  });

  // Distance constraints
  for (let iter = 0; iter < state.EFFECTIVE_ITERATIONS; iter++) {
    state.forEachFrameConstraint((i) => {
      if (state.restLengths[i] === null) return;
      const a = state.letters[i], b = state.letters[i + 1];
      if (a.deleted || b.deleted) return;
      const aFrozen = state.isLetterFrozen(i);
      const bFrozen = state.isLetterFrozen(i + 1);
      if (aFrozen && bFrozen) return;
      if ((aFrozen && a.locked) || (bFrozen && b.locked)) return;
      if (a.locked && b.locked) return;
      const aCenter = state.getLetterConstraintCenter(i);
      const bCenter = state.getLetterConstraintCenter(i + 1);
      const ax = aCenter.x, ay = aCenter.y;
      const bx = bCenter.x, by = bCenter.y;
      const dx = bx - ax, dy = by - ay;
      const dist = Math.hypot(dx, dy) || 0.001;
      const diff = (dist - state.restLengths[i]) / dist;
      const aFixed = a.locked || aFrozen || state.isDragged(i);
      const bFixed = b.locked || bFrozen || state.isDragged(i + 1);
      if (aFixed && !bFixed) {
        b.x -= dx * diff; b.y -= dy * diff;
      } else if (!aFixed && bFixed) {
        a.x += dx * diff; a.y += dy * diff;
      } else if (!aFixed && !bFixed) {
        a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
        b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
      }
    });
    for (const constraint of state.crossBlockConstraints) {
      const a = state.letters[constraint.aIdx], b = state.letters[constraint.bIdx];
      if (!a || !b || a.deleted || b.deleted) continue;
      const aFrozen = state.isLetterFrozen(constraint.aIdx);
      const bFrozen = state.isLetterFrozen(constraint.bIdx);
      if (aFrozen && bFrozen) continue;
      if (a.locked && b.locked) continue;
      const aCenter = state.getLetterConstraintCenter(constraint.aIdx);
      const bCenter = state.getLetterConstraintCenter(constraint.bIdx);
      const ax = aCenter.x, ay = aCenter.y;
      const bx = bCenter.x, by = bCenter.y;
      const dx = bx - ax, dy = by - ay;
      const dist = Math.hypot(dx, dy) || 0.001;
      if (dist > constraint.rest + constraint.unlockThreshold) {
        if (a.starterIdle && (!b.starterIdle || state.isDragged(constraint.bIdx))) state.wakeStarterIdleSegment(constraint.aIdx);
        if (b.starterIdle && (!a.starterIdle || state.isDragged(constraint.aIdx))) state.wakeStarterIdleSegment(constraint.bIdx);
      }
      const diff = (dist - constraint.rest) / dist * constraint.stiffness;
      const aFixed = a.locked || aFrozen || state.isDragged(constraint.aIdx);
      const bFixed = b.locked || bFrozen || state.isDragged(constraint.bIdx);
      if (aFixed && !bFixed) {
        b.x -= dx * diff; b.y -= dy * diff;
      } else if (!aFixed && bFixed) {
        a.x += dx * diff; a.y += dy * diff;
      } else if (!aFixed && !bFixed) {
        a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
        b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
      }
    }
    applyTieConstraints();
    applyTangledConstraints();
  }
  applyCrossBlockIdleArcs();
  simulateTieRopes();
  simulateTangledLines();

  // Letter collision
  const collisionLimit = state.mobileRuntime ? 45 : 140;
  const collisionItems = [];
  state.forEachFrameLetter((i) => {
    if (state.isCollidableLetter(i)) collisionItems.push({ letter: state.letters[i], idx: i });
  });
  const collisionIndices = collisionItems
    .sort((a, b) => (b.letter.unlockedAt ?? 0) - (a.letter.unlockedAt ?? 0))
    .slice(0, collisionLimit)
    .map(({ idx }) => idx);
  for (let ii = 0; ii < collisionIndices.length; ii++) {
    const i = collisionIndices[ii];
    const a = state.letters[i];
    const aRadius = state.getLetterCollisionRadius(i);
    const acx = a.x + a.w / 2, acy = a.y + getLetterLineHeight(a) / 2;
    for (let jj = ii + 1; jj < collisionIndices.length; jj++) {
      const j = collisionIndices[jj];
      if (Math.abs(i - j) === 1) continue;
      const b = state.letters[j];
      if (a.blockIdx !== b.blockIdx) continue;
      const bRadius = state.getLetterCollisionRadius(j);
      const bcx = b.x + b.w / 2, bcy = b.y + getLetterLineHeight(b) / 2;
      const dx = bcx - acx, dy = bcy - acy;
      const dist = Math.hypot(dx, dy) || 0.001;
      const minDist = aRadius + bRadius;
      if (dist < minDist) {
        const overlap = (minDist - dist) / dist * 0.5;
        const aD = state.isDragged(i);
        const bD = state.isDragged(j);
        if (aD) { b.x += dx * overlap; b.y += dy * overlap; b.px += dx * overlap; b.py += dy * overlap; }
        else if (bD) { a.x -= dx * overlap; a.y -= dy * overlap; a.px -= dx * overlap; a.py -= dy * overlap; }
        else { a.x -= dx * overlap; a.y -= dy * overlap; b.x += dx * overlap; b.y += dy * overlap; }
      }
    }
  }

  // Boundary
  const minX = -state.frameViewport.containerLeft;
  const minY = -state.frameViewport.containerTop;
  const maxX = state.frameViewport.width - state.frameViewport.containerLeft;
  const maxY = state.frameViewport.height - state.frameViewport.containerTop;
  const bounce = 0.4;
  state.forEachFrameLetter((i, l) => {
    if (l.deleted || l.locked || state.isDragged(i) || state.isLetterFrozen(i)) return;
    const offsetY = state.getLetterRenderOffsetY(i);
    if (l.x < minX) { l.x = minX; l.px = l.x + (l.x - l.px) * bounce; }
    if (l.x + l.w > maxX) { l.x = maxX - l.w; l.px = l.x + (l.x - l.px) * bounce; }
    if (l.y + offsetY < minY) { l.y = minY - offsetY; l.py = l.y + (l.y - l.py) * bounce; }
    const floor = state.getPileFloor(l.x + state.frameViewport.containerLeft, l.w);
    const lineHeight = getLetterLineHeight(l);
    if (l.y + offsetY + lineHeight > maxY - floor) { l.y = maxY - floor - lineHeight - offsetY; l.py = l.y + (l.y - l.py) * bounce; }
  });
  state.deleteDynamicOverflow();
  if (state.pileStampedSegs.size > 0) {
    const growth = state.PILE_GROW_SEC * getFixedDt();
    for (const s of state.pileStampedSegs) {
      state.pileHeights[s] = Math.min(state.MAX_PILE_H, state.pileHeights[s] + growth);
      if (s > 0) state.pileHeights[s - 1] = Math.min(state.pileHeights[s], Math.max(state.pileHeights[s - 1], state.pileHeights[s] - growth * 3));
      if (s < state.pileHeights.length - 1) state.pileHeights[s + 1] = Math.min(state.pileHeights[s], Math.max(state.pileHeights[s + 1], state.pileHeights[s] - growth * 3));
    }
    state.pileStampedSegs.clear();
  }
  // Reflow animation: lerp anchor letters toward compact positions
  if (state.reflowStarted.size > 0) {
    for (const [blockIdx, posMap] of state.reflowPositions) {
      if (!state.reflowStarted.has(blockIdx)) continue;
      const range = state.blockRanges[blockIdx];
      const isReflowAnchors = state.textBlocks[blockIdx]?.peel?.reflowAnchors;
      const reflowMotion = state.textBlocks[blockIdx]?.peel?.reflowMotion || 'pathfind';
      const rate = isReflowAnchors ? 0.025 : 0.09;
      // allWords+reflowAnchors uses neighborMap readiness: anchors only move after adjacent peel letters unlock.
      // Dynamic per-segment reflowAnchors (non-allWords) has correct partial targets — no readiness check needed.
      const neighborMap = (isReflowAnchors && state.textBlocks[blockIdx]?.peel?.allWords) ? state.anchorPeelNeighbors.get(blockIdx) : null;
      const isDynamicReflow = isReflowAnchors && !state.textBlocks[blockIdx]?.peel?.allWords;
      for (let i = range.start; i <= range.end; i++) {
        const l = state.letters[i];
        if (l.deleted) continue;
        // Dynamic: only reflow anchor letters (locked, non-peel). Peel segments handled below.
        if (isDynamicReflow) {
          if (l.inlineStyle?.explicitPeel || !l.locked) continue;
        } else {
          if (!l.locked) continue;
        }
        if (neighborMap) {
          const nb = neighborMap.get(i);
          if (nb) {
            const leftOk = nb.left < 0 || (!state.letters[nb.left]?.locked && !state.letters[nb.left]?.starterIdle);
            const rightOk = nb.right < 0 || (!state.letters[nb.right]?.locked && !state.letters[nb.right]?.starterIdle);
            const hasBoth = nb.left >= 0 && nb.right >= 0;
            const ready = hasBoth ? (leftOk || rightOk) : (nb.left >= 0 ? leftOk : rightOk);
            if (!ready) continue;
          }
        }
        const target = posMap.get(l.readingIdx);
        if (!target) continue;
        stepReflowLetter(l, target, rate, reflowMotion);
      }
      // Dynamic: shift each unstarted peel segment so it tracks its nearest anchor letter.
      // Use the anchor's total displacement from its ORIGINAL layout position (not compact-target dx),
      // so line-reflow jumps in the compact target don't cause spurious large shifts.
      // sl.ox is the original layout x for peel letters (never overwritten by the reflow loop).
      if (isDynamicReflow) {
        const startedSegs = state.startedPeelSegments.get(blockIdx) || new Set();
        const blockSegs = state.segmentRanges[blockIdx] || [];
        const anchorSeg = blockSegs[0];
        const blockPositions = state.positions[blockIdx]?.positions;
        for (let segIdx = 1; segIdx < blockSegs.length; segIdx++) {
          if (startedSegs.has(segIdx)) continue;
          const seg = blockSegs[segIdx];
          if (!seg || !anchorSeg || !blockPositions) continue;
          const firstPeelRid = state.letters[seg.start]?.readingIdx ?? -1;
          if (firstPeelRid < 0) continue;
          // Find nearest anchor letter by readingIdx
          let nearestAl = null;
          let bestDist = Infinity;
          for (let li = anchorSeg.start; li <= anchorSeg.end; li++) {
            const al = state.letters[li];
            if (!al || al.deleted) continue;
            const dist = Math.abs(al.readingIdx - firstPeelRid);
            if (dist < bestDist) { bestDist = dist; nearestAl = al; }
          }
          if (!nearestAl) continue;
          const origAnchorX = blockPositions[nearestAl.readingIdx]?.x;
          const origAnchorY = blockPositions[nearestAl.readingIdx]?.y;
          if (origAnchorX === undefined || origAnchorY === undefined) continue;
          const anchorDispX = nearestAl.x - origAnchorX;
          const anchorDispY = nearestAl.y - origAnchorY;
          for (let li = seg.start; li <= seg.end; li++) {
            const sl = state.letters[li];
            if (!sl || sl.deleted) continue;
            // X: exact tracking — no x physics for unstarted peel segments
            const targetX = sl.ox + anchorDispX;
            if (Math.abs(targetX - sl.x) > 0.1) { sl.x = targetX; sl.px = sl.x; }
            // Y: delta tracking — shift both y and py by the anchor's frame delta so gravity/swing are preserved
            const origSlY = blockPositions[sl.readingIdx]?.y ?? sl.oy;
            const targetY = origSlY + anchorDispY;
            const prevTargetY = sl._peelTargetY ?? origSlY;
            const dY = targetY - prevTargetY;
            if (Math.abs(dY) > 0.01) { sl.y += dY; sl.py += dY; }
            sl._peelTargetY = targetY;
          }
        }
      }
    }
  }
  // Strip gap decay: gradually shrink inter-group rest lengths for shrinkGaps blocks
  if (state.gapLinkDecayTargets) {
    for (let i = 0; i < state.gapLinkDecayTargets.length; i++) {
      const target = state.gapLinkDecayTargets[i];
      if (target === null || state.restLengths[i] === null || state.restLengths[i] <= target) continue;
      const a = state.letters[i];
      if (!a || a.deleted || !state.blockStartedFlags[a.blockIdx]) continue;
      state.restLengths[i] = Math.max(target, state.restLengths[i] * 0.991);
    }
  }
  // Rope-like angle for unlocked censor letters: each segment aligns with chain direction
  state.forEachFrameLetter((i, l) => {
    if (l.deleted || l.locked || !l.inlineStyle?.censor) return;
    const prev = i > 0 ? state.letters[i - 1] : null;
    const next = i < state.letters.length - 1 ? state.letters[i + 1] : null;
    const prevOk = prev && !prev.deleted && prev.blockIdx === l.blockIdx;
    const nextOk = next && !next.deleted && next.blockIdx === l.blockIdx;
    if (prevOk && nextOk) {
      l.angle = Math.atan2(next.y - prev.y, next.x - prev.x);
    } else if (nextOk) {
      l.angle = Math.atan2(next.y - l.y, next.x - l.x);
    } else if (prevOk) {
      l.angle = Math.atan2(l.y - prev.y, l.x - prev.x);
    }
  });

  state.simulateLooseParts();
  state.simulatePeelStrokes();
}

// Fixed-timestep loop: simulate at a stable rate regardless of display refresh rate
export function render(now) {
  if (lastTime < 0) {
    lastTime = now;
    requestAnimationFrame(render);
    return;
  }

  const frameStart = performance.now();
  const fixedDt = getFixedDt();
  const dt = Math.min((now - lastTime) / 1000, MAX_STEPS * fixedDt);
  const frameMs = now - lastTime;
  lastTime = now;
  accumulator += dt;

  state.updateFrameState();
  state.updateCamera?.();
  state.positionAttachments();
  state.syncPeelStrokeOrigins(false);
  state.positionInlineLinkButtons();
  state.positionTimedButtons();
  state.positionClipShapeFrames();
  state.positionHint();
  if (!state.mobileRuntime) state.positionBlockGizmos();

  let steps = 0;
  const simStart = performance.now();
  while (accumulator >= fixedDt) {
    state.particlesSpawnedThisStep = 0;
    simulate();
    simulateEffects();
    accumulator -= fixedDt;
    steps++;
  }
  const simMs = performance.now() - simStart;

  const renderStart = performance.now();
  state.forEachFrameLetter((i, letter) => {
    if (letter.deleted) return;
    state.els[i].classList.toggle('draggable', Boolean(!letter.locked));
    const visualOffset = state.getLetterVisualOffset(i);
    const renderX = letter.x + visualOffset.x;
    const renderedY = state.getRenderedY(i);
    const renderY = renderedY + visualOffset.y;
    const renderAngle = (letter.angle || 0) + (visualOffset.angle || 0);
    if (state.lastRenderedX[i] !== renderX || state.lastRenderedY[i] !== renderY || state.lastRenderedAngle[i] !== renderAngle) {
      state.lastRenderedX[i] = renderX;
      state.lastRenderedY[i] = renderY;
      state.lastRenderedAngle[i] = renderAngle;
      state.els[i].style.transform = `translate(${renderX}px, ${renderY}px) rotate(${renderAngle}rad)`;
    }
    // Track reading position for censor reveal while block offset is still animating in.
    // Always use ox/oy (not physics position) so reveal text stays at reading position
    // even as the falling censor-bar span droops away.
    // Track even after yBaked so revealed text follows the block's animated scroll offset.
    const revealEl = state.censorRevealEls[i];
    if (revealEl && (!letter.yBaked || state.censorRevealedFlags[i])) {
      revealEl.style.transform = `translate(${letter.ox}px, ${letter.oy + state.getBlockRenderOffsetY(letter.blockIdx)}px)`;
    }
  });

  state.updateBehaviorVisibility();
  state.positionAttachments();
  state.syncPeelStrokeOrigins(false);
  state.positionInlineLinkButtons();
  state.positionTimedButtons();
  state.positionClipShapeFrames();
  renderEffects();
  state.positionHint();
  if (!state.mobileRuntime) state.positionBlockGizmos();

  const renderMs = performance.now() - renderStart;
  state.updateDebugStats(now, frameMs || (performance.now() - frameStart), simMs, renderMs, steps);
  requestAnimationFrame(render);
}
