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
//  4. SHAPES — arc, wave, hook, pin, loop, knot, coil, giant, and lines that
//              twist on themselves: spring (a run of curls), eight, fold.
//              A "bridge" is a curve of text already out, going in through two
//              pores close together: you pull the curve, and it comes out of
//              both sides at once.
//  5. EXTRAS — twin (a second line joined to the root of the first, following
//              it out as you pull), chain (drags its neighbours' tips out),
//              pale lines, lines deeper than they look, and short words already
//              standing out of pores (fuzz).
//  6. ROUNDS — sets of lines. With a camera direction, the rounds lie side by
//              side across a wider page and the view pans to the next set when
//              one is cleared; without one, the next set grows in where you are.
//
// What comes out is never redrawn as something else: every letter that leaves
// a pore is a node of a Verlet chain with PeelType's own letter physics
// (120 Hz, gravity 0.15, damping 0.97, 1.2× spacing, letters easing back
// upright, collision radius). Held, it hangs from your grip; finished, snapped
// or dropped, the same chain falls to the floor and can be picked up again.
//
// Config: pieceConfig.ingrown (schema: normalizeIngrownConfig). The game owns
// one full-bleed canvas and its rAF loop, and sleeps while off-screen.

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fr = (a, b) => a + (b - a) * Math.random();
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const ease = t => t * t * (3 - 2 * t);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash32(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const num = (v, d) => { const n = Number(v); return (v === '' || v === null || v === undefined || !Number.isFinite(n)) ? d : n; };
const words = v => (Array.isArray(v) ? v : String(v || '').split(/[\s,]+/)).map(s => String(s).trim()).filter(Boolean);
function rgbArr(hex) {
  const h = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return [74, 74, 74];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const rgbStr = (c, a) => (a === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);

export const INGROWN_LINE_TYPES = ['arc', 'wave', 'hook', 'pin', 'loop', 'knot', 'coil', 'giant', 'spring', 'eight', 'fold', 'bridge'];
export const INGROWN_CAMERA_MODES = ['right', 'left', 'down', 'up', 'none'];
const DEPTH = { arc: [0.15, 0.45], wave: [0.3, 0.6], hook: [0.3, 0.6], pin: [0.3, 0.6], loop: [0.4, 0.7], knot: [0.45, 0.75], coil: [0.45, 0.8], giant: [0.8, 1], spring: [0.35, 0.65], eight: [0.4, 0.7], fold: [0.3, 0.6], bridge: [0.2, 0.5] };
const POOL = [['arc', 22], ['wave', 18], ['hook', 12], ['pin', 12], ['loop', 8], ['spring', 8], ['fold', 7], ['bridge', 6], ['knot', 4], ['eight', 4], ['coil', 4]];
const CAM_DIR = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1], none: [0, 0] };

// PeelType letter physics (see physics.js): fixed 120 Hz ticks
const TICK = 120, DAMP = 0.97, ITER = 10, ANGLE_EASE = 0.94;
// letters hang 1.2× their advance apart (physics.constraintDistance), so material
// lengths along the text (s) become K× longer once they are out of a pore
const K = 1.2;

// ── Config ────────────────────────────────────────────────────────────────────
// Text fields can carry an English version next to the main (Spanish) one:
// line.textEn / line.twinEn, patch.fuzzWordsEn, config.textPoolEn. With lang 'en'
// the English one is used when present.
const pick = (raw, key, lang) => (lang === 'en' && raw[key + 'En'] !== undefined && String(raw[key + 'En']).trim() !== '' ? raw[key + 'En'] : raw[key]);
export function normalizeIngrownLine(raw = {}, lang = 'es') {
  const out = {
    text: String(pick(raw, 'text', lang) ?? '').replace(/\s+/g, ' ').trim(),
    type: INGROWN_LINE_TYPES.includes(raw.type) ? raw.type : 'arc',
    depth: raw.depth === '' || raw.depth === undefined || raw.depth === null ? null : clamp(num(raw.depth, 0.4), 0, 1),
    hidden: clamp(num(raw.hidden, 0), 0, 0.9),
    white: Boolean(raw.white),
    chain: Boolean(raw.chain),
    snags: clamp(Math.round(num(raw.snags, 0)), 0, 6),
    twin: String(pick(raw, 'twin', lang) ?? '').replace(/\s+/g, ' ').trim()
  };
  for (const k of ['x', 'y']) if (raw[k] !== '' && raw[k] !== null && raw[k] !== undefined && Number.isFinite(Number(raw[k]))) out[k] = clamp(Number(raw[k]), 0, 1);
  if (raw.angle !== '' && raw.angle !== null && raw.angle !== undefined && Number.isFinite(Number(raw.angle))) out.angle = Number(raw.angle);
  if (raw.onExtract) out.onExtract = raw.onExtract;
  return out;
}
export function normalizeIngrownPatch(raw = {}, lang = 'es') {
  const out = {
    fuzz: clamp(Math.round(num(raw.fuzz, 10)), 0, 80),
    fuzzWords: words(pick(raw, 'fuzzWords', lang)).join(' '),
    lines: (Array.isArray(raw.lines) ? raw.lines : []).map(l => normalizeIngrownLine(l, lang))
  };
  // where this round lies on the page, in screens (only with a camera direction); empty = next along the direction
  const ox = raw.offset?.x, oy = raw.offset?.y;
  if ((ox !== undefined && ox !== '' && Number.isFinite(Number(ox))) || (oy !== undefined && oy !== '' && Number.isFinite(Number(oy)))) out.offset = { x: num(ox, 0), y: num(oy, 0) };
  if (raw.onClear) out.onClear = raw.onClear;
  return out;
}
export function normalizeIngrownConfig(raw = {}, lang = 'es') {
  const patches = (Array.isArray(raw.patches) ? raw.patches : []).map(p => normalizeIngrownPatch(p, lang));
  const pool = pick(raw, 'textPool', lang);
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
    camera: INGROWN_CAMERA_MODES.includes(raw.camera) ? raw.camera : 'none',
    panTime: clamp(num(raw.panTime, 1.8), 0.3, 6),
    endless: Boolean(raw.endless),
    textPool: (Array.isArray(pool) ? pool : String(pool || '').split('\n')).map(s => String(s).trim()).filter(Boolean),
    patches: patches.length ? patches : [normalizeIngrownPatch({ lines: [{ text: 'una línea crecida hacia dentro', textEn: 'a line grown inward', type: 'arc' }] }, lang)],
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
    // letters knocking together: one short pre-made paper tap, pitch-varied
    tap(vol) {
      if (!S.ctx || vol <= 0) return;
      if (!S.tapBuf) {
        const n = Math.round(S.ctx.sampleRate * 0.03), b = S.ctx.createBuffer(1, n, S.ctx.sampleRate), d = b.getChannelData(0);
        let lp = 0; for (let i = 0; i < n; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.35; d[i] = lp * Math.exp(-i / (n * 0.18)); }
        S.tapBuf = b;
      }
      const src = S.ctx.createBufferSource(), gn = S.ctx.createGain();
      src.buffer = S.tapBuf; src.playbackRate.value = 0.75 + Math.random() * 0.6; gn.gain.value = vol;
      src.connect(gn); gn.connect(S.master); src.start();
    },
    close() { try { S.ctx?.close(); } catch (_) {} S.ctx = null; }
  };
}
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {} }

// ── Game ──────────────────────────────────────────────────────────────────────
export function createIngrownGame(host, rawConfig, hooks = {}) {
  const cfg = normalizeIngrownConfig(rawConfig || {}, hooks.lang === 'en' ? 'en' : 'es');
  const fontFamily = cfg.fontFamily ? `"${cfg.fontFamily}", Georgia, serif` : (hooks.fontFamily || "'EB Garamond', Georgia, serif");
  const INK = rgbArr(cfg.ink || hooks.ink || '#4a4a4a'), PALE = rgbArr(cfg.paleInk);
  const INK_S = rgbStr(INK), PALE_S = rgbStr(PALE);
  const panning = cfg.camera !== 'none';
  const sfx = makeSfx(cfg.sound, () => (hooks.isMuted ? hooks.isMuted() : false));

  const cv = document.createElement('canvas');
  cv.className = 'ingrown-canvas';
  host.appendChild(cv);
  const g = cv.getContext('2d');

  let W = 1, H = 1, DPR = 1, S = 1, F = 20, y0 = 60, yMax = 400;
  let level = 0, hairs = [], strands = [], scratches = [], pain = 0, stun = 0, shake = 0, clearT = -1, acc = 0, tickNo = 0;
  let ptr = null, alive = true, visible = true, raf = 0, last = performance.now(), sleepTicks = 0, finished = false;
  let editTool = 'off', editSel = -1, editDrag = null, previewPatch = -1;
  let poresTile = null;
  const rounds = new Map(); // lv → { x0, y0, x1, y1 } in world px
  const cam = { x: 0, y: 0 }; let pan = null;
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
    const rot = (px, py) => ({ x: px * Math.cos(a0Used) - py * Math.sin(a0Used), y: px * Math.sin(a0Used) + py * Math.cos(a0Used) });
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
    else if (type === 'fold') { // zig-zag: doubles back on itself twice
      const r = rr(1.15, 1.5) * f, seg = Math.max(2 * f, (L - 2 * Math.PI * r) / 3), turn = Math.PI * r;
      walk(L, d => { const ph = d % (seg + turn), n = Math.floor(d / (seg + turn)); return ph < seg ? 0 : (n % 2 ? -sg : sg) / r; });
    }
    else if (type === 'loop') {
      const r = Math.min(rr(2, 3) * f, L / 9), at = L * rr(0.25, 0.45), k0 = sg / rr(20, 50) / f, ease = f * 0.7;
      walk(L, d => lerp(k0, sg / r, clamp(Math.min(d - at, at + TAU * r - d) / ease))); flip = rnd() < 0.5;
    }
    else if (type === 'spring') { // a run of curls: a stretched-out spring seen from above
      const R = rr(1.45, 1.8) * f, adv = rr(0.42, 0.6) * f, raw = [];
      for (let t = 0, len = 0, px = 0, py = 0; len < L * 1.02 && t < 400; t += 0.05) {
        const qx = adv * t - R * Math.sin(t) * sg, qy = R * (1 - Math.cos(t));
        if (t > 0) len += Math.hypot(qx - px, qy - py);
        px = qx; py = qy; raw.push(rot(qx, qy));
      }
      pts = raw; flip = rnd() < 0.5;
    }
    else if (type === 'eight') { // twisted over itself into a figure eight
      const R = Math.max(2.4 * f, L / 6.1), raw = [];
      for (let t = 0, len = 0, px = 0, py = 0; len < L * 1.02 && t < 30; t += 0.02) {
        const qx = R * Math.sin(t), qy = R * 0.62 * Math.sin(2 * t) * sg;
        if (t > 0) len += Math.hypot(qx - px, qy - py);
        px = qx; py = qy; raw.push(rot(qx, qy));
      }
      pts = raw;
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
      const ph = rnd() * TAU, wob = rr(0.03, 0.07), wf = rr(0.55, 0.9), sq = rr(0.82, 0.95);
      for (let th = 0; th <= thMax;) {
        const r = lerp(r0, r1, th / thMax) * (1 + wob * Math.sin(th * wf + ph));
        pts.push(rot(Math.cos(th * sg) * r, Math.sin(th * sg) * r * sq)); th += st / r;
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
  const pathLen = pts => (pts.length - 1) * 3;
  function eachPts(h, fn) { fn(h.pts); if (h.ptsA) fn(h.ptsA); }
  function outOf(pts) {
    const a = pts[0], t = pts[Math.min(3, pts.length - 1)], dl = Math.hypot(a.x - t.x, a.y - t.y) || 1;
    return { x: (a.x - t.x) / dl, y: (a.y - t.y) / dl };
  }
  function setHole(h) {
    h.hole = h.pts[0]; h.out = outOf(h.pts); h.visL = pathLen(h.pts);
    if (h.ptsA) { h.holeA = h.ptsA[0]; h.visLA = pathLen(h.ptsA); }
    let x0 = 1e9, x1 = -1e9, ya = 1e9, yb = -1e9;
    eachPts(h, pts => pts.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); ya = Math.min(ya, p.y); yb = Math.max(yb, p.y); }));
    h.bb = { x0: x0 - F * 2, x1: x1 + F * 2, y0: ya - F * 2, y1: yb + F * 2 };
  }
  function setText(h, text) {
    const gl = glyphsOf(text, F * h.thick);
    h.text = text; h.glyphs = gl.glyphs; h.L = gl.L; h.nodes = new Array(gl.glyphs.length).fill(null); h.n = 0; h.i0 = 0;
  }
  function baseHair(spec, lv, rnd) {
    const rr = (a, b) => a + (b - a) * rnd();
    return {
      spec, idx: spec.idx, round: lv, type: spec.type, thick: spec.type === 'giant' ? 1.1 : rr(0.96, 1.04),
      ext: 0, sA: 0, gripS: 0, grip: null, cover: 1, white: spec.white, state: 'in', tension: 0,
      heal: 1, chain: spec.chain, snags: [], tick: 0, onExtract: spec.onExtract, appear: 1, joinAt: -1
    };
  }
  function makeLine(spec, x, y, lv) {
    if (spec.type === 'bridge') return makeBridge(spec, x, y, lv);
    const rnd = mulberry(spec.seed), rr = (a, b) => a + (b - a) * rnd();
    const h = baseHair(spec, lv, rnd);
    // a twin is joined to the root of the first line and follows it out
    const full = spec.twin ? `${spec.text} ${spec.twin}` : spec.text;
    setText(h, full);
    if (spec.twin) { const first = glyphsOf(spec.text, F * h.thick); h.joinAt = first.L + (h.glyphs[first.glyphs.length]?.w || F * 0.3) / 2; }
    const shaped = shapePath(spec.type, Math.max(F * 3, h.L * (1 - spec.hidden)), rnd, spec.angle);
    let pts = shaped.pts, rad = centre(pts);
    const maxRad = Math.max(60 * S, Math.min(W, yMax - y0) * 0.45);
    if (rad > maxRad) { // too big for the page: the rest runs on, out of sight
      const hole = pts[0]; let cut = pts.length;
      for (let i = 0; i < pts.length; i++) if (Math.hypot(pts[i].x - hole.x, pts[i].y - hole.y) > maxRad * 1.7) { cut = i; break; }
      pts = pts.slice(0, Math.max(8, cut)); rad = centre(pts);
    }
    pts.forEach(p => { p.x += x; p.y += y; });
    Object.assign(h, { x, y, pts, step: 3, rad: Math.max(rad, 26 * S), a0: shaped.a0, seed: rnd() * 100 });
    setHole(h);
    let depth = spec.depth ?? rr(DEPTH[spec.type][0], DEPTH[spec.type][1]);
    if (h.L > h.visL + F) depth = Math.max(depth, 0.5);
    if (spec.easy) depth = Math.min(depth, 0.3);
    h.depth = depth; h.res = (1 + depth * 1.25) * cfg.resistance;
    const gaps = h.glyphs.filter(gl => gl.ch === ' ' && gl.sc > h.L * 0.15 && gl.sc < h.L * 0.9 && Math.abs(gl.sc - h.joinAt) > F).map(gl => gl.sc);
    for (let i = 0; i < spec.snags && gaps.length; i++) {
      const want = h.L * (0.22 + 0.6 * (i + rnd() * 0.7) / spec.snags);
      let best = gaps[0]; gaps.forEach(s => { if (Math.abs(s - want) < Math.abs(best - want)) best = s; });
      if (!h.snags.includes(best)) h.snags.push(best);
    }
    if (h.joinAt > 0) h.snags.push(h.joinAt); // the first line's root holds until a firm tug
    h.snags.sort((a, b) => a - b);
    return h;
  }
  // A bridge: the middle of the text is out, as a curve between two pores close together;
  // the start of the text runs in through pore A, the end through pore B.
  function makeBridge(spec, x, y, lv) {
    const rnd = mulberry(spec.seed), rr = (a, b) => a + (b - a) * rnd();
    const h = baseHair(spec, lv, rnd);
    setText(h, spec.text);
    const ax = (spec.angle ?? rr(-25, 25)) * Math.PI / 180, ux = Math.cos(ax), uy = Math.sin(ax), gap = rr(1.1, 1.6) * F;
    const mid = h.L * rr(0.38, 0.55), arch = Math.max(F * 3.2, Math.min(h.L * 0.3, F * 5));
    h.sA = clamp(mid - arch / 2, F, h.L - F * 2); h.ext = clamp(mid + arch / 2, h.sA + F * 1.5, h.L - F);
    const A = { x: x - ux * gap / 2, y: y - uy * gap / 2 }, B = { x: x + ux * gap / 2, y: y + uy * gap / 2 };
    const angA = (ax + Math.PI) * 180 / Math.PI + rr(-35, 35), angB = ax * 180 / Math.PI + rr(-35, 35);
    const pa = shapePath(rnd() < 0.5 ? 'arc' : 'wave', Math.max(F * 2, h.sA), rnd, angA).pts;
    const pb = shapePath(['arc', 'wave', 'hook'][Math.floor(rnd() * 3)], Math.max(F * 2, (h.L - h.ext) * (1 - spec.hidden)), rnd, angB).pts;
    h.ptsA = pa.map(p => ({ x: p.x + A.x, y: p.y + A.y })); h.pts = pb.map(p => ({ x: p.x + B.x, y: p.y + B.y }));
    Object.assign(h, { bridge: true, x, y, step: 3, a0: ax * 180 / Math.PI, seed: rnd() * 100, cover: 0, state: 'out' });
    setHole(h);
    h.rad = Math.max(26 * S, ...[...h.pts, ...h.ptsA].map(p => Math.hypot(p.x - x, p.y - y)));
    h.depth = spec.depth ?? rr(DEPTH.bridge[0], DEPTH.bridge[1]); h.res = (1 + h.depth * 1.25) * cfg.resistance;
    // the curve outside: a bulge between the two pores, away from both channels
    let nx = -uy, ny = ux; const side = (h.ptsA[6]?.x ?? A.x) - A.x; if ((nx * (h.pts[6].x - B.x + side) + ny * ((h.pts[6].y - B.y) + ((h.ptsA[6]?.y ?? A.y) - A.y))) > 0) { nx = -nx; ny = -ny; }
    let i0 = 0; while (i0 < h.glyphs.length && h.glyphs[i0].sc < h.sA) i0++;
    let n = i0; while (n < h.glyphs.length && h.glyphs[n].sc <= h.ext) n++;
    const lam = K * (h.ext - h.sA), hump = Math.sqrt(Math.max(0, lam * lam - gap * gap)) / 2;
    for (let i = i0; i < n; i++) {
      const t = (h.glyphs[i].sc - h.sA) / (h.ext - h.sA), bx = lerp(A.x, B.x, t) + nx * hump * Math.sin(Math.PI * t), by = lerp(A.y, B.y, t) + ny * hump * Math.sin(Math.PI * t);
      h.nodes[i] = { x: bx, y: by, px: bx, py: by, a: 0 };
    }
    h.i0 = i0; h.n = n;
    return h;
  }
  function makeFuzz(x, y, r, word, lv) { // a short word already standing out of a pore
    const a = Math.PI + (r() - 0.5) * 0.7, px = F * 0.7;
    const gl = glyphsOf(word, px);
    const h = {
      surface: true, type: 'fuzz', round: lv, text: word, glyphs: gl.glyphs, L: gl.L, thick: 0.7, x, y, pts: [{ x, y }], step: 3, visL: 0, rad: 10 * S,
      ext: gl.L, sA: 0, gripS: 0, grip: null, cover: 0, depth: 0, res: 1, white: false, state: 'out', tension: 0, seed: r() * 100, heal: 1,
      chain: false, snags: [], tick: 0, appear: 1, nodes: new Array(gl.glyphs.length).fill(null), n: 0, i0: 0, stiff: true, joinAt: -1
    };
    h.hole = h.pts[0]; h.out = { x: Math.cos(a), y: Math.sin(a) }; h.bb = { x0: x - 60, x1: x + 60, y0: y - 30, y1: y + 30 };
    ensureNodes(h);
    return h;
  }

  // ── Rounds ──
  function generatedPatch(lv) {
    const rnd = mulberry(hash32('endless:' + lv + ':' + cfg.textPool.length));
    const n = clamp(2 + Math.floor(lv / 2), 2, 6), lines = [];
    const pool = cfg.textPool.length ? cfg.textPool : cfg.patches.flatMap(p => p.lines.map(l => l.text)).filter(Boolean);
    for (let i = 0; i < n && pool.length; i++) {
      let type = 'arc', q = rnd() * 100; for (const [t, w] of POOL) { type = t; if ((q -= w) < 0) break; }
      const a = rnd(), d = rnd();
      lines.push(normalizeIngrownLine({ text: pool[Math.floor(rnd() * pool.length)], type: lv > 3 && rnd() < 0.12 ? 'giant' : type, white: a < 0.08, chain: d < 0.12, snags: d > 0.7 ? 1 + Math.floor(rnd() * 2) : 0, twin: d > 0.12 && d < 0.2 && type !== 'bridge' ? pool[Math.floor(rnd() * pool.length)] : '' }));
    }
    const base = cfg.patches[lv % cfg.patches.length];
    return { fuzz: base.fuzz, fuzzWords: base.fuzzWords, lines };
  }
  function patchConfig(lv) {
    if (lv < cfg.patches.length) {
      const p = cfg.patches[lv];
      return cfg.endless && !p.lines.some(l => l.text) ? { ...generatedPatch(lv), offset: p.offset } : p;
    }
    return cfg.endless ? generatedPatch(lv) : null;
  }
  function roundOrigin(lv) { // in px, world space
    if (!panning) return { x: 0, y: 0 };
    const off = patchConfig(lv)?.offset, d = CAM_DIR[cfg.camera];
    const sx = off ? off.x : d[0] * lv, sy = off ? off.y : d[1] * lv;
    return { x: sx * W, y: sy * H };
  }
  function placeRegion(o) { const mg = F * 0.9 + 8; return { x0: o.x + mg, x1: o.x + W - mg, y0: o.y + y0 + mg * 0.5, y1: o.y + yMax }; }
  function fitInside(h, R) {
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    eachPts(h, pts => pts.forEach(q => { mnx = Math.min(mnx, q.x); mxx = Math.max(mxx, q.x); mny = Math.min(mny, q.y); mxy = Math.max(mxy, q.y); }));
    const dx = mxx - mnx > R.x1 - R.x0 ? (R.x0 + R.x1) / 2 - (mnx + mxx) / 2 : mnx < R.x0 ? R.x0 - mnx : mxx > R.x1 ? R.x1 - mxx : 0;
    const dy = mxy - mny > R.y1 - R.y0 ? (R.y0 + R.y1) / 2 - (mny + mxy) / 2 : mny < R.y0 ? R.y0 - mny : mxy > R.y1 ? R.y1 - mxy : 0;
    if (dx || dy) translateHair(h, dx, dy);
    return h;
  }
  function translateHair(h, dx, dy) {
    eachPts(h, pts => pts.forEach(q => { q.x += dx; q.y += dy; }));
    for (let i = h.i0 || 0; i < h.n; i++) { const p = h.nodes[i]; if (p) { p.x += dx; p.y += dy; p.px += dx; p.py += dy; } }
    h.x += dx; h.y += dy; setHole(h);
  }
  function rotateHair(h, da) {
    const c = Math.cos(da), s = Math.sin(da), rotP = p => { const x = p.x - h.x, y = p.y - h.y; p.x = h.x + x * c - y * s; p.y = h.y + x * s + y * c; };
    eachPts(h, pts => pts.forEach(rotP));
    for (let i = h.i0 || 0; i < h.n; i++) { const p = h.nodes[i]; if (p) { rotP(p); p.px = p.x; p.py = p.y; } }
    setHole(h);
  }
  function buildRound(lv, avoid = []) {
    const pc = patchConfig(lv);
    if (!pc) return null;
    const o = roundOrigin(lv);
    rounds.set(lv, { x0: o.x, y0: o.y, x1: o.x + W, y1: o.y + H });
    const out = [];
    const place = mulberry(hash32(`place:${lv}:${pc.lines.map(l => l.type).join('|')}`));
    const R = placeRegion(o);
    const specs = pc.lines.map((l, i) => ({ ...l, idx: i, seed: hash32(`${lv}:${i}:${l.type}`), easy: lv === 0 && i < 2 && l.depth == null })).filter(l => l.text);
    specs.filter(s => s.x !== undefined && s.y !== undefined).forEach(s => out.push(makeLine(s, o.x + lerp(0, W, s.x), o.y + lerp(y0, yMax, s.y), lv)));
    const sample = h => { const a = []; eachPts(h, pts => { for (let i = 0; i < pts.length; i += 4) a.push(pts[i]); }); return a; };
    const others = out.concat(avoid).filter(o2 => !o2.surface).map(o2 => sample(o2));
    specs.filter(s => s.x === undefined || s.y === undefined).forEach(spec => {
      let best = null, bestScore = 1e9;
      for (let tries = 0; tries < 90; tries++) {
        const h = fitInside(makeLine(spec, lerp(R.x0, R.x1, place()), lerp(R.y0, R.y1, place()), lv), R);
        const mine = sample(h);
        let score = 0;
        for (const ot of others) for (const q of mine) if (ot.some(r => Math.hypot(q.x - r.x, q.y - r.y) < F * 2.4)) score += 10;
        if (score < bestScore) { bestScore = score; best = h; }
        if (score === 0) break;
      }
      out.push(best); others.push(sample(best));
    });
    const pool = words(pc.fuzzWords).length ? words(pc.fuzzWords) : ['y', 'a', 'de', 'la', 'sí', 'no', 'tú', 'ya', 'yo', 'en'];
    const nf = Math.round(pc.fuzz * clamp(W * (yMax - y0) / (900 * 600), 0.5, 1.6));
    const wOff = Math.floor(place() * pool.length);
    for (let i = 0; i < nf; i++) for (let tries = 0; tries < 40; tries++) {
      const x = lerp(R.x0, R.x1, place()), y = lerp(R.y0 + F, R.y1, place());
      const near = others.some(ot => ot.some(q => Math.hypot(q.x - x, q.y - y) < F * 1.6));
      if (!near && out.concat(avoid).every(o2 => !o2.surface || Math.hypot(o2.x - x, o2.y - y) > 40 * S)) { out.push(makeFuzz(x, y, place, pool[(i + wOff) % pool.length], lv)); break; }
    }
    return out;
  }
  function ensureBuilt(lv) {
    if (rounds.has(lv)) return true;
    const r = buildRound(lv, hairs.filter(h => h.state !== 'done'));
    if (!r) return false;
    hairs.push(...r);
    return true;
  }
  function makePoresTile() { // the page's own pores: fine dots, nothing else
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    const x = c.getContext('2d'); x.scale(DPR, DPR);
    if (cfg.pores > 0) {
      const rr = mulberry(hash32('pores' + W + 'x' + H)), step = 23 * S / Math.sqrt(cfg.pores);
      for (let py = step / 2; py < H; py += step) for (let px = step / 2; px < W; px += step) {
        const qx = px + lerp(-7, 7, rr()) * S, qy = py + lerp(-7, 7, rr()) * S;
        x.fillStyle = rgbStr(INK, 0.06 + rr() * 0.07); x.beginPath(); x.ellipse(qx, qy, 1.25 * S, 0.9 * S, rr() * 3, 0, 7); x.fill();
      }
    }
    return c;
  }

  // ── Chains: the letters that are out, with PeelType's letter physics ──
  // A chain has glyphs, nodes[i0..n-1], pore (anchor at node n-1), poreA (bridges:
  // anchor at node i0) and grip. Anchors are material points { x, y, s }.
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
    const gl = c.glyphs, i0 = c.i0 || 0, N = c.n, s = c.grip.s;
    let j = i0 - 1; for (let i = i0; i < N; i++) if (gl[i].sc <= s) j = i;
    if (j >= i0) anchorTo(c.nodes[j], c.grip.x, c.grip.y, K * (s - gl[j].sc));
    if (j + 1 < N) anchorTo(c.nodes[j + 1], c.grip.x, c.grip.y, K * (gl[j + 1].sc - s));
  }
  function floorAt(x, y) {
    let best = Infinity, bottom = -Infinity;
    for (const r of rounds.values()) { bottom = Math.max(bottom, r.y1); if (x >= r.x0 - 2 && x <= r.x1 + 2 && r.y1 >= y - F) best = Math.min(best, r.y1); }
    return (best === Infinity ? (bottom === -Infinity ? H : bottom) : best) - 6;
  }
  let wallL = 0, wallR = 1;
  function tickChain(c) {
    const i0 = c.i0 || 0, N = c.n, nodes = c.nodes, gl = c.glyphs, gr = c.stiff ? 0 : 0.15 * cfg.gravity * (c.bridge ? 0.15 : 1); // a curve held by two pores keeps its shape
    let motion = 0;
    for (let i = i0; i < N; i++) {
      const p = nodes[i];
      let vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP; const sp = Math.hypot(vx, vy);
      if (sp > 40) { vx *= 40 / sp; vy *= 40 / sp; }
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + gr;
      if (p.a) p.a = Math.abs(p.a) < 1e-3 ? 0 : wrapA(p.a) * ANGLE_EASE;
      motion += sp;
    }
    for (let it = 0; it < ITER; it++) {
      for (let i = i0; i < N - 1; i++) link(nodes[i], nodes[i + 1], K * (gl[i + 1].sc - gl[i].sc));
      if (c.pore && N > i0) anchorTo(nodes[N - 1], c.pore.x, c.pore.y, K * Math.max(0, c.pore.s - gl[N - 1].sc));
      if (c.poreA && N > i0) anchorTo(nodes[i0], c.poreA.x, c.poreA.y, K * Math.max(0, gl[i0].sc - c.poreA.s));
      if (c.grip) pinGrip(c);
    }
    if (!c.stiff) collide(c);
    const p0 = nodes[i0];
    const fl = (p0 ? floorAt(p0.x, p0.y) : H - 6) - F * 0.45, wl = wallL + F * 0.4, wr = wallR - F * 0.4;
    for (let i = i0; i < N; i++) {
      const p = nodes[i];
      if (p.y > fl) { if (p.y - p.py > impact) impact = p.y - p.py; p.y = fl; p.py = fl; p.px = p.x - (p.x - p.px) * 0.5; }
      if (p.x < wl) { p.x = wl; p.px = wl; } else if (p.x > wr) { p.x = wr; p.px = wr; }
    }
    return motion;
  }
  // letters don't pass through each other (PeelType's collision radius), so a dropped
  // strand lies on the floor instead of collapsing into one blot. The grid is reused
  // tick after tick: nothing is allocated here.
  const radOf = gl => clamp(Math.max(gl.w * 0.45, F * 0.27), 2.5, F * 0.36);
  const grid = new Map(); let gridT = -1;
  let impact = 0, lastTap = 0; // hardest knock this frame (px/tick), for the tap sound
  function gridAdd(c) {
    const cell = F;
    for (let i = c.i0 || 0; i < c.n; i++) {
      const p = c.nodes[i]; p.c = c; p.i = i; p.r = radOf(c.glyphs[i]);
      const k = Math.floor(p.x / cell) * 65536 + Math.floor(p.y / cell);
      let b = grid.get(k); if (!b) grid.set(k, b = []); b.push(p);
    }
  }
  function buildGrid() {
    for (const b of grid.values()) b.length = 0;
    if (grid.size > 4000) grid.clear();
    for (const st of strands) gridAdd(st);
    for (const h of hairs) if ((h.state === 'out' || h.state === 'held') && h.n && !h.stiff) gridAdd(h);
  }
  function collide(c) {
    if (gridT !== tickNo) { gridT = tickNo; buildGrid(); }
    const cell = F;
    for (let i = c.i0 || 0; i < c.n; i++) {
      const p = c.nodes[i], cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const b = grid.get(gx * 65536 + gy); if (!b) continue;
        for (let m = 0; m < b.length; m++) {
          const q = b[m];
          if (q === p || (q.c === c && Math.abs(q.i - i) < 2)) continue;
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), rr = p.r + q.r;
          if (d >= rr || d < 1e-4) continue;
          const k = (rr - d) / d * 0.5;
          if (q.c !== c) { const iv = Math.abs(p.x - p.px - q.x + q.px) + Math.abs(p.y - p.py - q.y + q.py); if (iv > impact) impact = iv; } // only strand against strand: a strand's own letters jostle all the time
          p.x -= dx * k; p.y -= dy * k; q.x += dx * k; q.y += dy * k;
          if (q.c !== c) q.c.still = 0; // a resting strand that gets bumped wakes up
        }
      }
    }
  }
  // letters that cross a pore become nodes, placed between the pore and the letter before them
  function placeNew(i, hole, out, d, neighbour) {
    let ux = out.x, uy = out.y, lim = d;
    if (neighbour) { const dx = neighbour.x - hole.x, dy = neighbour.y - hole.y, l = Math.hypot(dx, dy); if (l > 1e-3) { ux = dx / l; uy = dy / l; lim = Math.min(d, l); } }
    const x = hole.x + ux * lim, y = hole.y + uy * lim;
    return { x, y, px: x, py: y, a: 0 };
  }
  function ensureNodes(h) { // pore B side (every line has one): material at the pore = ext
    let k = h.n; while (k < h.glyphs.length && h.glyphs[k].sc <= h.ext) k++;
    const inA = h.surface ? 0 : pointOn(h.pts, 0).a;
    for (let i = h.n; i < k; i++) {
      h.nodes[i] = placeNew(i, h.hole, h.out, K * Math.max(0, h.ext - h.glyphs[i].sc), i > (h.i0 || 0) ? h.nodes[i - 1] : null);
      h.nodes[i].a = inA;
    }
    h.n = Math.max(h.n, k);
  }
  function ensureNodesA(h) { // pore A side of a bridge: material at the pore = sA
    const outA = outOf(h.ptsA), inA = pointOn(h.ptsA, 0).a + Math.PI;
    while (h.i0 > 0 && h.glyphs[h.i0 - 1].sc >= h.sA) {
      const i = h.i0 - 1;
      h.nodes[i] = placeNew(i, h.holeA, outA, K * Math.max(0, h.glyphs[i].sc - h.sA), h.nodes[i + 1]);
      h.nodes[i].a = inA; h.i0 = i;
    }
  }
  function chainOf(h) {
    h.pore = { x: h.hole.x, y: h.hole.y, s: h.ext };
    h.poreA = h.bridge ? { x: h.holeA.x, y: h.holeA.y, s: h.sA } : null;
    h.grip = h.state === 'held' && ptr ? { x: ptr.x, y: ptr.y, s: h.gripS } : null;
    return h;
  }
  function freeStrand(glyphs, nodes, white, px, joinAt = -1) { // a chain nothing holds any more: it falls
    const st = { glyphs, nodes, n: nodes.length, i0: 0, pore: null, poreA: null, grip: null, white, px, still: 0, joinAt, text: glyphs.map(q => q.ch).join('') };
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
    for (const a of list) { try { hooks.runAction(a, { x: x - cam.x, y: y - cam.y }); } catch (e) { console.warn('ingrown action failed', e); } }
  }
  function pointOn(pts, u) {
    if (pts.length < 2) return { x: pts[0].x, y: pts[0].y, a: 0 };
    const f = clamp(u / 3, 0, pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), t = f - i;
    const a = pts[i], b = pts[i + 1];
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), a: Math.atan2(b.y - a.y, b.x - a.x) };
  }
  function scratch(x1, y1, x2, y2, w, col) {
    scratches.push({ x1, y1, x2, y2, w, col, t: 0 });
    if (scratches.length > 900) scratches.splice(0, scratches.length - 900);
  }

  // ── Input (world coordinates: the view looks at cam.x, cam.y) ──
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left + cam.x, y: e.clientY - r.top + cam.y }; };
  const digR = () => Math.max(18 * S, F * 0.95);
  const live = h => h.state !== 'done' && h.appear > 0.5;
  function inNear(x, y) { let b = null, bd = digR(); for (const h of hairs) { if (h.state !== 'in' || !live(h)) continue; const d = Math.hypot(h.hole.x - x, h.hole.y - y); if (d < bd) { bd = d; b = h; } } return b; }
  function nearestNode(c, x, y, r) { let j = -1, bd = r; for (let i = c.i0 || 0; i < c.n; i++) { const p = c.nodes[i], d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; j = i; } } return { j, d: bd }; }
  function grabbable(x, y) { // an out line (its letters or its pores), or a fallen strand
    let best = null, bd = 1e9;
    for (const h of hairs) {
      if (h.state !== 'out' || !live(h)) continue;
      if (!h.surface) {
        const dp = Math.hypot(h.hole.x - x, h.hole.y - y); if (dp < 24 * S && dp < bd) { bd = dp; best = { h, s: h.ext }; }
        if (h.bridge) { const da = Math.hypot(h.holeA.x - x, h.holeA.y - y); if (da < 24 * S && da < bd) { bd = da; best = { h, s: h.sA }; } }
      }
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
    ptr = { id: e.pointerId, sx: t.x - cam.x, sy: t.y - cam.y, x: t.x, y: t.y, px: t.x, py: t.y, mode: null, sc: 0, hair: null, strand: null };
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
    ptr.sx = t.x - cam.x; ptr.sy = t.y - cam.y; ptr.x = t.x; ptr.y = t.y;
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
    const h = inNear(p.x, p.y);
    const nearAny = hairs.some(o => !o.surface && o.state !== 'done' && (Math.hypot(o.hole.x - p.x, o.hole.y - p.y) < 32 * S || (o.bridge && Math.hypot(o.holeA.x - p.x, o.holeA.y - p.y) < 32 * S)));
    if (h) {
      h.cover -= m / ((70 + 130 * h.depth) * S * cfg.openEffort);
      scratch(p.px, p.py, p.x, p.y, 2.2 * S, 'rgba(200,90,90,');
      p.sc += m;
      if (p.sc > 14 * S) { p.sc = 0; sfx.burst(fr(2400, 3600), 0.03, 0.16, 0, 2); }
      if (h.cover <= 0) { popOut(h); sfx.peek(); vibrate(8); }
    } else if (!nearAny && cfg.painRate > 0) {
      pain += m * 0.0013 / S * cfg.painRate;
      scratch(p.px, p.py, p.x, p.y, 1.6 * S, 'rgba(196,48,56,');
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
    const st = freeStrand(h.glyphs, h.nodes.slice(h.i0 || 0, h.n), h.white, F * h.thick, h.joinAt);
    puff(h.hole.x, h.hole.y, big ? 14 : 6, 'rgba(196,84,84,.5)');
    sfx.pop(big); vibrate(big ? [20, 30, 60] : 18); shake = big ? 0.18 : 0.06;
    pain = Math.max(0, pain - 0.08);
    fire(h.onExtract, h.hole.x, h.hole.y);
    if (ptr && ptr.hair === h) holdStrand(st, gripS);
    if (h.chain) {
      hairs.forEach(o => { if (o !== h && o.state === 'in' && !o.surface && live(o) && Math.hypot(o.x - h.x, o.y - h.y) < 210 * S) popOut(o); });
      sfx.peek();
    }
    h.state = 'done'; h.heal = 1;
  }
  function snapHair(h) { // breaks at the last letter fully out: that part falls, the rest sinks back
    let cut = 0; while (cut < h.n && h.glyphs[cut].sc + h.glyphs[cut].w / 2 <= h.ext) cut++;
    const piece = h.glyphs.slice(0, cut), pieceNodes = h.nodes.slice(0, cut);
    const cutAt = cut ? h.glyphs[cut - 1].sc + h.glyphs[cut - 1].w / 2 : 0, gripS = h.gripS;
    const st = piece.length ? freeStrand(piece, pieceNodes, h.white, F * h.thick) : null;
    const rest = h.glyphs.slice(cut).map(q => q.ch).join('').trimStart();
    const snags = h.snags.map(s => s - cutAt), join = h.joinAt - cutAt;
    setText(h, rest);
    h.snags = snags.filter(s => s > F && s < h.L - F); h.joinAt = join > 0 ? join : -1;
    h.ext = 0; h.tension = 0; h.tick = 0; h.cover = 0.45; h.state = 'in'; h.grip = null;
    pain += 0.2; shake = 0.2;
    sfx.snap(); vibrate(30);
    if (ptr && ptr.hair === h) { if (st && gripS <= cutAt) holdStrand(st, gripS); else { ptr.hair = null; ptr.mode = null; } }
    if (h.glyphs.length < 2) h.state = 'done';
    if (pain >= 1) ouch();
  }

  // Bridges turn into ordinary lines once one of their ends is out or snaps.
  function asSingle(h, text, pts, ext, outNodes, extra = {}) { // rebuild h (in place) as a one-pore line
    setText(h, text);
    h.bridge = false; h.ptsA = null; h.holeA = null; h.poreA = null; h.sA = 0; h.pts = pts; h.ext = ext; h.snags = []; h.joinAt = -1;
    outNodes.forEach((p, i) => { h.nodes[i] = p; }); h.n = outNodes.length; h.i0 = 0;
    setHole(h); Object.assign(h, extra);
    return h;
  }
  const reversedText = gl => gl.map(q => q.ch).reverse().join('');
  function bridgeEndOutA(h) { // the start of the text has left pore A: a plain line in pore B
    ensureNodes(h);
    h.bridge = false; h.ptsA = null; h.holeA = null; h.poreA = null; h.i0 = 0; h.sA = 0;
    setHole(h);
  }
  function bridgeEndOutB(h) { // the end has left pore B: a plain line in pore A, read from the far end
    const gl = h.glyphs, nodes = [];
    for (let i = h.n - 1; i >= h.i0; i--) nodes.push(h.nodes[i]);
    const L = h.L, gripS = L - h.gripS, held = h.state === 'held';
    asSingle(h, reversedText(gl), h.ptsA, L - h.sA, nodes, { gripS, noBead: true, state: held ? 'held' : 'out' });
    puff(h.hole.x, h.hole.y, 5, 'rgba(196,84,84,.5)');
  }
  function snapBridge(h, side) {
    const gl = h.glyphs, gripS = h.gripS, held = ptr && ptr.hair === h;
    let other;
    if (side === 'A') { // breaks at pore A: the curve stays on in pore B, the start sinks back into A
      let cut = h.i0; while (cut < h.n && gl[cut].sc - gl[cut].w / 2 < h.sA) cut++;
      const start = cut < gl.length ? gl[cut].sc - gl[cut].w / 2 : h.L;
      const buried = gl.slice(0, cut);
      other = buried.length > 1 ? asSingle({ ...h, spec: h.spec }, reversedText(buried), h.ptsA, 0, [], { state: 'in', cover: 0.45, noBead: true, gripS: 0 }) : null;
      const outNodes = h.nodes.slice(cut, h.n);
      asSingle(h, gl.slice(cut).map(q => q.ch).join(''), h.pts, h.ext - start, outNodes, { gripS: Math.max(0, gripS - start), state: held ? 'held' : 'out' });
    } else { // breaks at pore B: the curve stays on in pore A, the end sinks back into B
      let cut = h.n - 1; while (cut >= h.i0 && gl[cut].sc + gl[cut].w / 2 > h.ext) cut--;
      const end = cut >= 0 ? gl[cut].sc + gl[cut].w / 2 : 0;
      const buried = gl.slice(cut + 1);
      other = buried.length > 1 ? asSingle({ ...h, spec: h.spec }, buried.map(q => q.ch).join(''), h.pts, 0, [], { state: 'in', cover: 0.45, gripS: 0 }) : null;
      const outNodes = []; for (let i = cut; i >= h.i0; i--) outNodes.push(h.nodes[i]);
      asSingle(h, reversedText(gl.slice(0, cut + 1)), h.ptsA, end - h.sA, outNodes, { gripS: Math.max(0, end - gripS), state: held ? 'held' : 'out', noBead: true });
    }
    if (other) { other.nodes = new Array(other.glyphs.length).fill(null); other.n = 0; hairs.push(other); }
    pain += 0.2; shake = 0.2; sfx.snap(); vibrate(30);
    if (held) letGo();
    if (pain >= 1) ouch();
  }

  // ── Drawing ──
  let curM = { a: 1, e: 0, f: 0 }, glyphPx = -1;
  function setM(a, e, f) { curM = { a, e, f }; glyphPx = -1; g.setTransform(a, 0, 0, a, e, f); g.globalAlpha = 1; }
  function glyph(ch, x, y, ang, px, col, alpha = 1) {
    if (ch === ' ' || alpha <= 0.01) return;
    if (ang) { const c = Math.cos(ang) * curM.a, s = Math.sin(ang) * curM.a; g.setTransform(c, s, -s, c, curM.a * x + curM.e, curM.a * y + curM.f); }
    else g.setTransform(curM.a, 0, 0, curM.a, curM.a * x + curM.e, curM.a * y + curM.f);
    if (px !== glyphPx) { g.font = font(px); glyphPx = px; g.textAlign = 'center'; g.textBaseline = 'middle'; }
    g.globalAlpha = alpha; g.fillStyle = col; g.fillText(ch, 0, 0);
  }
  function drawPore(x, y, open, col, ap) {
    const r = (open ? 5 : 1.6) * S;
    g.fillStyle = open ? 'rgba(186,70,74,.55)' : rgbStr(col, 0.5 * ap);
    g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0.4, 0, 7); g.fill();
  }
  function drawUnder(h, now) {
    const ap = h.appear;
    if (h.surface) { // just its pore
      if (h.state !== 'done') { g.fillStyle = rgbStr(INK, 0.4 * ap); g.beginPath(); g.arc(h.hole.x, h.hole.y, 1.4 * S, 0, 7); g.fill(); }
      else if (h.heal > 0) { g.fillStyle = `rgba(196,84,84,${0.3 * h.heal})`; g.beginPath(); g.arc(h.hole.x, h.hole.y, 1.8 * S, 0, 7); g.fill(); }
      return;
    }
    if (h.state === 'done') {
      if (h.heal <= 0) return;
      g.fillStyle = `rgba(196,84,84,${0.4 * h.heal})`; g.beginPath(); g.arc(h.hole.x, h.hole.y, 3.2 * S, 0, 7); g.fill();
      return;
    }
    const col = h.white ? PALE : INK, colS = h.white ? PALE_S : INK_S, aTip = lerp(0.6, 0.38, h.depth), aRoot = lerp(0.2, 0.08, h.depth);
    const breathe = h.state === 'in' ? 0.88 + 0.12 * Math.sin(now * 0.0025 + h.seed) : 1;
    const px = F * h.thick, base = curM;
    g.lineCap = 'round';
    // channel B (every line): text beyond ext, from the pore inward
    const rem = h.L - h.ext, vis = Math.min(rem, h.visL), deep = rem > h.visL;
    for (let i = h.n; i < h.glyphs.length; i++) {
      const gl = h.glyphs[i], u = gl.sc - h.ext;
      if (u < 0) continue; if (u > vis) break;
      const mid = u / Math.max(1, h.visL), sink = deep ? clamp((1 - mid) / 0.4) : 1;
      let a = lerp(aTip, aRoot, mid) * sink * ap;
      if (u < F * 1.6) a = Math.min(1, a * (h.cover < 1 ? lerp(1, 1.6, 1 - h.cover) : breathe)); // the dark tip
      const p = pointOn(h.pts, u);
      glyph(gl.ch, p.x, p.y, p.a, px, colS, a);
    }
    // channel A (bridges): text before sA, from pore A inward, read backwards
    if (h.bridge) {
      for (let i = h.i0 - 1; i >= 0; i--) {
        const gl = h.glyphs[i], u = h.sA - gl.sc;
        if (u > h.visLA) break;
        const p = pointOn(h.ptsA, u);
        glyph(gl.ch, p.x, p.y, p.a + Math.PI, px, colS, lerp(aTip, aRoot, u / Math.max(1, h.visLA)) * ap);
      }
    }
    setM(base.a, base.e, base.f);
    drawPore(h.hole.x, h.hole.y, h.cover < 1, col, ap);
    if (h.bridge) drawPore(h.holeA.x, h.holeA.y, true, col, ap);
  }
  function drawLetters(c, px, colS, col, alpha, hot, gripS, now) {
    const base = curM, i0 = c.i0 || 0;
    for (let i = i0; i < c.n; i++) {
      const p = c.nodes[i], gl = c.glyphs[i];
      const strained = hot > 0 && (c.bridge ? true : gl.sc > gripS); // between your grip and the pore
      const color = strained ? rgbStr([lerp(col[0], 196, hot), lerp(col[1], 52, hot), lerp(col[2], 58, hot)].map(Math.round)) : colS;
      glyph(gl.ch, p.x + (strained ? Math.sin(now * 0.09 + i) * hot * 1.6 * S : 0), p.y, p.a, px, color, alpha);
    }
    setM(base.a, base.e, base.f);
  }

  // ── Editor: move a line (drag its body) or turn it (drag its tip) ──
  const previewIdx = () => (previewPatch >= 0 ? previewPatch : level);
  const editLines = () => hairs.filter(h => !h.surface && h.round === previewIdx());
  function editDown(e, w) {
    let best = null, bd = 1e9, mode = 'move';
    for (const h of editLines()) {
      const dh = Math.hypot(h.hole.x - w.x, h.hole.y - w.y);
      if (dh < 14 * S && dh < bd) { bd = dh; best = h; mode = 'turn'; continue; }
      eachPts(h, pts => { for (let i = 0; i < pts.length; i += 2) { const d = Math.hypot(pts[i].x - w.x, pts[i].y - w.y); if (d < F && d < bd) { bd = d; best = h; mode = 'move'; } } });
      for (let i = h.i0 || 0; i < h.n; i++) { const p = h.nodes[i], d = Math.hypot(p.x - w.x, p.y - w.y); if (d < F && d < bd) { bd = d; best = h; mode = 'move'; } }
    }
    if (!best) { editSel = -1; hooks.onEditSelect?.(previewIdx(), -1); return; }
    editSel = best.idx; hooks.onEditSelect?.(previewIdx(), best.idx);
    editDrag = { id: e.pointerId, h: best, mode, sx: w.x, sy: w.y, ox: best.x, oy: best.y, ang0: Number.isFinite(best.spec.angle) ? best.spec.angle : best.a0, turned: 0 };
  }
  function editMove(e, t) {
    if (!editDrag || e.pointerId !== editDrag.id) return;
    const d = editDrag, h = d.h, r = rounds.get(h.round) || { x0: 0, y0: 0 };
    if (d.mode === 'move') {
      const nx = clamp(d.ox + t.x - d.sx, r.x0, r.x0 + W), ny = clamp(d.oy + t.y - d.sy, r.y0 + y0, r.y0 + yMax);
      translateHair(h, nx - h.x, ny - h.y);
    } else {
      const da = Math.atan2(t.y - h.y, t.x - h.x) - Math.atan2(h.hole.y - h.y, h.hole.x - h.x);
      rotateHair(h, da); d.turned += da;
    }
  }
  function editUp(e) {
    if (!editDrag || (e && e.pointerId !== editDrag.id)) return;
    const d = editDrag, h = d.h, r = rounds.get(h.round) || { x0: 0, y0: 0 }; editDrag = null;
    if (d.mode === 'move' && Math.hypot(h.x - d.ox, h.y - d.oy) < 2) return; // a click: selection only
    const change = { x: +((h.x - r.x0) / W).toFixed(4), y: +((h.y - r.y0 - y0) / Math.max(1, yMax - y0)).toFixed(4) };
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
      eachPts(h, pts => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokeStyle = sel ? 'rgba(31,111,82,.28)' : 'rgba(74,74,74,.1)'; g.lineWidth = F * 1.3; g.stroke(); });
      g.fillStyle = sel ? '#1f6f52' : '#4a4a4a'; g.beginPath(); g.arc(h.hole.x, h.hole.y, 8 * S, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = `700 ${Math.round(9 * S)}px Manrope, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(h.idx + 1), h.hole.x, h.hole.y + 0.5);
    }
  }

  // ── Rounds flow ──
  function restart(lv = 0) {
    level = lv; strands = []; scratches = []; pain = 0; stun = 0; clearT = -1; ptr = null; finished = false; parts.length = 0; acc = 0;
    hairs = []; rounds.clear();
    if (!ensureBuilt(level)) { level = 0; ensureBuilt(0); }
    if (panning) ensureBuilt(level + 1); // the next set is already there, out of view
    const o = roundOrigin(level); cam.x = o.x; cam.y = o.y; pan = null;
    updateWalls();
  }
  function updateWalls() { wallL = Infinity; wallR = -Infinity; for (const r of rounds.values()) { wallL = Math.min(wallL, r.x0); wallR = Math.max(wallR, r.x1); } if (!Number.isFinite(wallL)) { wallL = 0; wallR = W; } }
  function nextRound() {
    if (panning) {
      if (!ensureBuilt(level + 1)) { if (!finished) { finished = true; fire(cfg.onComplete, cam.x + W / 2, cam.y + yMax / 2); } return; }
      level++; ensureBuilt(level + 1); updateWalls();
      const o = roundOrigin(level); pan = { fx: cam.x, fy: cam.y, tx: o.x, ty: o.y, t: 0 };
      return;
    }
    // no camera: the next lines grow in where there is room; fuzz left behind stays
    const keep = hairs.filter(h => h.state !== 'done' || h.heal > 0);
    rounds.delete(level + 1);
    const np = buildRound(level + 1, keep);
    if (!np) { if (!finished) { finished = true; fire(cfg.onComplete, W / 2, yMax / 2); } return; }
    np.forEach(h => { h.appear = 0; });
    level++; hairs = keep.concat(np);
  }

  // ── Loop ──
  function resize() {
    const want = cfg.height > 0 ? cfg.height : Math.max(420, window.innerHeight);
    if (Math.abs(host.clientHeight - want) > 1) host.style.height = `${want}px`;
    const nw = host.clientWidth, nh = host.clientHeight;
    if (nw < 2 || nh < 2) return false;
    if (nw === W && nh === H && poresTile) return true;
    W = nw; H = nh; DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    S = clamp(Math.min(W, H) / 500, 0.8, 1.4);
    F = cfg.fontSize * clamp(Math.min(W, H) / 700, 0.72, 1.15);
    y0 = Math.max(64, H * 0.09); yMax = H * 0.7;
    poresTile = makePoresTile();
    restart(previewPatch >= 0 ? previewPatch : level);
    return true;
  }
  const inView = bb => bb.x1 > cam.x && bb.x0 < cam.x + W && bb.y1 > cam.y && bb.y0 < cam.y + H;
  function frame(now) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (!alive) return;
    if (!host.isConnected) { destroy(); return; }
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    raf = requestAnimationFrame(frame);
    if (!visible) {
      if (++sleepTicks % 30 === 0) { const r = host.getBoundingClientRect(); visible = r.bottom > 0 && r.top < innerHeight; }
      if (!visible) return;
    }
    if (!resize()) return;
    if (editTool !== 'off' && hooks.isEditor && !hooks.isEditor()) { editTool = 'off'; editDrag = null; if (previewPatch >= 0) { previewPatch = -1; restart(0); } hooks.onEditToolOff?.(); }
    const editing = editTool !== 'off';
    let sliding = 0, strain = 0;

    // the camera glides to the next set
    if (pan) {
      pan.t = Math.min(1, pan.t + dt / cfg.panTime);
      const k = ease(pan.t); cam.x = lerp(pan.fx, pan.tx, k); cam.y = lerp(pan.fy, pan.ty, k);
      if (pan.t >= 1) pan = null;
      if (ptr) { ptr.x = ptr.sx + cam.x; ptr.y = ptr.sy + cam.y; }
    }

    if (!editing) {
      pain = Math.max(0, pain - 0.03 * dt);
      if (stun > 0) stun -= dt;
      for (const h of hairs) if (h.appear < 1) h.appear = Math.min(1, h.appear + dt / 1.4);
      if (ptr && ptr.mode === 'pull') pullStep(ptr.hair, dt, v => { sliding = Math.max(sliding, v.sliding); strain = Math.max(strain, v.strain); });
      if (ptr && ptr.mode === 'drag' && ptr.strand?.grip) { ptr.strand.grip.x = ptr.x; ptr.strand.grip.y = ptr.y; }
      const open = hairs.some(h => !h.surface && h.round === level && h.state !== 'done');
      if (!open && clearT < 0 && !finished && !pan && hairs.some(h => !h.surface && h.round === level)) clearT = 1.1;
      if (clearT >= 0) {
        clearT -= dt;
        if (clearT < 0) { fire(patchConfig(level)?.onClear, cam.x + W / 2, cam.y + yMax / 2); sfx.beep(660, 990, 0.18, 'triangle', 0.16); nextRound(); }
      }
      // physics at PeelType's fixed rate
      acc += dt * TICK; let ticks = 0;
      while (acc >= 1 && ticks < 10) {
        acc -= 1; ticks++; tickNo++;
        for (const h of hairs) if ((h.state === 'out' || h.state === 'held') && h.n && (h.state === 'held' || !h.stiff || tickNo % 8 === 0)) tickChain(chainOf(h));
        for (const st of strands) {
          if (!st.grip && st.still > TICK) continue; // resting on the floor
          const m = tickChain(st);
          st.still = !st.grip && m < 0.02 * st.n ? st.still + 1 : 0;
        }
      }
      if (acc > 3) acc = 0;
      if (impact > 2.2 && now - lastTap > 70) { lastTap = now; sfx.tap(Math.min(0.08, 0.012 + (impact - 2.2) * 0.009)); }
      impact = 0;
      for (const h of hairs) if (h.state === 'done' && h.heal > 0) h.heal = Math.max(0, h.heal - dt * 0.25);
      for (let i = scratches.length - 1; i >= 0; i--) if ((scratches[i].t += dt) > 8) scratches.splice(i, 1); // scratches fade back into the page
    }
    sfx.syncMute();
    sfx.loop(sfx.slide, clamp(sliding / (500 * S)) * 0.22);
    sfx.loop(sfx.strain, strain > 0.5 ? (strain - 0.5) * 0.16 : 0);
    sfx.setStrainFreq(220 + strain * 520);

    // ---- draw ----
    shake = Math.max(0, shake - dt);
    const shx = shake > 0 ? Math.sin(now * 0.09) * shake * 9 * S : 0, shy = shake > 0 ? Math.cos(now * 0.11) * shake * 7 * S : 0;
    setM(DPR, 0, 0);
    g.clearRect(0, 0, W, H);
    // pores tile the page, fixed to the world
    const tx = Math.floor(cam.x / W) * W - cam.x, ty = Math.floor(cam.y / H) * H - cam.y;
    for (let ix = 0; ix < 2; ix++) for (let iy = 0; iy < 2; iy++) g.drawImage(poresTile, tx + ix * W + shx, ty + iy * H + shy, W, H);
    setM(DPR, DPR * (shx - cam.x), DPR * (shy - cam.y));
    g.lineCap = 'round';
    for (const s of scratches) { g.strokeStyle = s.col + (0.3 * clamp(1 - s.t / 8)) + ')'; g.lineWidth = s.w; g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.stroke(); }
    for (const h of hairs) if (inView(h.bb)) drawUnder(h, now);
    for (const st of strands) drawLetters(st, st.px, st.white ? PALE_S : INK_S, st.white ? PALE : INK, 1, 0, 0, now);
    for (const h of hairs) {
      if ((h.state !== 'out' && h.state !== 'held') || h.n <= (h.i0 || 0)) continue;
      const hot = h.state === 'held' ? clamp((clamp(h.tension) - 0.5) / 0.5) : 0;
      drawLetters(h, h.surface ? F * 0.7 : F * h.thick, h.white ? PALE_S : INK_S, h.white ? PALE : INK, h.appear, hot, h.gripS, now);
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
  // pulling: the text slides out at a rate set by how far it is stretched
  function pullStep(h, dt, report) {
    const snapT = 70 * S * cfg.snapTolerance;
    if (h.surface) { if (Math.hypot(ptr.x - h.hole.x, ptr.y - h.hole.y) > K * (h.ext - h.gripS) + 18 * S) pluck(h); return; }
    const D = Math.hypot(ptr.x - h.hole.x, ptr.y - h.hole.y);
    const root = h.L - Math.min(6 * S, h.L * 0.2), stop = h.snags.length ? Math.min(h.snags[0], root) : root;
    if (h.bridge) { // a curve between two pores: each side slides out on its own stretch
      const DA = Math.hypot(ptr.x - h.holeA.x, ptr.y - h.holeA.y);
      const tB = D - K * (h.ext - h.gripS), tA = DA - K * (h.gripS - h.sA);
      h.tension = Math.max(tA, tB) / snapT;
      let rate = 0;
      if (tB > 0 && h.ext < stop) { rate = 9 / h.res * tB / K; h.ext = Math.min(stop, h.ext + rate * dt); ensureNodes(h); }
      if (tA > 0 && h.sA > 0) { const ra = 9 / h.res * tA / K; h.sA = Math.max(0, h.sA - ra * dt); ensureNodesA(h); rate += ra; }
      report({ sliding: rate, strain: clamp(h.tension) });
      if (tA > snapT) { snapBridge(h, 'A'); return; }
      if (h.sA <= 0) { bridgeEndOutA(h); return; }
      if (h.ext >= stop) {
        if (tB > snapT * 0.5) {
          if (stop < root) { h.snags.shift(); h.ext += 1; ensureNodes(h); sfx.burst(2200, 0.03, 0.3, 0, 2); vibrate(10); }
          else { h.ext = h.L; ensureNodes(h); bridgeEndOutB(h); }
        }
      } else if (tB > snapT) snapBridge(h, 'B');
      return;
    }
    if (D < K * (h.ext - h.gripS)) h.gripS = h.ext - D / K; // back toward the pore: grip lower down, reel it in
    const t = D - K * (h.ext - h.gripS);
    h.tension = t / snapT;
    let rate = 0;
    if (t > 0 && h.ext < stop) { rate = 9 / h.res * t / K; h.ext = Math.min(stop, h.ext + rate * dt); ensureNodes(h); }
    report({ sliding: rate, strain: clamp(h.tension) });
    let wordsOut = 0; for (let i = 0; i < h.n; i++) if (h.glyphs[i].ch === ' ') wordsOut++;
    if (wordsOut > h.tick) { h.tick = wordsOut; const f = Math.min(1500, 420 + wordsOut * 70); sfx.beep(f, f, 0.05, 'triangle', 0.13); }
    if (h.ext >= stop) {
      if (t > snapT * 0.5) { // caught on a word gap, a twin's joint or the root: a firm tug gets it through
        if (stop < root) { h.snags.shift(); h.ext += 1; ensureNodes(h); sfx.burst(2200, 0.03, 0.3, 0, 2); vibrate(10); }
        else finishHair(h);
      }
    } else if (t > snapT) snapHair(h);
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
    debug: () => ({ level, W, H, F, S, pain, stun, finished, cam: { ...cam }, panning: !!pan, rounds: [...rounds.keys()], strands: strands.map(s => ({ text: s.text, n: s.n, grip: !!s.grip, maxY: Math.max(...s.nodes.map(p => p.y)) })), hairs: hairs.map(h => ({ round: h.round, type: h.type, state: h.state, ext: h.ext, sA: h.sA, L: h.L, text: h.text, cover: h.cover, hole: { x: h.hole.x, y: h.hole.y }, holeA: h.holeA ? { x: h.holeA.x, y: h.holeA.y } : null, bridge: !!h.bridge, surface: !!h.surface, snags: h.snags.slice(), n: h.n, i0: h.i0 || 0, appear: h.appear })) })
  };
}
