// Chat bubbles — a block prefab. Any block with `chat` becomes a message:
//
//   chat: { side: 'in' | 'out', time: '21:04', ticks: 'none' | 'sent' | 'delivered' | 'read',
//           reactions: ['heart', 'laugh', …], color: '' (bubble colour override), tail: true }
//
// It keeps PeelType's look: the message is the block's own peelable letters, the
// time is appended as smaller letters in the same ink. Everything else is a
// peelable line (lineart stroke) in that same ink: the bubble is ONE stroke —
// outline and tail in a single closed line — then the ticks, and each reaction:
// a small icon in one or two strokes, just under the bubble.
//
// layout.js lays a chat block out inside its bubble (padding, tail, right
// alignment for outgoing) and returns the bubble box as the block's attachment
// layout; main.js gives chat blocks a synthetic lineart attachment whose strokes
// come from buildChatStrokes() once that box is known.
// Scene-wide options: pieceConfig.chat { lineColor, lineWidth } (default: the scene's text colour).

export const CHAT_SIDES = ['in', 'out'];
export const CHAT_TICKS = ['none', 'sent', 'delivered', 'read'];
export const CHAT_REACTIONS = ['heart', 'laugh', 'wow', 'sad', 'smile', 'star'];
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
    .map(s => String(s).trim()).map(s => (s === 'pray' ? 'star' : s)).filter(s => CHAT_REACTIONS.includes(s)).slice(0, 4);
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
  const Hb = geom.Hb, r = Math.min(8, Hb / 3);
  const rc = (geom.reactions || [])[0];
  // the bubble: one line. Closed from the tail's tip when there is no reaction; with
  // one, it starts and ends either side of the reaction badges sitting on its bottom edge
  let gap = null;
  if (rc) { // where the badges cross the bottom edge: the bubble's line stops either side
    const R = rc.h / 2, sink = Hb - rc.y, chord = Math.sqrt(Math.max(0, R * R - (R - sink) * (R - sink)));
    const n = rc.kinds.length;
    gap = [rc.x + R - chord - 2, rc.x + R + (n - 1) * (rc.h + 3) + chord + 2];
  }
  add(bubblePath(W, Hb, r, geom.side, geom.tail ? geom.tailW : 0, gap), 6, [1, 1]);
  // ticks: one ✓ sent, two ✓✓ delivered / read
  if (geom.ticks && geom.tickKind !== 'none') {
    const s = 9, { x, y } = geom.ticks;
    const check = dx => [[x + dx, y + s * 0.55], [x + dx + s * 0.35, y + s * 0.9], [x + dx + s, y + s * 0.1]];
    add(check(0), 2.5);
    if (geom.tickKind !== 'sent') add(check(4.5), 2.5);
  }
  // reactions: a round badge on the bottom edge for each, the icon inside
  if (rc) rc.kinds.forEach((kind, i) => {
    const R = rc.h / 2, cx = rc.x + R + i * (rc.h + 3), cy = rc.y + R;
    add(arc(cx, cy, R, -Math.PI / 2, Math.PI * 1.5, 24), 3);
    for (const pts of reactionIcon(kind, cx, cy, R)) add(pts, 2);
  });
  return out;
}

function arc(cx, cy, r, a0, a1, n = 8) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
// The bubble outline with its tail as one path (drawn for an incoming bubble, tail at
// the top-left, then mirrored for outgoing). Without a gap it is closed at the tail's
// tip; with gap [x0, x1] on the bottom edge it runs from x0 all the way round to x1.
function bubblePath(W, H, r, side, t, gap) {
  const mir = side === 'out';
  let g = gap ? (mir ? [W - gap[1], W - gap[0]] : gap) : null;
  if (g) g = [Math.max(r, g[0]), Math.min(W - r, g[1])];
  const leftUp = [...arc(r, H - r, r, Math.PI / 2, Math.PI), ...(t > 0 ? [[0, Math.min(H - r, t * 1.6)], [-t, 0]] : [[0, r], ...arc(r, r, r, Math.PI, Math.PI * 1.5)])];
  const topRightDown = [[W - r, 0], ...arc(W - r, r, r, -Math.PI / 2, 0), [W, H - r], ...arc(W - r, H - r, r, 0, Math.PI / 2)];
  let pts;
  if (g && g[1] > g[0]) pts = [[g[0], H], [r, H], ...leftUp, ...topRightDown, [g[1], H]];
  else pts = t > 0 ? [[-t, 0], ...topRightDown, [r, H], ...leftUp] : [[r, 0], ...topRightDown, [r, H], ...leftUp];
  return mir ? pts.map(([x, y]) => [W - x, y]) : pts;
}
// the icon inside a reaction badge of radius R: heart, star, or a face (the badge is its outline)
function reactionIcon(kind, cx, cy, R) {
  const r = R * 0.58;
  if (kind === 'heart') {
    const p = []; for (let i = 0; i <= 36; i++) { const t = Math.PI * 2 * i / 36; p.push([cx + 16 * Math.sin(t) ** 3 * r / 17, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * r / 17 - r * 0.08]); }
    return [p];
  }
  if (kind === 'star') {
    const p = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.42 : r; p.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad + r * 0.08]); }
    return [p];
  }
  const eyes = [[[cx - R * 0.3, cy - R * 0.3], [cx - R * 0.3, cy - R * 0.1]], [[cx + R * 0.3, cy - R * 0.3], [cx + R * 0.3, cy - R * 0.1]]];
  let mouth;
  if (kind === 'laugh') mouth = [...arc(cx, cy + R * 0.08, R * 0.42, Math.PI, 0, 10), [cx - R * 0.42, cy + R * 0.08]]; // D
  else if (kind === 'wow') mouth = arc(cx, cy + R * 0.32, R * 0.16, 0, Math.PI * 2, 10);                                  // o
  else if (kind === 'sad') mouth = arc(cx, cy + R * 0.72, R * 0.36, Math.PI + 0.7, Math.PI * 2 - 0.7, 8);                // ⌒
  else mouth = arc(cx, cy + R * 0.02, R * 0.4, 0.5, Math.PI - 0.5, 8);                                                   // ‿
  return [...eyes, mouth];
}
