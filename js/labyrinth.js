// Procedural labyrinth generator.
// Builds a bundle of interwoven serpentine "threads" laid out on Bézier draw-paths.
// One thread carries the guiding message (the thread of Ariadne); the rest weave
// through the same maze carrying strange, scrambled fragments. Pulling the right
// thread unwinds a coherent text — the others read as nonsense.
import { anchorsFromDrawnPoints } from './draw-path.js';

function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shuffle the words of a text so it keeps the same vocabulary but loses its meaning.
export function scrambleWords(text, rng) {
  const words = String(text).split(/\s+/).filter(Boolean);
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words.join(' ');
}

// Corner points of one interwoven serpentine thread, then smoothed into anchors.
function buildThreadAnchors({ threadIndex, threads, lanes, laneGap, margin, width, jitter, rng }) {
  const left = margin;
  const right = width - margin;
  const points = [];
  for (let k = 0; k < lanes; k++) {
    const laneIndex = threadIndex + k * threads;
    const y = margin + laneIndex * laneGap;
    const jx = jitter ? (rng() - 0.5) * 2 * jitter * (right - left) * 0.12 : 0;
    const xa = Math.round((k % 2 === 0 ? left : right) + jx);
    const xb = Math.round((k % 2 === 0 ? right : left) + jx);
    points.push({ x: xa, y: Math.round(y) });
    points.push({ x: xb, y: Math.round(y) });
  }
  return anchorsFromDrawnPoints(points);
}

/**
 * Build the labyrinth thread blocks.
 *
 * @param {Object} opts
 * @param {string} opts.trueText        Guiding message carried by the correct thread.
 * @param {string[]} [opts.decoyTexts]  Custom strange texts for the other threads.
 * @param {number} [opts.threads=4]     Total number of interwoven threads.
 * @param {number} [opts.rows=6]        Minimum corridors (lanes) per thread.
 * @param {number} [opts.width=640]     Labyrinth width in px.
 * @param {number} [opts.fontPx=20]     Base glyph size used to estimate fit.
 * @param {number} [opts.lineHeight=30] Engine line height (corridor clearance).
 * @param {number} [opts.blockGap=40]   Engine block gap (flow compensation).
 * @param {number} [opts.spacing=2]     Letter spacing along the path.
 * @param {number} [opts.jitter=0]      0..1 horizontal randomness for a looser tangle.
 * @param {number} [opts.seed=1]        Seed for reproducible generation.
 * @param {string} [opts.idPrefix]      Block id prefix.
 * @param {string} [opts.color]         Thread color.
 * @param {string} [opts.trueColor]     Optional distinct color for the true thread.
 * @param {string} [opts.fontFamily]    Font family for every thread.
 * @param {number} [opts.starterCount=3] Loose-end handle length.
 * @param {Object} [opts.gradient]      Optional gradient applied to every thread.
 * @returns {Array<Object>} block configs ready to push into config.blocks.
 */
export function buildLabyrinthThreads(opts = {}) {
  const trueText = String(opts.trueText || '').replace(/\s+/g, ' ').trim();
  if (!trueText) return [];
  const threads = Math.max(1, Math.min(8, Math.round(Number(opts.threads) || 4)));
  const rows = Math.max(2, Math.round(Number(opts.rows) || 6));
  const width = Math.max(240, Math.round(Number(opts.width) || 640));
  const fontPx = Math.max(8, Number(opts.fontPx) || 20);
  const lineHeight = Math.max(8, Number(opts.lineHeight) || 30);
  const blockGap = Math.max(0, Number(opts.blockGap) || 0);
  const spacing = Math.max(0, Number(opts.spacing) || 0);
  const jitter = Math.max(0, Math.min(1, Number(opts.jitter) || 0));
  const seed = Math.round(Number(opts.seed) || 1);
  const idPrefix = opts.idPrefix || `lab-${Date.now().toString(36)}`;
  const color = opts.color || '#4a4a4a';
  const trueColor = opts.trueColor || null;
  const fontFamily = opts.fontFamily || 'Georgia';
  const starterCount = Math.max(0, Math.round(Number(opts.starterCount ?? 3)));
  const gradient = opts.gradient || null;
  const rng = mulberry32(seed);

  const laneGap = Math.max(lineHeight, Math.round(fontPx * 1.5));
  const margin = Math.max(Math.round(fontPx * 1.5), Math.round(width * 0.08));

  // Assemble the text for each thread: one true thread + strange decoys.
  const trueIndex = Math.min(threads - 1, Math.floor(threads / 2));
  const decoys = (opts.decoyTexts || [])
    .map(t => String(t).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const texts = [];
  let decoyIdx = 0;
  for (let t = 0; t < threads; t++) {
    if (t === trueIndex) { texts.push(trueText); continue; }
    texts.push(decoys[decoyIdx++] ?? scrambleWords(trueText, rng));
  }

  // Size the maze so the longest thread fits without clamping.
  const usable = width - margin * 2;
  // Rough mean glyph advance for prose (incl. spaces). Errs slightly wide so the
  // longest thread never overflows its corridors and piles up at the path end.
  const avgAdvance = fontPx * 0.42 + spacing;
  const charsPerLane = Math.max(4, Math.floor(usable / avgAdvance));
  const lanesNeeded = texts.reduce((max, txt) => Math.max(max, Math.ceil([...txt].length / charsPerLane)), 0);
  const lanes = Math.min(60, Math.max(rows, lanesNeeded));

  const maxLaneIndex = (lanes - 1) * threads + (threads - 1);
  const firstThreadHeight = margin + maxLaneIndex * laneGap + lineHeight;

  let flowConsumed = 0; // height + gap already reserved by previous threads in flow
  return texts.map((text, t) => {
    const anchors = buildThreadAnchors({ threadIndex: t, threads, lanes, laneGap, margin, width, jitter, rng });
    // Pull every thread back onto the first one's origin so they share the maze.
    const transformY = -Math.round(flowConsumed);
    flowConsumed += (t === 0 ? firstThreadHeight : lineHeight) + blockGap;
    return {
      id: `${idPrefix}-${t + 1}`,
      text,
      drawPath: { enabled: true, anchors, spacing, angleMix: 1, startOffset: 0 },
      transform: { x: 0, y: transformY, scale: 1, width, height: 0 },
      peel: { fromBeginning: true, mode: 'linear', persistState: false },
      peelPoints: [{ line: 0, direction: 'right', starterCount }],
      style: {
        color: t === trueIndex && trueColor ? trueColor : color,
        colorMode: gradient ? 'sequential' : 'solid',
        fontFamily,
        ...(gradient ? { gradient } : {})
      }
    };
  });
}
