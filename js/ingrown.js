// Ingrown lines ("líneas enquistadas") — lines of text grown in under the page.
//
// Everything is diegetic: no frame, no HUD, no buttons. The page is the skin;
// only its pores show. A buried line is faint ink lying along a curve, darkest
// at its tip (its first letters), which sits in a pore.
//
//  1. OPEN   — rub over the dark tip to open the pore (deeper lines take more
//              rubbing). Rubbing bare page scratches it red; too much and it
//              flinches (shake) and lets go of whatever you hold.
//  2. PULL   — grab what shows and pull slowly. Text slides out of the pore at
//              a speed proportional to how far you stretch it; stretch too far
//              and it snaps — the part outside breaks off, the rest sinks back.
//              Moving back toward the pore re-grips lower down, so long lines
//              are reeled in hand over hand.
//  3. SNAGS  — lines can catch on a gap between words, and every line holds at
//              its root: one firm tug gets it through.
//  4. EXTRAS — twin (a second line in the same pore), chain (drags its
//              neighbours' tips out), pale lines, lines deeper than they look,
//              and short words already standing out of pores (fuzz).
//
// What comes out is never redrawn as something else: every letter that leaves
// the pore is a node of a Verlet chain with PeelType's own letter physics
// (120 Hz, gravity 0.15, damping 0.97, letters easing back upright). Held, it
// hangs from your grip; finished, snapped or dropped, the same chain falls to
// the floor of the page and can be picked up again.
//
// Config: pieceConfig.ingrown (schema: normalizeIngrownConfig). The game owns
// one full-bleed canvas and its rAF loop, and sleeps while off-screen.

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fr = (a, b) => a + (b - a) * Math.random();
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash32(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const num = (v, d) => { const n = Number(v); return (v === '' || v === null || v === undefined || !Number.isFinite(n)) ? d : n; };
const words = v => (Array.isArray(v) ? v : String(v || '').split(/[\s,]+/)).map(s => String(s).trim()).filter(Boolean);
function rgbArr(hex) {
  const h = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return [74, 74, 74];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export const INGROWN_LINE_TYPES = ['arc', 'wave', 'hook', 'pin', 'loop', 'knot', 'coil', 'giant'];
const DEPTH = { arc: [0.15, 0.45], wave: [0.3, 0.6], hook: [0.3, 0.6], pin: [0.3, 0.6], loop: [0.4, 0.7], knot: [0.45, 0.75], coil: [0.45, 0.8], giant: [0.8, 1] };
const POOL = [['arc', 26], ['wave', 22], ['hook', 16], ['pin', 16], ['loop', 10], ['knot', 5], ['coil', 5]];

// PeelType letter physics (see physics.js): fixed 120 Hz ticks
const TICK = 120, DAMP = 0.97, ITER = 10, ANGLE_EASE = 0.94;
// letters hang 1.2× their advance apart (physics.constraintDistance), so material
// lengths along the text (s) become K× longer once they are out of the pore
const K = 1.2;

// ── Config ────────────────────────────────────────────────────────────────────
export function normalizeIngrownLine(raw = {}) {
  const out = {
    text: String(raw.text ?? '').replace(/\s+/g, ' ').trim(),
    type: INGROWN_LINE_TYPES.includes(raw.type) ? raw.type : 'arc',
    depth: raw.depth === '' || raw.depth === undefined || raw.depth === null ? null : clamp(num(raw.depth, 0.4), 0, 1),
    hidden: clamp(num(raw.hidden, 0), 0, 0.9),
    white: Boolean(raw.white),
    chain: Boolean(raw.chain),
    snags: clamp(Math.round(num(raw.snags, 0)), 0, 6),
    twin: String(raw.twin ?? '').replace(/\s+/g, ' ').trim()
  };
  for (const k of ['x', 'y']) if (raw[k] !== '' && raw[k] !== null && raw[k] !== undefined && Number.isFinite(Number(raw[k]))) out[k] = clamp(Number(raw[k]), 0, 1);
  if (raw.angle !== '' && raw.angle !== null && raw.angle !== undefined && Number.isFinite(Number(raw.angle))) out.angle = Number(raw.angle);
  if (raw.onExtract) out.onExtract = raw.onExtract;
  return out;
}
export function normalizeIngrownPatch(raw = {}) {
  return {
    fuzz: clamp(Math.round(num(raw.fuzz, 10)), 0, 80),
    fuzzWords: words(raw.fuzzWords).join(' '),
    lines: (Array.isArray(raw.lines) ? raw.lines : []).map(normalizeIngrownLine),
    ...(raw.onClear ? { onClear: raw.onClear } : {})
  };
}
export function normalizeIngrownConfig(raw = {}) {
  const patches = (Array.isArray(raw.patches) ? raw.patches : []).map(normalizeIngrownPatch);
  return {
    height: clamp(num(raw.height, 0), 0, 6000), // 0 = one screen
    fontFamily: String(raw.fontFamily ?? ''),
    fontSize: clamp(num(raw.fontSize, 20), 8, 48),
    ink: String(raw.ink || ''),
    paleInk: String(raw.paleInk || '#a39c93'),
    resistance: clamp(num(raw.resistance, 1), 0.2, 5),
    snapTolerance: clamp(num(raw.snapTolerance, 1), 0.3, 4),
    openEffort: clamp(num(raw.openEffort, 1), 0.2, 5),
    painRate: clamp(num(raw.painRate, 1), 0, 5),
    gravity: clamp(num(raw.gravity, 1), 0, 3),
    pores: clamp(num(raw.pores, 1), 0, 3),
    sound: raw.sound === undefined ? true : Boolean(raw.sound),
    endless: Boolean(raw.endless),
    textPool: (Array.isArray(raw.textPool) ? raw.textPool : String(raw.textPool || '').split('\n')).map(s => String(s).trim()).filter(Boolean),
    patches: patches.length ? patches : [normalizeIngrownPatch({ lines: [{ text: 'una línea crecida hacia dentro', type: 'arc' }] })],
    ...(raw.onComplete ? { onComplete: raw.onComplete } : {})
  };
}
export function asIngrownActions(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(a => a && a.type);
  if (v.type) return [v];
  return [];
}

// ── Sound ─────────────────────────────────────────────────────────────────────
function makeSfx(enabled, isMuted) {
  const S = { ctx: null };
  function init() {
    if (!enabled) return;
    if (S.ctx) { if (S.ctx.state === 'suspended') S.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext, ctx = new C();
      S.ctx = ctx;
      S.master = ctx.createGain(); S.master.gain.value = isMuted() ? 0 : 0.5; S.master.connect(ctx.destination);
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      S.noise = buf;
      const ns = ctx.createBufferSource(); ns.buffer = buf; ns.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.9;
      S.slide = ctx.createGain(); S.slide.gain.value = 0;
      ns.connect(f); f.connect(S.slide); S.slide.connect(S.master); ns.start();
      S.strainOsc = ctx.createOscillator(); S.strainOsc.type = 'triangle'; S.strainOsc.frequency.value = 200;
      S.strain = ctx.createGain(); S.strain.gain.value = 0;
      S.strainOsc.connect(S.strain); S.strain.connect(S.master); S.strainOsc.start();
    } catch (_) { S.ctx = null; }
  }
  const loop = (node, v) => { if (S.ctx && node) node.gain.setTargetAtTime(v, S.ctx.currentTime, 0.03); };
  function burst(freq, dur, vol, delay = 0, q = 1.4) {
    if (!S.ctx) return;
    const ctx = S.ctx, t = ctx.currentTime + delay, s = ctx.createBufferSource(); s.buffer = S.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(gn); gn.connect(S.master); s.start(t, Math.random() * 0.8, dur + 0.02);
  }
  function beep(f0, f1, dur, type = 'sine', vol = 0.22, delay = 0) {
    if (!S.ctx) return;
    const ctx = S.ctx, t = ctx.currentTime + delay, o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(gn); gn.connect(S.master); o.start(t); o.stop(t + dur + 0.03);
  }
  return {
    init, burst, beep, loop,
    get slide() { return S.slide; }, get strain() { return S.strain; },
    setStrainFreq(f) { if (S.strainOsc) S.strainOsc.frequency.value = f; },
    syncMute() { if (S.master && S.ctx) S.master.gain.setTargetAtTime(isMuted() ? 0 : 0.5, S.ctx.currentTime, 0.05); },
    pop(big) { beep(240, big ? 1300 : 980, 0.09, 'sine', 0.34); burst(900, 0.05, 0.3, 0.02); if (big) [660, 880, 1175, 1568].forEach((f, i) => beep(f, f, 0.18, 'triangle', 0.2, 0.12 + i * 0.09)); },
    snap() { burst(3200, 0.03, 0.55, 0, 3); beep(180, 90, 0.12, 'square', 0.1, 0.02); },
    peek() { beep(700, 1200, 0.07, 'triangle', 0.2); },
    ouch() { beep(160, 70, 0.4, 'sawtooth', 0.16); beep(170, 75, 0.4, 'sawtooth', 0.12, 0.04); },
    close() { try { S.ctx?.close(); } catch (_) {} S.ctx = null; }
  };
}
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {} }

// ── Game ──────────────────────────────────────────────────────────────────────
export function createIngrownGame(host, rawConfig, hooks = {}) {
  const cfg = normalizeIngrownConfig(rawConfig || {});
  const fontFamily = cfg.fontFamily ? `"${cfg.fontFamily}", Georgia, serif` : (hooks.fontFamily || "'EB Garamond', Georgia, serif");
  const ink = cfg.ink || hooks.ink || '#4a4a4a';
  const INK = rgbArr(ink), PALE = rgbArr(cfg.paleInk);
  const rgb = (c, a) => (a === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);
  const sfx = makeSfx(cfg.sound, () => (hooks.isMuted ? hooks.isMuted() : false));

  const cv = document.createElement('canvas');
  cv.className = 'ingrown-canvas';
  host.appendChild(cv);
  const g = cv.getContext('2d');

  let W = 1, H = 1, DPR = 1, S = 1, F = 20, floorY = 1, y0 = 60, yMax = 400;
  let level = 0, hairs = [], strands = [], pain = 0, stun = 0, slow = 0, shake = 0, clearT = -1, acc = 0;
  let ptr = null, alive = true, visible = true, raf = 0, last = performance.now(), sleepTicks = 0, finished = false;
  let editTool = 'off', editSel = -1, editDrag = null, previewPatch = -1;
  let poresLayer = null, dmg = null, dmgFade = 0;
  const parts = [];
  const font = px => `${Math.max(4, px).toFixed(1)}px ${fontFamily}`;

  function glyphsOf(text, px) {
    const segs = typeof Intl !== 'undefined' && Intl.Segmenter
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(s => s.segment)
      : Array.from(text);
    g.font = font(px);
    const track = px * 0.03;
    let s = 0;
    const out = segs.map(ch => { const w = g.measureText(ch).width + track; const o = { ch, w, sc: s + w / 2 }; s += w; return o; });
    return { glyphs: out, L: s };
  }

  // ── Buried line shapes (curvature tied to the font size so letters never pile up) ──
  function resample(raw, step) {
    const out = [{ x: raw[0].x, y: raw[0].y }];
    let carry = 0;
    for (let i = 1; i < raw.length; i++) {
      const ax = raw[i - 1].x, ay = raw[i - 1].y, bx = raw[i].x, by = raw[i].y, d = Math.hypot(bx - ax, by - ay);
      if (d < 1e-6) continue;
      let t = step - carry;
      while (t <= d) { out.push({ x: ax + (bx - ax) * t / d, y: ay + (by - ay) * t / d }); t += step; }
      carry = d - (t - step);
    }
    return out;
  }
  function shapePath(type, L, rnd, angle) {
    const rr = (a, b) => a + (b - a) * rnd();
    const ra = rnd() * TAU, hasA = angle !== undefined && angle !== null;
    let pts = [], x = 0, y = 0, a = hasA ? angle * Math.PI / 180 : ra;
    const a0Used = a, st = 1.5, sg = rnd() < 0.5 ? -1 : 1, f = F;
    const walk = (len, fn) => { for (let d = 0; d <= len; d += st) { pts.push({ x, y }); a += fn(d) * st; x += Math.cos(a) * st; y += Math.sin(a) * st; } };
    let flip = false;
    if (type === 'arc') { const k = sg / Math.max(rr(4, 9) * f, L / rr(1.5, 2.6)); walk(L, () => k); }
    else if (type === 'wave') { const wl = rr(5, 8) * f, wf = TAU / wl, wa = wf * rr(0.55, 0.85), k = sg / Math.max(rr(8, 14) * f, L / 1.2); walk(L, d => k + Math.cos(d * wf) * wa); }
    else if (type === 'hook') {
      const r1 = rr(1.3, 1.8) * f, curl = Math.min(L * 0.4, TAU * r1 * 0.85), k0 = sg / rr(14, 28) / f, at = L - curl;
      walk(L, d => d < at ? k0 : lerp(k0, sg / r1, clamp((d - at) / (f * 1.2))));
    }
    else if (type === 'pin') {
      const r = rr(1.15, 1.6) * f, L1 = L * rr(0.4, 0.55), k0 = sg / rr(18, 36) / f, k2 = -sg / rr(12, 28) / f;
      walk(L, d => d < L1 ? k0 : d < L1 + Math.PI * r ? sg / r : k2); flip = rnd() < 0.5;
    }
    else if (type === 'loop') {
      const r = Math.min(rr(2, 3) * f, L / 9), at = L * rr(0.25, 0.45), k0 = sg / rr(20, 50) / f, ease = f * 0.7;
      walk(L, d => lerp(k0, sg / r, clamp(Math.min(d - at, at + TAU * r - d) / ease))); flip = rnd() < 0.5;
    }
    else if (type === 'knot') {
      let k = 0; const R = Math.max(3 * f, Math.sqrt(L * f * 0.7));
      walk(L, () => {
        k = clamp(k + rr(-0.022, 0.022) / (f / 9), -0.9 / f, 0.9 / f);
        if (Math.hypot(x, y) > R) { const da = ((Math.atan2(-y, -x) - a + 9.4248) % TAU) - Math.PI; return clamp(da * 0.12, -1.2 / f, 1.2 / f); }
        return k;
      });
      flip = rnd() < 0.5;
    }
    else { // coil, giant: a spiral whose turns sit one line of text apart
      const gap = (type === 'giant' ? 1.3 : 1.15) * f, r0 = (type === 'giant' ? 1.7 : 1.25) * f;
      const r1 = Math.sqrt(L * gap / Math.PI + r0 * r0), thMax = L / ((r0 + r1) / 2);
      const ph = rnd() * TAU, wob = rr(0.03, 0.07), wf = rr(0.55, 0.9), sq = rr(0.82, 0.95), c = Math.cos(a0Used), sn = Math.sin(a0Used);
      for (let th = 0; th <= thMax;) {
        const r = lerp(r0, r1, th / thMax) * (1 + wob * Math.sin(th * wf + ph)), px = Math.cos(th * sg) * r, py = Math.sin(th * sg) * r * sq;
        pts.push({ x: px * c - py * sn, y: px * sn + py * c }); th += st / r;
      }
      flip = rnd() < 0.5;
    }
    if (flip) pts.reverse();
    return { pts: resample(pts, 3), a0: a0Used * 180 / Math.PI };
  }
  function centre(pts) {
    let cx = 0, cy = 0, rad = 0;
    pts.forEach(p => { cx += p.x; cy += p.y; }); cx /= pts.length; cy /= pts.length;
    pts.forEach(p => { p.x -= cx; p.y -= cy; rad = Math.max(rad, Math.hypot(p.x, p.y)); });
    return rad;
  }
  function setHole(h) {
    h.hole = h.pts[0];
    const t = h.pts[Math.min(3, h.pts.length - 1)], dl = Math.hypot(h.hole.x - t.x, h.hole.y - t.y) || 1;
    h.out = { x: (h.hole.x - t.x) / dl, y: (h.hole.y - t.y) / dl };
  }
  function setText(h, text) {
    const gl = glyphsOf(text, F * h.thick);
    h.text = text; h.glyphs = gl.glyphs; h.L = gl.L; h.nodes = new Array(gl.glyphs.length).fill(null); h.n = 0;
  }
  function makeLine(spec, x, y) {
    const rnd = mulberry(spec.seed), rr = (a, b) => a + (b - a) * rnd();
    const thick = spec.type === 'giant' ? 1.1 : rr(0.96, 1.04);
    const L = glyphsOf(spec.text, F * thick).L;
    const shaped = shapePath(spec.type, Math.max(F * 3, L * (1 - spec.hidden)), rnd, spec.angle);
    let pts = shaped.pts, rad = centre(pts);
    const maxRad = Math.max(60 * S, Math.min(W, yMax - y0) * 0.45);
    if (rad > maxRad) { // too big for the page: the rest runs on, out of sight
      const hole = pts[0]; let cut = pts.length;
      for (let i = 0; i < pts.length; i++) if (Math.hypot(pts[i].x - hole.x, pts[i].y - hole.y) > maxRad * 1.7) { cut = i; break; }
      pts = pts.slice(0, Math.max(8, cut)); rad = centre(pts);
    }
    pts.forEach(p => { p.x += x; p.y += y; });
    const visL = (pts.length - 1) * 3;
    let depth = spec.depth ?? rr(DEPTH[spec.type][0], DEPTH[spec.type][1]);
    if (L > visL + F) depth = Math.max(depth, 0.5);
    if (spec.easy) depth = Math.min(depth, 0.3);
    const h = {
      spec, idx: spec.idx, type: spec.type, x, y, pts, step: 3, visL, rad: Math.max(rad, 26 * S), thick, a0: shaped.a0,
      ext: 0, gripS: 0, grip: null, cover: 1, depth, res: (1 + depth * 1.25) * cfg.resistance, white: spec.white, state: 'in', tension: 0,
      seed: rnd() * 100, heal: 1, twin: spec.twin, chain: spec.chain, snags: [], tick: 0, onExtract: spec.onExtract, appear: 0
    };
    setText(h, spec.text);
    const gaps = h.glyphs.filter(gl => gl.ch === ' ' && gl.sc > h.L * 0.15 && gl.sc < h.L * 0.9).map(gl => gl.sc);
    for (let i = 0; i < spec.snags && gaps.length; i++) {
      const want = h.L * (0.22 + 0.6 * (i + rnd() * 0.7) / spec.snags);
      let best = gaps[0]; gaps.forEach(s => { if (Math.abs(s - want) < Math.abs(best - want)) best = s; });
      if (!h.snags.includes(best)) h.snags.push(best);
    }
    h.snags.sort((a, b) => a - b);
    setHole(h);
    return h;
  }
  function makeFuzz(x, y, r, word) { // a short word already standing out of a pore
    const a = Math.PI + (r() - 0.5) * 0.7, px = F * 0.7;
    const gl = glyphsOf(word, px);
    const h = {
      surface: true, type: 'fuzz', text: word, glyphs: gl.glyphs, L: gl.L, thick: 0.7, x, y, pts: [{ x, y }], step: 3, visL: 0, rad: 10 * S,
      ext: gl.L, gripS: 0, grip: null, cover: 0, depth: 0, res: 1, white: false, state: 'out', tension: 0, seed: r() * 100, heal: 1,
      twin: '', chain: false, snags: [], tick: 0, appear: 0, nodes: new Array(gl.glyphs.length).fill(null), n: 0, stiff: true
    };
    h.hole = h.pts[0]; h.out = { x: Math.cos(a), y: Math.sin(a) };
    ensureNodes(h);
    return h;
  }

  // ── Patches: rounds of buried lines; the next grows in when one is cleared ──
  function generatedPatch(lv) {
    const rnd = mulberry(hash32('endless:' + lv + ':' + cfg.textPool.length));
    const n = clamp(2 + Math.floor(lv / 2), 2, 6), lines = [];
    const pool = cfg.textPool.length ? cfg.textPool : cfg.patches.flatMap(p => p.lines.map(l => l.text)).filter(Boolean);
    for (let i = 0; i < n && pool.length; i++) {
      let type = 'arc', q = rnd() * 100; for (const [t, w] of POOL) { type = t; if ((q -= w) < 0) break; }
      const a = rnd(), d = rnd();
      lines.push(normalizeIngrownLine({ text: pool[Math.floor(rnd() * pool.length)], type: lv > 3 && rnd() < 0.12 ? 'giant' : type, white: a < 0.08, chain: d < 0.12, snags: d > 0.7 ? 1 + Math.floor(rnd() * 2) : 0, twin: d > 0.12 && d < 0.2 ? pool[Math.floor(rnd() * pool.length)] : '' }));
    }
    const base = cfg.patches[lv % cfg.patches.length];
    return { fuzz: base.fuzz, fuzzWords: base.fuzzWords, lines };
  }
  function patchConfig(lv) {
    if (lv < cfg.patches.length) {
      const p = cfg.patches[lv];
      return cfg.endless && !p.lines.some(l => l.text) ? generatedPatch(lv) : p;
    }
    return cfg.endless ? generatedPatch(lv) : null;
  }
  function placeRegion() { const mg = F * 0.9 + 8; return { x0: mg, x1: W - mg, y0: y0 + mg * 0.5, y1: yMax }; }
  function fitInside(h) {
    const R = placeRegion();
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    h.pts.forEach(q => { mnx = Math.min(mnx, q.x); mxx = Math.max(mxx, q.x); mny = Math.min(mny, q.y); mxy = Math.max(mxy, q.y); });
    const dx = mxx - mnx > R.x1 - R.x0 ? (R.x0 + R.x1) / 2 - (mnx + mxx) / 2 : mnx < R.x0 ? R.x0 - mnx : mxx > R.x1 ? R.x1 - mxx : 0;
    const dy = mxy - mny > R.y1 - R.y0 ? (R.y0 + R.y1) / 2 - (mny + mxy) / 2 : mny < R.y0 ? R.y0 - mny : mxy > R.y1 ? R.y1 - mxy : 0;
    if (dx || dy) { h.pts.forEach(q => { q.x += dx; q.y += dy; }); h.x += dx; h.y += dy; setHole(h); }
    return h;
  }
  function buildPatch(lv, avoid = []) {
    const pc = patchConfig(lv);
    if (!pc) return null;
    const out = [];
    const place = mulberry(hash32(`place:${lv}:${pc.lines.map(l => l.text).join('|')}`));
    const R = placeRegion();
    const specs = pc.lines.map((l, i) => ({ ...l, idx: i, seed: hash32(`${lv}:${i}:${l.text}`), easy: lv === 0 && i < 2 && l.depth == null })).filter(l => l.text);
    specs.filter(s => s.x !== undefined && s.y !== undefined).forEach(s => out.push(makeLine(s, lerp(0, W, s.x), lerp(y0, yMax, s.y))));
    const overlap = (h, o) => o.surface ? 0 : h.pts.reduce((n, q, i) => n + (i % 4 === 0 && o.pts.some((r, j) => j % 4 === 0 && Math.hypot(q.x - r.x, q.y - r.y) < F * 2.4) ? 1 : 0), 0);
    specs.filter(s => s.x === undefined || s.y === undefined).forEach(spec => {
      let best = null, bestScore = 1e9;
      for (let tries = 0; tries < 90; tries++) {
        const h = fitInside(makeLine(spec, lerp(R.x0, R.x1, place()), lerp(R.y0, R.y1, place())));
        const score = out.concat(avoid).reduce((n, o) => n + overlap(h, o) * 10 + (Math.hypot(o.x - h.x, o.y - h.y) < (o.rad + h.rad) * 0.6 ? 3 : 0), 0);
        if (score < bestScore) { bestScore = score; best = h; }
        if (score === 0) break;
      }
      out.push(best);
    });
    const pool = words(pc.fuzzWords).length ? words(pc.fuzzWords) : ['y', 'a', 'de', 'la', 'sí', 'no', 'tú', 'ya', 'yo', 'en'];
    const nf = Math.round(pc.fuzz * clamp(W * (yMax - y0) / (900 * 600), 0.5, 1.6));
    const wOff = Math.floor(place() * pool.length);
    for (let i = 0; i < nf; i++) for (let tries = 0; tries < 40; tries++) {
      const x = lerp(R.x0, R.x1, place()), y = lerp(R.y0 + F, R.y1, place());
      const near = out.concat(avoid).some(o => !o.surface && o.state !== 'done' && o.pts.some((q, qi) => qi % 3 === 0 && Math.hypot(q.x - x, q.y - y) < F * 1.6));
      if (!near && out.concat(avoid).every(o => !o.surface || Math.hypot(o.x - x, o.y - y) > 40 * S)) { out.push(makeFuzz(x, y, place, pool[(i + wOff) % pool.length])); break; }
    }
    return out;
  }
  function makePores() { // the page's own pores: fine dots, nothing else
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    const x = c.getContext('2d'); x.scale(DPR, DPR);
    if (cfg.pores > 0) {
      const rr = mulberry(hash32('pores' + W + 'x' + H)), step = 23 * S / Math.sqrt(cfg.pores);
      for (let py = step / 2; py < H; py += step) for (let px = step / 2; px < W; px += step) {
        const qx = px + lerp(-7, 7, rr()) * S, qy = py + lerp(-7, 7, rr()) * S;
        x.fillStyle = rgb(INK, 0.06 + rr() * 0.07); x.beginPath(); x.ellipse(qx, qy, 1.25 * S, 0.9 * S, rr() * 3, 0, 7); x.fill();
      }
    }
    return c;
  }
  function blank() { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; return c; }

  // ── Chains: the letters that are out, with PeelType's letter physics ──
  // A chain is { glyphs, nodes[], n (nodes in use, from the tip), pore, grip }.
  // pore / grip are material anchors { x, y, s } — s is a distance along the text.
  function anchorTo(p, ax, ay, rest) {
    const dx = p.x - ax, dy = p.y - ay, d = Math.hypot(dx, dy);
    if (d < 1e-6) { p.x = ax; p.y = ay + rest; return; }
    p.x = ax + dx / d * rest; p.y = ay + dy / d * rest;
  }
  function link(a, b, rest) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, k = (d - rest) / d * 0.5;
    a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
  }
  function pinGrip(c) {
    const gl = c.glyphs, N = c.n, s = c.grip.s;
    let j = -1; for (let i = 0; i < N; i++) if (gl[i].sc <= s) j = i;
    if (j >= 0) anchorTo(c.nodes[j], c.grip.x, c.grip.y, K * (s - gl[j].sc));
    if (j + 1 < N) anchorTo(c.nodes[j + 1], c.grip.x, c.grip.y, K * (gl[j + 1].sc - s));
  }
  function tickChain(c) {
    const N = c.n, nodes = c.nodes, gl = c.glyphs, gr = 0.15 * cfg.gravity * (c.stiff ? 0 : 1);
    let motion = 0;
    for (let i = 0; i < N; i++) {
      const p = nodes[i];
      let vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP; const sp = Math.hypot(vx, vy);
      if (sp > 40) { vx *= 40 / sp; vy *= 40 / sp; }
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + gr;
      p.a = wrapA(p.a) * ANGLE_EASE;
      motion += sp;
    }
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < N - 1; i++) link(nodes[i], nodes[i + 1], K * (gl[i + 1].sc - gl[i].sc));
      if (c.pore && N) anchorTo(nodes[N - 1], c.pore.x, c.pore.y, K * Math.max(0, c.pore.s - gl[N - 1].sc));
      if (c.grip) pinGrip(c);
    }
    const fl = floorY - F * 0.45, wl = F * 0.4, wr = W - F * 0.4;
    if (!c.stiff) collide(c);
    for (let i = 0; i < N; i++) {
      const p = nodes[i];
      if (p.y > fl) { p.y = fl; p.py = fl; p.px = p.x - (p.x - p.px) * 0.5; }
      if (p.x < wl) { p.x = wl; p.px = wl; } else if (p.x > wr) { p.x = wr; p.px = wr; }
    }
    return motion;
  }
  // letters don't pass through each other (PeelType's collision radius), so a
  // dropped strand lies on the floor instead of collapsing into one blot
  const radOf = gl => clamp(Math.max(gl.w * 0.45, F * 0.27), 2.5, F * 0.36);
  let gridT = -1; const grid = new Map();
  function buildGrid() {
    grid.clear();
    const cell = F;
    const add = c => { for (let i = 0; i < c.n; i++) { const p = c.nodes[i], k = ((p.x / cell) | 0) * 4096 + ((p.y / cell) | 0); let b = grid.get(k); if (!b) grid.set(k, b = []); b.push([p, radOf(c.glyphs[i]), c, i]); } };
    for (const st of strands) add(st);
    for (const h of hairs) if ((h.state === 'out' || h.state === 'held') && h.n && !h.stiff) add(h);
  }
  function collide(c) {
    if (gridT !== tickNo) { gridT = tickNo; buildGrid(); }
    const cell = F;
    for (let i = 0; i < c.n; i++) {
      const p = c.nodes[i], ra = radOf(c.glyphs[i]), cx = (p.x / cell) | 0, cy = (p.y / cell) | 0;
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const b = grid.get(gx * 4096 + gy); if (!b) continue;
        for (const [q, rb, oc, j] of b) {
          if (q === p || (oc === c && Math.abs(j - i) < 2)) continue;
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), m = ra + rb;
          if (d >= m || d < 1e-4) continue;
          const k = (m - d) / d * 0.5;
          p.x -= dx * k; p.y -= dy * k; q.x += dx * k; q.y += dy * k;
          if (oc !== c) oc.still = 0; // a resting strand that gets bumped wakes up
        }
      }
    }
  }
  let tickNo = 0;

  // letters that cross the pore become nodes, placed between the pore and the letter before them
  function ensureNodes(h) {
    let k = 0; while (k < h.glyphs.length && h.glyphs[k].sc <= h.ext) k++;
    const inA = h.surface ? 0 : pointAtH(h, 0).a;
    for (let i = h.n; i < k; i++) {
      const d = K * Math.max(0, h.ext - h.glyphs[i].sc), prev = i > 0 ? h.nodes[i - 1] : null;
      let ux = h.out.x, uy = h.out.y, lim = d;
      if (prev) { const dx = prev.x - h.hole.x, dy = prev.y - h.hole.y, l = Math.hypot(dx, dy); if (l > 1e-3) { ux = dx / l; uy = dy / l; lim = Math.min(d, l); } }
      const x = h.hole.x + ux * lim, y = h.hole.y + uy * lim;
      h.nodes[i] = { x, y, px: x, py: y, a: inA };
    }
    h.n = Math.max(h.n, k);
  }
  function chainOf(h) {
    h.pore = { x: h.hole.x, y: h.hole.y, s: h.ext };
    h.grip = h.state === 'held' && ptr ? { x: ptr.x, y: ptr.y, s: h.gripS } : null;
    return h;
  }
  function freeStrand(glyphs, nodes, white, px) { // a chain nothing holds any more: it falls
    const st = { glyphs, nodes, n: nodes.length, pore: null, grip: null, white, px, still: 0, text: glyphs.map(q => q.ch).join('') };
    strands.push(st);
    return st;
  }

  // ── Effects / actions ──
  function puff(x, y, n, col) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = fr(30, 140) * S; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30 * S, life: fr(0.3, 0.7), max: 0.7, col, r: fr(0.8, 1.8) * S }); }
    if (parts.length > 200) parts.splice(0, parts.length - 200);
  }
  function fire(actions, x, y) {
    const list = asIngrownActions(actions);
    if (!list.length || !hooks.runAction) return;
    for (const a of list) { try { hooks.runAction(a, { x, y }); } catch (e) { console.warn('ingrown action failed', e); } }
  }
  function pointAtH(h, u) {
    if (h.pts.length < 2) return { x: h.hole.x, y: h.hole.y, a: 0 };
    const f = clamp(u / h.step, 0, h.pts.length - 1), i = Math.min(h.pts.length - 2, Math.floor(f)), t = f - i;
    const a = h.pts[i], b = h.pts[i + 1] || a;
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), a: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  // ── Input ──
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const digR = () => Math.max(18 * S, F * 0.95);
  const live = h => h.state !== 'done' && h.appear > 0.5;
  function inNear(x, y) { let b = null, bd = digR(); for (const h of hairs) { if (h.state !== 'in' || !live(h)) continue; const d = Math.hypot(h.hole.x - x, h.hole.y - y); if (d < bd) { bd = d; b = h; } } return b; }
  function nearestNode(c, x, y, r) { let j = -1, bd = r; for (let i = 0; i < c.n; i++) { const p = c.nodes[i], d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; j = i; } } return { j, d: bd }; }
  function grabbable(x, y) { // an out line (its letters or its pore), or a fallen strand
    let best = null, bd = 1e9;
    for (const h of hairs) {
      if (h.state !== 'out' || !live(h)) continue;
      const dp = Math.hypot(h.hole.x - x, h.hole.y - y);
      if (!h.surface && dp < 24 * S && dp < bd) { bd = dp; best = { h, s: h.ext }; }
      const nn = nearestNode(h, x, y, F * 0.8); if (nn.j >= 0 && nn.d < bd) { bd = nn.d; best = { h, s: h.glyphs[nn.j].sc }; }
    }
    for (const st of strands) { const nn = nearestNode(st, x, y, F * 0.8); if (nn.j >= 0 && nn.d < bd) { bd = nn.d; best = { st, s: st.glyphs[nn.j].sc }; } }
    return best;
  }
  function onDown(e) {
    if (!alive || ptr) return;
    e.stopPropagation(); e.preventDefault();
    sfx.init(); try { hooks.armAudio?.(); } catch (_) {}
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const t = local(e);
    if (editTool !== 'off') { editDown(e, t); return; }
    ptr = { id: e.pointerId, x: t.x, y: t.y, px: t.x, py: t.y, mode: null, sc: 0, hair: null, strand: null };
    if (stun > 0) return;
    const grab = inNear(t.x, t.y) ? null : grabbable(t.x, t.y);
    if (grab?.h) {
      const h = grab.h; ptr.mode = 'pull'; ptr.hair = h; h.state = 'held'; h.gripS = grab.s;
      if (!h.surface) sfx.beep(900, 700, 0.04, 'square', 0.08);
    } else if (grab?.st) {
      ptr.mode = 'drag'; ptr.strand = grab.st; grab.st.grip = { x: t.x, y: t.y, s: grab.s }; grab.st.still = 0;
      sfx.burst(900, 0.03, 0.12);
    } else ptr.mode = 'dig';
  }
  function onMove(e) {
    const t = local(e);
    if (editTool !== 'off') { editMove(e, t); return; }
    if (!ptr) { const c = grabbable(t.x, t.y) ? 'grab' : ''; if (cv.style.cursor !== c) cv.style.cursor = c; return; }
    if (e.pointerId !== ptr.id) return;
    ptr.x = t.x; ptr.y = t.y;
    if (ptr.mode === 'dig' && stun <= 0) dig(ptr); // may flinch and let go
    if (ptr) { ptr.px = t.x; ptr.py = t.y; }
  }
  function release(e) {
    if (editTool !== 'off') { editUp(e); return; }
    if (!ptr || (e && e.pointerId !== ptr.id)) return;
    letGo();
  }
  function letGo() {
    if (!ptr) return;
    if (ptr.hair && ptr.hair.state === 'held') { ptr.hair.state = 'out'; ptr.hair.grip = null; }
    if (ptr.strand) { ptr.strand.grip = null; ptr.strand.still = 0; }
    ptr = null; cv.style.cursor = '';
  }
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  cv.addEventListener('contextmenu', e => e.preventDefault());

  function popOut(h) {
    h.cover = 0; h.state = 'out'; h.ext = Math.min(h.L, Math.max(12 * S, F * 1.1)); h.grip = null;
    ensureNodes(h);
    puff(h.hole.x, h.hole.y, 3, 'rgba(196,84,84,.55)');
  }
  function dig(p) {
    const m = Math.hypot(p.x - p.px, p.y - p.py);
    if (m < 0.4) return;
    const d = dmg.getContext('2d');
    d.setTransform(DPR, 0, 0, DPR, 0, 0); d.lineCap = 'round';
    const h = inNear(p.x, p.y);
    const nearAny = hairs.some(o => !o.surface && o.state !== 'done' && Math.hypot(o.hole.x - p.x, o.hole.y - p.y) < 32 * S);
    if (h) {
      h.cover -= m / ((70 + 130 * h.depth) * S * cfg.openEffort);
      d.strokeStyle = 'rgba(200,90,90,.12)'; d.lineWidth = 2.2 * S;
      d.beginPath(); d.moveTo(p.px, p.py); d.lineTo(p.x, p.y); d.stroke();
      p.sc += m;
      if (p.sc > 14 * S) { p.sc = 0; sfx.burst(fr(2400, 3600), 0.03, 0.16, 0, 2); }
      if (h.cover <= 0) { popOut(h); sfx.peek(); vibrate(8); }
    } else if (!nearAny && cfg.painRate > 0) {
      pain += m * 0.0013 / S * cfg.painRate;
      d.strokeStyle = 'rgba(196,48,56,.28)'; d.lineWidth = 1.6 * S;
      d.beginPath(); d.moveTo(p.px, p.py); d.lineTo(p.x, p.y); d.stroke();
      p.sc += m;
      if (p.sc > 18 * S) { p.sc = 0; sfx.burst(1200, 0.04, 0.14, 0, 1); }
      if (pain >= 1) ouch();
    }
  }
  function ouch() { // the page flinches and lets go
    stun = 1.6; pain = 0.35; shake = 0.5;
    letGo();
    sfx.ouch(); vibrate([40, 40, 40]);
  }

  function holdStrand(st, s) { if (ptr) { ptr.mode = 'drag'; ptr.hair = null; ptr.strand = st; st.grip = { x: ptr.x, y: ptr.y, s }; } }
  function pluck(h) { // a fuzz word comes out whole and stays in the hand
    h.state = 'done'; h.heal = 1;
    const st = freeStrand(h.glyphs, h.nodes.slice(0, h.n), false, F * 0.7);
    sfx.beep(1250 + Math.random() * 500, 820, 0.035, 'sine', 0.13); vibrate(6);
    holdStrand(st, h.gripS);
  }
  function finishHair(h) {
    h.ext = h.L; ensureNodes(h);
    const big = h.glyphs.length >= 40, gripS = h.gripS;
    const st = freeStrand(h.glyphs, h.nodes.slice(0, h.n), h.white, F * h.thick);
    puff(h.hole.x, h.hole.y, big ? 14 : 6, 'rgba(196,84,84,.5)');
    sfx.pop(big); vibrate(big ? [20, 30, 60] : 18); shake = big ? 0.25 : 0.08;
    slow = big ? 0.9 : 0.4;
    pain = Math.max(0, pain - 0.08);
    fire(h.onExtract, h.hole.x, h.hole.y);
    if (ptr && ptr.hair === h) holdStrand(st, gripS);
    if (h.chain) {
      hairs.forEach(o => { if (o !== h && o.state === 'in' && !o.surface && live(o) && Math.hypot(o.x - h.x, o.y - h.y) < 210 * S) popOut(o); });
      sfx.peek();
    }
    if (h.twin) { // a second line was sharing the same pore
      setText(h, h.twin); h.twin = ''; h.snags = []; h.white = false; h.chain = false; h.tick = 0; h.seed += 7; h.onExtract = null;
      h.ext = Math.min(h.L, 12 * S); h.tension = 0; h.state = 'out'; h.grip = null; ensureNodes(h);
    } else { h.state = 'done'; h.heal = 1; }
  }
  function snapHair(h) { // breaks at the last letter fully out: that part falls, the rest sinks back
    let cut = 0; while (cut < h.n && h.glyphs[cut].sc + h.glyphs[cut].w / 2 <= h.ext) cut++;
    const piece = h.glyphs.slice(0, cut), pieceNodes = h.nodes.slice(0, cut);
    const cutAt = cut ? h.glyphs[cut - 1].sc + h.glyphs[cut - 1].w / 2 : 0, gripS = h.gripS;
    const st = piece.length ? freeStrand(piece, pieceNodes, h.white, F * h.thick) : null;
    const rest = h.glyphs.slice(cut).map(q => q.ch).join('').trimStart();
    const snags = h.snags.map(s => s - cutAt);
    setText(h, rest);
    h.snags = snags.filter(s => s > F && s < h.L - F);
    h.ext = 0; h.tension = 0; h.tick = 0; h.cover = 0.45; h.state = 'in'; h.grip = null;
    pain += 0.2; shake = 0.2;
    sfx.snap(); vibrate(30);
    if (ptr && ptr.hair === h) { if (st && gripS <= cutAt) holdStrand(st, gripS); else { ptr.hair = null; ptr.mode = null; } }
    if (h.glyphs.length < 2) h.state = 'done';
    if (pain >= 1) ouch();
  }

  // ── Drawing ──
  let curM = { a: 1, e: 0, f: 0 }, glyphFont = '';
  function setM(a, e, f) { curM = { a, e, f }; glyphFont = ''; g.setTransform(a, 0, 0, a, e, f); g.globalAlpha = 1; }
  function glyph(ch, x, y, ang, px, col, alpha = 1) {
    if (ch === ' ' || alpha <= 0.01) return;
    const c = Math.cos(ang) * curM.a, s = Math.sin(ang) * curM.a;
    g.setTransform(c, s, -s, c, curM.a * x + curM.e, curM.a * y + curM.f);
    const fs = font(px); if (fs !== glyphFont) { g.font = fs; glyphFont = fs; g.textAlign = 'center'; g.textBaseline = 'middle'; }
    g.globalAlpha = alpha; g.fillStyle = col; g.fillText(ch, 0, 0);
  }
  function strokeRange(h, u0, u1, w, style) {
    if (u1 <= u0) return;
    const a = pointAtH(h, u0), b = pointAtH(h, u1);
    g.beginPath(); g.moveTo(a.x, a.y);
    for (let i = Math.floor(u0 / h.step) + 1; i * h.step < u1 && i < h.pts.length; i++) g.lineTo(h.pts[i].x, h.pts[i].y);
    g.lineTo(b.x, b.y); g.lineWidth = w; g.strokeStyle = style; g.stroke();
  }
  function drawUnder(h, now) {
    const ap = h.appear;
    if (h.surface) { // just its pore
      if (h.state !== 'done') { g.fillStyle = rgb(INK, 0.4 * ap); g.beginPath(); g.arc(h.hole.x, h.hole.y, 1.4 * S, 0, 7); g.fill(); }
      else if (h.heal > 0) { g.fillStyle = `rgba(196,84,84,${0.3 * h.heal})`; g.beginPath(); g.arc(h.hole.x, h.hole.y, 1.8 * S, 0, 7); g.fill(); }
      return;
    }
    if (h.state === 'done') {
      if (h.heal <= 0) return;
      g.fillStyle = `rgba(196,84,84,${0.4 * h.heal})`; g.beginPath(); g.arc(h.hole.x, h.hole.y, 3.2 * S, 0, 7); g.fill();
      return;
    }
    const rem = h.L - h.ext, vis = Math.min(rem, h.visL), deep = rem > h.visL;
    const col = h.white ? PALE : INK, aTip = lerp(0.6, 0.38, h.depth), aRoot = lerp(0.2, 0.08, h.depth);
    const breathe = h.state === 'in' ? 0.88 + 0.12 * Math.sin(now * 0.0025 + h.seed) : 1;
    g.lineCap = 'round';
    strokeRange(h, 0, vis, Math.max(0.6, 0.6 * S), rgb(col, 0.16 * ap)); // the line itself, a hair of ink
    const base = curM;
    for (const gl of h.glyphs) {
      const u = gl.sc - h.ext;
      if (u < 0 || u > vis) continue;
      const mid = u / Math.max(1, h.visL), sink = deep ? clamp((1 - mid) / 0.4) : 1;
      let a = lerp(aTip, aRoot, mid) * sink * ap;
      if (u < F * 1.6) a = Math.min(1, a * (h.cover < 1 ? lerp(1, 1.6, 1 - h.cover) : breathe)); // the dark tip
      const p = pointAtH(h, u);
      glyph(gl.ch, p.x, p.y, p.a, F * h.thick, rgb(col), a);
    }
    setM(base.a, base.e, base.f);
    if (!deep) { // the root: a little pale bead
      const rp = pointAtH(h, rem + F * 0.3);
      g.strokeStyle = rgb(col, 0.35 * ap); g.fillStyle = 'rgba(255,252,246,.9)'; g.lineWidth = 0.8;
      g.beginPath(); g.arc(rp.x, rp.y, F * 0.16, 0, 7); g.fill(); g.stroke();
    }
    const r = (h.cover < 1 ? lerp(1.8, 5.5, 1 - h.cover) : 1.6) * S; // its pore, opening as you rub
    g.fillStyle = h.cover < 1 ? 'rgba(186,70,74,.55)' : rgb(col, 0.5 * ap);
    g.beginPath(); g.ellipse(h.hole.x, h.hole.y, r, r * 0.8, 0.4, 0, 7); g.fill();
  }
  function drawLetters(c, px, col, alpha, hot, gripS, now) {
    const base = curM;
    for (let i = 0; i < c.n; i++) {
      const p = c.nodes[i], gl = c.glyphs[i];
      const strained = hot > 0 && gl.sc > gripS; // between your grip and the pore
      const color = strained ? rgb([lerp(col[0], 196, hot), lerp(col[1], 52, hot), lerp(col[2], 58, hot)].map(Math.round)) : rgb(col);
      glyph(gl.ch, p.x + (strained ? Math.sin(now * 0.09 + i) * hot * 1.6 * S : 0), p.y, p.a, px, color, alpha);
    }
    setM(base.a, base.e, base.f);
  }

  // ── Editor: move a line (drag its body) or turn it (drag its tip) ──
  const previewIdx = () => (previewPatch >= 0 ? previewPatch : level);
  const editLines = () => hairs.filter(h => !h.surface);
  function editDown(e, w) {
    let best = null, bd = 1e9, mode = 'move';
    for (const h of editLines()) {
      const dh = Math.hypot(h.hole.x - w.x, h.hole.y - w.y);
      if (dh < 14 * S && dh < bd) { bd = dh; best = h; mode = 'turn'; continue; }
      for (let i = 0; i < h.pts.length; i += 2) { const d = Math.hypot(h.pts[i].x - w.x, h.pts[i].y - w.y); if (d < F && d < bd) { bd = d; best = h; mode = 'move'; } }
    }
    if (!best) { editSel = -1; hooks.onEditSelect?.(previewIdx(), -1); return; }
    editSel = best.idx; hooks.onEditSelect?.(previewIdx(), best.idx);
    editDrag = { id: e.pointerId, h: best, mode, sx: w.x, sy: w.y, ox: best.x, oy: best.y, ang0: Number.isFinite(best.spec.angle) ? best.spec.angle : best.a0, turned: 0 };
  }
  function editMove(e, t) {
    if (!editDrag || e.pointerId !== editDrag.id) return;
    const d = editDrag, h = d.h;
    if (d.mode === 'move') {
      const nx = clamp(d.ox + t.x - d.sx, 0, W), ny = clamp(d.oy + t.y - d.sy, y0, yMax), dx = nx - h.x, dy = ny - h.y;
      h.pts.forEach(p => { p.x += dx; p.y += dy; }); h.x = nx; h.y = ny;
    } else {
      const da = Math.atan2(t.y - h.y, t.x - h.x) - Math.atan2(h.hole.y - h.y, h.hole.x - h.x), c = Math.cos(da), s = Math.sin(da);
      h.pts.forEach(p => { const x = p.x - h.x, y = p.y - h.y; p.x = h.x + x * c - y * s; p.y = h.y + x * s + y * c; });
      d.turned += da;
    }
    setHole(h);
  }
  function editUp(e) {
    if (!editDrag || (e && e.pointerId !== editDrag.id)) return;
    const d = editDrag, h = d.h; editDrag = null;
    if (d.mode === 'move' && Math.hypot(h.x - d.ox, h.y - d.oy) < 2) return; // a click: selection only
    const change = { x: +(h.x / W).toFixed(4), y: +((h.y - y0) / Math.max(1, yMax - y0)).toFixed(4) };
    if (d.mode === 'turn' && d.turned) change.angle = Math.round(((d.ang0 + d.turned * 180 / Math.PI) % 360 + 360) % 360);
    const pi = previewIdx(), line = cfg.patches[pi]?.lines?.[h.idx];
    if (line) Object.assign(line, change); // keep the live copy in step so a re-layout doesn't undo it
    Object.assign(h.spec, change);
    hooks.onEdit?.(pi, h.idx, change);
  }
  function drawEditOverlay() {
    for (const h of editLines()) {
      const sel = h.idx === editSel;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); h.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.strokeStyle = sel ? 'rgba(31,111,82,.28)' : 'rgba(74,74,74,.1)'; g.lineWidth = F * 1.3; g.stroke();
      g.fillStyle = sel ? '#1f6f52' : '#4a4a4a'; g.beginPath(); g.arc(h.hole.x, h.hole.y, 8 * S, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = `700 ${Math.round(9 * S)}px Manrope, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(h.idx + 1), h.hole.x, h.hole.y + 0.5);
    }
  }

  // ── Round ──
  function restart(lv = 0) {
    level = lv; strands = []; pain = 0; stun = 0; slow = 0; clearT = -1; ptr = null; finished = false; parts.length = 0; acc = 0;
    hairs = buildPatch(level) || buildPatch(0) || [];
    hairs.forEach(h => { h.appear = 1; });
    if (dmg) dmg.getContext('2d').clearRect(0, 0, dmg.width, dmg.height);
  }
  function nextPatch() { // the next lines grow in where there is room; fuzz left behind stays
    const keep = hairs.filter(h => h.state !== 'done' || h.heal > 0);
    const np = buildPatch(level + 1, keep);
    if (!np) { if (!finished) { finished = true; fire(cfg.onComplete, W / 2, yMax / 2); } return; }
    level++;
    hairs = keep.concat(np);
  }

  // ── Loop ──
  function resize() {
    const want = cfg.height > 0 ? cfg.height : Math.max(420, window.innerHeight);
    if (Math.abs(host.clientHeight - want) > 1) host.style.height = `${want}px`;
    const nw = host.clientWidth, nh = host.clientHeight;
    if (nw < 2 || nh < 2) return false;
    if (nw === W && nh === H && poresLayer) return true;
    W = nw; H = nh; DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    S = clamp(Math.min(W, H) / 500, 0.8, 1.4);
    F = cfg.fontSize * clamp(Math.min(W, H) / 700, 0.72, 1.15);
    floorY = H - 6; y0 = Math.max(64, H * 0.09); yMax = H * 0.7;
    poresLayer = makePores(); dmg = blank();
    restart(previewPatch >= 0 ? previewPatch : level);
    return true;
  }
  function frame(now) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (!alive) return;
    if (!host.isConnected) { destroy(); return; }
    const dtR = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    raf = requestAnimationFrame(frame);
    if (!visible) {
      if (++sleepTicks % 30 === 0) { const r = host.getBoundingClientRect(); visible = r.bottom > 0 && r.top < innerHeight; }
      if (!visible) return;
    }
    if (!resize()) return;
    if (editTool !== 'off' && hooks.isEditor && !hooks.isEditor()) { editTool = 'off'; editDrag = null; if (previewPatch >= 0) { previewPatch = -1; restart(0); } hooks.onEditToolOff?.(); }
    const editing = editTool !== 'off';
    const dt = dtR * (slow > 0 ? 0.3 : 1);
    slow = Math.max(0, slow - dtR);
    let sliding = 0, strain = 0;

    if (!editing) {
      pain = Math.max(0, pain - 0.03 * dt);
      if (stun > 0) stun -= dt;
      for (const h of hairs) if (h.appear < 1) h.appear = Math.min(1, h.appear + dtR / 1.4);
      if (ptr && ptr.mode === 'pull') {
        const h = ptr.hair, snapT = 70 * S * cfg.snapTolerance, D = Math.hypot(ptr.x - h.hole.x, ptr.y - h.hole.y);
        if (h.surface) { if (D > K * (h.ext - h.gripS) + 18 * S) pluck(h); }
        else {
          if (D < K * (h.ext - h.gripS)) h.gripS = h.ext - D / K; // back toward the pore: grip lower down, reel it in
          const t = D - K * (h.ext - h.gripS), root = h.L - Math.min(6 * S, h.L * 0.2), stop = h.snags.length ? Math.min(h.snags[0], root) : root;
          h.tension = t / snapT;
          if (t > 0 && h.ext < stop) { const rate = 9 / h.res * t / K; h.ext = Math.min(stop, h.ext + rate * dt); sliding = rate; ensureNodes(h); }
          strain = clamp(h.tension);
          const wordsOut = h.glyphs.filter(gl => gl.ch === ' ' && gl.sc < h.ext).length;
          if (wordsOut > h.tick) { h.tick = wordsOut; const f = Math.min(1500, 420 + wordsOut * 70); sfx.beep(f, f, 0.05, 'triangle', 0.13); }
          if (h.ext >= stop) {
            if (t > snapT * 0.5) { // caught on a word gap, or on the root: a firm tug gets it through
              if (stop < root) { h.snags.shift(); h.ext += 1; ensureNodes(h); sfx.burst(2200, 0.03, 0.3, 0, 2); vibrate(10); }
              else finishHair(h);
            }
          } else if (t > snapT) snapHair(h);
        }
      }
      if (ptr && ptr.mode === 'drag' && ptr.strand?.grip) { ptr.strand.grip.x = ptr.x; ptr.strand.grip.y = ptr.y; }
      const open = hairs.some(h => !h.surface && h.state !== 'done');
      if (!open && clearT < 0 && !finished && hairs.some(h => !h.surface)) clearT = 1.1;
      if (clearT >= 0) {
        clearT -= dt;
        if (clearT < 0) { fire(patchConfig(level)?.onClear, W / 2, yMax / 2); sfx.beep(660, 990, 0.18, 'triangle', 0.16); nextPatch(); }
      }
      // physics at PeelType's fixed rate
      acc += dt * TICK; let ticks = 0;
      while (acc >= 1 && ticks < 10) {
        acc -= 1; ticks++; tickNo++;
        for (const h of hairs) if ((h.state === 'out' || h.state === 'held') && h.n) tickChain(chainOf(h));
        for (const st of strands) {
          if (!st.grip && st.still > TICK) continue; // resting on the floor
          const m = tickChain(st);
          st.still = !st.grip && m < 0.02 * st.n ? st.still + 1 : 0;
        }
      }
      if (acc > 3) acc = 0;
      for (const h of hairs) if (h.state === 'done') h.heal = Math.max(0, h.heal - dt * 0.25);
    }
    sfx.syncMute();
    sfx.loop(sfx.slide, clamp(sliding / (500 * S)) * 0.22);
    sfx.loop(sfx.strain, strain > 0.5 ? (strain - 0.5) * 0.16 : 0);
    sfx.setStrainFreq(220 + strain * 520);
    if ((dmgFade += dtR) > 0.3) { // scratches fade slowly back into the page
      dmgFade = 0; const d = dmg.getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0);
      d.globalCompositeOperation = 'destination-out'; d.fillStyle = 'rgba(0,0,0,.035)'; d.fillRect(0, 0, dmg.width, dmg.height); d.globalCompositeOperation = 'source-over';
    }

    // ---- draw ----
    shake = Math.max(0, shake - dtR);
    const shx = shake > 0 ? Math.sin(now * 0.09) * shake * 9 * S : 0, shy = shake > 0 ? Math.cos(now * 0.11) * shake * 7 * S : 0;
    setM(DPR, 0, 0);
    g.clearRect(0, 0, W, H);
    setM(DPR, DPR * shx, DPR * shy);
    g.drawImage(poresLayer, 0, 0, W, H);
    g.drawImage(dmg, 0, 0, W, H);
    for (const h of hairs) drawUnder(h, now);
    for (const st of strands) drawLetters(st, st.px, st.white ? PALE : INK, 1, 0, 0, now);
    for (const h of hairs) {
      if ((h.state !== 'out' && h.state !== 'held') || !h.n) continue;
      const hot = h.state === 'held' ? clamp((clamp(h.tension) - 0.5) / 0.5) : 0;
      drawLetters(h, F * h.thick, h.white ? PALE : INK, h.appear, hot, h.gripS, now);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += 300 * S * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      g.globalAlpha = clamp(p.life / p.max * 1.6); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); g.globalAlpha = 1;
    }
    if (editing) drawEditOverlay();
    if (editing) cv.style.cursor = editDrag ? 'grabbing' : 'grab';
    else if (ptr && (ptr.mode === 'pull' || ptr.mode === 'drag')) cv.style.cursor = 'grabbing';
  }

  let io = null;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(entries => {
      for (const en of entries) visible = en.isIntersecting;
      if (visible && !raf && alive) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    io.observe(host);
  }
  raf = requestAnimationFrame(frame);

  function destroy() {
    if (!alive) return;
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    io?.disconnect(); sfx.close(); cv.remove();
  }

  return {
    destroy,
    restart: () => { previewPatch = -1; restart(0); },
    poke() { if (!alive) return; const r = host.getBoundingClientRect(); visible = r.bottom > 0 && r.top < innerHeight; if (visible) frame(performance.now()); },
    setEditTool(tool) {
      editTool = tool === 'move' ? 'move' : 'off'; editDrag = null;
      letGo();
      if (editTool === 'off' && previewPatch >= 0) { previewPatch = -1; restart(0); }
    },
    get editTool() { return editTool; },
    select(lineIdx) { editSel = lineIdx; },
    showPatch(idx) { if (!(idx >= 0)) return; previewPatch = idx; restart(idx); },
    debug: () => ({ level, W, H, F, S, pain, stun, finished, strands: strands.map(s => ({ text: s.text, n: s.n, grip: !!s.grip, maxY: Math.max(...s.nodes.map(p => p.y)) })), hairs: hairs.map(h => ({ type: h.type, state: h.state, ext: h.ext, L: h.L, text: h.text, cover: h.cover, hole: { x: h.hole.x, y: h.hole.y }, surface: !!h.surface, snags: h.snags.slice(), n: h.n, appear: h.appear })) })
  };
}
