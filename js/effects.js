const state = globalThis.__tiritaState || (globalThis.__tiritaState = {});
import { playGrabSound, playNamedSound } from './audio.js';
import { renderTies } from './ties.js';

export function createParticle({ x, y, vx = 0, vy = 0, life = 900, size = 10, kind = 'spark', gravity = 0, bounce = 0.45, rotateWithVelocity = true, fade = true, color }) {
  if (state.particles.length >= state.MAX_PARTICLES || state.particlesSpawnedThisStep >= state.MAX_PARTICLES_PER_STEP) return false;
  state.particles.push({ x, y, px: x - vx, py: y - vy, life, maxLife: life, size, kind, gravity, bounce, rotateWithVelocity, fade, color, spawnedSplash: false });
  state.particlesSpawnedThisStep++;
  return true;
}

export function createParticleEmitter(preset, anchor, count = 80, duration = 1200) {
  state.particleEmitters.push({
    preset,
    anchor: { ...anchor },
    count: Math.max(1, Number(count) || 1),
    duration: Math.max(80, Number(duration) || 1200),
    elapsed: 0,
    emitted: 0,
    carry: 0
  });
}

export function spawnParticles(preset, anchor, count = 12, color = null) {
  const baseSpeed = Math.hypot(anchor.vx || 0, anchor.vy || 0);
  const cappedCount = Math.min(count, Math.max(0, state.MAX_PARTICLES - state.particles.length), Math.max(0, state.MAX_PARTICLES_PER_STEP - state.particlesSpawnedThisStep));
  for (let i = 0; i < cappedCount; i++) {
    const angle = preset === 'spark'
      ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.65
      : Math.atan2(anchor.vy || -1, anchor.vx || 0) + (Math.random() - 0.5) * Math.PI * 1.25;
    const speed = preset === 'violentGeyser'
      ? 11 + Math.random() * 18
      : preset === 'redDrops'
        ? 2.5 + baseSpeed * 0.12 + Math.random() * 3
        : preset === 'smokePoof'
          ? 0.4 + Math.random() * 1.4
          : preset === 'tears'
            ? 0.5 + Math.random() * 0.6
            : preset === 'spark'
              ? 4 + Math.random() * 7
              : 2 + Math.random() * 4;
    if (preset === 'smokePoof') {
      createParticle({
        x: anchor.x + (Math.random() - 0.5) * 26,
        y: anchor.y + (Math.random() - 0.5) * 18,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.8 - Math.random() * 1.1,
        life: 1800 + Math.random() * 1100,
        size: 18 + Math.random() * 28,
        kind: 'smoke',
        gravity: -0.006,
        bounce: 0.12,
        rotateWithVelocity: false
      });
    } else if (preset === 'violentGeyser') {
      const wallSide = anchor.x < (state.frameViewport.width - state.MARGIN * 2) * 0.5 ? 1 : -1;
      const jetAngle = (wallSide > 0 ? -0.16 : Math.PI + 0.16) + (Math.random() - 0.5) * 0.38;
      createParticle({
        x: anchor.x + (Math.random() - 0.5) * 20,
        y: anchor.y + (Math.random() - 0.5) * 14,
        vx: Math.cos(jetAngle) * speed + (anchor.vx || 0) * 0.08,
        vy: Math.sin(jetAngle) * speed + (Math.random() - 0.5) * 2.8,
        life: 1400 + Math.random() * 900,
        size: 7 + Math.random() * 10,
        kind: 'drop',
        gravity: 0.13,
        bounce: 0.64
      });
    } else if (preset === 'tears') {
      createParticle({
        x: anchor.x + (Math.random() - 0.5) * 10,
        y: anchor.y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.4 + Math.random() * speed,
        life: 1100 + Math.random() * 700,
        size: 5 + Math.random() * 5,
        kind: 'tear',
        gravity: 0.06,
        bounce: 0.18,
        rotateWithVelocity: false
      });
    } else if (preset === 'inkdrop') {
      createParticle({
        x: anchor.x + (Math.random() - 0.5) * 14,
        y: anchor.y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.4 + Math.random() * 1.1,
        life: 1400 + Math.random() * 1000,
        size: 4 + Math.random() * 5,
        kind: 'inkdrop',
        gravity: 0.16,
        bounce: 0.28,
        color: color || '#2a2521'
      });
    } else if (preset === 'sludgeDrop') {
      createParticle({
        x: anchor.x + (Math.random() - 0.5) * 8,
        y: anchor.y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.1 + Math.random() * 0.4,
        life: 2500 + Math.random() * 1500,
        size: 7 + Math.random() * 8,
        kind: 'inkdrop',
        gravity: 0.08,
        bounce: 0.12,
        color: color || '#1a1208'
      });
    } else {
      createParticle({
        x: anchor.x,
        y: anchor.y,
        vx: Math.cos(angle) * speed + (anchor.vx || 0) * 0.16,
        vy: Math.sin(angle) * speed + (anchor.vy || 0) * 0.16,
        life: preset === 'spark' ? 160 + Math.random() * 110 : 900 + Math.random() * 450,
        size: preset === 'spark' ? 3 + Math.random() * 3 : 5 + Math.random() * 8,
        kind: preset === 'spark' ? 'spark' : 'drop',
        gravity: preset === 'spark' ? 0.06 : 0.2,
        bounce: 0.5,
        color: preset === 'spark' ? color : null
      });
    }
  }
}

export function createPhysicsProp(anchor, action = {}) {
  const radius = Math.max(18, Number(action.radius || 42));
  const el = document.createElement('div');
  el.className = 'physics-prop';
  if (action.src) {
    el.classList.add('has-image');
    const img = document.createElement('img');
    img.src = action.src;
    img.alt = action.label || 'prop';
    img.draggable = false;
    el.appendChild(img);
  } else {
    el.textContent = action.label || 'prop';
  }
  el.style.width = `${radius * 2}px`;
  el.style.height = `${radius * 2}px`;
  state.container.appendChild(el);
  const side = Math.random() < 0.5 ? -1 : 1;
  const impulseX = (Math.abs(anchor.vx || 0) > 0.2 ? anchor.vx * 1.2 : side * (2.4 + Math.random() * 2.4));
  const impulseY = (anchor.vy || 0) - (0.6 + Math.random() * 1.1);
  const prop = {
    el,
    x: anchor.x - radius,
    y: anchor.y - radius,
    px: anchor.x - radius - impulseX,
    py: anchor.y - radius - impulseY,
    radius,
    label: action.label || 'prop',
    src: action.src || '',
    angle: (Math.random() - 0.5) * 0.5,
    angularVelocity: impulseX / Math.max(20, radius) * 0.12,
    sleeping: false,
    groundedFrames: 0
  };
  state.physicsProps.push(prop);
  el.addEventListener('pointerdown', (e) => {
    state.armAudio();
    const rect = state.container.getBoundingClientRect();
    prop.sleeping = false;
    prop.groundedFrames = 0;
    state.physicsPropDrags.set(e.pointerId, {
      prop,
      offsetX: e.clientX - rect.left - prop.x,
      offsetY: e.clientY - rect.top - prop.y,
      lastX: e.clientX,
      lastY: e.clientY
    });
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
    playGrabSound();
    e.stopPropagation();
    e.preventDefault();
  });
}

function spawnInkSplash(x, y) {
  const count = 3 + Math.floor(Math.random() * 4);
  for (let s = 0; s < count; s++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6;
    const speed = 1.5 + Math.random() * 4;
    createParticle({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 340 + Math.random() * 280,
      size: 3 + Math.random() * 5,
      kind: 'splash',
      gravity: 0.18,
      bounce: 0.0,
      rotateWithVelocity: true
    });
  }
}

export function simulateEffects() {
  const minX = -state.frameViewport.containerLeft;
  const minY = -state.frameViewport.containerTop;
  const maxX = state.frameViewport.width - state.frameViewport.containerLeft;
  const maxY = state.frameViewport.height - state.frameViewport.containerTop;
  for (let i = state.particleEmitters.length - 1; i >= 0; i--) {
    const emitter = state.particleEmitters[i];
    emitter.elapsed += state.STEP_MS;
    const t = Math.min(1, emitter.elapsed / emitter.duration);
    const intensity = Math.pow(1 - t, 2.2);
    const desired = emitter.count * (1 - intensity);
    emitter.carry += Math.max(0, desired - emitter.emitted);
    const burst = Math.min(emitter.count - emitter.emitted, Math.floor(emitter.carry));
    if (burst > 0) {
      spawnParticles(emitter.preset, emitter.anchor, burst);
      emitter.emitted += burst;
      emitter.carry -= burst;
    }
    if (emitter.elapsed >= emitter.duration || emitter.emitted >= emitter.count) {
      state.particleEmitters.splice(i, 1);
    }
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= state.STEP_MS;
    const vx = (p.x - p.px) * Math.pow(0.988, state.SIM_STEP_SCALE);
    const vy = (p.y - p.py) * Math.pow(0.988, state.SIM_STEP_SCALE);
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + p.gravity * state.SIM_STEP_SCALE;
    if (p.x < minX) {
      p.x = minX; p.px = p.x + vx * p.bounce;
      if (p.kind === 'inkdrop' && !p.spawnedSplash) { p.spawnedSplash = true; spawnInkSplash(p.x, p.y); }
    }
    if (p.x + p.size > maxX) {
      p.x = maxX - p.size; p.px = p.x + vx * p.bounce;
      if (p.kind === 'inkdrop' && !p.spawnedSplash) { p.spawnedSplash = true; spawnInkSplash(p.x, p.y); }
    }
    if (p.y < minY && p.kind === 'smoke') p.life = Math.min(p.life, 80);
    if (p.y + p.size > maxY) {
      p.y = maxY - p.size;
      p.py = p.y + vy * p.bounce;
      if (p.kind === 'drop' && !p.spawnedSplash) {
        p.spawnedSplash = true;
        for (let s = 0; s < 4; s++) {
          createParticle({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3, life: 420, size: 3 + Math.random() * 4, kind: 'splash', gravity: 0.16 });
        }
      }
      if (p.kind === 'inkdrop' && !p.spawnedSplash) { p.spawnedSplash = true; spawnInkSplash(p.x, p.y); }
    }
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
  }
  for (const prop of state.physicsProps) {
    let isDraggedProp = false;
    for (const drag of state.physicsPropDrags.values()) {
      if (drag.prop === prop) { isDraggedProp = true; break; }
    }
    if (isDraggedProp) continue;
    if (prop.sleeping) {
      prop.px = prop.x;
      prop.py = prop.y;
      prop.angularVelocity = 0;
      continue;
    }
    const vx = (prop.x - prop.px) * Math.pow(0.982, state.SIM_STEP_SCALE);
    const vy = (prop.y - prop.py) * Math.pow(0.982, state.SIM_STEP_SCALE);
    prop.px = prop.x;
    prop.py = prop.y;
    prop.x += vx;
    prop.y += vy + 0.34 * state.SIM_STEP_SCALE;
    prop.angularVelocity = prop.angularVelocity * Math.pow(0.94, state.SIM_STEP_SCALE) + vx / Math.max(22, prop.radius) * 0.08;
    prop.angle += prop.angularVelocity;
    const size = prop.radius * 2;
    if (prop.x < minX) { prop.x = minX; prop.px = prop.x + vx * 0.56; if (Math.abs(vx) > 3.5) playNamedSound('thud'); }
    if (prop.x + size > maxX) { prop.x = maxX - size; prop.px = prop.x + vx * 0.56; if (Math.abs(vx) > 3.5) playNamedSound('thud'); }
    if (prop.y < minY) { prop.y = minY; prop.py = prop.y + vy * 0.56; }
    if (prop.y + size > maxY) {
      prop.y = maxY - size;
      if (Math.abs(vy) > 3.5) playNamedSound('thud');
      const floorSide = (Math.random() < 0.5 ? -1 : 1);
      prop.x += vx * 0.18 + floorSide * Math.min(1.8, Math.abs(vy) * 0.08);
      prop.px = prop.x - vx * 0.74;
      if (Math.abs(vx) < 0.08 && Math.abs(vy) < 0.42) {
        prop.px = prop.x;
        prop.py = prop.y;
        prop.angularVelocity *= 0.5;
        prop.groundedFrames++;
        if (prop.groundedFrames > 5) prop.sleeping = true;
      } else {
        prop.py = prop.y + vy * 0.18;
        prop.angularVelocity += (vx * 0.12 + floorSide * Math.min(1.2, Math.abs(vy) * 0.04)) / Math.max(18, prop.radius);
        prop.groundedFrames = 0;
      }
    } else {
      prop.groundedFrames = 0;
    }
  }
  for (let i = 0; i < state.physicsProps.length; i++) {
    for (let j = i + 1; j < state.physicsProps.length; j++) {
      const a = state.physicsProps[i], b = state.physicsProps[j];
      const ax = a.x + a.radius, ay = a.y + a.radius;
      const bx = b.x + b.radius, by = b.y + b.radius;
      const dx = bx - ax, dy = by - ay;
      const dist = Math.hypot(dx, dy) || 0.001;
      const minDist = a.radius + b.radius;
      if (dist < minDist) {
        const push = (minDist - dist) / dist * 0.5;
        a.sleeping = false;
        b.sleeping = false;
        a.groundedFrames = 0;
        b.groundedFrames = 0;
        a.angularVelocity -= dx * push * 0.006;
        b.angularVelocity += dx * push * 0.006;
        a.x -= dx * push; a.y -= dy * push;
        b.x += dx * push; b.y += dy * push;
      }
    }
  }
  simulateDrainAmbient();
}

// ── Drain ambient ───────────────────────────────────────────────────────────
// Dark drops welling up out of the plughole, plus occasional bugs that crawl
// out and wander. Bugs are DOM elements (draggable, tap to squish).
// Drop and bug rates scale up while the block is actively being pulled.
// Both stop entirely once the block is fully unclogged (completed).

function isDrainBlockBeingPulled(blockIdx) {
  if (!state.drags?.size) return false;
  const range = state.blockRanges?.[blockIdx];
  if (!range) return false;
  for (const d of state.drags.values()) {
    if (d.idx >= range.start && d.idx <= range.end) return true;
  }
  return false;
}

function spawnBug(x, y, color) {
  state.bugs ||= [];
  if (state.bugs.length >= 12) return;
  const s = 3.5 + Math.random() * 2.5;
  const col = color || '#1c1814';
  // Transparent DOM element: only for hit detection (drag + tap)
  const hitW = Math.ceil(s * 4);
  const hitH = Math.ceil(s * 5);

  const el = document.createElement('div');
  el.className = 'bug-prop';
  el.style.cssText = `position:absolute;left:0;top:0;width:${hitW}px;height:${hitH}px;pointer-events:auto;touch-action:none;cursor:pointer;`;
  state.container.appendChild(el);

  const bug = {
    el, s, hitW, hitH,
    x, y,
    angle: Math.random() * Math.PI * 2,
    speed: 0.7 + Math.random() * 1.0,
    legPhase: Math.random() * 6.28,
    wander: Math.random() * 6.28,
    life: 7000 + Math.random() * 7000,
    color: col,
    dragging: false, dragMoved: false, dragOffX: 0, dragOffY: 0,
    dying: false, dieStarted: 0
  };
  state.bugs.push(bug);

  el.addEventListener('pointerdown', (e) => {
    state.armAudio?.();
    e.stopPropagation();
    e.preventDefault();
    bug.dragging = true;
    bug.dragMoved = false;
    const rect = state.container.getBoundingClientRect();
    bug.dragOffX = e.clientX - rect.left - bug.x;
    bug.dragOffY = e.clientY - rect.top - bug.y;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!bug.dragging) return;
    bug.dragMoved = true;
    const rect = state.container.getBoundingClientRect();
    bug.x = e.clientX - rect.left - bug.dragOffX;
    bug.y = e.clientY - rect.top - bug.dragOffY;
  });
  el.addEventListener('pointerup', (e) => {
    if (!bug.dragging) return;
    bug.dragging = false;
    if (!bug.dragMoved) killBug(bug, true);
  });
  el.addEventListener('pointercancel', () => { bug.dragging = false; });
}

function killBug(bug, splat = false) {
  if (bug.dying) return;
  bug.dying = true;
  bug.dieStarted = performance.now();
  bug.el.style.pointerEvents = 'none';
  if (splat) spawnParticles('redDrops', { x: bug.x, y: bug.y, vx: 0, vy: -0.5 }, 10);
}

function simulateDrainAmbient() {
  state.bugs ||= [];
  const blocks = state.pieceConfig?.blocks || [];
  const flags = state.activeBlockFlags || [];
  const isEditor = document.body.classList.contains('editor-open');
  const perSec = state.STEP_MS / 1000;

  for (let i = 0; i < blocks.length; i++) {
    const d = blocks[i]?.drain;
    if (!d?.enabled) continue;
    if (!isEditor && flags[i] === false) continue;
    // Stop everything once the block is fully unclogged
    if (!isEditor && state.completedBlocks?.[i]) continue;
    const hx = Number(d.x ?? 360);
    const hy = Number(d.y ?? 150);
    // Rates scale up 8× while being actively pulled
    const pull = isEditor ? 1 : (isDrainBlockBeingPulled(i) ? 8 : 1);
    if (d.dropsEnabled !== false) {
      const rate = Math.max(0, Number(d.dropRate ?? 0.7)) * pull;
      if (Math.random() < rate * perSec) {
        spawnParticles('inkdrop', { x: hx, y: hy }, 1, d.dropColor || '#2a2521');
      }
    }
    if (d.bugsEnabled !== false) {
      const rate = Math.max(0, Number(d.bugRate ?? 0.08)) * pull;
      if (Math.random() < rate * perSec) spawnBug(hx, hy, d.bugColor || '#1c1814');
    }
  }

  // Advance and update every live bug
  const minX = -state.frameViewport.containerLeft - 80;
  const minY = -state.frameViewport.containerTop - 80;
  const maxX = state.frameViewport.width - state.frameViewport.containerLeft + 80;
  const maxY = state.frameViewport.height - state.frameViewport.containerTop + 80;
  const now = performance.now();

  for (let i = state.bugs.length - 1; i >= 0; i--) {
    const b = state.bugs[i];
    if (b.dying) {
      if (now - b.dieStarted > 200) {
        b.el.remove();
        state.bugs.splice(i, 1);
      }
      continue;
    }
    b.life -= state.STEP_MS;
    if (b.life <= 0 || b.x < minX || b.x > maxX || b.y < minY || b.y > maxY) {
      killBug(b);
      continue;
    }
    if (!b.dragging) {
      b.wander += 0.07 * state.SIM_STEP_SCALE;
      b.angle += Math.sin(b.wander) * 0.055 * state.SIM_STEP_SCALE;
      const step = b.speed * state.SIM_STEP_SCALE;
      b.x += Math.cos(b.angle) * step;
      b.y += Math.sin(b.angle) * step;
      b.legPhase += step * 0.6;
    }
    // Keep transparent hit area centred on the bug position
    b.el.style.transform = `translate(${b.x - b.hitW / 2}px, ${b.y - b.hitH / 2}px)`;
  }
}

function renderBugs(offX, offY) {
  if (!state.bugs?.length) return;
  const ctx = state.effectsCtx;
  const now = performance.now();
  for (const b of state.bugs) {
    let fade = Math.max(0, Math.min(1, Math.min(b.life, 800) / 800));
    let squishX = 1, squishY = 1;
    if (b.dying) {
      const t = Math.min(1, (now - b.dieStarted) / 180);
      fade = 1 - t;
      squishX = 1 + t * 1.8;
      squishY = 1 - t * 0.72;
    }
    if (fade <= 0) continue;
    const s = b.s;
    ctx.save();
    ctx.translate(b.x + offX, b.y + offY);
    ctx.rotate(b.angle + Math.PI / 2);
    ctx.scale(squishX, squishY);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = b.color;
    ctx.fillStyle = b.color;
    ctx.lineWidth = Math.max(0.7, s * 0.22);
    ctx.lineCap = 'round';
    for (let li = 0; li < 3; li++) {
      const ly = (li - 1) * s * 0.55;
      const swing  = Math.sin(b.legPhase + li * 1.7) * s * 0.5;
      const swing2 = Math.sin(b.legPhase + li * 1.7 + Math.PI) * s * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, ly); ctx.lineTo(-s * 1.4, ly + swing);
      ctx.moveTo(0, ly); ctx.lineTo( s * 1.4, ly + swing2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, s * 0.3, s * 0.7, s * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -s * 0.9, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 1.2); ctx.lineTo(-s * 0.7, -s * 2.1);
    ctx.moveTo( s * 0.2, -s * 1.2); ctx.lineTo( s * 0.7, -s * 2.1);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawPeelStroke(stroke, cx, cy, alpha = 1, offsetX = 0, offsetY = 0) {
  if (stroke.texture === 'hand') {
    state.effectsCtx.setLineDash([]);
    state.effectsCtx.globalAlpha = alpha * 0.96;
    for (let i = 0; i < stroke.nodes.length - 1; i++) {
      const a = stroke.nodes[i];
      const b = stroke.nodes[i + 1];
      const wave = Math.sin(i * 1.73 + stroke.blockIdx * 0.91) * 0.5 + Math.sin(i * 0.47) * 0.5;
      state.effectsCtx.lineWidth = Math.max(0.5, stroke.strokeLW * (0.78 + wave * 0.28));
      state.effectsCtx.beginPath();
      state.effectsCtx.moveTo(a.x + cx + offsetX, a.y + cy + offsetY);
      state.effectsCtx.lineTo(b.x + cx + offsetX, b.y + cy + offsetY);
      state.effectsCtx.stroke();
    }
    state.effectsCtx.globalAlpha = alpha;
    return;
  }
  const passes = stroke.texture === 'sketch' ? 3 : stroke.texture === 'rough' ? 2 : 1;
  state.effectsCtx.setLineDash(stroke.texture === 'dashed' ? [8, 6] : stroke.texture === 'dotted' ? [1, 6] : []);
  for (let pass = 0; pass < passes; pass++) {
    const jitter = pass === 0 ? 0 : 1.6 * pass;
    state.effectsCtx.beginPath();
    state.effectsCtx.moveTo(stroke.nodes[0].x + cx + offsetX, stroke.nodes[0].y + cy + offsetY);
    for (let i = 1; i < stroke.nodes.length; i++) {
      const n = stroke.nodes[i];
      const jx = jitter ? (Math.sin(i * 12.989 + pass * 7.1) * jitter) : 0;
      const jy = jitter ? (Math.cos(i * 7.233 + pass * 5.7) * jitter) : 0;
      state.effectsCtx.lineTo(n.x + cx + offsetX + jx, n.y + cy + offsetY + jy);
    }
    state.effectsCtx.globalAlpha = alpha * (pass === 0 ? 1 : 0.45);
    state.effectsCtx.stroke();
  }
  state.effectsCtx.globalAlpha = alpha;
  state.effectsCtx.setLineDash([]);
}

export function getAttachmentOpacity(blockIdx) {
  return Math.max(0, Math.min(1, Number(state.textBlocks[blockIdx]?.attachment?.opacity ?? 1) || 0));
}

export function getPeelStrokeVisibilityAlpha(blockIdx, blockVis, isEditor) {
  if (isEditor || blockVis) return 1;
  const delayMs = state.getStepAdvanceDelayMs(blockIdx);
  const completedAt = state.completedBlockTimes[blockIdx] || 0;
  if (!completedAt) return 0;
  const elapsedAfterDelay = performance.now() - completedAt - delayMs;
  const fadeMs = 300;
  if (elapsedAfterDelay < 0) return 1;
  if (elapsedAfterDelay >= fadeMs) return 0;
  return 1 - (elapsedAfterDelay / fadeMs);
}

export function renderEffects() {
  state.effectsCtx.clearRect(0, 0, state.frameViewport.width, state.frameViewport.height);
  const canvasOffsetX = -(state.frameViewport.effectsLeft || 0);
  const canvasOffsetY = -(state.frameViewport.effectsTop || 0);
  const containerCanvasLeft = state.frameViewport.containerLeft + canvasOffsetX;
  const containerCanvasTop = state.frameViewport.containerTop + canvasOffsetY;
  for (const p of state.particles) {
    const x = p.x + containerCanvasLeft;
    const y = p.y + containerCanvasTop;
    const size = p.size;
    const alpha = p.fade ? Math.max(0, Math.min(1, p.life / p.maxLife)) : 1;
    const angle = p.rotateWithVelocity ? Math.atan2(p.y - p.py, p.x - p.px) : 0;
    state.effectsCtx.save();
    state.effectsCtx.globalAlpha = alpha;
    state.effectsCtx.translate(x + size / 2, y + size / 2);
    if (angle) state.effectsCtx.rotate(angle);
    if (p.kind === 'spark') {
      const r = size / 2;
      state.effectsCtx.fillStyle = p.color || '#ffffff';
      state.effectsCtx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 4;
        const rr = i % 2 === 0 ? r : r * 0.34;
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i === 0) state.effectsCtx.moveTo(px, py);
        else state.effectsCtx.lineTo(px, py);
      }
      state.effectsCtx.closePath();
      state.effectsCtx.fill();
    } else {
      state.effectsCtx.fillStyle = p.color
        ? p.color
        : p.kind === 'smoke'
          ? 'rgba(102, 98, 91, 0.34)'
          : p.kind === 'tear'
            ? 'rgba(160, 195, 220, 0.82)'
            : p.kind === 'splash'
              ? '#d2454b'
              : '#b3282d';
      state.effectsCtx.beginPath();
      state.effectsCtx.arc(0, 0, size / 2, 0, Math.PI * 2);
      state.effectsCtx.fill();
    }
    state.effectsCtx.restore();
  }
  renderBugs(containerCanvasLeft, containerCanvasTop);
  for (const prop of state.physicsProps) {
    prop.el.style.transform = `translate(${prop.x}px, ${prop.y}px) rotate(${prop.angle}rad)`;
  }
  // Draw peelable SVG strokes (Verlet chains)
  const isEditor = document.body.classList.contains('editor-open');
  for (const stroke of state.peelStrokes) {
    if (!stroke.initialized || !stroke.nodes.length) continue;
    const layout   = state.positions[stroke.blockIdx]?.attachment;
    const blockVis = state.isBlockVisible(stroke.blockIdx) && state.activeBlockFlags[stroke.blockIdx];
    let alpha = getAttachmentOpacity(stroke.blockIdx) * getPeelStrokeVisibilityAlpha(stroke.blockIdx, blockVis, isEditor);
    if (!layout || alpha <= 0.01) continue;
    let exitOffsetY = 0;
    if (!isEditor && stroke.exitStartedAt) {
      const progress = Math.max(0, Math.min(1, (performance.now() - stroke.exitStartedAt) / 300));
      const eased = 1 - Math.pow(1 - progress, 3);
      exitOffsetY = (stroke.exitDriftY || 22) * eased;
      alpha *= (1 - progress);
    }
    if (alpha <= 0.01) continue;
    const cx = containerCanvasLeft;
    const cy = containerCanvasTop;
    state.effectsCtx.save();
    state.effectsCtx.strokeStyle = stroke.strokeColor;
    state.effectsCtx.lineWidth   = stroke.strokeLW;
    state.effectsCtx.lineCap     = 'round';
    state.effectsCtx.lineJoin    = 'round';
    drawPeelStroke(stroke, cx, cy, alpha, 0, exitOffsetY);
    state.effectsCtx.restore();
  }
  if (state.lineartAuthoring.tool === 'draw' && state.lineartAuthoring.points.length) {
    const target = state.getLineartAuthoringLayout();
    if (target) {
      const { layout, offsetY } = target;
      state.effectsCtx.save();
      state.effectsCtx.strokeStyle = '#1f6f52';
      state.effectsCtx.lineWidth = 2;
      state.effectsCtx.lineCap = 'round';
      state.effectsCtx.lineJoin = 'round';
      state.effectsCtx.setLineDash([5, 4]);
      state.effectsCtx.beginPath();
      state.lineartAuthoring.points.forEach((point, idx) => {
        const x = containerCanvasLeft + layout.x + point[0] * layout.width;
        const y = containerCanvasTop + layout.y + offsetY + point[1] * layout.height;
        if (idx === 0) state.effectsCtx.moveTo(x, y);
        else state.effectsCtx.lineTo(x, y);
      });
      state.effectsCtx.stroke();
      state.effectsCtx.restore();
    }
  }
  if (isEditor) {
    const drawPath = state.getSelectedDrawPath();
    const anchors = drawPath?.anchors || [];
    if (drawPath?.enabled && anchors.length >= 2) {
      state.effectsCtx.save();
      state.effectsCtx.strokeStyle = '#1f6f52';
      state.effectsCtx.fillStyle = '#1f6f52';
      state.effectsCtx.lineWidth = 1.5;
      state.effectsCtx.lineCap = 'round';
      state.effectsCtx.lineJoin = 'round';
      state.effectsCtx.setLineDash([6, 5]);
      state.effectsCtx.beginPath();
      anchors.forEach((anchor, idx) => {
        const screen = state.drawPathPointToScreen(anchor);
        const x = containerCanvasLeft + screen.x;
        const y = containerCanvasTop + screen.y;
        if (idx === 0) state.effectsCtx.moveTo(x, y);
        else {
          const prev = anchors[idx - 1];
          const prevScreen = state.drawPathPointToScreen(prev);
          const prevOut = state.drawPathPointToScreen({ x: prev.x + (prev.out?.x || 0), y: prev.y + (prev.out?.y || 0) });
          const anchorIn = state.drawPathPointToScreen({ x: anchor.x + (anchor.in?.x || 0), y: anchor.y + (anchor.in?.y || 0) });
          state.effectsCtx.bezierCurveTo(
            containerCanvasLeft + prevOut.x,
            containerCanvasTop + prevOut.y,
            containerCanvasLeft + anchorIn.x,
            containerCanvasTop + anchorIn.y,
            x,
            y
          );
        }
      });
      state.effectsCtx.stroke();
      state.effectsCtx.setLineDash([]);
      anchors.forEach((anchor) => {
        const anchorScreen = state.drawPathPointToScreen(anchor);
        const ax = containerCanvasLeft + anchorScreen.x;
        const ay = containerCanvasTop + anchorScreen.y;
        const hx = [
          { x: anchor.x + (anchor.in?.x || 0), y: anchor.y + (anchor.in?.y || 0) },
          { x: anchor.x + (anchor.out?.x || 0), y: anchor.y + (anchor.out?.y || 0) }
        ];
        state.effectsCtx.strokeStyle = 'rgba(31, 111, 82, 0.42)';
        for (const h of hx) {
          const handleScreen = state.drawPathPointToScreen(h);
          const x = containerCanvasLeft + handleScreen.x;
          const y = containerCanvasTop + handleScreen.y;
          state.effectsCtx.beginPath();
          state.effectsCtx.moveTo(ax, ay);
          state.effectsCtx.lineTo(x, y);
          state.effectsCtx.stroke();
          state.effectsCtx.beginPath();
          state.effectsCtx.rect(x - 3.5, y - 3.5, 7, 7);
          state.effectsCtx.fill();
        }
        state.effectsCtx.beginPath();
        state.effectsCtx.arc(ax, ay, 5, 0, Math.PI * 2);
        state.effectsCtx.fill();
      });
      state.effectsCtx.restore();
    }
    if (state.drawTextAuthoring.tool === 'draw' && state.drawTextAuthoring.points.length) {
      state.effectsCtx.save();
      state.effectsCtx.strokeStyle = '#784830';
      state.effectsCtx.lineWidth = 2;
      state.effectsCtx.lineCap = 'round';
      state.effectsCtx.lineJoin = 'round';
      state.effectsCtx.beginPath();
      state.drawTextAuthoring.points.forEach((point, idx) => {
        const screen = state.drawPathPointToScreen(point);
        const x = containerCanvasLeft + screen.x;
        const y = containerCanvasTop + screen.y;
        if (idx === 0) state.effectsCtx.moveTo(x, y);
        else state.effectsCtx.lineTo(x, y);
      });
      state.effectsCtx.stroke();
      state.effectsCtx.restore();
    }
  }
  renderTies(containerCanvasLeft, containerCanvasTop, isEditor);
  state.renderLooseParts();
}
