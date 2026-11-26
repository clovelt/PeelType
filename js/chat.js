// Chat bubbles — a block prefab. Any block with `chat` becomes a message:
//
//   chat: { side: 'in' | 'out', time: '21:04', ticks: 'none' | 'sent' | 'delivered' | 'read',
//           reactions: ['heart', 'laugh', …], color: '' (bubble colour override), tail: true }
//
// The message text stays the block's own peelable letters; the time is appended
// as small grey letters, peelable too. Everything else is built from PeelType's
// peelable lines (lineart strokes): the bubble fill is a stack of thick bands in
// the bubble colour, plus its tail, a hairline shadow, the read ticks, and each
// reaction — a pill with an icon drawn in lines. Every one of them peels.
//
// layout.js lays a chat block out inside its bubble (padding, tail, right
// alignment for outgoing) and returns the bubble box as the block's attachment
// layout; main.js gives chat blocks a synthetic lineart attachment whose strokes
// come from buildChatStrokes() once that box is known.
// Scene-wide colours: pieceConfig.chat (see CHAT_THEME).

export const CHAT_SIDES = ['in', 'out'];
export const CHAT_TICKS = ['none', 'sent', 'delivered', 'read'];
export const CHAT_REACTIONS = ['heart', 'laugh', 'wow', 'sad', 'smile', 'pray'];
export const CHAT_THEME = {
  inColor: '#ffffff', outColor: '#d9fdd3', timeColor: '#667781', tickColor: '#8696a0', readColor: '#53bdeb',
  shadowColor: 'rgba(11,20,26,0.14)', pillColor: '#ffffff', pillBorder: 'rgba(11,20,26,0.12)'
};

export function chatTheme(raw = {}) { return { ...CHAT_THEME, ...(raw || {}) }; }

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
  const px = Math.max(9, Math.round(basePx * 0.6));
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
  const fx = x => x / Math.max(1, W), fy = y => y / Math.max(1, total);
  const add = (ptsPx, opts) => {
    if (ptsPx.length < 2) return;
    let len = 0; for (let i = 1; i < ptsPx.length; i++) len += Math.hypot(ptsPx[i][0] - ptsPx[i - 1][0], ptsPx[i][1] - ptsPx[i - 1][1]);
    out.push({
      pathPoints: ptsPx.map(([x, y]) => [fx(x), fy(y)]),
      nodeCount: Math.max(4, Math.min(70, Math.round(len / (opts.spacing || 8)))),
      starterCount: opts.starters ?? 1, endStarterCount: opts.endStarters ?? 0,
      lineWidth: opts.lw, color: opts.color, source: 'manual'
    });
  };
  const fill = geom.color || (geom.side === 'out' ? theme.outColor : theme.inColor);
  const Hb = geom.Hb, r = Math.min(9, Hb / 2);
  const fromTail = geom.side === 'in'; // bands start (and peel) on the tail side

  // hairline shadow under the bubble
  add([[r, Hb + 0.7], [W - r, Hb + 0.7]], { lw: 1.4, color: theme.shadowColor, spacing: 12, starters: 1 });
  // the fill: thick bands stacked down the bubble, inset at the rounded corners
  const lw = Math.min(11, Math.max(6, Hb / 3)), k = Math.max(1, Math.ceil((Hb - lw) / (lw * 0.72)) + 1);
  for (let b = 0; b < k; b++) {
    const y = k === 1 ? Hb / 2 : lw / 2 + (Hb - lw) * b / (k - 1);
    const edge = Math.min(y - lw / 2, Hb - y - lw / 2); // distance of the band's outer edge to the bubble edge
    const inset = edge < r ? r - Math.sqrt(Math.max(0, r * r - (r - edge) * (r - edge))) : 0;
    const x0 = inset + lw / 2, x1 = W - inset - lw / 2;
    const pts = [[x0, y], [Math.max(x0, x1), y]];
    add(fromTail ? pts : pts.reverse(), { lw: lw + 1, color: fill, spacing: 9, starters: 1 });
  }
  // the tail: a little tab at the top corner on its side
  if (geom.tail && geom.tailW > 0) {
    const t = geom.tailW, s = lw * 0.62;
    const pts = geom.side === 'in' ? [[-t + 3, s * 0.5], [s * 1.2, s * 0.8]] : [[W + t - 3, s * 0.5], [W - s * 1.2, s * 0.8]];
    add(pts, { lw: s, color: fill, spacing: 4, starters: 1 });
  }
  // read ticks
  if (geom.ticks && geom.tickKind !== 'none') {
    const col = geom.tickKind === 'read' ? theme.readColor : theme.tickColor, s = 9, { x, y } = geom.ticks;
    const check = dx => [[x + dx, y + s * 0.55], [x + dx + s * 0.35, y + s * 0.9], [x + dx + s, y + s * 0.1]];
    add(check(0), { lw: 1.6, color: col, spacing: 2.5, starters: 1 });
    if (geom.tickKind !== 'sent') add(check(4.5), { lw: 1.6, color: col, spacing: 2.5, starters: 1 });
  }
  // reactions: a pill (two capsules: border, then white) and one line-drawn icon per kind
  for (const rc of geom.reactions || []) {
    const h = rc.h, cy = rc.y + h / 2;
    add([[rc.x + h / 2, cy], [rc.x + rc.w - h / 2, cy]], { lw: h + 1.6, color: theme.pillBorder, spacing: 6 });
    add([[rc.x + h / 2, cy], [rc.x + rc.w - h / 2, cy]], { lw: h, color: theme.pillColor, spacing: 6 });
    rc.kinds.forEach((kind, i) => {
      const cx = rc.x + h * 0.65 + i * (h * 0.82);
      for (const part of reactionIcon(kind, cx, cy, h * 0.7)) add(part.pts, { lw: part.lw, color: part.color, spacing: part.spacing || 2.5, starters: 1 });
    });
  }
  return out;
}

// icons drawn as lines, centred on (cx, cy), size s
function circle(cx, cy, r, from = 0, to = Math.PI * 2, n = 24) {
  const pts = []; for (let i = 0; i <= n; i++) { const a = from + (to - from) * i / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts;
}
function reactionIcon(kind, cx, cy, s) {
  if (kind === 'heart') {
    const heart = k => { const pts = []; for (let i = 0; i <= 40; i++) { const t = Math.PI * 2 * i / 40; pts.push([cx + 16 * Math.sin(t) ** 3 * s / 34 * k, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s / 34 * k + s * 0.05]); } return pts; };
    return [{ pts: heart(1), lw: s * 0.2, color: '#f0364c' }, { pts: heart(0.55), lw: s * 0.3, color: '#f0364c' }, { pts: heart(0.18), lw: s * 0.25, color: '#f0364c', spacing: 1.5 }];
  }
  if (kind === 'pray') { // two hands together
    return [
      { pts: [[cx - s * 0.05, cy + s * 0.45], [cx - s * 0.35, cy + s * 0.05], [cx - s * 0.08, cy - s * 0.45]], lw: s * 0.28, color: '#f5b544' },
      { pts: [[cx + s * 0.05, cy + s * 0.45], [cx + s * 0.35, cy + s * 0.05], [cx + s * 0.08, cy - s * 0.45]], lw: s * 0.28, color: '#f5b544' },
      { pts: [[cx, cy - s * 0.42], [cx, cy + s * 0.42]], lw: s * 0.08, color: '#a86a1f' }
    ];
  }
  const face = '#ffc83d', ink = '#6b3f12', R = s / 2;
  const parts = [
    { pts: circle(cx, cy, R * 0.62), lw: R * 0.78, color: face, spacing: 2 }, // the disc, as a fat ring
    { pts: circle(cx, cy, R * 0.94), lw: s * 0.1, color: '#e8a91f', spacing: 2 }
  ];
  const eyeY = cy - R * 0.22, ex = R * 0.36;
  if (kind === 'laugh') {
    parts.push({ pts: [[cx - ex - R * 0.16, eyeY + R * 0.08], [cx - ex, eyeY - R * 0.1], [cx - ex + R * 0.16, eyeY + R * 0.08]], lw: s * 0.08, color: ink });
    parts.push({ pts: [[cx + ex - R * 0.16, eyeY + R * 0.08], [cx + ex, eyeY - R * 0.1], [cx + ex + R * 0.16, eyeY + R * 0.08]], lw: s * 0.08, color: ink });
    parts.push({ pts: circle(cx, cy + R * 0.12, R * 0.42, 0.15, Math.PI - 0.15, 12).concat([[cx + R * 0.4, cy + R * 0.16]]), lw: s * 0.12, color: ink });
  } else {
    parts.push({ pts: [[cx - ex, eyeY - R * 0.12], [cx - ex, eyeY + R * 0.12]], lw: s * 0.11, color: ink, spacing: 1 });
    parts.push({ pts: [[cx + ex, eyeY - R * 0.12], [cx + ex, eyeY + R * 0.12]], lw: s * 0.11, color: ink, spacing: 1 });
    if (kind === 'wow') parts.push({ pts: circle(cx, cy + R * 0.38, R * 0.17, 0, Math.PI * 2, 10), lw: s * 0.09, color: ink, spacing: 1.2 });
    else if (kind === 'sad') {
      parts.push({ pts: circle(cx, cy + R * 0.72, R * 0.38, Math.PI + 0.5, Math.PI * 2 - 0.5, 10), lw: s * 0.08, color: ink });
      parts.push({ pts: [[cx + ex + R * 0.05, eyeY + R * 0.25], [cx + ex + R * 0.1, eyeY + R * 0.55]], lw: s * 0.1, color: '#4fb3ff', spacing: 1 });
    } else parts.push({ pts: circle(cx, cy + R * 0.05, R * 0.45, 0.35, Math.PI - 0.35, 10), lw: s * 0.08, color: ink }); // smile
  }
  return parts;
}
