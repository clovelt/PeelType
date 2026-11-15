// Rich procedural feed → PeelType scene generator.
// Each post becomes a block using the full palette of PeelType mechanics:
// peel modes, gradients, letter motion, force fields, shapes, attachments,
// triggers, peel points, layers and BBCode decoration. Deterministic by seed.

const PEEL_MODES = ['linear', 'zigzag', 'spiral', 'spiral-center', 'random-walk',
  'alternating-ends', 'vowels-first', 'punctuation-last', 'center', 'syllables-in-order'];

const SHAPES = ['circle', 'ellipse', 'diamond', 'triangle', 'pentagon', 'hexagon', 'star5'];

const SOLID_COLORS = ['#4a4a4a', '#1f6f52', '#784830', '#325f51', '#7a4b30', '#283b59', '#5a7db8', '#8a5a6a'];

const GRADIENTS = [
  { type: 'linear', angle: 30, stops: [{ color: '#283b59', alpha: 1, position: 0 }, { color: '#7b595f', alpha: 1, position: 56 }, { color: '#c6a766', alpha: 1, position: 100 }] },
  { type: 'linear', angle: -25, stops: [{ color: '#1f3a2d', alpha: 1, position: 0 }, { color: '#2e7d32', alpha: 1, position: 55 }, { color: '#a5c98a', alpha: 1, position: 100 }] },
  { type: 'linear', angle: 55, stops: [{ color: '#3a1f1f', alpha: 1, position: 0 }, { color: '#b74040', alpha: 1, position: 50 }, { color: '#e8c9a0', alpha: 1, position: 100 }] },
  { type: 'radial', stops: [{ color: '#1f2d3a', alpha: 1, position: 0 }, { color: '#5a7db8', alpha: 1, position: 60 }, { color: '#c9d6e8', alpha: 1, position: 100 }] },
  { type: 'radial', stops: [{ color: '#2d2a3a', alpha: 1, position: 0 }, { color: '#7a5a8a', alpha: 1, position: 55 }, { color: '#d6c9e8', alpha: 1, position: 100 }] }
];

const PARTICLES = ['spark', 'smokePoof', 'redDrops', 'tears', 'inkdrop', 'sludgeDrop'];
const SOUNDS = ['spark', 'poof', 'peel', 'drop', 'geyser'];

const LINEART_SRCS = [
  'illustrations/tirita/t_ondas.svg',
  'illustrations/tirita/t_corazones.svg',
  'illustrations/tirita/t_ojos.svg',
  'illustrations/tirita/t_manos.svg',
  'illustrations/plant-body.svg'
];

const FONT = 'Georgia';

// ── deterministic helpers ────────────────────────────────────────────────────
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function pick(i, seed, arr) { return arr[(i + seed) % arr.length]; }
function clamp(min, max, v) { return Math.max(min, Math.min(max, v)); }

function stripBbcode(text) {
  return String(text || '').replace(/\[[^\]]*\]/g, '');
}
function plainWords(text) {
  return stripBbcode(text).split(/[\s.,;:!?¿¡()"“”'’…—–\-]+/).filter(Boolean);
}

// ── BBCode decoration ────────────────────────────────────────────────────────
function decorateText(text, i, seed) {
  let s = String(text || '');
  const m = s.match(/^(\s*)(\S+)/);
  if (m) s = m[1] + '[b]' + m[2] + '[/b]' + s.slice(m[1].length + m[2].length);
  if (i % 3 === 1) {
    const words = s.split(/\s+/);
    const idx = 1 + ((i + seed) % Math.max(1, words.length - 1));
    if (words[idx] && !words[idx].startsWith('[')) words[idx] = `[i]${words[idx]}[/i]`;
    s = words.join(' ');
  }
  if (i % 9 === 4) {
    const words = s.split(/\s+/);
    const candidates = words.filter(w => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}$/.test(w.replace(/\[[^\]]*\]/g, '')));
    if (candidates.length) {
      const target = candidates[(i + seed) % candidates.length];
      const plain = target.replace(/\[[^\]]*\]/g, '');
      s = s.replace(target, `[censor]${plain}[/censor]`);
    }
  }
  if (i % 6 === 2 && m) {
    s = s.replace(`[b]${m[2]}[/b]`, `[nopeel][b]${m[2]}[/b][/nopeel]`);
  }
  return s;
}

// ── block builder ────────────────────────────────────────────────────────────
function buildBlock(post, i, seed, total) {
  const len = post.text.length;
  const engagement = Number(post.likes || 0) + Number(post.reposts || 0) * 2;

  const text = decorateText(post.text, i, seed);
  const mode = PEEL_MODES[i % PEEL_MODES.length];
  const fromBeginning = i % 2 === 0;
  const initialUnlockCount = 1 + (i % 4);
  const scale = clamp(0.85, 1.3, 0.9 + engagement / 90);

  const cm = i % 5;
  const style = { colorMode: cm === 0 ? 'solid' : cm === 1 ? 'variation' : cm === 2 ? 'linear' : cm === 3 ? 'radial' : 'sequential', fontFamily: FONT };
  if (style.colorMode === 'solid' || style.colorMode === 'variation') {
    style.color = pick(i, seed, SOLID_COLORS);
    if (style.colorMode === 'variation') style.variationStrength = 0.06 + (i % 5) * 0.025;
  } else {
    style.gradient = pick(i, seed, GRADIENTS);
  }

  const block = {
    id: `bsky-${i}`,
    text,
    transform: { x: 0, y: 0, scale: Number(scale.toFixed(3)), width: 660 },
    peel: { fromBeginning, mode, initialUnlockCount },
    style
  };

  const motion = i % 3;
  if (motion === 0) {
    block.letterMotion = { type: 'buoyancy', strength: 0.014 + (i % 4) * 0.004, lift: 1.15, wave: 2.4, drift: 1.3, frequency: 0.08 };
  } else if (motion === 1 && len < 220) {
    block.letterMotion = [
      { type: 'orbit', cx: 380, cy: 200 + (i % 3) * 70, radius: 250, strength: 0.09, spin: 1.1, band: 0.7 },
      { type: 'buoyancy', strength: 0.011, lift: 1.1, wave: 2.1, drift: 1.2, frequency: 0.07 }
    ];
  } else if (motion === 2) {
    block.letterMotion = { type: 'line-lock', strength: 0.5, damping: 0.86 };
  }

  if (i % 4 === 3) {
    block.transform.width = 440;
    block.transform.height = 440;
    block.clipShape = { type: pick(i, seed, SHAPES) };
  }

  if (i % 6 === 5) {
    block.attachment = { type: 'placeholder', label: 'illustration', width: 380, height: 150, gap: 16, opticalOffsetY: 22 };
  } else if (i % 10 === 9) {
    block.attachment = { type: 'lineart', src: pick(i, seed, LINEART_SRCS), lineQuantity: 7, linePrecision: 1, initialPeeled: 2 };
  }

  if (i % 5 === 1) {
    block.peelPoints = [
      { fromRatio: 0, toRatio: 0.5, direction: 'right', starterCount: 1, mode: 'linear' },
      { fromRatio: 0.5, toRatio: 1, direction: 'left', starterCount: 1, mode: 'linear' }
    ];
  }

  const words = plainWords(post.text);
  if (words.length > 3) {
    const target = words[(i + seed) % words.length].replace(/['"]/g, '');
    if (target) {
      block.triggers = [{
        on: 'wordComplete',
        word: target,
        actions: [
          { type: 'particles', preset: pick(i, seed, PARTICLES), count: 12 + (i % 5) * 7 },
          { type: 'sound', name: pick(i + 3, seed, SOUNDS) }
        ]
      }];
    }
  }

  return block;
}

// ── scene builder ────────────────────────────────────────────────────────────
export function buildFeedScene(posts, { seed = Date.now(), title = 'My feed, peeled' } = {}) {
  const list = (Array.isArray(posts) ? posts : []).filter(p => p && typeof p.text === 'string' && p.text.trim());
  const blocks = list.map((post, i) => buildBlock(post, i, hash(String(seed)), list.length));

  // Matrioska layers: stack two consecutive short posts into the same spot.
  list.forEach((post, i) => {
    if (i % 8 === 7 && i + 1 < list.length) {
      const a = blocks[i], b = blocks[i + 1];
      if (stripBbcode(a.text).length < 120 && stripBbcode(b.text).length < 120) {
        a.layer = { group: `onion-${Math.floor(i / 8)}`, depth: 0 };
        b.layer = { group: `onion-${Math.floor(i / 8)}`, depth: 1 };
      }
    }
  });

  const forceFields = [];
  list.forEach((post, i) => {
    if (i % 6 === 2) {
      forceFields.push({ id: `field-${i}`, type: 'magnetic', mode: 'attract', blocks: [`bsky-${i}`], cx: 380, cy: 180, radius: 360, strength: 0.7, lockedStrength: 0.4, feather: 260 });
    } else if (i % 9 === 5) {
      forceFields.push({ id: `field-${i}`, type: 'cursor', mode: 'repel', active: 'hover', blocks: [`bsky-${i}`], radius: 240, strength: 1.1, lockedStrength: 0.6, feather: 220 });
    }
  });
  forceFields.push({ id: 'feed-breeze', type: 'wind', global: true, direction: 'right', autoWake: true, strength: 0.05, lockedStrength: 0, gust: 0.08, feather: 0 });

  return {
    id: 'bluesky-feed',
    version: 32,
    title,
    editor: { enabled: true },
    style: {
      font: '20px "EB Garamond"',
      lineHeight: 30,
      color: '#4a4a4a',
      backgroundColor: '#f5f0e8'
    },
    layout: { type: 'paragraph', blockGap: 54, margin: 20, topMargin: 76, bottomMargin: 160 },
    peel: { fromBeginning: true, zigzag: false, mode: 'linear', initialUnlockCount: 2, unlockThreshold: 1 },
    physics: { constraintDistance: 1.2, iterations: 12, damping: 0.97, gravity: 0.15, gravityOn: true },
    optimization: {
      dynamicLetterLimitDesktop: 520,
      dynamicLetterLimitMobile: 130,
      dynamicLetterLimitNarrow: 170,
      initialPeelActiveBlocks: 2
    },
    behaviors: {
      fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
      stepParagraphs: {
        enabled: false, visibleCount: 2, compactFlow: false, advanceDelayMs: 0,
        perBlockAdvanceDelayMs: {}, perBlockVisibleCount: {}
      },
      cablePull: {
        enabled: false, mode: 'frontier', followBlockIds: [], ease: 0.12,
        leadMargin: 380, maxPan: 0, lockVerticalScroll: true, lockOnComplete: true
      }
    },
    forceFields,
    blocks,
    mobileBlocks: []
  };
}
