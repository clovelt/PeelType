// Tangled lines ("maraña") — initially peeled strips spawn already tangled
// with each other and are untangled by pulling them apart.
//
// The strips themselves are the lines: nothing is painted on top of them.
// Each strand is the loose (pre-unlocked) letter chain of a block, dangling
// from its locked frontier. At spawn the strands of a group are PLACED woven
// around each other in a wide serpentine derived from the crossings list and
// pre-settled against the real constraints, so frame 0 hangs in equilibrium.
//
// Three ingredients make the tangle physical rather than decorative:
//  1. WRAPS — each crossing is a contact constraint at floating material
//     coordinates (sA, sB = letters from the strand TIP). Pulling a strand
//     taut, or pulling the strands apart, slides the wrap toward the free
//     tips like a twisted cord unwinding; it releases when it slips off.
//     Wraps on the same strand cannot pass each other (outermost-first).
//  2. STRAND COLLISION — letters of different strands in a group cannot
//     interpenetrate (except right at a wrap), so the tangle keeps volume
//     and strands drape over each other instead of merging into one line.
//  3. BEND STIFFNESS — strips resist sharp folds (push-only i↔i+2
//     constraint), so they bow into cord-like loops instead of hanging dead
//     straight.
//
// Config: pieceConfig.tangledLines[]   (schema shared with the editor UI)
//   { id, strands: [{ block, endpoint }], crossings: [{ a, b, aFrac, bFrac,
//     type }], onUntangle }
// Runtime state: state.tangledLines[]  (computed by computeTangledLines)
const state = globalThis.__tiritaState || (globalThis.__tiritaState = {});
import { runTriggerAction } from './events.js';
import { asActionList } from './ties.js';
import { getLetterLineHeight } from './layout.js';

// ── Tuning ────────────────────────────────────────────────────────────────────
const SLACK         = 0.06;  // chain stretch tolerated before a wrap slides
const PULL_RATE     = 0.8;   // slide (letters/step) per unit of tip-side stretch
const SEP_RATE      = 0.035; // slide per unit of separation strain at the wrap
const MAX_SLIDE     = 0.05;  // slip speed limit (letters per 120Hz step) — cord friction
const ORDER_GAP     = 1.6;   // min letters between wraps on the same strand
const RELEASE_S     = 0.90;  // material coord (letters from tip) — a wrap this close slips off
const SETTLE_STEPS  = 100;   // pre-settle iterations at spawn
const MIN_STRAND    = 5;     // strands shorter than this are not placed
const BEND_OPEN     = 0.78;  // i↔i+2 min distance as a fraction of the straight span
const BEND_STIFF    = 0.35;
const COLLIDE_STIFF = 0.75;

function lh() { return state.LINE_HEIGHT || 24; }
function contactDist() { return Math.max(8, lh() * 0.5); }
function collideDist() { return Math.max(8, lh() * 0.62); }

// ── Normalization ─────────────────────────────────────────────────────────────
function normalizeStrand(s, idx) {
  return {
    id:       s.id       || `s${idx}`,
    block:    s.block    || s.blockId || '',
    endpoint: s.endpoint || 'end',
    color:    s.color    || '#7a5a3a',
    width:    Math.max(1.5, Number(s.width ?? 3) || 3)
  };
}

function normalizeCrossing(c) {
  return {
    a:     Number(c.a ?? c.strandA ?? 0),
    b:     Number(c.b ?? c.strandB ?? 1),
    aFrac: Math.max(0.05, Math.min(0.9, Number(c.aFrac ?? c.aAt ?? 0.6))),
    bFrac: Math.max(0.05, Math.min(0.9, Number(c.bFrac ?? c.bAt ?? 0.6))),
    type:  c.type || 'knot'
  };
}

// ── Strand helpers ────────────────────────────────────────────────────────────
// Loose letter indices of a strand, ordered root (next to lock) → tip.
function getLooseIndices(blockIdx, endpoint) {
  const range = state.blockRanges?.[blockIdx];
  if (!range) return [];
  const isEnd = endpoint !== 'start';
  const out = [];
  if (isEnd) {
    for (let i = range.end; i >= range.start; i--) {
      const l = state.letters[i];
      if (!l || l.deleted) continue;
      if (l.locked) break;
      out.unshift(i);
    }
  } else {
    for (let i = range.start; i <= range.end; i++) {
      const l = state.letters[i];
      if (!l || l.deleted) continue;
      if (l.locked) break;
      out.push(i);
    }
  }
  return out;
}

function letterCenter(idx) {
  const l = state.letters[idx];
  if (!l) return null;
  return { x: l.x + l.w / 2, y: l.y + getLetterLineHeight(l) / 2 };
}

function setLetterCenter(idx, cx, cy) {
  const l = state.letters[idx];
  if (!l) return;
  l.x = cx - l.w / 2;
  l.y = cy - getLetterLineHeight(l) / 2;
  l.px = l.x;
  l.py = l.y;
}

function isFixedLetter(idx) {
  const l = state.letters[idx];
  return !l || l.deleted || l.locked || state.isDragged(idx);
}

// Material coordinate s (letters from TIP, float) → interpolated point + the
// two letter indices and the interpolation fraction.
function pointAtMaterial(indices, s) {
  const len = indices.length;
  if (!len) return null;
  const p  = Math.max(0, Math.min(len - 1, (len - 1) - s));
  const i0 = Math.floor(p);
  const i1 = Math.min(len - 1, i0 + 1);
  const f  = p - i0;
  const c0 = letterCenter(indices[i0]);
  const c1 = letterCenter(indices[i1]);
  if (!c0 || !c1) return null;
  return {
    x: c0.x + (c1.x - c0.x) * f,
    y: c0.y + (c1.y - c0.y) * f,
    idx0: indices[i0], idx1: indices[i1], f
  };
}

// Stretch of the chain span from material coord s to the tip: cur/rest - 1.
function tipSpanStretch(indices, s) {
  const len = indices.length;
  if (len < 2) return 0;
  const from = Math.max(0, Math.floor((len - 1) - s));
  let cur = 0, rest = 0;
  for (let i = from; i < len - 1; i++) {
    const a = letterCenter(indices[i]);
    const b = letterCenter(indices[i + 1]);
    if (!a || !b) continue;
    cur  += Math.hypot(b.x - a.x, b.y - a.y);
    rest += state.restLengths[indices[i]] ?? 0;
  }
  return rest > 1 ? cur / rest - 1 : 0;
}

function strandRestLength(indices) {
  let rest = 0;
  const rootLink = indices[0] - 1;
  if (rootLink >= 0 && state.restLengths[rootLink] !== null) rest += state.restLengths[rootLink];
  for (let i = 0; i < indices.length - 1; i++) rest += state.restLengths[indices[i]] ?? 0;
  return rest;
}

// ── computeTangledLines ───────────────────────────────────────────────────────
export function computeTangledLines() {
  const configs  = Array.isArray(state.pieceConfig?.tangledLines) ? state.pieceConfig.tangledLines : [];
  const previous = new Map((state.tangledLines || []).map(g => [g.id, g]));
  const groups   = [];


  for (const cfg of configs) {
    const id   = cfg.id || `tangle-${groups.length + 1}`;
    const prev = previous.get(id);

    const strands = (cfg.strands || []).map(normalizeStrand).map(s => ({
      ...s,
      blockIdx: (state.textBlocks || []).findIndex(b => b.id === s.block)
    })).filter(s => s.blockIdx >= 0);
    if (strands.length < 2) continue;

    const crossings = (cfg.crossings || []).map((c, ci) => {
      const nc = normalizeCrossing(c);
      if (nc.a >= strands.length || nc.b >= strands.length || nc.a === nc.b) return null;
      const pc = prev?.crossings?.[ci];
      return {
        ...nc,
        sA:     pc?.sA ?? null,   // material coords assigned at placement
        sB:     pc?.sB ?? null,
        side:   pc?.side ?? 1,    // which side strand a sits on ABOVE the wrap
        status: pc?.status ?? 'tangled',
        freeAt: pc?.freeAt ?? 0
      };
    }).filter(Boolean);

    const allFree = crossings.length > 0 && crossings.every(c => c.status === 'free');
    groups.push({
      id, strands, crossings,
      onUntangle: asActionList(cfg.onUntangle),
      // Carried across recomputes; rebuilt letters are detected per-letter via
      // the _tanglePlaced marker (see needsPlacement) and re-placed if idle.
      placed: prev?.placed ?? false,
      allFree,
      allFreeAt: allFree ? (prev?.allFreeAt || performance.now()) : 0
    });
  }

  return groups;
}

// ── Serpentine placement at spawn ─────────────────────────────────────────────
// Slot timeline: strands start in slots ordered by anchor x; each crossing
// swaps the slots of its two strands. Transitions are smoothed over wide
// windows so each strand sweeps broad S-curves through the bundle and the two
// swapping strands meet near their mutual midpoint exactly at the crossing.
function buildSlotTimelines(group, order) {
  const n = group.strands.length;
  const slots = new Array(n);
  order.forEach((si, slot) => { slots[si] = slot; });
  const timelines = group.strands.map((_, si) => [{ t: 0, slot: slots[si] }]);
  const events = group.crossings
    .map(c => ({ c, t: Math.max(0.1, Math.min(0.85, (c.aFrac + c.bFrac) / 2)) }))
    .sort((u, v) => u.t - v.t);
  for (const { c, t } of events) {
    // Which side strand a occupies just above this wrap — the topology
    // constraint keeps the strands actually crossing here, not just touching.
    c.side = Math.sign(slots[c.a] - slots[c.b]) || 1;
    const tmp = slots[c.a]; slots[c.a] = slots[c.b]; slots[c.b] = tmp;
    timelines[c.a].push({ t, slot: slots[c.a] });
    timelines[c.b].push({ t, slot: slots[c.b] });
  }
  // Per-key smoothing window: half the gap to the neighboring keys.
  for (const keys of timelines) {
    for (let k = 1; k < keys.length; k++) {
      const prevGap = keys[k].t - keys[k - 1].t;
      const nextGap = k + 1 < keys.length ? keys[k + 1].t - keys[k].t : 0.25;
      keys[k].w = Math.max(0.05, Math.min(0.3, Math.min(prevGap, nextGap) * 0.5));
    }
  }
  return timelines;
}

function lateralAt(keys, t, spread, n) {
  const slotX = slot => (slot - (n - 1) / 2) * spread;
  let x = slotX(keys[0].slot);
  for (let k = 1; k < keys.length; k++) {
    const w = keys[k].w || 0.08;
    const u = Math.max(0, Math.min(1, (t - (keys[k].t - w)) / (2 * w)));
    const e = u * u * (3 - 2 * u);
    x = x + (slotX(keys[k].slot) - x) * e;
  }
  return x;
}

function placeTangleGroup(group) {
  const looseMap = group.strands.map(s => getLooseIndices(s.blockIdx, s.endpoint));
  // Wait until every strand exists, is long enough, and is still untouched.
  for (let si = 0; si < group.strands.length; si++) {
    const ind = looseMap[si];
    if (!ind || ind.length < MIN_STRAND) return false;
    if (!state.activeBlockFlags?.[group.strands[si].blockIdx]) return false;
    if (ind.some(i => !state.letters[i].starterIdle)) return false;
  }

  // Anchors = locked frontier letters (or the root letter's layout position).
  const anchors = looseMap.map(ind => {
    const frontier = state.letters[ind[0] - 1];
    if (frontier && frontier.locked && !frontier.deleted && frontier.blockIdx === state.letters[ind[0]].blockIdx) {
      return { x: frontier.x + frontier.w / 2, y: frontier.y + getLetterLineHeight(frontier) / 2 };
    }
    const l = state.letters[ind[0]];
    return { x: l.ox + l.w / 2, y: l.oy + getLetterLineHeight(l) / 2 };
  });

  const n = group.strands.length;
  const order = anchors.map((a, si) => ({ si, x: a.x })).sort((u, v) => u.x - v.x).map(o => o.si);
  const timelines = buildSlotTimelines(group, order);
  const bundleX = anchors.reduce((s, a) => s + a.x, 0) / n;
  const bundleTopY = Math.max(...anchors.map(a => a.y)) + lh() * 1.2;

  const totalRests = looseMap.map(strandRestLength);
  const minRest = Math.min(...totalRests);
  // Weave amplitude: enough lateral room per crossing segment so strands
  // visibly cross each other. Minimum 2.5× lh so even short strips spread.
  const maxEvents = Math.max(1, ...timelines.map(keys => keys.length - 1));
  const segMaterial = (minRest * 0.7) / (maxEvents + 1);
  const spread = Math.max(lh() * 2.5, Math.min(lh() * 7, segMaterial * 0.9));

  for (let si = 0; si < n; si++) {
    const ind = looseMap[si];
    const total = totalRests[si];
    const keys = timelines[si];
    // Direct parametric placement: letter k → t = k/(len-1). No arc-length
    // constraint, so the slot timeline drives the full lateral sweep without
    // being capped. Pre-settle corrects chain spacing afterward.
    const totalVertical = total * 0.88;
    for (let k = 0; k < ind.length; k++) {
      const t = k / Math.max(1, ind.length - 1);
      const lat = lateralAt(keys, t, spread, n);
      // Blend from the anchor x into the bundle over the root stretch.
      const blend = Math.min(1, t / 0.18);
      const ease = blend * blend * (3 - 2 * blend);
      const px = anchors[si].x + ((bundleX + lat) - anchors[si].x) * ease;
      const py = bundleTopY + t * totalVertical;
      setLetterCenter(ind[k], px, py);
      state.letters[ind[k]].yBaked = false;
      state.letters[ind[k]]._tanglePlaced = true;
    }
  }

  // Initialise wrap material coordinates (letters from tip).
  for (const c of group.crossings) {
    const lenA = looseMap[c.a].length, lenB = looseMap[c.b].length;
    c.sA = (1 - c.aFrac) * (lenA - 1);
    c.sB = (1 - c.bFrac) * (lenB - 1);
    if (c.status !== 'free') c.status = 'tangled';
  }
  enforceCrossingOrder(group, looseMap);

  preSettleGroup(group, looseMap);
  group.placed = true;
  return true;
}

// Mini-sim: relax the freshly placed strands against their real constraints
// (chains, wraps, bend, strand collision) so the visible frame-0 pose is
// already in equilibrium.
function preSettleGroup(group, looseMap) {
  const gravity = state.gravityOn ? (state.TICK_GRAVITY || 0.5) : 0;
  for (let step = 0; step < SETTLE_STEPS; step++) {
    for (const ind of looseMap) {
      for (const idx of ind) {
        const l = state.letters[idx];
        const vx = (l.x - l.px) * 0.55;
        const vy = (l.y - l.py) * 0.55;
        l.px = l.x; l.py = l.y;
        l.x += vx;
        l.y += vy + gravity;
      }
    }
    for (let iter = 0; iter < 10; iter++) {
      for (const ind of looseMap) {
        const rootLink = ind[0] - 1;
        const from = (rootLink >= 0 && state.restLengths[rootLink] !== null) ? rootLink : ind[0];
        for (let i = from; i < ind[ind.length - 1]; i++) {
          if (state.restLengths[i] === null) continue;
          solveChainPair(i);
        }
      }
      for (const c of group.crossings) {
        if (c.status === 'free' || c.sA === null) continue;
        solveCrossing(group, looseMap, c, 1);
        solveWrapSides(looseMap, c);
      }
      solveGroupShape(group, looseMap);
    }
  }
  for (const ind of looseMap) {
    for (const idx of ind) {
      const l = state.letters[idx];
      l.px = l.x; l.py = l.y;
    }
  }
}

function solveChainPair(i) {
  const a = state.letters[i], b = state.letters[i + 1];
  if (!a || !b || a.deleted || b.deleted) return;
  const ac = letterCenter(i), bc = letterCenter(i + 1);
  const dx = bc.x - ac.x, dy = bc.y - ac.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const diff = (dist - state.restLengths[i]) / dist;
  const aFixed = a.locked, bFixed = b.locked;
  if (aFixed && bFixed) return;
  if (aFixed) { b.x -= dx * diff; b.y -= dy * diff; }
  else if (bFixed) { a.x += dx * diff; a.y += dy * diff; }
  else {
    a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
    b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
  }
}

// ── Constraint primitives ─────────────────────────────────────────────────────
function applyLetterCorrection(idx, cx, cy) {
  const l = state.letters[idx];
  if (!l || l.deleted || l.locked || state.isDragged(idx)) return;
  l.x += cx;
  l.y += cy;
}

function applyPointCorrection(pt, cx, cy) {
  const w0 = 1 - pt.f, w1 = pt.f;
  const denom = w0 * w0 + w1 * w1 || 1;
  applyLetterCorrection(pt.idx0, cx * w0 / denom, cy * w0 / denom);
  if (pt.idx1 !== pt.idx0) applyLetterCorrection(pt.idx1, cx * w1 / denom, cy * w1 / denom);
}

// Wrap: pull the two strands together at the crossing (pull-only).
function solveCrossing(group, looseMap, crossing, stiffness) {
  const indA = looseMap[crossing.a], indB = looseMap[crossing.b];
  if (!indA?.length || !indB?.length) return;
  const pA = pointAtMaterial(indA, crossing.sA);
  const pB = pointAtMaterial(indB, crossing.sB);
  if (!pA || !pB) return;

  const dx = pB.x - pA.x, dy = pB.y - pA.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const diff = (dist - contactDist()) / dist * stiffness;
  if (diff <= 0) return;

  const cx = dx * diff, cy = dy * diff;
  applyPointCorrection(pA, cx * 0.5, cy * 0.5);
  applyPointCorrection(pB, -cx * 0.5, -cy * 0.5);
}

// Wrap topology: the two strands must actually CROSS at the wrap — strand a
// stays on its recorded side just above it and on the opposite side just
// below. Without this the settle collapses the weave into two parallel
// strands that merely touch. Push-only along x.
function solveWrapSides(looseMap, crossing) {
  const indA = looseMap[crossing.a], indB = looseMap[crossing.b];
  if (!indA?.length || !indB?.length) return;
  const delta = 2.6;             // letters away from the wrap centre
  const gap   = collideDist() * 1.5;
  for (const dir of [1, -1]) {   // 1 = above (toward root), -1 = below
    const sA = crossing.sA + delta * dir;
    const sB = crossing.sB + delta * dir;
    if (sA < 0.3 || sB < 0.3) continue;
    if (sA > indA.length - 1.3 || sB > indB.length - 1.3) continue;
    const pA = pointAtMaterial(indA, sA);
    const pB = pointAtMaterial(indB, sB);
    if (!pA || !pB) continue;
    // Above the wrap a sits on `side`; below it sits on the opposite side.
    const want = crossing.side * dir;       // sign of (xA - xB) required
    const cur  = (pA.x - pB.x) * want;
    if (cur >= gap) continue;
    const push = (gap - cur) * 0.85 * want;
    applyPointCorrection(pA, push * 0.5, 0);
    applyPointCorrection(pB, -push * 0.5, 0);
  }
}

// Push-only minimum distance between two letters (collision / bend opening).
function solvePushApart(idxA, idxB, minDist, stiffness) {
  const a = state.letters[idxA], b = state.letters[idxB];
  if (!a || !b || a.deleted || b.deleted) return;
  const ac = letterCenter(idxA), bc = letterCenter(idxB);
  let dx = bc.x - ac.x, dy = bc.y - ac.y;
  let dist = Math.hypot(dx, dy);
  if (dist >= minDist) return;
  if (dist < 0.001) { dx = 0.5 - (idxA % 2); dy = 0.3; dist = Math.hypot(dx, dy); }
  const push = (minDist - dist) / dist * stiffness;
  const aFixed = isFixedLetter(idxA);
  const bFixed = isFixedLetter(idxB);
  if (aFixed && bFixed) return;
  if (aFixed) { b.x += dx * push; b.y += dy * push; }
  else if (bFixed) { a.x -= dx * push; a.y -= dy * push; }
  else {
    a.x -= dx * push * 0.5; a.y -= dy * push * 0.5;
    b.x += dx * push * 0.5; b.y += dy * push * 0.5;
  }
}

// Bend stiffness + strand-strand collision: what gives the tangle its body.
function solveGroupShape(group, looseMap) {
  // Bend: keep i↔i+2 from folding flat, so the strip behaves like a cord.
  for (const ind of looseMap) {
    for (let k = 0; k + 2 < ind.length; k++) {
      const r0 = state.restLengths[ind[k]] ?? 0;
      const r1 = state.restLengths[ind[k + 1]] ?? 0;
      if (!r0 || !r1) continue;
      solvePushApart(ind[k], ind[k + 2], (r0 + r1) * BEND_OPEN, BEND_STIFF);
    }
  }

  // Letters at active wraps are allowed to touch (that's the wrap itself).
  const wrapSet = new Set();
  for (const c of group.crossings) {
    if (c.status === 'free' || c.sA === null) continue;
    for (const [side, s] of [[c.a, c.sA], [c.b, c.sB]]) {
      const ind = looseMap[side];
      if (!ind?.length) continue;
      const p = Math.round(Math.max(0, Math.min(ind.length - 1, (ind.length - 1) - s)));
      for (let o = -1; o <= 1; o++) {
        const k = p + o;
        if (k >= 0 && k < ind.length) wrapSet.add(ind[k]);
      }
    }
  }

  // Cross-strand collision: strands cannot pass through each other.
  const minDist = collideDist();
  for (let si = 0; si < looseMap.length; si++) {
    for (let sj = si + 1; sj < looseMap.length; sj++) {
      const A = looseMap[si], B = looseMap[sj];
      if (!A?.length || !B?.length) continue;
      for (const ia of A) {
        const la = state.letters[ia];
        if (!la || la.deleted) continue;
        const aWrap = wrapSet.has(ia);
        for (const ib of B) {
          if (aWrap && wrapSet.has(ib)) continue;
          solvePushApart(ia, ib, minDist, COLLIDE_STIFF);
        }
      }
    }
  }
}

// Wraps on the same strand keep their order (inner can't pass outer).
function enforceCrossingOrder(group, looseMap) {
  for (let si = 0; si < group.strands.length; si++) {
    const refs = [];
    for (const c of group.crossings) {
      if (c.status === 'free') continue;
      if (c.a === si) refs.push({ c, side: 'sA' });
      else if (c.b === si) refs.push({ c, side: 'sB' });
    }
    refs.sort((u, v) => u.c[u.side] - v.c[v.side]);
    for (let k = 1; k < refs.length; k++) {
      const min = refs[k - 1].c[refs[k - 1].side] + ORDER_GAP;
      if (refs[k].c[refs[k].side] < min) refs[k].c[refs[k].side] = min;
    }
    const maxS = Math.max(0, (looseMap[si]?.length ?? 1) - 1);
    for (const r of refs) r.c[r.side] = Math.min(r.c[r.side], maxS);
  }
}

// ── applyTangledConstraints ───────────────────────────────────────────────────
// Called once per physics constraint iteration (like applyTieConstraints).
export function applyTangledConstraints() {
  const groups = state.tangledLines;
  if (!groups?.length) return;

  for (const group of groups) {
    if (!group.placed) continue;
    const looseMap = group.strands.map(s => getLooseIndices(s.blockIdx, s.endpoint));
    for (const crossing of group.crossings) {
      if (crossing.status === 'free' || crossing.sA === null) continue;
      const stiffness = crossing.type === 'loop' ? 0.55 : 0.85;
      solveCrossing(group, looseMap, crossing, stiffness);
      solveWrapSides(looseMap, crossing);
    }
    solveGroupShape(group, looseMap);
  }
}

// A group needs (re-)placement when it was never placed, or when its letters
// were rebuilt from layout (fresh starterIdle letters without the placement
// marker) — e.g. after a resize or an editor change.
function needsPlacement(group) {
  if (!group.placed) return true;
  for (const s of group.strands) {
    const ind = getLooseIndices(s.blockIdx, s.endpoint);
    for (const i of ind) {
      const l = state.letters[i];
      if (l.starterIdle && !l._tanglePlaced) return true;
      if (!l.starterIdle) return false; // tangle is live — never re-place
    }
  }
  return false;
}

// ── simulateTangledLines ──────────────────────────────────────────────────────
// Called once per physics step: placement, wrap sliding, releases.
export function simulateTangledLines() {
  const groups = state.tangledLines;
  if (!groups || !groups.length) return;

  const dt = state.SIM_STEP_SCALE || 1;

  for (const group of groups) {
    if (needsPlacement(group) && !placeTangleGroup(group)) continue;
    const looseMap = group.strands.map(s => getLooseIndices(s.blockIdx, s.endpoint));

    let anyActive = false;
    for (const crossing of group.crossings) {
      if (crossing.status === 'free' || crossing.sA === null) continue;
      anyActive = true;

      const indA = looseMap[crossing.a], indB = looseMap[crossing.b];
      if (!indA?.length || !indB?.length) continue;
      const pA = pointAtMaterial(indA, crossing.sA);
      const pB = pointAtMaterial(indB, crossing.sB);
      if (!pA || !pB) continue;

      const idleA = indA.every(i => state.letters[i].starterIdle);
      const idleB = indB.every(i => state.letters[i].starterIdle);
      // Untouched tangle: nothing slides, nothing creeps.
      if (idleA && idleB) continue;

      const sep = Math.hypot(pB.x - pA.x, pB.y - pA.y);
      // Capped so a single hard yank can't cascade every wrap off at once.
      const sepStrain = Math.min(1.5, Math.max(0, sep - contactDist() * 1.8) / contactDist());
      // Wake the passive strand once the tangle is actually being worked.
      if (sepStrain > 0.4 || !idleA || !idleB) {
        if (idleA) state.wakeStarterIdleSegment(indA[0]);
        if (idleB) state.wakeStarterIdleSegment(indB[0]);
      }

      const overA = Math.max(0, tipSpanStretch(indA, crossing.sA) - SLACK);
      const overB = Math.max(0, tipSpanStretch(indB, crossing.sB) - SLACK);
      crossing.sA = Math.max(-0.2, crossing.sA - Math.min(MAX_SLIDE, overA * PULL_RATE + sepStrain * SEP_RATE) * dt);
      crossing.sB = Math.max(-0.2, crossing.sB - Math.min(MAX_SLIDE, overB * PULL_RATE + sepStrain * SEP_RATE) * dt);
    }

    if (anyActive) enforceCrossingOrder(group, looseMap);

    // Releases: a wrap that reaches a free tip slides off.
    for (const crossing of group.crossings) {
      if (crossing.status === 'free' || crossing.sA === null) continue;
      if (crossing.sA > RELEASE_S && crossing.sB > RELEASE_S) continue;
      crossing.status = 'free';
      crossing.freeAt = performance.now();
      const indA = looseMap[crossing.a];
      const pA = indA?.length ? pointAtMaterial(indA, Math.max(0, crossing.sA)) : null;
      const anchor = pA ? { x: pA.x, y: pA.y } : { x: 0, y: 0 };
      // A few sparks where the wrap slipped off — feedback without painting
      // anything permanent over the strips.
      runTriggerAction({ type: 'particles', preset: 'spark', count: 7 }, anchor);
      if (group.crossings.every(c => c.status === 'free') && !group.allFree) {
        group.allFree   = true;
        group.allFreeAt = performance.now();
        for (const act of group.onUntangle) runTriggerAction(act, anchor);
        // Restore normal peel feel on the now-free strand blocks: drop the
        // high unlockThreshold that kept the root anchored during tangling.
        for (const s of group.strands) {
          const block = state.textBlocks?.[s.blockIdx];
          if (block?.peel) {
            delete block.peel.unlockThreshold;
            delete block.peel.longStripAssist;
          }
        }
      }
    }
  }
}
