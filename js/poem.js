// Block structure for the tirita poem — no translatable text lives here.
// Text and word-trigger words come from a locale (see locales/es.js, locales/en.js).
// Call buildBlocks(locale) to get the final blocks array ready for a scene config.

const TIRITA_POEM_BLOCKS = [
  {
    id: 'tit-titulo',
    transform: { x: 0, y: 0, scale: 2.4, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 1 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b01',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b02',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'ambient', name: 'latido-bajo', mode: 'crossfade' }, { type: 'bgColor', color: '#cfc2ac', duration: 1600 }] },
      { on: 'letterUnlock', once: true, actions: [{ type: 'ambient', name: 'latido-bajo', mode: 'crossfade' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b03',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b04',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 2 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b05',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b06',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b07',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#ece5db', duration: 1600 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b08',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b09',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 1 }],
    triggers: [
      // word filled by locale via wordTriggers['tit-b09']
      { on: 'wordComplete', actions: [{ type: 'particles', preset: 'smokePoof', count: 34 }, { type: 'sound', name: 'poof' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b10',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 3 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b11',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    style: { color: '#6e6e6e', colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b12',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 2 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#e8ddd0', duration: 1800 }, { type: 'ambient', name: 'tension', mode: 'layer', gain: 0.022 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b13',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b14',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
  },
  {
    id: 'tit-b15',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 1 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#e0d2bf', duration: 2500 }] },
      { on: 'letterUnlock', once: true, actions: [{ type: 'ambient', name: 'silence', mode: 'crossfade', gain: 0 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b16',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    triggers: [
      { on: 'letterUnlock', once: true, actions: [{ type: 'ambient', name: 'tension', mode: 'crossfade' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b17',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 2 }],
    triggers: [
      // 'cruel' is the same in both languages
      { on: 'wordComplete', word: 'cruel', actions: [{ type: 'particles', preset: 'redDrops', count: 10 }, { type: 'bgColor', color: '#d8cab5', duration: 1200 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b18',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 3 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b19',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 4 }],
    triggers: [
      // words filled by locale via wordTriggers['tit-b19']
      { on: 'wordComplete', actions: [{ type: 'particles', preset: 'spark', count: 18, color: '#b77713' }, { type: 'sound', name: 'spark' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b20',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    triggers: [
      { on: 'letterUnlock', once: true, actions: [{ type: 'ambient', name: 'silence', mode: 'crossfade', gain: 0 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b21',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 2 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b22',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#cfc2ac', duration: 1600 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b23',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'ambient', name: 'latido-bajo', mode: 'crossfade' }, { type: 'bgColor', color: '#c5b89e', duration: 1800 }] },
      { on: 'blockComplete', actions: [{ type: 'particles', preset: 'redDrops', count: 5 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b24',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 5 }],
    triggers: [
      { on: 'letterUnlock', actions: [{ type: 'particles', preset: 'tears', count: 1 }] },
      { on: 'blockAppear', actions: [{ type: 'ambient', name: 'latido-bajo', mode: 'layer', gain: 0.04 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b25',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 5 }],
    triggers: [
      { on: 'beforeLetterUnlock', target: 'readingLast', holdMs: 1600, condition: { completedBlock: 'tit-b10' }, actions: [{ type: 'particles', preset: 'violentGeyser', count: 60, duration: 1700 }, { type: 'sound', name: 'geyser' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b26',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 4 }],
    triggers: [
      // word + physicsLabel filled by locale via wordTriggers['tit-b26'][0]
      { on: 'wordComplete', actions: [{ type: 'physicsObject', radius: 48 }, { type: 'sound', name: 'drop' }] },
      // word + physicsLabel filled by locale via wordTriggers['tit-b26'][1]
      { on: 'wordComplete', actions: [{ type: 'physicsObject', radius: 36 }, { type: 'sound', name: 'drop' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b27',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 1 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'ambient', name: 'silence', mode: 'crossfade', gain: 0 }, { type: 'bgColor', color: '#bfb09a', duration: 2200 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b28',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 2 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b29',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    triggers: [{ on: 'blockAppear', actions: [{ type: 'ambient', name: 'sigilo', mode: 'crossfade' }] }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b30',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 2 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b31',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [
      { line: 0, direction: 'right', starterCount: 2, toGrapheme: 26 },
      { line: 0, direction: 'left', starterCount: 2, fromGrapheme: 27 }
    ],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#b5a48c', duration: 2000 }, { type: 'ambient', name: 'tension', mode: 'layer', gain: 0.03 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b32',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [
      { line: 0, direction: 'right', starterCount: 2, fromRatio: 0, toRatio: 0.5 },
      { line: 0, direction: 'left', starterCount: 2, fromRatio: 0.5, toRatio: 1 }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b33',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 2 }, { line: 1, direction: 'right', starterCount: 2 }, { line: 2, direction: 'left', starterCount: 2 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b34',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [
      { line: 0, direction: 'right', starterCount: 2 },
      { line: 1, direction: 'left',  starterCount: 2 },
      { line: 2, direction: 'right', starterCount: 2 },
      { line: 3, direction: 'left',  starterCount: 2 },
      { line: 4, direction: 'right', starterCount: 2 }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b35',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [
      { line: 0, direction: 'right', starterCount: 2 }, { line: 0, direction: 'left', starterCount: 2 },
      { line: 1, direction: 'right', starterCount: 2 },
      { line: 2, direction: 'left',  starterCount: 2 }, { line: 2, direction: 'right', starterCount: 2 }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b36',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [
      { line: 0, direction: 'right', starterCount: 2 }, { line: 0, direction: 'left', starterCount: 2 },
      { line: 1, direction: 'right', starterCount: 2 },
      { line: 2, direction: 'left',  starterCount: 2 },
      { line: 3, direction: 'right', starterCount: 2 },
      { line: 4, direction: 'left',  starterCount: 2 }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b37',
    transform: { x: 0, y: 0, scale: 1, width: 460 },
    peelPoints: [{ line: 0, direction: 'right', mode: 'spiral', starterCount: 7 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#ac9c82', duration: 1800 }, { type: 'ambient', name: 'latido-alto', mode: 'crossfade' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b38',
    transform: { x: 0, y: 0, scale: 1, width: 480 },
    peelPoints: [{ line: 0, direction: 'right', mode: 'spiral', starterCount: 4 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b39',
    transform: { x: 0, y: 0, scale: 1.1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#a39077', duration: 1200 }, { type: 'particles', preset: 'redDrops', count: 20 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-preg1',
    transform: { x: 0, y: 0, scale: 0.85, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#9e8e74', duration: 1400 }, { type: 'ambient', name: 'spiral', mode: 'crossfade' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-preg2',
    transform: { x: 0, y: 0, scale: 1.0, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 4 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-preg3',
    transform: { x: 0, y: 0, scale: 1.3, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 5 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-preg4',
    transform: { x: 0, y: 0, scale: 1.6, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 5 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-preg5',
    transform: { x: 0, y: 0, scale: 1.9, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 5 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#967d62', duration: 1000 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b45',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 4 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#a08870', duration: 1600 }] },
      { on: 'letterUnlock', once: true, actions: [{ type: 'particles', preset: 'redDrops', count: 5 }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-tq',
    transform: { x: 0, y: 0, scale: 1.4, width: 400 },
    peelPoints: [{ line: 0, direction: 'right', mode: 'spiral', starterCount: 7 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#c4aa92', duration: 1800 }, { type: 'ambient', name: 'latido-bajo', mode: 'crossfade' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b47',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#cdb8a2', duration: 2400 }, { type: 'ambient', name: 'sigilo', mode: 'crossfade' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b48',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b49',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'left', starterCount: 2 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b50',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b51',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#d8c4b0', duration: 2000 }] },
      { on: 'beforeLetterUnlock', target: 'readingLast', holdMs: 2200, actions: [{ type: 'ambient', name: 'sigilo', mode: 'crossfade' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b52',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 2 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#1a1a1a', duration: 1800 }, { type: 'textColor', color: '#f0ece3' }] },
      { on: 'beforeLetterUnlock', target: 'readingLast', holdMs: 3000, actions: [{ type: 'sound', name: 'crack' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  },
  {
    id: 'tit-b53',
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    timedButton: { text: '+', action: 'url', url: 'https://gustavochico.com', spawnAt: 'afterAll', delayMs: 1500 },
    peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
    triggers: [
      { on: 'blockAppear', actions: [{ type: 'bgColor', color: '#f5f0e8', duration: 3000 }, { type: 'textColor', color: '#7e7e7e' }] },
      { on: 'beforeLetterUnlock', target: 'readingLast', holdMs: 2000, condition: { completedBlock: 'tit-b10' }, actions: [{ type: 'particles', preset: 'violentGeyser', count: 60, duration: 2000 }, { type: 'sound', name: 'geyser' }] }
    ],
    style: { colorMode: 'solid', fontFamily: 'EB Garamond' }
  }
];

// Apply locale text, hint text, and word-trigger overrides to an existing blocks array.
// Preserves all editor-edited structure (peelPoints, triggers shape, etc.).
// Used for both the fallback (buildBlocks) and the JSON-loaded poem.
export function applyLocaleToBlocks(blocks, locale) {
  return blocks.map(block => {
    const text = locale.strings[block.id];
    const hintString = locale.strings[block.id + '-hint'];
    const wordOverrides = locale.wordTriggers?.[block.id];
    if (!text && !hintString && !wordOverrides) return block;

    const result = text ? { ...block, text } : { ...block };

    if (result.hint && hintString) {
      result.hint = { ...result.hint, text: hintString };
    }

    if (!wordOverrides || !block.triggers) return result;

    let overrideIdx = 0;
    result.triggers = block.triggers.map(trigger => {
      if (trigger.on !== 'wordComplete') return trigger;
      const ov = wordOverrides[overrideIdx++];
      if (!ov) return trigger;
      const next = { ...trigger };
      if ('word'  in ov) next.word  = ov.word;  else delete next.word;
      if ('words' in ov) next.words = ov.words; else delete next.words;
      if ('physicsLabel' in ov) {
        next.actions = trigger.actions.map(a =>
          a.type === 'physicsObject' ? { ...a, label: ov.physicsLabel } : a
        );
      }
      return next;
    });
    return result;
  });
}

// Merge block structure with locale strings and word-trigger overrides.
export function buildBlocks(locale) {
  return applyLocaleToBlocks(TIRITA_POEM_BLOCKS, locale);
}
