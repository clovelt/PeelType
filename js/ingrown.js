// Ingrown lines ("líneas enquistadas") — a patch of skin with lines of text
// grown in under it. The reader digs them out:
//
//  1. OPEN   — rub over the dark end of a buried line (its first letters) to
//              open the skin. Deeper lines need more rubbing. Rubbing bare skin
//              hurts: the pain meter fills and, when full, the skin flinches
//              (stun, shake, red flash) and drops whatever you were holding.
//  2. PULL   — pinch the tip that pops out and pull SLOWLY. The text slides out
//              of the pore at a speed proportional to how far you stretch it;
//              stretch it too far and it snaps (the pulled part breaks off and
//              the rest sinks back). Moving back toward the pore re-grips lower
//              down, so long lines are reeled in hand over hand.
//  3. SNAGS  — some lines catch at a gap between words, and every line holds
//              at its root: one firm tug gets it through.
//  4. EXTRAS — a second line can share the same pore (twin); pulling a "chain"
//              line drags its neighbours' tips out; pale ("white") lines;
//              short words already standing out of the pores (fuzz) are just
//              pinched and plucked.
//  5. TISSUE — what comes out hangs off the tweezers (stiff, or whipping about)
//              and is laid on a tissue at the bottom, which can be dragged up.
//              Clearing the patch moves to the next one; at the end the tissue
//              shows every line you pulled, in order — a found poem.
//
// Config lives on a block attachment: { type: 'skin', width, height, skin: {...} }
// (schema: normalizeSkinConfig). The game owns its own canvas and rAF loop and
// sleeps while off-screen or detached.

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fr = (a, b) => a + (b - a) * Math.random();
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash32(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const num = (v, d) => { const n = Number(v); return (v === '' || v === null || v === undefined || !Number.isFinite(n)) ? d : n; };
const bool = (v, d) => (v === undefined || v === null ? d : Boolean(v));

export const SKIN_LINE_TYPES = ['arc', 'wave', 'hook', 'pin', 'loop', 'knot', 'coil', 'giant'];
const DEPTH = { arc: [0.15, 0.45], wave: [0.3, 0.6], hook: [0.3, 0.6], pin: [0.3, 0.6], loop: [0.4, 0.7], knot: [0.45, 0.75], coil: [0.45, 0.8], giant: [0.8, 1] };
const POOL = [['arc', 26], ['wave', 22], ['hook', 16], ['pin', 16], ['loop', 10], ['knot', 5], ['coil', 5]];

const TXT = {
  es: {
    rub: 'frota aquí', pull: 'pinza y tira despacio', ouch: '¡ay, ay, ay!', snapped: 'se partió…', longest: '¡la más larga!',
    smooth: '¡lisa!', another: '¡había otra!', dragged: (n) => `salieron ${n} más`, pale: 'una pálida', huge: '¡enorme!',
    left: (n) => `quedan ${n}`, lines: 'líneas', letters: 'letras', pain: 'dolor', next: 'deja los pelillos · siguiente piel',
    finish: 'terminar', again: 'otra vez', nothing: 'no salió ninguna línea…', tissue: 'lo que saques, déjalo aquí (el pañuelo también se mueve)',
    tissueAuto: 'lo que saques se ordena en este pañuelo', result: 'lo que salió de la piel', snaps: (n) => `partidas: ${n}`, stuns: (n) => `dolores: ${n}`,
    ranks: [[1400, 'SS', 'mano de dios legendaria'], [900, 'S', 'mano de dios'], [560, 'A', 'maestra de pinzas'], [300, 'B', 'cazadora de enquistes'], [120, 'C', 'aprendiz de pinzas'], [0, 'D', 'principiante']],
    chill: [[1400, 'la que vio el mundo sin vello'], [700, 'sabia de raíces'], [300, 'coleccionista de líneas'], [0, 'artesana sin prisa']],
    edit: 'editando: arrastra una línea para moverla · arrastra su punta para girarla'
  },
  en: {
    rub: 'rub here', pull: 'pinch and pull slowly', ouch: 'ow ow ow!', snapped: 'it snapped…', longest: 'new longest!',
    smooth: 'smooth!', another: 'another one in there!', dragged: (n) => `dragged out ${n} more`, pale: 'a pale one', huge: 'huge!',
    left: (n) => `${n} left`, lines: 'lines', letters: 'letters', pain: 'pain', next: 'leave the fuzz · next skin',
    finish: 'finish', again: 'again', nothing: 'not a single line came out…', tissue: 'put what you pull here (the tissue moves too)',
    tissueAuto: 'what you pull lines up on this tissue', result: 'what came out of the skin', snaps: (n) => `snapped: ${n}`, stuns: (n) => `ouches: ${n}`,
    ranks: [[1400, 'SS', 'legendary god hand'], [900, 'S', 'god hand'], [560, 'A', 'tweezer master'], [300, 'B', 'ingrown hunter'], [120, 'C', 'tweezer apprentice'], [0, 'D', 'beginner']],
    chill: [[1400, 'seer of the hairless world'], [700, 'sage of roots'], [300, 'line collector'], [0, 'unhurried artisan']],
    edit: 'editing: drag a line to move it · drag its tip to turn it'
  }
};

// ── Config ────────────────────────────────────────────────────────────────────
function parseTone(v, fallback = [240, 195, 162]) {
  if (Array.isArray(v) && v.length >= 3) return v.slice(0, 3).map(n => clamp(Math.round(Number(n) || 0), 0, 255));
  if (typeof v === 'string' && /^#?[0-9a-f]{6}$/i.test(v.trim())) {
    const h = v.trim().replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return fallback.slice();
}
export function toneToHex(t) { return '#' + parseTone(t).map(n => n.toString(16).padStart(2, '0')).join(''); }
const words = v => (Array.isArray(v) ? v : String(v || '').split(/[\s,]+/)).map(s => String(s).trim()).filter(Boolean);

export function normalizeSkinLine(raw = {}) {
  const type = SKIN_LINE_TYPES.includes(raw.type) ? raw.type : 'arc';
  const out = {
    text: String(raw.text ?? '').replace(/\s+/g, ' ').trim(),
    type,
    depth: raw.depth === '' || raw.depth === undefined || raw.depth === null ? null : clamp(num(raw.depth, 0.4), 0, 1),
    hidden: clamp(num(raw.hidden, 0), 0, 0.9),
    white: Boolean(raw.white),
    chain: Boolean(raw.chain),
    snags: clamp(Math.round(num(raw.snags, 0)), 0, 6),
    twin: String(raw.twin ?? '').replace(/\s+/g, ' ').trim()
  };
  if (Number.isFinite(Number(raw.x)) && raw.x !== '' && raw.x !== null) out.x = clamp(Number(raw.x), 0, 1);
  if (Number.isFinite(Number(raw.y)) && raw.y !== '' && raw.y !== null) out.y = clamp(Number(raw.y), 0, 1);
  if (Number.isFinite(Number(raw.angle)) && raw.angle !== '' && raw.angle !== null) out.angle = Number(raw.angle);
  if (raw.onExtract) out.onExtract = raw.onExtract;
  return out;
}
export function normalizeSkinPatch(raw = {}, idx = 0) {
  return {
    name: String(raw.name ?? `piel ${idx + 1}`),
    tone: toneToHex(raw.tone ?? '#f0c3a2'),
    fuzz: clamp(Math.round(num(raw.fuzz, 14)), 0, 80),
    fuzzWords: words(raw.fuzzWords).join(' '),
    lines: (Array.isArray(raw.lines) ? raw.lines : []).map(normalizeSkinLine),
    ...(raw.onClear ? { onClear: raw.onClear } : {})
  };
}
export function normalizeSkinConfig(raw = {}) {
  const patches = (Array.isArray(raw.patches) ? raw.patches : []).map(normalizeSkinPatch);
  return {
    mode: raw.mode === 'timed' ? 'timed' : 'chill',
    timeLimit: clamp(num(raw.timeLimit, 60), 10, 600),
    clearBonus: clamp(num(raw.clearBonus, 12), 0, 120),
    fontFamily: String(raw.fontFamily ?? ''),
    fontSize: clamp(num(raw.fontSize, 15), 8, 40),
    ink: String(raw.ink || '#2b1a17'),
    paleInk: String(raw.paleInk || '#8f8a83'),
    resistance: clamp(num(raw.resistance, 1), 0.2, 5),
    snapTolerance: clamp(num(raw.snapTolerance, 1), 0.3, 4),
    openEffort: clamp(num(raw.openEffort, 1), 0.2, 5),
    painRate: clamp(num(raw.painRate, 1), 0, 5),
    sway: bool(raw.sway, true),
    zoom: bool(raw.zoom, true),
    place: bool(raw.place, true),
    hints: bool(raw.hints, true),
    sound: bool(raw.sound, true),
    skinText: String(raw.skinText ?? ''),
    endless: Boolean(raw.endless),
    textPool: (Array.isArray(raw.textPool) ? raw.textPool : String(raw.textPool || '').split('\n')).map(s => String(s).trim()).filter(Boolean),
    patches: patches.length ? patches : [normalizeSkinPatch({ lines: [{ text: 'una línea crecida hacia dentro', type: 'arc' }] }, 0)],
    ...(raw.onComplete ? { onComplete: raw.onComplete } : {})
  };
}
export function asSkinActions(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(a => a && a.type);
  if (v.type) return [v];
  if (v.action && v.action !== 'none') {
    const t = v.target || v.blockId || v.name;
    if (v.action === 'revealBlock' || v.action === 'hideBlock' || v.action === 'skipBlock') return [{ type: v.action, blockId: t }];
    if (v.action === 'setFlag') return [{ type: 'setFlag', name: t }];
    if (v.action === 'sound') return [{ type: 'sound', name: t || 'peel' }];
    if (v.action === 'particles') return [{ type: 'particles', preset: t || 'spark', color: v.color }];
    if (v.action === 'bgColor') return [{ type: 'bgColor', color: t || v.color }];
  }
  return [];
}

// ── Sound (tiny synth, same palette as the rest of the piece) ────────────────
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
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
}

export function createSkinGame(el, attachment, hooks = {}) {
  const cfg = normalizeSkinConfig(attachment?.skin || {});
  const T = TXT[hooks.lang === 'en' ? 'en' : 'es'];
  const isEditor = () => (hooks.isEditor ? hooks.isEditor() : false);
  const fontFamily = cfg.fontFamily || hooks.fontFamily || "'EB Garamond', Georgia, serif";
  const sfx = makeSfx(cfg.sound, () => (hooks.isMuted ? hooks.isMuted() : false));

  const cv = document.createElement('canvas');
  cv.className = 'skin-canvas';
  cv.setAttribute('aria-label', T.rub);
  el.appendChild(cv);
  const g = cv.getContext('2d');

  let W = 1, H = 1, DPR = 1, S = 1, F = 15, trayH = 80, topPad = 40;
  let patch = null, level = 0, got = [], pain = 0, stun = 0, stuns = 0, snaps = 0, slow = 0, shake = 0, clearT = -1, fade = null;
  let timeLeft = cfg.timeLimit, started = false, over = null, lastTick = 99, lastAct = performance.now();
  let ptr = null, hover = null, alive = true, visible = true, raf = 0, last = performance.now();
  let editTool = 'off', editSel = -1, editDrag = null, previewPatch = -1;
  const parts = [], floats = [], flyers = [];
  const sheet = { x: 0, y: 0 };
  const cam = { x: 0, y: 0, z: 1, hair: null, px: 0, py: 0, tz: 1, hold: 0 };
  const toWorld = (sx, sy) => ({ x: (sx - W / 2) / cam.z + cam.x, y: (sy - H / 2) / cam.z + cam.y });
  const toScreen = (wx, wy) => ({ x: (wx - cam.x) * cam.z + W / 2, y: (wy - cam.y) * cam.z + H / 2 });
  const font = (px, style = '') => `${style}${Math.max(4, px).toFixed(1)}px ${fontFamily}`;
  const measure = (str, px) => { g.font = font(px); return g.measureText(str).width; };

  // ── Glyph strip: a line of text measured into letters along its length ──
  function glyphsOf(text, px) {
    const segs = typeof Intl !== 'undefined' && Intl.Segmenter
      ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(s => s.segment)
      : Array.from(text);
    g.font = font(px);
    const track = px * 0.04;
    let s = 0;
    const out = segs.map(ch => { const w = g.measureText(ch).width + track; const o = { ch, w, s0: s, sc: s + w / 2 }; s += w; return o; });
    return { glyphs: out, L: s };
  }

  // ── Camera ──
  function focusOn(h, z) {
    if (cam.hair !== h) { const p = toScreen(h.hole.x, h.hole.y); cam.hair = h; cam.px = p.x; cam.py = p.y; }
    cam.tz = z; cam.hold = 0.8;
  }
  function camStep(dt) {
    const k = 1 - Math.exp(-dt * 9);
    if (!ptr) cam.hold -= dt;
    if (cfg.zoom && editTool === 'off' && !over && cam.hair && (ptr || cam.hold > 0 || slow > 0)) {
      cam.z += ((slow > 0 ? 1.8 : cam.tz) - cam.z) * k;
      cam.x = cam.hair.hole.x - (cam.px - W / 2) / cam.z; cam.y = cam.hair.hole.y - (cam.py - H / 2) / cam.z;
    } else {
      cam.hair = null;
      cam.z += (1 - cam.z) * k; cam.x += (W / 2 - cam.x) * k; cam.y += (H / 2 - cam.y) * k;
    }
    cam.x = clamp(cam.x, W / (2 * cam.z), W - W / (2 * cam.z)); cam.y = clamp(cam.y, H / (2 * cam.z), H - H / (2 * cam.z));
  }

  // ── Skin texture: tone, blotches, creases (two families of lines), pores, and
  //    optionally faint text written along the creases ──
  function blank() { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; return c; }
  function makeSkin(toneHex) {
    const c = blank(), x = c.getContext('2d');
    x.scale(DPR, DPR);
    const [r, gg, b] = parseTone(toneHex);
    const lg = x.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, `rgb(${r + 9},${gg + 9},${b + 8})`); lg.addColorStop(0.55, `rgb(${r},${gg},${b})`); lg.addColorStop(1, `rgb(${r - 14},${gg - 20},${b - 20})`);
    x.fillStyle = lg; x.fillRect(0, 0, W, H);
    const rr = mulberry(hash32(toneHex + W + 'x' + H));
    for (let i = 0; i < 16; i++) {
      const px = rr() * W, py = rr() * H, rad = lerp(70, 210, rr()) * S, warm = rr() < 0.5;
      const rg = x.createRadialGradient(px, py, 0, px, py, rad);
      rg.addColorStop(0, warm ? 'rgba(214,118,104,.085)' : 'rgba(255,238,224,.11)'); rg.addColorStop(1, warm ? 'rgba(214,118,104,0)' : 'rgba(255,238,224,0)');
      x.fillStyle = rg; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    x.lineWidth = 1; x.strokeStyle = 'rgba(120,60,44,.055)';
    for (let k = 0; k < 2; k++) {
      const ang = k ? -0.9 : 0.5, dx = Math.cos(ang), dy = Math.sin(ang), gap = 13 * S, span = W + H;
      for (let d = -span; d < span; d += gap) {
        x.beginPath();
        for (let t = -span; t <= span; t += 24) {
          const wob = Math.sin(t * 0.021 + d * 0.13) * 3.2;
          const px = W / 2 + dx * t - dy * (d + wob), py = H / 2 + dy * t + dx * (d + wob);
          if (t === -span) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.stroke();
      }
    }
    if (cfg.skinText) { // the skin is written too: faint text running along one family of creases
      x.save(); x.translate(W / 2, H / 2); x.rotate(0.5);
      x.fillStyle = 'rgba(110,52,40,.075)'; x.font = font(8.5 * S, 'italic '); x.textBaseline = 'middle';
      const span = W + H, gap = 13 * S, tw = Math.max(20, x.measureText(cfg.skinText + ' · ').width);
      let row = 0;
      for (let d = -span / 2; d < span / 2; d += gap * 2, row++) {
        for (let t = -span / 2 - ((row * 37) % tw); t < span / 2; t += tw) x.fillText(cfg.skinText + ' · ', t, d + 6.5 * S);
      }
      x.restore();
    }
    const step = 21 * S;
    for (let py = -step; py < H + step; py += step) for (let px = -step; px < W + step; px += step) {
      const qx = px + lerp(-7, 7, rr()) * S, qy = py + lerp(-7, 7, rr()) * S;
      x.fillStyle = 'rgba(112,56,42,.17)'; x.beginPath(); x.ellipse(qx, qy, 1.7 * S, 1.15 * S, rr() * 3, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.13)'; x.beginPath(); x.arc(qx - 1.2 * S, qy - 1.2 * S, 0.9 * S, 0, 7); x.fill();
    }
    const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(96,34,34,0)'); vg.addColorStop(1, 'rgba(96,34,34,.24)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    return c;
  }

  // ── Buried line shapes. Built at screen scale in px; every curvature is tied to
  //    the font size so letters on the inside of a bend never pile up. ──
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
    const a0Used = a;
    const st = 1.5, sg = rnd() < 0.5 ? -1 : 1, f = F;
    const walk = (len, fn) => { for (let d = 0; d <= len; d += st) { pts.push({ x, y }); a += fn(d) * st; x += Math.cos(a) * st; y += Math.sin(a) * st; } };
    let flip = false;
    if (type === 'arc') { const k = sg / Math.max(rr(4, 9) * f, L / rr(1.5, 2.6)); walk(L, () => k); }
    else if (type === 'wave') { const wl = rr(5, 8) * f, wf = TAU / wl, wa = wf * rr(0.55, 0.85), k = sg / Math.max(rr(8, 14) * f, L / 1.2); walk(L, d => k + Math.cos(d * wf) * wa); }
    else if (type === 'hook') {
      const r1 = rr(1.3, 1.8) * f, curl = Math.min(L * 0.4, TAU * r1 * 0.85), k0 = sg / rr(14, 28) / f, at = L - curl;
      walk(L, d => d < at ? k0 : lerp(k0, sg / r1, clamp((d - at) / (f * 1.2))));
    }
    else if (type === 'pin') { // grew out, hit the skin and doubled back on itself
      const r = rr(1.15, 1.6) * f, L1 = L * rr(0.4, 0.55), k0 = sg / rr(18, 36) / f, k2 = -sg / rr(12, 28) / f;
      walk(L, d => d < L1 ? k0 : d < L1 + Math.PI * r ? sg / r : k2); flip = rnd() < 0.5;
    }
    else if (type === 'loop') { // nearly straight, crossing over itself once
      const r = Math.min(rr(2, 3) * f, L / 9), at = L * rr(0.25, 0.45), k0 = sg / rr(20, 50) / f, ease = f * 0.7;
      walk(L, d => lerp(k0, sg / r, clamp(Math.min(d - at, at + TAU * r - d) / ease))); flip = rnd() < 0.5;
    }
    else if (type === 'knot') { // tangled on itself, wandering inside a small area
      let k = 0; const R = Math.max(3 * f, Math.sqrt(L * f * 0.7));
      walk(L, () => {
        k = clamp(k + rr(-0.022, 0.022) / (f / 9), -0.9 / f, 0.9 / f);
        if (Math.hypot(x, y) > R) { const da = ((Math.atan2(-y, -x) - a + 9.4248) % TAU) - Math.PI; return clamp(da * 0.12, -1.2 / f, 1.2 / f); }
        return k;
      });
      flip = rnd() < 0.5;
    }
    else { // coil, giant: wound up under the skin, never a perfect spiral. turn spacing = a line of text
      const gap = (type === 'giant' ? 1.3 : 1.15) * f, r0 = (type === 'giant' ? 1.7 : 1.25) * f;
      const r1 = Math.sqrt(L * gap / Math.PI + r0 * r0), thMax = L / ((r0 + r1) / 2);
      const ph = rnd() * TAU, wob = rr(0.03, 0.07), wf = rr(0.55, 0.9), sq = rr(0.82, 0.95), a0 = a0Used, c = Math.cos(a0), sn = Math.sin(a0);
      for (let th = 0; th <= thMax;) {
        const r = lerp(r0, r1, th / thMax) * (1 + wob * Math.sin(th * wf + ph)), px = Math.cos(th * sg) * r, py = Math.sin(th * sg) * r * sq;
        pts.push({ x: px * c - py * sn, y: px * sn + py * c }); th += st / r;
      }
      flip = rnd() < 0.5; // the shallow tip can be at the centre or on the rim
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

  function makeLine(spec, x, y) {
    const rnd = mulberry(spec.seed);
    const rr = (a, b) => a + (b - a) * rnd();
    const thick = spec.type === 'giant' ? 1.15 : rr(0.94, 1.06);
    const { glyphs, L } = glyphsOf(spec.text, F * thick);
    let visWanted = Math.max(F * 3, L * (1 - spec.hidden));
    const shaped = shapePath(spec.type, visWanted, rnd, spec.angle);
    let pts = shaped.pts;
    let rad = centre(pts);
    const maxRad = Math.max(60 * S, Math.min(W, H - trayH - topPad) * 0.42);
    if (rad > maxRad) { // too big for this patch: the rest of it runs on, out of sight
      const hole = pts[0]; let cut = pts.length;
      for (let i = 0; i < pts.length; i++) if (Math.hypot(pts[i].x - hole.x, pts[i].y - hole.y) > maxRad * 1.7) { cut = i; break; }
      pts = pts.slice(0, Math.max(8, cut)); rad = centre(pts);
    }
    const step = 3, visL = (pts.length - 1) * step;
    pts.forEach(p => { p.x += x; p.y += y; });
    let depth = spec.depth ?? rr(DEPTH[spec.type][0], DEPTH[spec.type][1]);
    if (L > visL + F) depth = Math.max(depth, 0.5);
    if (spec.easy) depth = Math.min(depth, 0.3);
    const h = {
      spec, idx: spec.idx, text: spec.text, glyphs, type: spec.type, x, y, pts, step, visL, L, rad: Math.max(rad, 26 * S),
      ext: 0, grip: 0, cover: 1, depth, res: (1 + depth * 1.25) * cfg.resistance, white: spec.white, state: 'in', tension: 0,
      wig: rnd() * 6, seed: rnd() * 100, heal: 1, thick, a0: shaped.a0, twin: spec.twin, chain: spec.chain,
      snags: [], forks: spec.snags, tick: 0, bump: 0, onExtract: spec.onExtract
    };
    // snags sit on the gaps between words
    const gaps = glyphs.filter(gl => gl.ch === ' ' && gl.sc > L * 0.15 && gl.sc < L * 0.9).map(gl => gl.sc);
    for (let i = 0; i < spec.snags && gaps.length; i++) {
      const want = L * (0.22 + 0.6 * (i + rnd() * 0.7) / spec.snags);
      let best = gaps[0]; gaps.forEach(s => { if (Math.abs(s - want) < Math.abs(best - want)) best = s; });
      if (!h.snags.includes(best)) h.snags.push(best);
    }
    h.snags.sort((a, b) => a - b);
    h.hole = pts[0];
    const t = pts[Math.min(3, pts.length - 1)], dl = Math.hypot(h.hole.x - t.x, h.hole.y - t.y) || 1;
    h.out = { x: (h.hole.x - t.x) / dl, y: (h.hole.y - t.y) / dl };
    return h;
  }
  function makeFuzz(x, y, r, flow, word) { // a short word already standing out of a pore: pinch it and pull
    const a = flow + (r() - 0.5) * 0.3, px = F * 0.62;
    const { glyphs, L } = glyphsOf(word, px);
    const hole = { x, y }, out = { x: Math.cos(a), y: Math.sin(a) };
    return {
      surface: true, type: 'fuzz', text: word, glyphs, gpx: px, x, y, pts: [hole], step: 3, visL: 0, L, rad: 10 * S, ext: L, grip: 0, cover: 0, depth: 0, res: 1,
      white: false, state: 'out', tension: 0, wig: r() * 6, seed: r() * 100, heal: 1, thick: 0.6, twin: '', chain: false, snags: [], forks: 0, tick: 0, bump: 0, hole, out
    };
  }

  const underHud = (x, y, m) => y < topPad + m;
  function rollPatchLines(pIdx, pc) {
    return pc.lines.map((l, i) => ({ ...l, idx: i, seed: hash32(`${pIdx}:${i}:${l.text}`), easy: pIdx === 0 && i < 2 && l.depth == null })).filter(l => l.text);
  }
  function generatedPatch(lv) { // endless mode: random lines from the text pool, harder as it goes
    const rnd = mulberry(hash32('endless:' + lv + ':' + cfg.textPool.length));
    const n = clamp(2 + Math.floor(lv / 2), 2, 6), lines = [];
    const pool = cfg.textPool.length ? cfg.textPool : cfg.patches.flatMap(p => p.lines.map(l => l.text));
    for (let i = 0; i < n && pool.length; i++) {
      let type = 'arc', q = rnd() * 100; for (const [t, w] of POOL) { type = t; if ((q -= w) < 0) break; }
      const a = rnd(), d = rnd();
      lines.push({ text: pool[Math.floor(rnd() * pool.length)], type: lv > 3 && rnd() < 0.12 ? 'giant' : type, depth: null, hidden: 0, white: a < 0.08, chain: d < 0.12, snags: d > 0.7 ? 1 + Math.floor(rnd() * 2) : 0, twin: d > 0.12 && d < 0.2 ? pool[Math.floor(rnd() * pool.length)] : '' });
    }
    const base = cfg.patches[lv % cfg.patches.length];
    return { name: base.name, tone: base.tone, fuzz: base.fuzz, fuzzWords: base.fuzzWords, lines, generated: true };
  }
  function patchConfig(lv) {
    if (lv < cfg.patches.length) {
      const p = cfg.patches[lv];
      return cfg.endless && !p.lines.some(l => l.text) ? generatedPatch(lv) : p;
    }
    return cfg.endless ? generatedPatch(lv) : null;
  }
  function newPatch(lv) {
    const pc = patchConfig(lv);
    if (!pc) return null;
    const p = { level: lv, cfg: pc, hairs: [], skin: makeSkin(pc.tone), dmg: blank(), hint: lv === 0 && cfg.hints ? 1 : 0 };
    const place = mulberry(hash32(`place:${lv}:${pc.lines.map(l => l.text).join('|')}`));
    const m = 40 * S, x0 = m, x1 = Math.max(m + 1, W - m), y0 = topPad + m, y1 = Math.max(y0 + 1, H - trayH - m);
    const specs = rollPatchLines(lv, pc);
    // lines with a set place go first; the others are dropped where there is room
    specs.filter(s => s.x !== undefined && s.y !== undefined).forEach(s => p.hairs.push(makeLine(s, lerp(0, W, s.x), lerp(topPad, H - trayH, s.y))));
    // nudge a line so all of it lies on the skin, between the HUD and the tissue
    const fitInside = h => {
      const mg = F * 0.8 + 8, bx0 = mg, bx1 = W - mg, by0 = topPad + mg, by1 = H - trayH - mg;
      let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
      h.pts.forEach(q => { mnx = Math.min(mnx, q.x); mxx = Math.max(mxx, q.x); mny = Math.min(mny, q.y); mxy = Math.max(mxy, q.y); });
      const dx = mxx - mnx > bx1 - bx0 ? (bx0 + bx1) / 2 - (mnx + mxx) / 2 : mnx < bx0 ? bx0 - mnx : mxx > bx1 ? bx1 - mxx : 0;
      const dy = mxy - mny > by1 - by0 ? (by0 + by1) / 2 - (mny + mxy) / 2 : mny < by0 ? by0 - mny : mxy > by1 ? by1 - mxy : 0;
      if (dx || dy) { h.pts.forEach(q => { q.x += dx; q.y += dy; }); h.x += dx; h.y += dy; h.hole = h.pts[0]; }
      return h;
    };
    const overlap = (h, o) => o.surface ? 0 : h.pts.reduce((n, q, i) => n + (i % 4 === 0 && o.pts.some((r, j) => j % 4 === 0 && Math.hypot(q.x - r.x, q.y - r.y) < F * 2.4) ? 1 : 0), 0);
    specs.filter(s => s.x === undefined || s.y === undefined).forEach(spec => {
      let best = null, bestScore = 1e9;
      for (let tries = 0; tries < 90; tries++) {
        const h = fitInside(makeLine(spec, lerp(x0, x1, place()), lerp(y0, y1, place())));
        const score = p.hairs.reduce((n, o) => n + overlap(h, o) * 10 + (Math.hypot(o.x - h.x, o.y - h.y) < (o.rad + h.rad) * 0.6 ? 3 : 0), 0);
        if (score < bestScore) { bestScore = score; best = h; }
        if (score === 0) break;
      }
      p.hairs.push(best);
    });
    // fuzz: short words around them, lying one way across the patch, drifting gently
    const pool = words(pc.fuzzWords).length ? words(pc.fuzzWords) : ['y', 'a', 'de', 'la', 'sí', 'no', 'tú', 'ya', 'yo', 'en'];
    const nf = Math.round(pc.fuzz * clamp(W * (H - topPad - trayH) / (420 * 520), 0.6, 1.5) * (lv === 0 ? 0.6 : 1));
    const flow = Math.PI / 2 + (place() - 0.5) * 1.1, f1 = place() * TAU, f2 = place() * TAU;
    const flowAt = (x, y) => flow + 0.2 * Math.sin(x / (150 * S) + f1) + 0.16 * Math.sin(y / (190 * S) + f2);
    const wOff = Math.floor(place() * pool.length);
    for (let i = 0; i < nf; i++) for (let tries = 0; tries < 40; tries++) {
      const x = lerp(18 * S, W - 18 * S, place()), y = lerp(topPad + 12, H - trayH - 16 * S, place());
      if (underHud(x, y, 4)) continue;
      const nearLine = p.hairs.some(o => !o.surface && o.pts.some((q, qi) => qi % 3 === 0 && Math.hypot(q.x - x, q.y - y) < F * 1.1));
      if (!nearLine && p.hairs.every(o => !o.surface || Math.hypot(o.x - x, o.y - y) > 30 * S)) { p.hairs.push(makeFuzz(x, y, place, flowAt(x, y), pool[(i + wOff) % pool.length])); break; }
    }
    return p;
  }

  // ── Effects ──
  function puff(x, y, n, kind, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = (kind === 'spark' ? fr(60, 240) : fr(20, 90)) * S;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === 'flake' ? 30 * S : 0), life: fr(0.3, 0.7), max: 0.7, kind, col, r: (kind === 'spark' ? fr(1.5, 3) : fr(1, 2.4)) * S });
    }
    if (parts.length > 260) parts.splice(0, parts.length - 260);
  }
  const ring = (x, y, col) => parts.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, kind: 'ring', col, r: 8 * S });
  const say = (x, y, text, col, size = 20, life = 1.3, style = '') => floats.push({ x, y, text, col, size: size * S, life, max: life, style });
  const sayW = (wx, wy, text, col, size) => { const p = toScreen(wx, wy); say(p.x, p.y, text, col, size); };
  function fire(actions, wx, wy) {
    const list = asSkinActions(actions);
    if (!list.length || !hooks.runAction) return;
    const p = toScreen(wx, wy);
    for (const a of list) { try { hooks.runAction(a, { x: p.x, y: p.y }); } catch (e) { console.warn('skin action failed', e); } }
  }

  // ── Points along a buried line ──
  function pointAt(h, u) {
    const f = clamp(u / h.step, 0, h.pts.length - 1), i = Math.min(h.pts.length - 2, Math.floor(f)), t = f - i;
    const a = h.pts[i], b = h.pts[i + 1] || a;
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), a: Math.atan2(b.y - a.y, b.x - a.x) };
  }
  function strokeRange(h, u0, u1, w, style) {
    if (u1 <= u0) return;
    const a = pointAt(h, u0), b = pointAt(h, u1);
    g.beginPath(); g.moveTo(a.x, a.y);
    for (let i = Math.floor(u0 / h.step) + 1; i * h.step < u1 && i < h.pts.length; i++) g.lineTo(h.pts[i].x, h.pts[i].y);
    g.lineTo(b.x, b.y);
    g.lineWidth = w; g.strokeStyle = style; g.stroke();
  }
  function glyph(ch, x, y, ang, px, col, alpha = 1) {
    if (ch === ' ' || alpha <= 0.01) return;
    g.setTransform(curM.a * Math.cos(ang), curM.a * Math.sin(ang), -curM.a * Math.sin(ang), curM.a * Math.cos(ang), curM.a * x + curM.e, curM.a * y + curM.f);
    const fs = font(px); if (fs !== glyphFont) { g.font = fs; glyphFont = fs; g.textAlign = 'center'; g.textBaseline = 'middle'; }
    g.globalAlpha = alpha; g.fillStyle = col; g.fillText(ch, 0, 0);
  }
  let curM = { a: 1, e: 0, f: 0 }, glyphFont = ''; // the active uniform-scale transform (world or screen)
  function setM(a, e, f) { curM = { a, e, f }; glyphFont = ''; g.setTransform(a, 0, 0, a, e, f); g.globalAlpha = 1; }
  const inkOf = h => (h.white ? cfg.paleInk : cfg.ink);
  const rgbOf = hex => parseTone(hex).join(',');

  // ── Input ──
  const TOOL = { x: 0.45, y: 0.893 }; // direction from the working tip up to the handle
  function tipOf(e) {
    const r = cv.getBoundingClientRect(); // reacts right under the finger
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  const digR = () => Math.max(18 * S, F * 1.05);
  function hairNear(x, y, st, r) {
    let best = null, bd = r;
    for (const h of patch.hairs) { if (h.state !== st) continue; const d = Math.hypot(h.hole.x - x, h.hole.y - y); if (d < bd) { bd = d; best = h; } }
    return best;
  }
  function outNear(x, y) {
    let best = null, bd = 1e9;
    for (const h of patch.hairs) {
      if (h.state !== 'out') continue;
      let d = Math.hypot(h.hole.x - x, h.hole.y - y);
      if (h.surface) { // a standing word can be grabbed anywhere along it
        const ex = h.hole.x + h.out.x * h.L * 0.8, ey = h.hole.y + h.out.y * h.L * 0.8, t = clamp(((x - h.hole.x) * (ex - h.hole.x) + (y - h.hole.y) * (ey - h.hole.y)) / Math.max(1, (ex - h.hole.x) ** 2 + (ey - h.hole.y) ** 2));
        d = Math.hypot(x - lerp(h.hole.x, ex, t), y - lerp(h.hole.y, ey, t));
      }
      if (d < (h.surface ? 16 * S : 30 * S) && d < bd) { bd = d; best = h; }
    }
    return best;
  }

  // what is out hangs from the tweezers as a little rope (screen space)
  const RMAX = 64, rope = { n: 14, x: new Float32Array(RMAX), y: new Float32Array(RMAX), px: new Float32Array(RMAX), py: new Float32Array(RMAX), len: 0, a: Math.atan2(-0.866, -0.5) };
  function ropeReset(x, y) { rope.x.fill(x); rope.px.fill(x); rope.y.fill(y); rope.py.fill(y); rope.len = 0; }
  function ropeStep(ax, ay, target, dt, aim, bend) {
    rope.len = lerp(rope.len, target, 0.25);
    const N = rope.n = clamp(Math.ceil(rope.len / (9 * S)) + 2, 4, RMAX);
    const seg = rope.len / (N - 1), gr = 2600 * S * dt * dt;
    rope.x[0] = ax; rope.y[0] = ay;
    if (!cfg.sway) { // stiff: it stands out from the tweezers the way it was drawn out, keeping its curve
      if (aim !== null && aim !== undefined) { let d = aim - rope.a; d = Math.atan2(Math.sin(d), Math.cos(d)); rope.a += d * 0.35; }
      for (let i = 1; i < N; i++) {
        const an = rope.a + (bend || 0) * (i - 1) / Math.max(1, N - 2);
        rope.x[i] = rope.x[i - 1] + Math.cos(an) * seg; rope.y[i] = rope.y[i - 1] + Math.sin(an) * seg; rope.px[i] = rope.x[i]; rope.py[i] = rope.y[i];
      }
      return;
    }
    for (let i = 1; i < N; i++) {
      const vx = (rope.x[i] - rope.px[i]) * 0.8, vy = (rope.y[i] - rope.py[i]) * 0.8;
      rope.px[i] = rope.x[i]; rope.py[i] = rope.y[i];
      rope.x[i] += vx; rope.y[i] += vy + gr;
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 2; i < N; i++) { rope.x[i] = lerp(rope.x[i], 2 * rope.x[i - 1] - rope.x[i - 2], 0.3); rope.y[i] = lerp(rope.y[i], 2 * rope.y[i - 1] - rope.y[i - 2], 0.3); }
      for (let i = 1; i < N; i++) {
        const dx = rope.x[i] - rope.x[i - 1], dy = rope.y[i] - rope.y[i - 1], d = Math.hypot(dx, dy) || 1, k = (d - seg) / d;
        rope.x[i] -= dx * k; rope.y[i] -= dy * k;
      }
    }
  }
  function ropeAt(d) { // point + direction at arc distance d from the tweezers
    let acc = 0;
    for (let i = 1; i < rope.n; i++) {
      const dx = rope.x[i] - rope.x[i - 1], dy = rope.y[i] - rope.y[i - 1], l = Math.hypot(dx, dy);
      if (acc + l >= d || i === rope.n - 1) { const t = l > 0 ? clamp((d - acc) / l) : 0; return { x: rope.x[i - 1] + dx * t, y: rope.y[i - 1] + dy * t, a: Math.atan2(dy, dx), past: acc + l < d }; }
      acc += l;
    }
    return { x: rope.x[0], y: rope.y[0], a: 0, past: true };
  }
  // letters [s0, s1] of a strip hung on the rope: letter s sits at rope distance (sTop - s) * k
  function drawRopeText(o, glyphs, sTop, s0, s1, px, k, bulb) { // k < 0: the strip runs outward from the tweezers
    if (rope.len < 3) return;
    const col = o.white ? cfg.paleInk : cfg.ink;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); for (let i = 0; i < rope.n; i++) { if (i) g.lineTo(rope.x[i] + 2 * S, rope.y[i] + 3 * S); else g.moveTo(rope.x[i] + 2 * S, rope.y[i] + 3 * S); }
    g.strokeStyle = 'rgba(70,24,24,.12)'; g.lineWidth = px * 0.5; g.stroke();
    g.beginPath(); for (let i = 0; i < rope.n; i++) { if (i) g.lineTo(rope.x[i], rope.y[i]); else g.moveTo(rope.x[i], rope.y[i]); }
    g.strokeStyle = `rgba(${rgbOf(col)},.32)`; g.lineWidth = Math.max(0.7, px * 0.06); g.stroke();
    let more = false, endP = null;
    for (const gl of glyphs) {
      if (gl.sc < s0 || gl.sc > s1) continue;
      const d = (sTop - gl.sc) * k;
      if (d > rope.len + 1) { more = true; continue; }
      const p = ropeAt(Math.max(0, d));
      glyph(gl.ch, p.x, p.y, k < 0 ? p.a : p.a + Math.PI, px, col);
      endP = p;
    }
    setM(DPR, 0, 0);
    const e = ropeAt(rope.len);
    if (more) { g.strokeStyle = col; g.lineWidth = 1.2 * S; g.beginPath(); g.arc(e.x, e.y, 4.5 * S, 0, 7); g.stroke(); }
    if (bulb && !more) { const b = ropeAt(rope.len); g.fillStyle = '#f1e5d2'; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.ellipse(b.x + Math.cos(b.a) * px * 0.4, b.y + Math.sin(b.a) * px * 0.4, px * 0.22, px * 0.34, b.a + Math.PI / 2, 0, 7); g.fill(); g.stroke(); }
    return endP;
  }

  function onDown(e) {
    if (!alive || ptr) return;
    e.stopPropagation(); e.preventDefault();
    sfx.init(); if (hooks.armAudio) try { hooks.armAudio(); } catch (_) {}
    lastAct = performance.now();
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const t = tipOf(e);
    if (editTool !== 'off') { editDown(e, t); return; }
    if (fade) return;
    if (over) { if (hitAgain(t.x, t.y)) restart(); return; }
    const w = toWorld(t.x, t.y);
    ptr = { id: e.pointerId, sx: t.x, sy: t.y, psx: t.x, psy: t.y, x: w.x, y: w.y, mode: null, hair: null, carry: null, mouse: e.pointerType === 'mouse', sc: 0 };
    hover = t;
    if (hitButton(t.x, t.y)) { ptr.mode = 'button'; return; }
    if (stun > 0) return;
    if (cfg.place && onSheet(t.x, t.y)) {
      const o = t.y - sheetRect().y < 14 * S ? null : pickItem(t.x, t.y);
      if (o) { ptr.mode = 'carry'; ptr.carry = o; o.placed = false; ropeReset(t.x, t.y); }
      else { ptr.mode = 'sheet'; ptr.ox = sheet.x - t.x; ptr.oy = sheet.y - t.y; }
      return;
    }
    started = true;
    const h = hairNear(w.x, w.y, 'in', digR()) ? null : outNear(w.x, w.y);
    if (h) {
      ptr.mode = 'pull'; ptr.hair = h; h.state = 'held'; h.grip = h.ext;
      ropeReset(t.x, t.y);
      if (!h.surface) { focusOn(h, 1.2); sfx.beep(900, 700, 0.04, 'square', 0.08); }
    } else ptr.mode = 'dig';
  }
  function onMove(e) {
    const t = tipOf(e);
    if (e.pointerType === 'mouse' || ptr) hover = t;
    if (editTool !== 'off') { editMove(e, t); return; }
    if (!ptr || e.pointerId !== ptr.id) return;
    ptr.sx = t.x; ptr.sy = t.y;
    if (ptr.mode === 'sheet') { sheet.x = ptr.ox + t.x; sheet.y = ptr.oy + t.y; sheetClamp(); }
    if (ptr.mode === 'dig' && !over && stun <= 0 && !(cfg.place && onSheet(t.x, t.y))) dig(ptr);
    ptr.psx = t.x; ptr.psy = t.y;
  }
  function release(e) {
    if (editTool !== 'off') { editUp(e); return; }
    if (!ptr || (e && e.pointerId !== ptr.id)) return;
    lastAct = performance.now();
    if (ptr.mode === 'button') { const b = hitButton(ptr.sx, ptr.sy); ptr = null; if (b) b.run(); return; }
    if (ptr.hair && ptr.hair.state === 'held') ptr.hair.state = 'out';
    if (ptr.carry) { if (cfg.place && onSheet(ptr.sx, ptr.sy)) putDown(ptr.carry); else fly(ptr.carry, rope.x[rope.n - 1], rope.y[rope.n - 1]); }
    if (!ptr.mouse) hover = null;
    ptr = null;
  }
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !ptr) hover = null; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });

  function popOut(h) {
    h.cover = 0; h.state = 'out'; h.ext = Math.min(h.L, Math.max(12 * S, F * 1.2)); h.grip = 0;
    ring(h.hole.x, h.hole.y, 'rgba(255,255,255,.9)');
  }
  function dig(p) {
    const a = toWorld(p.psx, p.psy), b = toWorld(p.sx, p.sy), m = Math.hypot(b.x - a.x, b.y - a.y);
    if (m < 0.4) return;
    const d = patch.dmg.getContext('2d');
    d.setTransform(DPR, 0, 0, DPR, 0, 0); d.lineCap = 'round';
    const h = hairNear(b.x, b.y, 'in', digR());
    const nearAny = patch.hairs.some(o => !o.surface && o.state !== 'done' && Math.hypot(o.hole.x - b.x, o.hole.y - b.y) < 32 * S);
    if (h) {
      focusOn(h, 1.5);
      h.cover -= m / ((70 + 130 * h.depth) * S * cfg.openEffort);
      patch.hint = Math.min(patch.hint, 0.5);
      d.strokeStyle = 'rgba(212,92,92,.16)'; d.lineWidth = 2.6 * S;
      d.beginPath(); d.moveTo(a.x, a.y); d.lineTo(b.x, b.y); d.stroke();
      p.sc += m;
      if (p.sc > 14 * S) { p.sc = 0; sfx.burst(fr(2400, 3600), 0.03, 0.16, 0, 2); puff(b.x, b.y, 2, 'flake', 'rgba(255,240,228,.9)'); }
      if (h.cover <= 0) { popOut(h); sfx.peek(); vibrate(8); if (patch.hint) patch.hint = 0.25; }
    } else if (!nearAny && cfg.painRate > 0) {
      pain += m * 0.0013 / S * cfg.painRate;
      d.strokeStyle = 'rgba(206,44,54,.34)'; d.lineWidth = 2 * S;
      d.beginPath(); d.moveTo(a.x, a.y); d.lineTo(b.x, b.y); d.stroke();
      d.strokeStyle = 'rgba(255,255,255,.22)'; d.lineWidth = 1 * S;
      d.beginPath(); d.moveTo(a.x + S, a.y - S); d.lineTo(b.x + S, b.y - S); d.stroke();
      p.sc += m;
      if (p.sc > 18 * S) { p.sc = 0; sfx.burst(1200, 0.04, 0.14, 0, 1); }
      if (pain >= 1) ouch();
    }
  }
  function ouch() {
    stun = 2.2; stuns++; pain = 0.35; shake = 0.5;
    if (ptr) { if (ptr.hair && ptr.hair.state === 'held') ptr.hair.state = 'out'; if (ptr.carry) fly(ptr.carry, ptr.sx, ptr.sy); ptr.mode = null; ptr.hair = null; ptr.carry = null; }
    say(W / 2, H * 0.42, T.ouch, '#e5484d', 34); sfx.ouch(); vibrate([40, 40, 40]);
  }

  // ── Collected strips ──
  const letterCount = str => Array.from(str.replace(/\s/g, '')).length;
  function collect(h, text, broken) {
    text = text.trim();
    if (letterCount(text) < 1) return null;
    const { glyphs, L } = glyphsOf(text, tissuePx());
    const e = { text, glyphs, L, n: letterCount(text), type: h.type, white: h.white, broken, seed: h.seed, age: 0, placed: false, order: got.length };
    got.push(e);
    return e;
  }
  const tissuePx = () => Math.max(8, F * 0.7);
  function fly(e, x, y) { if (e.placed || flyers.some(f => f.e === e)) return; landSpot(e, x, y); flyers.push({ e, x0: x, y0: y, t: 0 }); }
  function pluck(h) {
    const e = collect(h, h.text, false);
    puff(h.hole.x, h.hole.y, 3, 'flake', 'rgba(255,240,228,.9)');
    sfx.beep(1250 + Math.random() * 500, 820, 0.035, 'sine', 0.13); vibrate(6);
    h.state = 'done'; h.heal = 1;
    if (ptr) { ptr.mode = e ? 'carry' : null; ptr.carry = e; ptr.hair = null; } else if (e) settle(e, h.hole.x, h.hole.y);
    if (patch.hairs.every(o => o.state === 'done')) clearT = 1.0;
  }
  const textOut = (h, upTo) => h.glyphs.filter(gl => gl.sc <= upTo).map(gl => gl.ch).join('');
  function finishHair(h) {
    const longest = got.reduce((s, o) => Math.max(s, o.n), 0);
    const e = collect(h, h.text, false), n = e ? e.n : 0, big = n >= 40;
    puff(h.hole.x, h.hole.y, big ? 30 : 12, 'spark', '#ffffff'); ring(h.hole.x, h.hole.y, 'rgba(255,255,255,.95)');
    const sp = ptr ? { x: ptr.sx, y: ptr.sy } : toScreen(h.hole.x, h.hole.y);
    say(sp.x, sp.y - 30 * S, `+${n} ${T.letters}`, '#3b1f2a', big ? 30 : 22);
    say(W / 2, topPad + 28 * S, h.text, cfg.ink, Math.max(13, F * 0.95) / S, 3.2, 'italic ');
    if (n > longest && got.length > 1) say(sp.x, sp.y - 62 * S, T.longest, '#e5484d', 17);
    if (h.type === 'giant' || n >= 90) say(W / 2, H * 0.32, T.huge, '#b8860b', 30);
    else if (h.white) sayW(h.hole.x, h.hole.y + 30 * S, T.pale, '#6f6a64', 16);
    sfx.pop(big); vibrate(big ? [20, 30, 60] : 18); shake = big ? 0.3 : 0.1;
    slow = big ? 0.95 : 0.45; cam.hold = 1.1;
    pain = Math.max(0, pain - 0.08);
    if (patch.hint) patch.hint = 0;
    fire(h.onExtract, h.hole.x, h.hole.y);
    if (ptr) { ptr.mode = e ? 'carry' : null; ptr.carry = e; ptr.hair = null; } else if (e) settle(e, h.hole.x, h.hole.y);
    if (h.chain) {
      let k = 0;
      patch.hairs.forEach(o => { if (o !== h && o.state === 'in' && !o.surface && Math.hypot(o.x - h.x, o.y - h.y) < 210 * S) { popOut(o); k++; } });
      if (k) { sayW(h.hole.x, h.hole.y + 34 * S, T.dragged(k), '#4f7c94', 16); sfx.peek(); }
    }
    if (h.twin) { // a second line was sharing the same pore
      const gl = glyphsOf(h.twin, F * h.thick);
      h.text = h.twin; h.glyphs = gl.glyphs; h.L = gl.L; h.twin = ''; h.snags = []; h.white = false; h.chain = false; h.tick = 0; h.seed += 7;
      h.ext = Math.min(h.L, 12 * S); h.grip = 0; h.tension = 0; h.state = 'out'; h.onExtract = null;
      sayW(h.hole.x, h.hole.y + 34 * S, T.another, '#4f7c94', 16);
    } else { h.state = 'done'; h.heal = 1; }
    if (patch.hairs.every(o => o.state === 'done')) clearT = 1.0;
  }
  function snapHair(h) {
    // it breaks at the last letter fully out; the rest sinks back and re-closes a little
    let cutIdx = 0; h.glyphs.forEach((gl, i) => { if (gl.s0 + gl.w <= h.ext) cutIdx = i + 1; });
    const cut = cutIdx ? h.glyphs[cutIdx - 1].s0 + h.glyphs[cutIdx - 1].w : 0;
    const e = collect(h, textOut(h, cut), true);
    const rest = h.glyphs.slice(cutIdx);
    h.text = rest.map(gl => gl.ch).join('').trimStart();
    const gl = glyphsOf(h.text, F * h.thick); h.glyphs = gl.glyphs; h.L = gl.L;
    h.snags = h.snags.map(s => s - cut).filter(s => s > F && s < h.L - F);
    h.ext = 0; h.grip = 0; h.tension = 0; h.tick = 0; h.cover = 0.45; h.state = 'in';
    snaps++; pain += 0.2; shake = 0.2;
    const sp = ptr ? { x: ptr.sx, y: ptr.sy } : toScreen(h.hole.x, h.hole.y);
    say(sp.x, sp.y - 26 * S, e ? `${T.snapped} ${e.n}` : T.snapped, '#e5484d', 18);
    sfx.snap(); vibrate(30);
    if (e) fly(e, sp.x, sp.y);
    if (letterCount(h.text) < 2) { h.state = 'done'; if (patch.hairs.every(o => o.state === 'done')) clearT = 1.0; }
    if (ptr) { ptr.mode = null; ptr.hair = null; }
    if (pain >= 1) ouch();
  }

  // ── The tissue ──
  const sheetRect = () => ({ x: 8 + sheet.x, y: H - trayH + 4 + sheet.y, w: W - 16, h: Math.round(Math.max(trayH * 2.3, H * 0.7)) });
  const onSheet = (x, y) => { const r = sheetRect(); return x >= r.x && x <= r.x + r.w && y >= r.y - 4 && y <= r.y + r.h; };
  function sheetClamp() { const w = W - 16 - 90 * S; sheet.x = clamp(sheet.x, -w, w); sheet.y = clamp(sheet.y, topPad + 8 - (H - trayH + 4), 0); }
  const rowH = () => tissuePx() * 1.45;
  function autoSlot(e) { // without hand placement: one line under the other, like a page
    const i = got.filter(o => o !== e && o.px !== undefined && o.auto).length;
    return { px: 14 * S, py: 12 * S + rowH() * (i + 0.5), pa: 0 };
  }
  function landSpot(e, x, y) {
    const r = sheetRect(), m = 10 * S, len = Math.min(e.L, r.w - 2 * m);
    if (!cfg.place) { Object.assign(e, autoSlot(e)); e.auto = true; return; }
    e.pa = 0; e.px = clamp(x - r.x - len / 2, m, Math.max(m, r.w - m - len)); e.py = clamp(y - r.y, m + 4 * S, Math.max(m + 4 * S, Math.min(r.h, H - r.y) - 10 * S));
  }
  function settle(e, wx, wy) { const sp = toScreen(wx, wy); landSpot(e, sp.x, sp.y); e.placed = true; }
  function pickItem(x, y) {
    const r = sheetRect(); let best = null, bd = 12 * S;
    for (const o of got) {
      if (!o.placed || o.px === undefined) continue;
      const ax = r.x + o.px, ay = r.y + o.py, L = Math.min(o.L, r.w), ux = Math.cos(o.pa), uy = Math.sin(o.pa), t = clamp(((x - ax) * ux + (y - ay) * uy) / Math.max(1, L));
      const d = Math.hypot(x - ax - ux * L * t, y - ay - uy * L * t);
      if (d <= bd) { bd = d; best = o; }
    }
    return best;
  }
  function putDown(e) { // let go over the tissue: it stays right there, lying the way it was trailing
    const r = sheetRect(), last = rope.n - 1, dx = rope.x[last] - ptr.sx, dy = rope.y[last] - ptr.sy;
    const a = Math.hypot(dx, dy) < 6 * S ? 0 : Math.atan2(dy, dx);
    e.pa = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > Math.PI / 2 ? a + Math.PI : a; // never upside down on the tissue
    e.pa = clamp(Math.atan2(Math.sin(e.pa), Math.cos(e.pa)), -0.18, 0.18);
    const m = 10 * S, len = Math.min(e.L, r.w - 2 * m);
    e.px = clamp(ptr.sx - r.x - 6 * S, m, Math.max(m, r.w - m - len)); e.py = clamp(ptr.sy - r.y, m, r.h - m);
    e.placed = true; e.auto = false; e.age = 0.12; sfx.burst(700, 0.03, 0.12); vibrate(5);
  }
  function drawStrip(c, e, x, y, ang, px, k = 1) { // a pulled line laid out flat, keeping a little of its curl
    const col = e.white ? cfg.paleInk : cfg.ink;
    const wav = e.type === 'arc' || e.type === 'hook' || e.type === 'pin' ? 0.12 : e.type === 'fuzz' ? 0.05 : 0.22;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const upto = e.L * k;
    c.font = font(px); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col;
    for (const gl of e.glyphs) {
      if (gl.sc > upto || gl.ch === ' ') continue;
      const off = Math.sin(gl.sc / (px * 3) + e.seed) * px * wav, tilt = Math.cos(gl.sc / (px * 3) + e.seed) * wav * 0.7;
      const gx = x + cs * gl.sc - sn * off, gy = y + sn * gl.sc + cs * off;
      c.save(); c.translate(gx, gy); c.rotate(ang + tilt); c.fillText(gl.ch, 0, 0); c.restore();
    }
    if (!e.broken && k >= 1) { // the root
      const ex = x + cs * (e.L + px * 0.35), ey = y + sn * (e.L + px * 0.35);
      c.fillStyle = '#f1e5d2'; c.strokeStyle = col; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(ex, ey, px * 0.32, px * 0.2, ang, 0, 7); c.fill(); c.stroke();
    }
  }
  function drawSheet(full) {
    const r = full ? { x: 14 * S, y: topPad + 44 * S, w: W - 28 * S, h: H - topPad - 100 * S } : sheetRect();
    g.fillStyle = 'rgba(70,24,24,.22)'; g.beginPath(); g.roundRect(r.x, r.y + 5, r.w, r.h, 16); g.fill();
    g.fillStyle = '#fcfbf7'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 16); g.fill();
    g.fillStyle = 'rgba(59,31,42,.045)';
    for (let yy = 10; yy < r.h - 6 && r.y + yy < H; yy += 10) for (let xx = 10 + ((yy / 10 | 0) % 2) * 5; xx < r.w - 6; xx += 10) g.fillRect(r.x + xx, r.y + yy, 1.5, 1.5);
    if (!full && cfg.place) { g.fillStyle = 'rgba(59,31,42,.2)'; g.beginPath(); g.roundRect(r.x + r.w / 2 - 19 * S, r.y + 5 * S, 38 * S, 4 * S, 2 * S); g.fill(); }
    return r;
  }
  function drawTray(dt) {
    const r = drawSheet(false);
    if (!got.length) {
      g.fillStyle = 'rgba(59,31,42,.45)'; g.font = font(11 * S, 'italic '); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(cfg.place ? T.tissue : T.tissueAuto, r.x + r.w / 2, r.y + trayH / 2 - 2);
      return;
    }
    g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, Math.max(0, H - r.y)); g.clip();
    got.forEach(o => {
      if (!o.placed) return;
      o.age += dt;
      if (o.px === undefined) Object.assign(o, autoSlot(o), { auto: true });
      drawStrip(g, o, r.x + o.px, r.y + o.py, o.pa, tissuePx(), clamp(o.age / 0.25));
    });
    g.restore();
  }

  // ── On-canvas buttons ──
  let buttons = [], lastButtons = [];
  function hitButton(x, y) { return lastButtons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null; }
  function button(label, x, y, run, align = 'right') {
    g.font = font(11.5 * S, '600 '); const w = g.measureText(label).width + 20 * S, h = 24 * S, bx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    g.fillStyle = 'rgba(59,31,42,.86)'; g.beginPath(); g.roundRect(bx, y, w, h, h / 2); g.fill();
    g.fillStyle = '#fcfbf7'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, bx + w / 2, y + h / 2 + 0.5);
    buttons.push({ x: bx, y, w, h, run });
  }

  // ── Drawing the buried lines ──
  function drawUnder(h) {
    if (h.surface) { // just its pore
      if (h.state === 'done') { if (h.heal > 0) { g.fillStyle = `rgba(196,84,84,${0.35 * h.heal})`; g.beginPath(); g.arc(h.hole.x, h.hole.y, 2.2 * S, 0, 7); g.fill(); } }
      else { g.fillStyle = 'rgba(60,32,28,.55)'; g.beginPath(); g.arc(h.hole.x, h.hole.y, 1.1 * S, 0, 7); g.fill(); }
      return;
    }
    if (h.state === 'done') {
      if (h.heal <= 0) return;
      g.fillStyle = `rgba(196,84,84,${0.45 * h.heal})`; g.beginPath(); g.arc(h.hole.x, h.hole.y, 4 * S, 0, 7); g.fill();
      return;
    }
    const rem = h.L - h.ext, vis = Math.min(rem, h.visL), deep = rem > h.visL; // deep: the rest runs out of sight
    const rg = g.createRadialGradient(h.x, h.y, 2, h.x, h.y, h.rad * 1.3);
    rg.addColorStop(0, `rgba(214,92,84,${0.2 * (1 - h.depth * 0.45)})`); rg.addColorStop(1, 'rgba(214,92,84,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(h.x, h.y, h.rad * 1.3, 0, 7); g.fill();
    g.lineCap = 'round'; g.lineJoin = 'round';
    const col = rgbOf(inkOf(h)), aTip = lerp(0.82, 0.5, h.depth), aRoot = lerp(0.34, 0.15, h.depth);
    // the channel the line lies in, a soft swelling under the skin
    const B = 9;
    for (let b = 0; b < B; b++) {
      const u0 = h.visL * b / B, u1 = h.visL * (b + 1) / B, mid = (b + 0.5) / B;
      if (u0 >= vis) break;
      const sink = deep ? clamp((1 - mid) / 0.4) : 1;
      strokeRange(h, Math.max(0, u0 - 1), Math.min(u1, vis), F * 1.15, `rgba(120,58,48,${0.075 * sink})`);
      strokeRange(h, Math.max(0, u0 - 1), Math.min(u1, vis), 0.8 * S, `rgba(${col},${lerp(aTip, aRoot, mid) * 0.35 * sink})`);
    }
    // the letters themselves: they slide along the channel toward the pore as the line comes out
    const base = curM;
    for (const gl of h.glyphs) {
      const u = gl.sc - h.ext;
      if (u < 0 || u > vis) continue;
      const mid = u / Math.max(1, h.visL), sink = deep ? clamp((1 - mid) / 0.4) : 1;
      let a = lerp(aTip, aRoot, mid) * sink;
      if (u < F * 1.6 && h.cover < 1) a = lerp(a, 0.95, 1 - h.cover); // the opening shows the dark tip clearly
      const p = pointAt(h, u);
      glyph(gl.ch, p.x, p.y, p.a, F * h.thick, `rgb(${col})`, a);
    }
    setM(base.a, base.e, base.f);
    if (!deep) { const rp = pointAt(h, rem + F * 0.25); g.fillStyle = `rgba(243,230,212,${lerp(0.75, 0.4, h.depth)})`; g.beginPath(); g.arc(rp.x, rp.y, F * 0.2 * h.thick, 0, 7); g.fill(); }
  }
  function drawOpening(h) {
    if (h.surface || h.state === 'done' || h.cover >= 1) return;
    const r = lerp(2.4, 7.5, 1 - h.cover) * S, { x, y } = h.hole;
    g.fillStyle = 'rgba(196,74,76,.6)'; g.beginPath(); g.ellipse(x, y, r, r * 0.82, 0.4, 0, 7); g.fill();
    g.fillStyle = 'rgba(118,30,42,.5)'; g.beginPath(); g.ellipse(x, y, r * 0.55, r * 0.42, 0.4, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,240,230,.55)'; g.lineWidth = 1.3 * S; g.beginPath(); g.arc(x, y, r + 1.2 * S, 3.6, 5.6); g.stroke();
  }
  function drawOutside(h, now) {
    if (h.state !== 'out' && h.state !== 'held') return;
    const col = inkOf(h), px = h.surface ? h.gpx : F * h.thick, { x, y } = h.hole, base = curM;
    if (h.state === 'out') { // lying still, sticking out of the pore
      const cap = h.surface ? h.ext : Math.min(h.ext, 110 * S), nx = -h.out.y, ny = h.out.x;
      let more = false;
      // shadow line
      g.beginPath(); g.moveTo(x + 1.5 * S, y + 2.5 * S); g.lineTo(x + h.out.x * cap * 0.9 + 1.5 * S, y + h.out.y * cap * 0.9 + 2.5 * S);
      g.strokeStyle = 'rgba(70,24,24,.13)'; g.lineWidth = px * 0.55; g.lineCap = 'round'; g.stroke();
      for (const gl of h.glyphs) {
        const d = h.ext - gl.sc; // distance out from the pore
        if (d < 0) continue;
        if (d > cap) { more = true; continue; }
        const k = Math.sin(d * 0.05 / S + h.wig) * (h.surface ? 0.7 : 2.2) * S * Math.min(1, d / (10 * S));
        glyph(gl.ch, x + h.out.x * d + nx * k, y + h.out.y * d + ny * k, Math.atan2(-h.out.y, -h.out.x), px, col);
      }
      setM(base.a, base.e, base.f);
      if (more) { const ex = x + h.out.x * cap, ey = y + h.out.y * cap; g.strokeStyle = col; g.lineWidth = 1.2 * S; g.beginPath(); g.arc(ex, ey, 4 * S, 0, 7); g.stroke(); }
      return;
    }
    // held: stretched from the pore to the tweezers, thinning and reddening as it nears snapping
    const t = clamp(h.tension), dx = ptr.x - x, dy = ptr.y - y, D = Math.hypot(dx, dy) || 1;
    const jit = t > 0.55 ? Math.sin(now * 0.09) * (t - 0.55) * 7 * S : 0, nx = -dy / D, ny = dx / D, hot = clamp((t - 0.55) / 0.45);
    const cx = (x + ptr.x) / 2 + nx * jit, cy = (y + ptr.y) / 2 + ny * jit;
    const hotCol = hot > 0 && !h.white ? `rgb(${Math.round(lerp(43, 214, hot))},${Math.round(lerp(26, 50, hot))},${Math.round(lerp(23, 56, hot))})` : col;
    g.strokeStyle = 'rgba(70,24,24,.14)'; g.lineWidth = px * 0.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x + 3 * S, y + 4 * S); g.lineTo(ptr.x + 3 * S, ptr.y + 4 * S); g.stroke();
    g.strokeStyle = hotCol; g.globalAlpha = 0.4; g.lineWidth = Math.max(0.6, 0.9 * S * lerp(1, 0.6, t));
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(cx, cy, ptr.x, ptr.y); g.stroke(); g.globalAlpha = 1;
    const span = Math.max(1, h.ext - h.grip);
    for (const gl of h.glyphs) {
      if (gl.sc > h.ext || gl.sc < h.grip) continue;
      const q = clamp((h.ext - gl.sc) / span), u = 1 - q; // q: 0 at the pore, 1 at the tweezers
      const qx = u * u * x + 2 * u * q * cx + q * q * ptr.x, qy = u * u * y + 2 * u * q * cy + q * q * ptr.y;
      const tx = 2 * u * (cx - x) + 2 * q * (ptr.x - cx), ty = 2 * u * (cy - y) + 2 * q * (ptr.y - cy);
      glyph(gl.ch, qx, qy, Math.atan2(-ty, -tx), px * lerp(1, 0.86, t), hotCol);
    }
    setM(base.a, base.e, base.f);
  }
  function drawTool() {
    if (!hover || editTool !== 'off' || over) return;
    const x = ptr ? ptr.sx : hover.x, y = ptr ? ptr.sy : hover.y, holding = ptr && (ptr.mode === 'pull' || ptr.mode === 'carry');
    if (!holding && (hitButton(x, y))) return;
    const wp = toWorld(x, y), tweeze = holding || (!ptr || ptr.mode !== 'dig') && !hairNear(wp.x, wp.y, 'in', digR()) && (outNear(wp.x, wp.y) || (cfg.place && onSheet(x, y) && pickItem(x, y)));
    const px = -TOOL.y, py = TOOL.x, len = 110 * S;
    g.lineCap = 'round';
    if (tweeze) {
      const gap = holding ? 0.6 * S : 5 * S;
      for (const sgn of [-1, 1]) {
        const ax = x + px * gap * sgn, ay = y + py * gap * sgn, bx = x + TOOL.x * len + px * 9 * S * sgn, by = y + TOOL.y * len + py * 9 * S * sgn;
        g.strokeStyle = 'rgba(60,20,24,.2)'; g.lineWidth = 6 * S; g.beginPath(); g.moveTo(ax + 3 * S, ay + 5 * S); g.lineTo(bx + 3 * S, by + 5 * S); g.stroke();
        g.strokeStyle = '#4f7c94'; g.lineWidth = 5 * S; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.4 * S; g.beginPath(); g.moveTo(ax - S, ay - S); g.lineTo(lerp(ax, bx, 0.7) - S, lerp(ay, by, 0.7) - S); g.stroke();
      }
    } else { // the needle
      const bx = x + TOOL.x * len, by = y + TOOL.y * len, mx = x + TOOL.x * len * 0.5, my = y + TOOL.y * len * 0.5;
      g.strokeStyle = 'rgba(60,20,24,.2)'; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(x + 2 * S, y + 4 * S); g.lineTo(bx + 4 * S, by + 6 * S); g.stroke();
      g.strokeStyle = '#8fa3ad'; g.lineWidth = 1.8 * S; g.beginPath(); g.moveTo(x, y); g.lineTo(mx, my); g.stroke();
      g.strokeStyle = '#3b1f2a'; g.lineWidth = 6 * S; g.beginPath(); g.moveTo(mx, my); g.lineTo(bx, by); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1.4 * S; g.beginPath(); g.moveTo(mx - S, my - S); g.lineTo(bx - S, by - S); g.stroke();
    }
  }

  // ── HUD ──
  const totalLetters = () => got.reduce((s, o) => s + o.n, 0);
  const wholeLines = () => got.filter(o => !o.broken && o.type !== 'fuzz').length;
  function drawHud() {
    const pad = 10 * S;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    const left = patch.hairs.filter(o => o.state !== 'done').length;
    const l1 = patch.cfg.name, l2 = `${wholeLines()} ${T.lines} · ${totalLetters()} ${T.letters}`, l3 = T.left(left);
    g.font = font(12.5 * S, '600 '); const w = Math.max(g.measureText(l2).width, g.measureText(l1).width) + 20 * S;
    g.fillStyle = 'rgba(252,251,247,.82)'; g.beginPath(); g.roundRect(pad, pad, w, 50 * S, 12 * S); g.fill();
    g.fillStyle = 'rgba(59,31,42,.6)'; g.font = font(10.5 * S, 'italic '); g.fillText(l1, pad + 10 * S, pad + 11 * S);
    g.fillStyle = '#3b1f2a'; g.font = font(12.5 * S, '600 '); g.fillText(l2, pad + 10 * S, pad + 25 * S);
    g.fillStyle = 'rgba(59,31,42,.6)'; g.font = font(10.5 * S); g.fillText(l3, pad + 10 * S, pad + 39 * S);
    // right: clock + pain
    const bw = 96 * S, bx = W - pad - bw;
    g.fillStyle = 'rgba(252,251,247,.82)'; g.beginPath(); g.roundRect(bx - 8 * S, pad, bw + 16 * S, cfg.mode === 'timed' ? 50 * S : 30 * S, 12 * S); g.fill();
    let yy = pad + 10 * S;
    if (cfg.mode === 'timed') {
      const low = timeLeft <= 10;
      g.fillStyle = low ? '#e5484d' : '#3b1f2a'; g.font = font(15 * S, '600 '); g.textAlign = 'left'; g.fillText(String(Math.ceil(Math.max(0, timeLeft))), bx, yy + 2 * S);
      g.fillStyle = 'rgba(59,31,42,.15)'; g.beginPath(); g.roundRect(bx + 26 * S, yy - 2 * S, bw - 26 * S, 5 * S, 2.5 * S); g.fill();
      g.fillStyle = low ? '#e5484d' : '#4f7c94'; g.beginPath(); g.roundRect(bx + 26 * S, yy - 2 * S, (bw - 26 * S) * clamp(timeLeft / cfg.timeLimit), 5 * S, 2.5 * S); g.fill();
      yy += 20 * S;
    }
    g.fillStyle = 'rgba(59,31,42,.6)'; g.font = font(10.5 * S, 'italic '); g.textAlign = 'left'; g.fillText(T.pain, bx, yy);
    g.fillStyle = 'rgba(59,31,42,.15)'; g.beginPath(); g.roundRect(bx + 30 * S, yy - 2.5 * S, bw - 30 * S, 5 * S, 2.5 * S); g.fill();
    g.fillStyle = '#e5484d'; g.beginPath(); g.roundRect(bx + 30 * S, yy - 2.5 * S, (bw - 30 * S) * clamp(pain), 5 * S, 2.5 * S); g.fill();
    const canSkip = !fade && clearT < 0 && !patch.hairs.some(o => !o.surface && o.state !== 'done') && patch.hairs.some(o => o.state !== 'done');
    if (canSkip) button(T.next, W - pad, pad + (cfg.mode === 'timed' ? 58 : 38) * S, nextPatch);
    else if (cfg.mode === 'chill' && cfg.endless && got.length) button(T.finish, W - pad, pad + 38 * S, () => endRound());
  }
  function nextPatch() { // leave the fuzz: the buried lines are what counts, so this patch still counts as done
    if (fade || clearT >= 0 || over) return;
    patch.cleared = true;
    if (!patch.clearFired) { patch.clearFired = true; fire(patch.cfg.onClear, W / 2, H / 2); }
    sfx.beep(520, 660, 0.12, 'triangle', 0.16);
    if (patchConfig(level + 1)) fade = { t: 0, swapped: false }; else endRound();
  }

  // ── Result: the tissue held up, with every line in the order it came out ──
  let againBtn = null;
  function rankOf(total) { const r = T.ranks.find(q => total >= q[0]); return r; }
  function endRound() {
    if (over) return;
    if (ptr && ptr.hair && ptr.hair.state === 'held') ptr.hair.state = 'out';
    ptr = null; hover = null; flyers.length = 0; slow = 0;
    got.forEach(o => { o.placed = true; });
    sfx.loop(sfx.slide, 0); sfx.loop(sfx.strain, 0);
    const total = totalLetters(), r = rankOf(total);
    const title = cfg.mode === 'chill' ? T.chill.find(q => total >= q[0])[1] : r[2];
    over = { t: 0, total, rank: cfg.mode === 'chill' ? '' : r[1], title, lines: got.filter(o => o.type !== 'fuzz').slice(), fuzzN: got.filter(o => o.type === 'fuzz').length };
    if (r[1][0] === 'S' || r[1] === 'A') [523, 659, 784, 1047].forEach((f, i) => sfx.beep(f, f, 0.22, 'triangle', 0.22, i * 0.11));
    else [523, 587].forEach((f, i) => sfx.beep(f, f, 0.2, 'triangle', 0.2, i * 0.14));
    fire(cfg.onComplete, W / 2, H / 2);
  }
  const hitAgain = (x, y) => againBtn && x >= againBtn.x && x <= againBtn.x + againBtn.w && y >= againBtn.y && y <= againBtn.y + againBtn.h;
  function drawResult(dt) {
    over.t += dt;
    const k = clamp(over.t / 0.5);
    g.fillStyle = `rgba(252,251,247,${0.45 * k})`; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = k; g.translate(0, (1 - k) * 30 * S);
    const r = drawSheet(true);
    g.fillStyle = '#3b1f2a'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = font(20 * S, 'italic '); g.fillText(T.result, r.x + 4 * S, r.y - 14 * S);
    g.font = font(12 * S, '600 '); g.textAlign = 'right';
    g.fillText(`${wholeLines()} ${T.lines} · ${over.total} ${T.letters}`, r.x + r.w - 4 * S, r.y - 14 * S);
    // the found poem
    const avail = r.h - 24 * S - 46 * S, nL = Math.max(1, over.lines.length);
    const px = Math.max(7, Math.min(F * 0.85, avail / nL / 1.45)), lh = Math.min(px * 1.5, avail / nL);
    g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, r.h - 40 * S); g.clip();
    let yy = r.y + 24 * S;
    if (!over.lines.length) { g.fillStyle = 'rgba(59,31,42,.5)'; g.font = font(14 * S, 'italic '); g.textAlign = 'center'; g.fillText(T.nothing, r.x + r.w / 2, r.y + r.h / 2); }
    over.lines.forEach((o, i) => {
      if (yy > r.y + r.h - 46 * S) return;
      const show = clamp((over.t - 0.3 - i * 0.12) / 0.35);
      if (show <= 0) return;
      const gl = glyphsOf(o.text, px), item = { ...o, glyphs: gl.glyphs, L: gl.L };
      const maxW = r.w - 40 * S;
      if (item.L > maxW) { // too long for one line on the tissue: shrink it to fit
        const s = maxW / item.L; const g2 = glyphsOf(o.text, px * s); item.glyphs = g2.glyphs; item.L = g2.L;
        drawStrip(g, item, r.x + 20 * S, yy, 0, px * s, show);
      } else drawStrip(g, item, r.x + 20 * S, yy, 0, px, show);
      yy += lh;
    });
    g.restore();
    // footer
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#b3323a'; g.font = font(11 * S, '600 ');
    const fy = r.y + r.h - 20 * S;
    g.fillText(over.title, r.x + 14 * S, fy);
    g.fillStyle = 'rgba(59,31,42,.6)'; g.font = font(10.5 * S); g.textAlign = 'center';
    g.fillText(`${T.snaps(snaps)} · ${T.stuns(stuns)}`, r.x + r.w / 2, fy);
    if (over.rank) {
      const sc = over.rank[0] === 'S' ? '#f2b632' : over.rank === 'A' ? '#e5484d' : over.rank === 'B' ? '#4f7c94' : '#8a7a80';
      g.save(); g.translate(r.x + r.w - 34 * S, r.y + 6 * S); g.rotate(0.14);
      g.fillStyle = '#fcfbf7'; g.beginPath(); g.arc(0, 0, 26 * S, 0, 7); g.fill();
      g.strokeStyle = sc; g.lineWidth = 3 * S; g.beginPath(); g.arc(0, 0, 26 * S, 0, 7); g.stroke();
      g.fillStyle = sc; g.textAlign = 'center'; g.font = font((over.rank.length > 1 ? 22 : 28) * S, '700 '); g.fillText(over.rank, 0, 2 * S);
      g.restore();
    }
    g.restore();
    g.font = font(11.5 * S, '600 '); const bw = g.measureText(T.again).width + 24 * S, bh = 26 * S;
    againBtn = { x: r.x + r.w - bw - 10 * S, y: r.y + r.h - 20 * S - bh / 2, w: bw, h: bh };
    if (k >= 1) {
      g.fillStyle = '#3b1f2a'; g.beginPath(); g.roundRect(againBtn.x, againBtn.y, bw, bh, bh / 2); g.fill();
      g.fillStyle = '#fcfbf7'; g.textAlign = 'center'; g.fillText(T.again, againBtn.x + bw / 2, againBtn.y + bh / 2 + 0.5);
    }
  }

  // ── Round ──
  function restart(lv = 0) {
    level = lv; got = []; pain = 0; stun = 0; stuns = 0; snaps = 0; slow = 0; timeLeft = cfg.timeLimit; started = false; clearT = -1; ptr = null; fade = null; over = null;
    parts.length = 0; floats.length = 0; flyers.length = 0; sheet.x = 0; sheet.y = 0;
    cam.hair = null; cam.z = 1; cam.x = W / 2; cam.y = H / 2;
    patch = newPatch(level) || newPatch(0);
  }

  // ── Editor tools: move a line (drag its body) or turn it (drag its tip) ──
  function editLines() { return patch ? patch.hairs.filter(h => !h.surface) : []; }
  function editDown(e, t) {
    const w = toWorld(t.x, t.y);
    let best = null, bd = 1e9, mode = 'move';
    for (const h of editLines()) {
      const dh = Math.hypot(h.hole.x - w.x, h.hole.y - w.y);
      if (dh < 14 * S && dh < bd) { bd = dh; best = h; mode = 'turn'; continue; }
      for (let i = 0; i < h.pts.length; i += 2) { const d = Math.hypot(h.pts[i].x - w.x, h.pts[i].y - w.y); if (d < F && d < bd) { bd = d; best = h; mode = 'move'; } }
    }
    if (!best) { editSel = -1; hooks.onEditSelect?.(previewIdx(), -1); return; }
    editSel = best.idx;
    hooks.onEditSelect?.(previewIdx(), best.idx);
    editDrag = { id: e.pointerId, h: best, mode, sx: w.x, sy: w.y, ox: best.x, oy: best.y, a0: Math.atan2(best.hole.y - best.y, best.hole.x - best.x), ang0: Number.isFinite(best.spec.angle) ? best.spec.angle : best.a0 };
  }
  function editMove(e, t0) {
    if (!editDrag || e.pointerId !== editDrag.id) return;
    const t = toWorld(t0.x, t0.y);
    const d = editDrag, h = d.h;
    if (d.mode === 'move') {
      const nx = clamp(d.ox + t.x - d.sx, 0, W), ny = clamp(d.oy + t.y - d.sy, topPad, H - trayH);
      const dx = nx - h.x, dy = ny - h.y;
      h.pts.forEach(p => { p.x += dx; p.y += dy; }); h.x = nx; h.y = ny;
    } else {
      const a1 = Math.atan2(t.y - h.y, t.x - h.x), da = a1 - Math.atan2(h.hole.y - h.y, h.hole.x - h.x), c = Math.cos(da), s = Math.sin(da);
      h.pts.forEach(p => { const x = p.x - h.x, y = p.y - h.y; p.x = h.x + x * c - y * s; p.y = h.y + x * s + y * c; });
      d.turned = (d.turned || 0) + da;
    }
    h.hole = h.pts[0];
  }
  function editUp(e) {
    if (!editDrag || (e && e.pointerId !== editDrag.id)) return;
    const d = editDrag, h = d.h; editDrag = null;
    const patchIdx = previewIdx();
    const change = { x: +(h.x / W).toFixed(4), y: +((h.y - topPad) / Math.max(1, H - trayH - topPad)).toFixed(4) };
    if (d.mode === 'turn' && d.turned) change.angle = Math.round(((d.ang0 + d.turned * 180 / Math.PI) % 360 + 360) % 360);
    if (d.mode === 'move' && Math.hypot(h.x - d.ox, h.y - d.oy) < 2) return; // just a click: selection only
    const line = cfg.patches[patchIdx]?.lines?.[h.idx];
    if (line) Object.assign(line, change); // keep the live copy in step, so a re-layout doesn't undo the move
    Object.assign(h.spec, change);
    hooks.onEdit?.(patchIdx, h.idx, change);
  }
  const previewIdx = () => (previewPatch >= 0 ? previewPatch : level);
  function drawEditOverlay() {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const h of editLines()) {
      const sel = h.idx === editSel;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); h.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.strokeStyle = sel ? 'rgba(79,124,148,.55)' : 'rgba(59,31,42,.18)'; g.lineWidth = F * 1.2; g.stroke();
      g.fillStyle = sel ? '#4f7c94' : '#3b1f2a'; g.beginPath(); g.arc(h.hole.x, h.hole.y, 7 * S, 0, 7); g.fill();
      g.fillStyle = '#fcfbf7'; g.font = font(9 * S, '700 '); g.fillText(String(h.idx + 1), h.hole.x, h.hole.y + 0.5);
      g.fillStyle = sel ? '#4f7c94' : 'rgba(59,31,42,.6)'; g.font = font(9.5 * S, 'italic ');
      g.fillText(`${h.type}${h.spec.x === undefined ? ' · auto' : ''}`, h.x, h.y + h.rad * 0.2 + 10 * S);
    }
    g.fillStyle = 'rgba(59,31,42,.8)'; g.beginPath(); g.roundRect(8, H - 26 * S, W - 16, 20 * S, 10 * S); g.fill();
    g.fillStyle = '#fcfbf7'; g.font = font(10 * S); g.fillText(T.edit, W / 2, H - 16 * S);
  }

  // ── Loop ──
  function resize() {
    const nw = cv.clientWidth || el.clientWidth, nh = cv.clientHeight || el.clientHeight;
    if (nw < 2 || nh < 2) return false;
    if (nw === W && nh === H && patch) return true;
    W = nw; H = nh; DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    S = clamp(Math.min(W, H) / 400, 0.85, 1.4); F = cfg.fontSize * S; trayH = Math.round(74 * S); topPad = Math.round(62 * S); sheetClamp();
    cam.x = W / 2; cam.y = H / 2; cam.z = 1; cam.hair = null;
    // a new size lays the patch out afresh (lines are placed in proportion to it)
    const keepGot = got, keepLv = previewPatch >= 0 ? previewPatch : level;
    const keepOver = over;
    restart(keepLv); got = keepGot; over = keepOver;
    got.forEach(o => { const gl = glyphsOf(o.text, tissuePx()); o.glyphs = gl.glyphs; o.L = gl.L; if (o.auto) delete o.px; });
    return true;
  }
  function frame(now) {
    if (raf) cancelAnimationFrame(raf); // may also be called directly (resize): keep a single loop
    raf = 0;
    if (!alive) return;
    if (!el.isConnected) { destroy(); return; }
    const dtR = Math.min(0.05, (now - last) / 1000); last = now;
    raf = requestAnimationFrame(frame);
    if (!visible) { // asleep off-screen; the observer wakes it, and a cheap check every so often in case it doesn't
      if (++sleepTicks % 30 === 0) { const r = el.getBoundingClientRect(); visible = r.width > 0 && r.bottom > 0 && r.top < innerHeight; }
      if (!visible) return;
    }
    if (!resize() || !patch) return;
    buttons = [];
    if (editTool !== 'off' && hooks.isEditor && !hooks.isEditor()) { editTool = 'off'; editDrag = null; previewPatch = -1; hooks.onEditToolOff?.(); } // editor closed
    const editing = editTool !== 'off';
    const dt = dtR * (slow > 0 ? 0.22 : 1);
    slow = Math.max(0, slow - dtR);
    let sliding = 0, strain = 0;
    if (ptr) { const w = toWorld(ptr.sx, ptr.sy); ptr.x = w.x; ptr.y = w.y; }
    if (!over && !editing) {
      if (started && !fade && cfg.mode === 'timed') {
        timeLeft -= dt;
        const tk = Math.ceil(timeLeft);
        if (tk !== lastTick) { lastTick = tk; if (tk <= 5 && tk > 0) sfx.beep(880, 880, 0.07, 'square', 0.1); }
        if (timeLeft <= 0) { timeLeft = 0; endRound(); }
      }
      pain = Math.max(0, pain - 0.03 * dt);
      if (stun > 0) stun -= dt;
      if (!over && ptr && ptr.mode === 'pull') {
        const h = ptr.hair, snapT = 70 * S * cfg.snapTolerance, D = Math.hypot(ptr.x - h.hole.x, ptr.y - h.hole.y);
        if (h.surface) { if (D > 20 * S) pluck(h); }
        else {
          if (D < h.ext - h.grip) h.grip = h.ext - D; // moving back toward the skin re-grips lower down: reel it in
          const t = D - (h.ext - h.grip), root = h.L - Math.min(6 * S, h.L * 0.2), stop = h.snags.length ? Math.min(h.snags[0], root) : root;
          h.tension = t / snapT;
          if (t > 0 && h.ext < stop) { const rate = 9 / h.res * t; h.ext = Math.min(stop, h.ext + rate * dt); sliding = rate; }
          strain = clamp(h.tension);
          // a soft tick each time a whole word clears the pore, rising in pitch
          const wordsOut = h.glyphs.filter(gl => gl.ch === ' ' && gl.sc < h.ext).length;
          if (wordsOut > h.tick) { h.tick = wordsOut; h.bump = 1; const f = Math.min(1500, 420 + wordsOut * 70); sfx.beep(f, f, 0.05, 'triangle', 0.13); }
          if (h.ext >= stop) { // caught on a gap between words, or on the root: one firm tug gets it through
            if (t > snapT * 0.5) {
              if (stop < root) { h.snags.shift(); h.ext += 1; sfx.burst(2200, 0.03, 0.3, 0, 2); puff(h.hole.x, h.hole.y, 4, 'flake', 'rgba(255,240,228,.9)'); vibrate(10); }
              else finishHair(h);
            }
          } else if (t > snapT) snapHair(h);
        }
      }
      if (clearT < 0 && !fade && !patch.cleared && patch.hairs.every(o => o.state === 'done')) clearT = 1.0;
      if (clearT >= 0) {
        clearT -= dt;
        if (clearT < 0) {
          patch.cleared = true;
          const more = Boolean(patchConfig(level + 1));
          if (cfg.mode === 'timed') { timeLeft = Math.min(999, timeLeft + cfg.clearBonus); say(W / 2, H * 0.4, `${T.smooth} +${cfg.clearBonus}s`, '#4f7c94', 28); } else say(W / 2, H * 0.4, T.smooth, '#4f7c94', 28);
          sfx.beep(660, 990, 0.18, 'triangle', 0.2);
          if (!patch.clearFired) { patch.clearFired = true; fire(patch.cfg.onClear, W / 2, H / 2); }
          if (more) fade = { t: 0, swapped: false }; else setTimeout(() => { if (alive) endRound(); }, 900);
        }
      }
      if (fade) {
        fade.t += dtR / 0.7;
        if (fade.t >= 0.5 && !fade.swapped) {
          fade.swapped = true; const np = newPatch(level + 1);
          if (np) { level++; patch = np; } else endRound();
          cam.hair = null;
          if (ptr && ptr.mode !== 'carry' && ptr.mode !== 'sheet') { ptr.mode = null; ptr.hair = null; }
        }
        if (fade.t >= 1) fade = null;
      }
    }
    sfx.syncMute();
    sfx.loop(sfx.slide, !over ? clamp(sliding / (500 * S)) * 0.22 : 0);
    sfx.loop(sfx.strain, !over && strain > 0.5 ? (strain - 0.5) * 0.16 : 0);
    sfx.setStrainFreq(220 + strain * 520);
    camStep(dtR);

    // ---- world ----
    shake = Math.max(0, shake - dtR);
    const shx = shake > 0 ? Math.sin(now * 0.09) * shake * 10 * S : 0, shy = shake > 0 ? Math.cos(now * 0.11) * shake * 8 * S : 0;
    setM(DPR, 0, 0);
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#e7b292'; g.fillRect(0, 0, W, H);
    setM(DPR * cam.z, DPR * (W / 2 - cam.x * cam.z + shx), DPR * (H / 2 - cam.y * cam.z + shy));
    g.drawImage(patch.skin, 0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const h of patch.hairs) { if (h.state === 'done') h.heal = Math.max(0, h.heal - dt * 0.25); drawUnder(h); }
    g.drawImage(patch.dmg, 0, 0, W, H);
    for (const h of patch.hairs) drawOpening(h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const h of patch.hairs) drawOutside(h, now);
    if (!editing && !over && !fade && !ptr && clearT < 0 && now - lastAct > 3000) { // only a few left and nothing touched for a while: show where they are
      const rest = patch.hairs.filter(o => o.state !== 'done');
      if (rest.length && rest.length <= 3) {
        const pr = (now * 0.0012) % 1, r = (9 + pr * 22) * S;
        for (const o of rest) {
          g.strokeStyle = `rgba(59,31,42,${0.45 * (1 - pr)})`; g.lineWidth = 5 * S; g.beginPath(); g.arc(o.hole.x, o.hole.y, r, 0, 7); g.stroke();
          g.strokeStyle = `rgba(255,255,255,${0.95 * (1 - pr)})`; g.lineWidth = 2.6 * S; g.beginPath(); g.arc(o.hole.x, o.hole.y, r, 0, 7); g.stroke();
        }
      }
    }
    if (!editing && patch.hint > 0 && !fade && !over) {
      const digging = patch.hint === 1, h = digging ? patch.hairs.find(o => o.state === 'in') : patch.hairs.find(o => o.state === 'out' && !o.surface);
      if (h) {
        const pr = (now * 0.002) % 1;
        g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - pr)})`; g.lineWidth = 2.5 * S;
        g.beginPath(); g.arc(h.hole.x, h.hole.y, (10 + pr * 20) * S, 0, 7); g.stroke();
        g.font = font(12.5 * S, 'italic '); g.textAlign = 'center'; g.textBaseline = 'middle';
        const label = digging ? T.rub : T.pull, ly = h.hole.y - 30 * S, tw = g.measureText(label).width + 18 * S;
        const v0 = cam.x - W / (2 * cam.z) + 6, v1 = cam.x + W / (2 * cam.z) - 6, lx = clamp(h.hole.x, v0 + tw / 2, Math.max(v0 + tw / 2, v1 - tw / 2));
        g.fillStyle = '#3b1f2a'; g.beginPath(); g.roundRect(lx - tw / 2, ly - 11 * S, tw, 22 * S, 11 * S); g.fill();
        g.fillStyle = '#fcfbf7'; g.fillText(label, lx, ly + S);
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      const k = p.life / p.max;
      if (p.kind === 'ring') { g.strokeStyle = p.col; g.globalAlpha = k; g.lineWidth = 3 * S * k; g.beginPath(); g.arc(p.x, p.y, p.r + (1 - k) * 34 * S, 0, 7); g.stroke(); }
      else { p.vy += (p.kind === 'flake' ? 260 : 380) * S * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = clamp(k * 1.6); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
    if (editing) drawEditOverlay();

    // ---- screen ----
    setM(DPR, 0, 0);
    if (!editing && !over) {
      drawTray(dtR);
      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i], sr = sheetRect(), to = { x: sr.x + (f.e.px ?? 14 * S), y: sr.y + (f.e.py ?? 14 * S) };
        f.t += dtR / 0.42;
        if (f.t >= 1) { f.e.placed = true; f.e.age = 0; flyers.splice(i, 1); sfx.burst(700, 0.03, 0.12); continue; }
        const k = f.t * f.t * (3 - 2 * f.t);
        drawStrip(g, f.e, lerp(f.x0, to.x, k), lerp(f.y0, to.y, k) - Math.sin(k * Math.PI) * 60 * S, lerp(-0.6, f.e.pa || 0, k), tissuePx(), 1);
      }
      if (ptr && !over && (ptr.mode === 'pull' || ptr.mode === 'carry')) {
        const pulling = ptr.mode === 'pull', o = pulling ? ptr.hair : ptr.carry;
        const px = pulling ? (o.surface ? o.gpx : F * o.thick) * cam.z : tissuePx() * 1.25;
        const carried = pulling ? null : glyphsOf(o.text, px);
        const full = pulling ? o.grip * cam.z : carried.L, cap = (pulling ? 180 : 240) * S;
        let aim = null;
        if (pulling && o.hole) { const hs = toScreen(o.hole.x, o.hole.y), dx = ptr.sx - hs.x, dy = ptr.sy - hs.y; if (Math.hypot(dx, dy) > 8 * S) aim = Math.atan2(dy, dx); }
        ropeStep(ptr.sx, ptr.sy, Math.min(full, cap), dt, aim, ((o.seed || 0) % 2 < 1 ? 1 : -1) * (o.type === 'arc' || o.type === 'hook' || o.type === 'pin' ? 0.5 : 0.18));
        if (pulling) drawRopeText(o, o.glyphs, o.grip, 0, o.grip, px, cam.z, false);
        else {
          drawRopeText(o, carried.glyphs, 0, 0, carried.L, px, -1, !o.broken);
        }
        setM(DPR, 0, 0);
      }
      drawTool();
      if (ptr && ptr.mode === 'pull' && !over && !ptr.hair.surface) {
        const h = ptr.hair, n = letterCount(textOut(h, h.ext));
        h.bump = Math.max(0, h.bump - dtR * 5);
        g.font = font((20 + Math.min(16, n * 0.15) + h.bump * 8) * S, '600 '); g.textAlign = 'center'; g.textBaseline = 'middle';
        const tx = clamp(ptr.sx - 34 * S, 40 * S, W - 40 * S), ty = Math.max(topPad + 10, ptr.sy - 40 * S);
        g.lineWidth = 5 * S; g.lineJoin = 'round'; g.strokeStyle = '#fcfbf7'; g.strokeText(String(n), tx, ty);
        g.fillStyle = n >= 60 ? '#b8860b' : n >= 30 ? '#e5484d' : '#3b1f2a'; g.fillText(String(n), tx, ty);
      }
      drawHud();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.life -= dtR; f.y -= (f.max > 2 ? 6 : 26) * S * dtR;
      if (f.life <= 0) { floats.splice(i, 1); continue; }
      g.globalAlpha = clamp(f.life * 2.2) * clamp((f.max - f.life) * 6);
      g.font = font(f.size, f.style || '600 ');
      const fw = g.measureText(f.text).width;
      if (fw > W - 24 * S) g.font = font(f.size * (W - 24 * S) / fw, f.style || '600 ');
      const fx = fw > W - 140 * S ? W / 2 : clamp(f.x, 70 * S, W - 70 * S);
      g.lineWidth = 5 * S; g.strokeStyle = '#fcfbf7'; g.lineJoin = 'round'; g.strokeText(f.text, fx, f.y);
      g.fillStyle = f.col; g.fillText(f.text, fx, f.y);
      g.globalAlpha = 1;
    }
    if (stun > 0 && !over) { g.fillStyle = `rgba(229,72,77,${0.22 * clamp(stun / 2.2) + 0.06})`; g.fillRect(0, 0, W, H); }
    if (fade) { g.fillStyle = `rgba(252,251,247,${Math.sin(clamp(fade.t) * Math.PI)})`; g.fillRect(0, 0, W, H); }
    if (over && !editing) drawResult(dtR);
    lastButtons = buttons;
    cv.style.cursor = editing ? (editDrag ? 'grabbing' : 'grab') : (hover && !over && !hitButton(hover.x, hover.y) ? 'none' : 'pointer');
  }

  let io = null, sleepTicks = 0;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(entries => {
      for (const en of entries) visible = en.isIntersecting;
      if (visible && !raf && alive) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    io.observe(el);
  }
  // draw as soon as the patch gets its size (rAF may have run before layout gave it one)
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (alive && el.clientWidth > 1) frame(performance.now()); }) : null;
  ro?.observe(el);
  raf = requestAnimationFrame(frame);

  function destroy() {
    if (!alive) return;
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    io?.disconnect(); ro?.disconnect();
    sfx.close();
    cv.remove();
  }

  return {
    destroy,
    restart: () => restart(0),
    poke() { // draw now: the host just gave the patch its size or position
      if (!alive || el.clientWidth < 2) return;
      const r = el.getBoundingClientRect(); visible = r.bottom > 0 && r.top < innerHeight;
      if (visible) frame(performance.now());
    },
    // editor
    setEditTool(tool) {
      editTool = tool === 'move' ? 'move' : 'off'; editDrag = null;
      if (ptr) { if (ptr.hair && ptr.hair.state === 'held') ptr.hair.state = 'out'; ptr = null; }
      if (editTool === 'off') previewPatch = -1;
    },
    get editTool() { return editTool; },
    select(lineIdx) { editSel = lineIdx; },
    showPatch(idx) { // jump to a patch to look at / edit it
      if (!(idx >= 0)) return;
      previewPatch = idx; over = null; fade = null; clearT = -1;
      const p = newPatch(idx); if (p) { level = idx; patch = p; }
    },
    debug: () => ({ level, got: got.map(o => o.text), patch: patch && patch.hairs.map(h => ({ type: h.type, state: h.state, ext: h.ext, L: h.L, text: h.text, cover: h.cover, hole: h.hole, surface: !!h.surface, snags: h.snags.slice() })), pain, stun, over: !!over, cam: { ...cam, hair: null }, W, H, S, F })
  };
}
