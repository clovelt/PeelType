// Ties & knots — transversal links between lines/blocks that are *untied*, not peeled.
// Each tie now has a Verlet rope chain so the cord sags, bounces and can be grabbed
// anywhere along its length. Grabbing a rope node proxies to the nearest endpoint letter.
const state = globalThis.__tiritaState || (globalThis.__tiritaState = {});
import { resolveCrossEndpoint } from './peel-segments.js';
import { runTriggerAction } from './events.js';

export const TIE_TYPES = ['tie', 'knot', 'cable', 'loop', 'bow'];

const ROPE_GRAVITY   = 0.13;
const ROPE_DAMPING   = 0.965;
const ROPE_ITERS     = 10;

export function asActionList(onUntie) {
  if (!onUntie) return [];
  if (Array.isArray(onUntie)) return onUntie.filter(Boolean);
  if (onUntie.type) return [onUntie];
  const action = onUntie.action;
  if (!action || action === 'none') return [];
  if (action === 'revealBlock' || action === 'hideBlock' || action === 'skipBlock')
    return [{ type: action, blockId: onUntie.target || onUntie.blockId }];
  if (action === 'setFlag') return [{ type: 'setFlag', name: onUntie.target || onUntie.name }];
  if (action === 'sound')  return [{ type: 'sound', name: onUntie.target || onUntie.name || 'peel' }];
  if (action === 'particles') return [{ type: 'particles', preset: onUntie.target || onUntie.preset || 'spark', color: onUntie.color }];
  if (action === 'bgColor') return [{ type: 'bgColor', color: onUntie.target || onUntie.color }];
  return [{ type: action, ...onUntie }];
}

export function normalizeTie(raw = {}, idx = 0) {
  const type = TIE_TYPES.includes(raw.type) ? raw.type : 'knot';
  return {
    id: raw.id || `tie-${idx + 1}`,
    type,
    from: { ...(raw.from || {}) },
    to:   { ...(raw.to   || {}) },
    stiffness:     Math.max(0.05, Math.min(1, Number(raw.stiffness     ?? 0.5) || 0.5)),
    untieDistance: Math.max(12,             Number(raw.untieDistance   ?? 120) || 120),
    ropeNodes:     Math.max(4,  Math.min(20, Number(raw.ropeNodes      ?? 8)   || 8)),
    color:  raw.color  || '#7a5a3a',
    width:  Math.max(1, Number(raw.width ?? (type === 'cable' ? 4 : 2.5)) || 2.5),
    label:  raw.label  || '',
    onUntie: asActionList(raw.onUntie)
  };
}

export function computeTies() {
  const configs  = Array.isArray(state.pieceConfig?.ties) ? state.pieceConfig.ties : [];
  const previous = new Map((state.ties || []).map(tie => [tie.id, tie]));
  const ties     = [];

  configs.forEach((rawCfg, cfgIdx) => {
    const cfg  = normalizeTie(rawCfg, cfgIdx);
    const aIdx = resolveCrossEndpoint(cfg.from, 0);
    const bIdx = resolveCrossEndpoint(cfg.to,   0);
    if (aIdx < 0 || bIdx < 0 || aIdx === bIdx) return;
    const a = state.letters[aIdx], b = state.letters[bIdx];
    if (!a || !b || a.deleted || b.deleted) return;

    const dx = (b.ox + b.w / 2) - (a.ox + a.w / 2);
    const dy = (b.oy + state.LINE_HEIGHT / 2) - (a.oy + state.LINE_HEIGHT / 2);
    const rest = Math.max(6, Math.hypot(dx, dy));

    // Build rope nodes — restore previous positions if available.
    const prev       = previous.get(cfg.id);
    const N          = cfg.ropeNodes + 2;   // includes two endpoint nodes
    const nodeRest   = rest / (N - 1);
    const ax = a.ox + a.w / 2, ay = a.oy + state.LINE_HEIGHT / 2;
    const bx = b.ox + b.w / 2, by = b.oy + state.LINE_HEIGHT / 2;
    const nodes = [];
    for (let ni = 0; ni < N; ni++) {
      const t   = ni / (N - 1);
      const sag = Math.sin(Math.PI * t) * Math.min(40, rest * 0.18);
      const nx  = ax + (bx - ax) * t;
      const ny  = ay + (by - ay) * t + sag;
      const pn  = prev?.nodes?.[ni];
      nodes.push(pn ? { x: pn.x, y: pn.y, px: pn.px, py: pn.py }
                    : { x: nx,   y: ny,   px: nx,     py: ny     });
    }

    ties.push({
      ...cfg,
      aIdx, bIdx, rest, nodeRest, nodes,
      status:   prev?.status   || 'tied',
      loosen:   prev?.loosen   || 0,
      untiedAt: prev?.untiedAt || 0
    });
  });
  return ties;
}

// ── Verlet rope simulation ────────────────────────────────────────────────────
export function simulateTieRopes() {
  const ties = state.ties;
  if (!ties || !ties.length) return;

  const dt     = state.SIM_STEP_SCALE || 1;
  const damping = Math.pow(ROPE_DAMPING, dt);
  const iters  = state.mobileRuntime ? 4 : ROPE_ITERS;
  const vp     = state.frameViewport || {};
  const minX   = -(vp.containerLeft || 0);
  const maxX   = (vp.width  || 800) - (vp.containerLeft || 0);
  const maxY   = (vp.height || 600) - (vp.containerTop  || 0);

  // Build dragged-node set from state.tieNodeDrags
  const dragMap = new Map(); // tieId → Set<nodeIdx>
  const drags   = state.tieNodeDrags;
  if (drags) {
    for (const d of drags.values()) {
      let s = dragMap.get(d.tieId);
      if (!s) { s = new Set(); dragMap.set(d.tieId, s); }
      s.add(d.ni);
    }
  }

  for (const tie of ties) {
    if (!tie.nodes) continue;
    const nodes   = tie.nodes;
    const N       = nodes.length;
    const dragged = dragMap.get(tie.id) || null;

    // Snap endpoint nodes to current letter positions (pinned to world)
    const ac = state.getLetterConstraintCenter(tie.aIdx);
    const bc = state.getLetterConstraintCenter(tie.bIdx);
    if (tie.status !== 'untied') {
      nodes[0].x   = ac.x; nodes[0].y   = ac.y;
      nodes[0].px  = ac.x; nodes[0].py  = ac.y;
      nodes[N-1].x = bc.x; nodes[N-1].y = bc.y;
      nodes[N-1].px= bc.x; nodes[N-1].py= bc.y;
    }

    // Verlet step for free (middle) nodes
    for (let ni = 1; ni < N - 1; ni++) {
      if (dragged?.has(ni)) continue;
      const n = nodes[ni];
      const vx = (n.x - n.px) * damping;
      const vy = (n.y - n.py) * damping;
      n.px = n.x; n.py = n.y;
      n.x += vx;
      n.y += vy + ROPE_GRAVITY * dt;
      if (n.x < minX) n.x = minX;
      if (n.x > maxX) n.x = maxX;
      const floor  = state.getPileFloor
        ? state.getPileFloor(n.x + (vp.containerLeft || 0), tie.width)
        : 0;
      if (n.y > maxY - floor) { n.y = maxY - floor; n.py = n.y + vy * 0.3; }
    }

    // Distance constraints along chain
    for (let iter = 0; iter < iters; iter++) {
      for (let ni = 0; ni < N - 1; ni++) {
        const aa = nodes[ni], bb = nodes[ni + 1];
        const aPinned = (ni === 0     && tie.status !== 'untied') || dragged?.has(ni);
        const bPinned = (ni + 1 === N-1 && tie.status !== 'untied') || dragged?.has(ni + 1);
        if (aPinned && bPinned) continue;
        const ddx = bb.x - aa.x, ddy = bb.y - aa.y;
        const dist = Math.hypot(ddx, ddy) || 0.001;
        const push = (dist - tie.nodeRest) / dist * 0.5;
        if (!aPinned) { aa.x += ddx * push; aa.y += ddy * push; }
        if (!bPinned) { bb.x -= ddx * push; bb.y -= ddy * push; }
      }
    }
  }
}

// Returns the tie and its closest middle node if within hitRadiusSq.
export function hitTestTieRope(cx, cy, hitRadiusSq) {
  const ties = state.ties;
  if (!ties) return null;
  let bestDist = Infinity, best = null;
  for (const tie of ties) {
    if (!tie.nodes || tie.status === 'untied') continue;
    const nodes = tie.nodes;
    for (let ni = 1; ni < nodes.length - 1; ni++) {
      const n = nodes[ni];
      const dx = n.x - cx, dy = n.y - cy;
      const dSq = dx * dx + dy * dy;
      if (dSq < hitRadiusSq && dSq < bestDist) {
        bestDist = dSq; best = { tie, ni };
      }
    }
  }
  return best;
}

// ── Binding constraint (per physics iteration) ────────────────────────────────
export function applyTieConstraints() {
  const ties = state.ties;
  if (!ties || !ties.length) return;
  for (const tie of ties) {
    if (tie.status === 'untied') continue;
    const a = state.letters[tie.aIdx], b = state.letters[tie.bIdx];
    if (!a || !b || a.deleted || b.deleted) continue;
    const aFrozen = state.isLetterFrozen(tie.aIdx);
    const bFrozen = state.isLetterFrozen(tie.bIdx);
    if (aFrozen && bFrozen) continue;
    if (a.locked && b.locked) continue;

    const ac = state.getLetterConstraintCenter(tie.aIdx);
    const bc = state.getLetterConstraintCenter(tie.bIdx);
    const dx = bc.x - ac.x, dy = bc.y - ac.y;
    const dist   = Math.hypot(dx, dy) || 0.001;
    const loosen = Math.max(0, Math.min(1, (dist - tie.rest) / tie.untieDistance));
    tie.loosen   = loosen;

    if (loosen >= 1) {
      tie.status   = 'untied';
      tie.untiedAt = performance.now();
      state.wakeStarterIdleSegment(tie.aIdx);
      state.wakeStarterIdleSegment(tie.bIdx);
      const anchor = { x: (ac.x + bc.x) / 2, y: (ac.y + bc.y) / 2 };
      for (const action of tie.onUntie) runTriggerAction(action, anchor);
      continue;
    }

    tie.status = loosen > 0.08 ? 'loosening' : 'tied';
    if (loosen > 0.05) {
      if (a.starterIdle && (!b.starterIdle || state.isDragged(tie.bIdx))) state.wakeStarterIdleSegment(tie.aIdx);
      if (b.starterIdle && (!a.starterIdle || state.isDragged(tie.aIdx))) state.wakeStarterIdleSegment(tie.bIdx);
    }

    const eff  = tie.stiffness * (1 - loosen * 0.7);
    const diff = (dist - tie.rest) / dist * eff;
    const aFixed = a.locked || aFrozen || state.isDragged(tie.aIdx);
    const bFixed = b.locked || bFrozen || state.isDragged(tie.bIdx);
    if (aFixed && !bFixed)       { b.x -= dx * diff; b.y -= dy * diff; }
    else if (!aFixed && bFixed)  { a.x += dx * diff; a.y += dy * diff; }
    else if (!aFixed && !bFixed) {
      a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
      b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
    }
  }
}

// ── Rendering ─────────────────────────────────────────────────────────────────
const UNTIE_FADE_MS = 600;

function drawKnotGlyph(ctx, x, y, type, size, color, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, size * 0.22);
  ctx.lineCap   = 'round';
  if (type === 'cable') {
    ctx.beginPath(); ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'loop') {
    ctx.beginPath(); ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2); ctx.stroke();
  } else if (type === 'bow') {
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(-size, -size*0.7); ctx.lineTo(-size, size*0.7); ctx.closePath();
    ctx.moveTo(0,0); ctx.lineTo( size, -size*0.7); ctx.lineTo( size, size*0.7); ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'tie') {
    ctx.beginPath(); ctx.arc(-size*0.28, 0, size*0.42, -Math.PI*0.5, Math.PI*1.1); ctx.stroke();
    ctx.beginPath(); ctx.arc( size*0.28, 0, size*0.42,  Math.PI*0.5, Math.PI*2.1); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, size*0.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-size*0.4, 0, size*0.52, -Math.PI*0.6, Math.PI*0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc( size*0.4, 0, size*0.52,  Math.PI*0.4, Math.PI*1.6); ctx.stroke();
  }
  ctx.restore();
}

// Draw a smooth cardinal-spline curve through nodes.
function drawCordCurve(ctx, nodes, offX, offY) {
  if (nodes.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(nodes[0].x + offX, nodes[0].y + offY);
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)];
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const p3 = nodes[Math.min(nodes.length - 1, i + 2)];
    const cx1 = p1.x + (p2.x - p0.x) / 6;
    const cy1 = p1.y + (p2.y - p0.y) / 6;
    const cx2 = p2.x - (p3.x - p1.x) / 6;
    const cy2 = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cx1 + offX, cy1 + offY, cx2 + offX, cy2 + offY,
                      p2.x + offX, p2.y + offY);
  }
  ctx.stroke();
}

export function renderTies(offX, offY) {
  const ties = state.ties;
  if (!ties || !ties.length) return;
  const ctx = state.effectsCtx;
  const now = performance.now();

  for (const tie of ties) {
    let alpha   = 1;
    let severed = false;
    if (tie.status === 'untied') {
      const t = (now - tie.untiedAt) / UNTIE_FADE_MS;
      if (t >= 1) continue;
      alpha   = 1 - t;
      severed = true;
    }
    const a = state.letters[tie.aIdx], b = state.letters[tie.bIdx];
    if (!a || !b || a.deleted || b.deleted) continue;

    if (severed || !tie.nodes) {
      // Fallback: simple snapping cord for untied/fade-out
      const ac = state.getLetterConstraintCenter(tie.aIdx);
      const bc = state.getLetterConstraintCenter(tie.bIdx);
      const ax = ac.x + offX, ay = ac.y + offY;
      const bx = bc.x + offX, by = bc.y + offY;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const sag = Math.min(30, Math.hypot(bx-ax, by-ay) * 0.18);
      const recoil = (1 - alpha) * 28;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = tie.color;
      ctx.lineWidth   = Math.max(1, tie.width * 0.8);
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my + sag + recoil, mx - (mx - ax) * 0.2, my + sag + recoil * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(mx, my + sag + recoil, mx + (bx - mx) * 0.2, my + sag + recoil * 0.5);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const nodes  = tie.nodes;
    const N      = nodes.length;
    const midIdx = Math.floor(N / 2);
    const mid    = nodes[midIdx];
    const prev   = nodes[midIdx - 1];
    const angle  = Math.atan2(mid.y - prev.y, mid.x - prev.x);

    ctx.save();
    ctx.globalAlpha  = alpha * (tie.status === 'loosening' ? 0.9 : 1);
    ctx.strokeStyle  = tie.color;
    ctx.lineWidth    = Math.max(1, tie.width * (1 - tie.loosen * 0.22));
    ctx.lineCap      = 'round';
    ctx.lineJoin     = 'round';

    // Outline pass for "cord depth" feel
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth   = Math.max(1.5, tie.width * 1.6 * (1 - tie.loosen * 0.22));
    drawCordCurve(ctx, nodes, offX, offY);
    ctx.restore();

    drawCordCurve(ctx, nodes, offX, offY);

    const glyphSize = 5 + tie.width * 1.3;
    drawKnotGlyph(ctx, mid.x + offX, mid.y + offY, tie.type, glyphSize, tie.color, angle);

    if (tie.label) {
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle   = tie.color;
      ctx.font        = '12px Georgia, serif';
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'top';
      ctx.fillText(tie.label, mid.x + offX, mid.y + offY + glyphSize + 4);
    }
    ctx.restore();
  }
}
