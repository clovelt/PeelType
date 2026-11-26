// Chat bubbles — a block prefab. Any block with `chat` becomes a message:
//
//   chat: { side: 'in' | 'out', time: '21:04', ticks: 'none' | 'sent' | 'delivered' | 'read',
//           reactions: ['heart', 'laugh', …], color: '' (bubble colour override), tail: true }
//
// It keeps PeelType's look: the message is the block's own peelable letters, the
// time is appended as smaller letters in the same ink. Everything else is a
// peelable line (lineart stroke) in that same ink: the bubble is ONE stroke —
// outline and tail in a single closed line — then the ticks, and each reaction:
// a one-stroke pill and a one-stroke icon.
//
// layout.js lays a chat block out inside its bubble (padding, tail, right
// alignment for outgoing) and returns the bubble box as the block's attachment
// layout; main.js gives chat blocks a synthetic lineart attachment whose strokes
// come from buildChatStrokes() once that box is known.
// Scene-wide options: pieceConfig.chat { lineColor, lineWidth } (default: the scene's text colour).

export const CHAT_SIDES = ['in', 'out'];
export const CHAT_TICKS = ['none', 'sent', 'delivered', 'read'];
export const CHAT_REACTIONS = ['heart', 'laugh', 'wow', 'sad', 'smile', 'pray'];
export const CHAT_THEME = { lineColor: '', lineWidth: 1.8 };

// ink defaults to the scene's text colour, so bubbles look like the rest of the page
export function chatTheme(raw = {}, ink = '#4a4a4a') {
  const t = { ...CHAT_THEME, ...(raw || {}) };
  t.lineColor = t.lineColor || ink;
  t.timeColor = t.lineColor;
  return t;
}

export function normalizeChat(raw) {
  if (!raw) return null;
  const r = typeof raw === 'object' ? raw : {};
  const reactions = (Array.isArray(r.reactions) ? r.reactions : String(r.reactions || '').split(/[\s,]+/))
    .map(s => String(s).trim()).filter(s => CHAT_REACTIONS.includes(s)).slice(0, 4);
  return {
    side: r.side === 'out' ? 'out' : 'in',
    time: String(r.time ?? '').trim().slice(0, 12),
    ticks: CHAT_TICKS.includes(r.ticks) ? r.ticks : (r.side === 'out' ? 'read' : 'none'),
    reactions,
    color: String(r.color || ''),
    tail: r.tail !== false
  };
}

// the time, small and grey, appended to the message as peelable letters
export function chatTimeMarkup(chat, theme, basePx = 20) {
  if (!chat?.time) return '';
  const px = Math.max(10, Math.round(basePx * 0.72));
  return `  [size=${px}][color=${theme.timeColor}]${chat.time}[/color][/size]`;
}

// a lineart attachment with no SVG: its strokes are generated from the laid-out bubble
export function chatAttachment(chat) {
  return { type: 'lineart', src: null, chat: true, strokes: [], strokeResistance: 13, lineWidth: 1, gap: 0, opacity: 1, roughPreset: 'solid' };
}

// widths that honour [size] (the time is smaller than the message)
export function measureChatWidths(graphemes, inlineStyles, ctx, blockFont) {
  const family = String(blockFont).replace(/^\s*[\d.]+px\s*/, '');
  return graphemes.map((g, i) => {
    const size = inlineStyles?.[i]?.size;
    ctx.font = size ? `${size}px ${family}` : blockFont;
    return ctx.measureText(g).width;
  });
}

// ── Strokes ───────────────────────────────────────────────────────────────────
// geom (from layout.js, px relative to the bubble box's top-left):
//   { side, W, Hb, total, tail, tailW, ticks: { x, y } | null, tickKind, reactions: [{ x, y, w, h, kinds }], color }
export function buildChatStrokes(geom, theme) {
  const { W, total } = geom, out = [];
  const ink = geom.color || theme.lineColor, lw = theme.lineWidth;
  const fx = x => x / Math.max(1, W), fy = y => y / Math.max(1, total);
  const add = (ptsPx, spacing = 6, ends = [1, 0]) => {
    if (ptsPx.length < 2) return;
    let len = 0; for (let i = 1; i < ptsPx.length; i++) len += Math.hypot(ptsPx[i][0] - ptsPx[i - 1][0], ptsPx[i][1] - ptsPx[i - 1][1]);
    out.push({
      pathPoints: ptsPx.map(([x, y]) => [fx(x), fy(y)]),
      nodeCount: Math.max(4, Math.min(150, Math.round(len / spacing))),
      starterCount: ends[0], endStarterCount: ends[1],
      lineWidth: lw, color: ink, source: 'manual'
    });
  };
  const Hb = geom.Hb, r = Math.min(10, Hb / 2);
  // the bubble: one closed line from the tail's tip, round the box, back to the tip
  add(bubblePath(W, Hb, r, geom.side, geom.tail ? geom.tailW : 0), 6, [1, 1]);
  // ticks: one ✓ sent, two ✓✓ delivered / read
  if (geom.ticks && geom.tickKind !== 'none') {
    const s = 9, { x, y } = geom.ticks;
    const check = dx => [[x + dx, y + s * 0.55], [x + dx + s * 0.35, y + s * 0.9], [x + dx + s, y + s * 0.1]];
    add(check(0), 2.5);
    if (geom.tickKind !== 'sent') add(check(4.5), 2.5);
  }
  // reactions: a one-stroke pill, and one stroke per icon
  for (const rc of geom.reactions || []) {
    const h = rc.h, rr = h / 2;
    add(roundRect(rc.x, rc.y, rc.w, h, rr), 4);
    rc.kinds.forEach((kind, i) => add(reactionIcon(kind, rc.x + h * 0.65 + i * (h * 0.82), rc.y + h / 2, h * 0.5), 2));
  }
  return out;
}

function arc(cx, cy, r, a0, a1, n = 8) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return [[x + r, y], [x + w - r, y], ...arc(x + w - r, y + r, r, -Math.PI / 2, 0), [x + w, y + h - r], ...arc(x + w - r, y + h - r, r, 0, Math.PI / 2),
    [x + r, y + h], ...arc(x + r, y + h - r, r, Math.PI / 2, Math.PI), [x, y + r], ...arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)];
}
// the bubble outline with its tail, as a single path starting and ending at the tail's tip
function bubblePath(W, H, r, side, t) {
  const right = [[W - r, 0], ...arc(W - r, r, r, -Math.PI / 2, 0), [W, H - r], ...arc(W - r, H - r, r, 0, Math.PI / 2), [r, H], ...arc(r, H - r, r, Math.PI / 2, Math.PI)];
  let pts;
  if (t > 0) pts = [[-t, 0], ...right, [0, Math.min(H - r, t * 1.6)], [-t, 0]]; // tail at the top-left
  else pts = [[r, 0], ...right, [0, r], ...arc(r, r, r, Math.PI, Math.PI * 1.5)];
  return side === 'out' ? pts.map(([x, y]) => [W - x, y]) : pts; // outgoing: mirrored, tail at the top-right
}
// one simple line per reaction, centred on (cx, cy), size s
function reactionIcon(kind, cx, cy, s) {
  if (kind === 'heart') { const p = []; for (let i = 0; i <= 32; i++) { const t = Math.PI * 2 * i / 32; p.push([cx + 16 * Math.sin(t) ** 3 * s / 34, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s / 34 + s * 0.06]); } return p; }
  if (kind === 'smile') return arc(cx, cy - s * 0.25, s * 0.5, 0.35, Math.PI - 0.35, 10);           // ‿
  if (kind === 'sad') return arc(cx, cy + s * 0.55, s * 0.5, Math.PI + 0.45, Math.PI * 2 - 0.45, 10); // ⌒
  if (kind === 'wow') return arc(cx, cy, s * 0.3, 0, Math.PI * 2, 12);                              // o
  if (kind === 'laugh') return [...arc(cx, cy - s * 0.15, s * 0.5, Math.PI, 0, 10), [cx - s * 0.5, cy - s * 0.15]]; // a wide open mouth: half circle closed by a line
  if (kind === 'pray') return [[cx - s * 0.4, cy + s * 0.45], [cx, cy - s * 0.5], [cx + s * 0.4, cy + s * 0.45]]; // ^ two hands together
  return [[cx - s * 0.3, cy], [cx + s * 0.3, cy]];
}
