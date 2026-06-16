async function initTirita() {
console.log("Tirita: Script execution started.");
// Inherit ?v=XX from this script's own URL so only tirita.html needs bumping
const _v = new URL(import.meta.url).searchParams.get('v') ?? '1';
const { TIRITA_LOCALE_ES } = await import(`./locales/es.js?v=${_v}`);
const { TIRITA_LOCALE_EN } = await import(`./locales/en.js?v=${_v}`);
const { buildBlocks, applyLocaleToBlocks } = await import(`./poem.js?v=${_v}`);
const { buildExampleScenes, buildCableScenes } = await import(`./scenes.js?v=${_v}`);
const { pointsOnPath, hachureLines } = await import(`./vendor/geometry.js?v=${_v}`);
const { quoteFontFamily, fontFamilyToGoogleSlug, loadGoogleFont } = await import(`./font.js?v=${_v}`);
const { parseInlineMotionValue, cloneInlineStyle, parseBBCode, normalizeWord, buildWordRanges } = await import(`./bbcode.js?v=${_v}`);
const { cubicAt, cubicDerivativeAt, getAnchorOut, getAnchorIn,
        sampleDrawPath, pointOnDrawSamples, anchorsFromDrawnPoints } = await import(`./draw-path.js?v=${_v}`);
const { buildLabyrinthThreads, scrambleWords } = await import(`./labyrinth.js?v=${_v}`);
const { buildMazeBlocks, MAZE_ALGORITHMS } = await import(`./maze.js?v=${_v}`);
const { armAudio: _armAudioCore, zzfx, applyAudioMutedState,
        playPeelSound, playGrabSound, playDropSound,
        playParagraphAppearSound, playPeelPointCompleteSound, playParagraphCompleteSound,
        playNamedSound, setAudioParamSmooth, ensureAmbientLayer, runAmbientAction,
        isSoundArmed } = await import(`./audio.js?v=${_v}`);
const { normalizeGradient, hexToRgba, hexToRgb, gradientStopsToCss, gradientToCss,
        interpolateChannel, getGradientPresetByName, sampleGradientColor,
        sampleLinearGradientColorForLetter, sampleRadialGradientColorForLetter,
        hexToHsl, sampleRandomGradientColor, applyHslVariation } = await import(`./color.js?v=${_v}`);
const { isWordGrapheme, getWordIndexGroups, fallbackSplitSyllables, splitWordSyllables,
        getSyllableIndexGroups, flattenGroups, buildNthFromGroups,
        getSyllableGroupKeyMap } = await import(`./syllables.js?v=${_v}`);
const { state } = await import(`./state.js?v=${_v}`);
const { normalizeDirectionVector, normalizeForceFields, getForceFieldWeight,
        getForceFieldAcceleration, forceFieldAffectsBlock, getWindGustMultiplier,
        wakeWindForceStarters, getForceFieldVisualPush } = await import(`./force-fields.js?v=${_v}`);
const { loadBundledTiritaConfig, loadPoemsFromManifest, resolveSceneKey, getSceneKeyFromQuery, applySceneQueryOverride,
        getSceneConfigStorageKey, getStoredSceneConfigString, persistPieceConfig,
        removeStoredSceneConfig, getStoredSceneConfig, cloneAttachmentForSync, attachmentSignature,
        loadAttachmentSyncStore, saveAttachmentSyncStore, getAttachmentSyncBlockKey,
        getMainLocale, setMainLocale, promoteLocaleToMain,
        clearLocaleSyncStores, loadLastAttachmentSettings, saveLastAttachmentSettings,
        seedAttachmentSyncFromConfig, applyAttachmentSyncToConfig, recordSyncedBlockFieldEdit,
        recordAttachmentEditForLocale, persistAttachmentSyncFromConfig,
        migrateStoredConfig, loadPieceConfig, consumeClearSceneStorageQuery } = await import(`./storage.js?v=${_v}`);
const { getBlockStyle, getBlockFont, getBlockRawLineHeight, getBlockVisualLineHeight,
        getLetterLineHeight, getBlockPeelFromBeginning, getConfigBlocks, getBlockPeelFromConfig,
        waitForTextFonts, getMaxWidth, getShapePathD, transformShapePoint, buildPathSpans,
        layoutBlockInPath, getBlockLayout, layoutPositions, layoutBlockAtWidth,
        layoutBlockOnDrawPath, getAttachmentHeight, getAttachmentLayout,
        getBlockPeelPoints } = await import(`./layout.js?v=${_v}`);
const { buildSpiralOrder, buildSegmentOrder, buildSelectivePeelSegments, buildBlockSegments,
        computeRestLengths, computeGapLinkDecayTargets, computeAllReflowPositions,
        computeAnchorPeelNeighbors, resolveBlockIndex, resolveCrossSegment, resolveCrossEndpoint,
        getCrossStarterIndices, getCrossBlockArcBridge, holdCrossArcSegments,
        placeCrossBlockArcBridge, solveBridgeConstraint, preSettleCrossBlockBridge,
        applyCrossBlockIdleArcs, computeCrossBlockConstraints,
        buildCensorRevealEls } = await import(`./peel-segments.js?v=${_v}`);
const { createParticle, createParticleEmitter, spawnParticles, createPhysicsProp,
        simulateEffects, drawPeelStroke, getAttachmentOpacity,
        getPeelStrokeVisibilityAlpha, renderEffects } = await import(`./effects.js?v=${_v}`);
const { setForceFieldEnabledById, runTriggerAction, resolveBlockConditionIndex,
        triggerConditionPasses, triggerConditionsPass, runTriggers,
        checkWordTriggers } = await import(`./events.js?v=${_v}`);
const { applyLetterMotion, migrateGripOneStep, simulate, render } = await import(`./physics.js?v=${_v}`);
const { computeTies, normalizeTie, TIE_TYPES,
        simulateTieRopes, hitTestTieRope } = await import(`./ties.js?v=${_v}`);
const { computeTangledLines, simulateTangledLines } = await import(`./tangled-lines.js?v=${_v}`);
console.log("Tirita: Local offline modules imported successfully.");

let spanishHyphenator = null;

const DEFAULT_OPTIMIZATION = {
  dynamicLetterLimitDesktop: 370,
  dynamicLetterLimitMobile: 110,
  dynamicLetterLimitNarrow: 140,
  initialPeelActiveBlocks: 4
};

const defaultPieceConfig = {
  id: 'tirita',
  version: 32,
  title: 'tirar después de leer',
  editor: { enabled: true },
  style: {
    font: '20px "EB Garamond"',
    lineHeight: 30,
    color: '#4a4a4a',
    backgroundColor: '#f5f0e8'
  },
  layout: {
    type: 'paragraph',
    blockGap: 40,
    margin: 20,
    topMargin: 72,
    bottomMargin: 96
  },
  peel: {
    fromBeginning: true,
    zigzag: true,
    mode: 'zigzag',
    initialUnlockCount: 2,
    unlockThreshold: 1
  },
  physics: {
    constraintDistance: 1.2,
    iterations: 12,
    damping: 0.97,
    gravity: 0.15,
    gravityOn: true
  },
  optimization: { ...DEFAULT_OPTIMIZATION },
  behaviors: {
    fadeReveal: {
      enabled: false,
      visibleLetters: 24,
      fadeSteps: 8
    },
    stepParagraphs: {
      enabled: false,
      visibleCount: 2,
      compactFlow: false,
      advanceDelayMs: 0,
      perBlockAdvanceDelayMs: {},
      perBlockVisibleCount: {}
    },
    cablePull: {
      enabled: false,
      mode: 'frontier',
      followBlockIds: [],
      ease: 0.12,
      leadMargin: 380,
      maxPan: 0,
      lockVerticalScroll: true,
      lockOnComplete: true
    }
  },
  blocks: [
    {
      id: 'default-0',
      text: 'Esto es una línea corta.',
      transform: { x: 0, y: 0, scale: 1, width: 660 },
      peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
      style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
    },
    {
      id: 'default-1',
      text: 'Esta línea es un poco más larga, pero no tanto. Ahora voy a poner algo de texto en los demás párrafos.',
      transform: { x: 0, y: 0, scale: 1, width: 660 },
      peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
      style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
    },
    {
      id: 'carne-viva-1',
      text: 'El proceso de conocer profundamente a alguien - me refiero en el sentido intenso de carne viva con carne viva - es un poco como tirar de la cutícula del dedo.',
      transform: { x: 0, y: 0, scale: 1, width: 660 },
      peelPoints: [{ line: 0, direction: 'right', starterCount: 1 }],
      style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
    },
    {
      id: 'carne-viva-2',
      text: 'Al principio es curioso, casi tienes ganas de tirar un poco por satisfacción de saber algo de otra persona y así sentirte humano un rato.',
      transform: { x: 0, y: 0, scale: 1, width: 660 },
      peelPoints: [{ line: 0, direction: 'right', starterCount: 3 }],
      style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
    },
    {
      id: 'carne-viva-3',
      text: 'Sin embargo, si de ahí surge una conexión fuerte lo que suele pasar es que decides por inercia y con permiso seguir tirando, con mucho cuidado y muy suavemente, bajando por el lateral del dedo, a pasito de caracol y notando cada ristra de células romperse.',
      transform: { x: 0, y: 0, scale: 1, width: 660 },
      peelPoints: [{ line: 0, direction: 'right', starterCount: 2 }],
      style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
    },
    {
      id: 'carne-viva-4',
      text: 'Existen agentes externos como sus compromisos, malos recuerdos u obstáculos mentales.',
      transform: { x: 0, y: 0, scale: 1, width: 660 },
      peelPoints: [{ line: 0, direction: 'right', starterCount: 4 }],
      style: { color: '#4a4a4a', colorMode: 'solid', fontFamily: 'Georgia' }
    }
  ],
  mobileBlocks: []
};

const TIRITA_OPTIMIZATION = {
  ...DEFAULT_OPTIMIZATION,
  initialPeelActiveBlocks: 1
};

const LOCALES = { es: TIRITA_LOCALE_ES, en: TIRITA_LOCALE_EN };
// Discover and load any additional locale files from the server (e.g. fr.js, de.js)
try {
  const extraCodes = await fetch('/api/locales', { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []);
  for (const code of (Array.isArray(extraCodes) ? extraCodes : [])) {
    if (!code || LOCALES[code]) continue;
    try {
      const mod = await import(`./locales/${code}.js?v=${_v}`);
      const key = Object.keys(mod).find(k => k.startsWith('TIRITA_LOCALE_'));
      if (key) LOCALES[code] = mod[key];
    } catch {}
  }
} catch {}
const browserLocale = /^en\b/i.test(navigator.language || '') ? 'en' : 'es';
const storedLocale = localStorage.getItem('tirita.locale') || browserLocale;
const currentLocale = LOCALES[storedLocale] || LOCALES.es;

const fallbackTiritaConfig = {
  ...structuredClone(defaultPieceConfig),
  id: 'tirita-poema',
  style: { font: '20px "EB Garamond"', lineHeight: 30, color: '#4a4a4a', backgroundColor: '#f5f0e8' },
  layout: { type: 'paragraph', blockGap: 34, margin: 20, topMargin: 72, bottomMargin: 96 },
  peel: { fromBeginning: true, zigzag: true, mode: 'zigzag', initialUnlockCount: 3, unlockThreshold: 1 },
  optimization: { ...TIRITA_OPTIMIZATION },
  mobileBlocks: [],
  behaviors: {
    fadeReveal: { enabled: false, visibleLetters: 24, fadeSteps: 8 },
    stepParagraphs: { enabled: true, visibleCount: 1, compactFlow: true, advanceDelayMs: 0, perBlockAdvanceDelayMs: {}, perBlockVisibleCount: {} }
  },
  blocks: buildBlocks(currentLocale)
};
fallbackTiritaConfig.blocks[0].hint = { enabled: true, peelPointIndex: 0 };

const poemScenes = await loadPoemsFromManifest(defaultPieceConfig);
for (const scene of Object.values(poemScenes)) {
  scene.config.blocks = applyLocaleToBlocks(scene.config.blocks, currentLocale);
}
if (!poemScenes.tirita) {
  poemScenes.tirita = { label: 'tirita', config: fallbackTiritaConfig };
}

const scenePresets = {
  ...buildExampleScenes(defaultPieceConfig),
  ...buildCableScenes(defaultPieceConfig),
  ...poemScenes
};


// --- Initialization Calls ---
applySceneQueryOverride(scenePresets);
let pieceConfig = loadPieceConfig(scenePresets, defaultPieceConfig, DEFAULT_OPTIMIZATION, storedLocale);
if (pieceConfig?.id === 'tirita-poema' && Array.isArray(pieceConfig.blocks)) {
  pieceConfig.blocks = applyLocaleToBlocks(pieceConfig.blocks, currentLocale);
}
const isTouchMobile = window.innerWidth < 760 || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900);
if (isTouchMobile) document.body.classList.add('mobile-runtime');
const mobileRuntime = isTouchMobile;

// --- Hide-UI toggle (top-left button + ?hideUI query string) ---
(() => {
  const uiToggle = document.getElementById('uiToggle');
  const params = new URLSearchParams(window.location.search);
  const truthy = (v) => v === '' || v === '1' || v === 'true' || v === 'yes';
  const setHidden = (hidden) => {
    document.body.classList.toggle('ui-hidden', hidden);
    if (!uiToggle) return;
    uiToggle.setAttribute('aria-pressed', String(hidden));
    uiToggle.title = hidden ? 'Show interface' : 'Hide interface';
    uiToggle.setAttribute('aria-label', uiToggle.title);
  };
  setHidden(params.has('hideUI') && truthy(params.get('hideUI')));
  uiToggle?.addEventListener('click', () => {
    setHidden(!document.body.classList.contains('ui-hidden'));
  });
})();
const DEFAULT_PALETTE = ['#4a4a4a', '#1f6f52', '#784830', '#c1a35f', '#f5f0e8', '#e8ddd0', '#cfc2ac', '#b74040', '#1a1a1a', '#ffffff'];
const DEFAULT_GRADIENT_PRESETS = [
  { name: 'Warm pulse', stops: [{ color: '#b74040', alpha: 1, position: 0 }, { color: '#c1a35f', alpha: 1, position: 100 }] },
  { name: 'Leaf shadow', stops: [{ color: '#1f6f52', alpha: 1, position: 0 }, { color: '#f5f0e8', alpha: 1, position: 100 }] },
  { name: 'Bruise', stops: [{ color: '#4a4a4a', alpha: 1, position: 0 }, { color: '#784830', alpha: 1, position: 55 }, { color: '#b74040', alpha: 1, position: 100 }] },
  { name: 'Paper ash', stops: [{ color: '#1a1a1a', alpha: 1, position: 0 }, { color: '#e8ddd0', alpha: 1, position: 100 }] }
];
let currentPalette = JSON.parse(localStorage.getItem('tirita.palette') || JSON.stringify(DEFAULT_PALETTE));
let currentGradientPresets = JSON.parse(localStorage.getItem('tirita.gradientPresets') || JSON.stringify(DEFAULT_GRADIENT_PRESETS));
let currentGradientStops = [];
let editorInitialized = false;
let activeColorMode = 'solid';
const COLOR_MODES = ['solid', 'linear', 'sequential', 'radial', 'random', 'variation'];

// Restore preferences
const autoReloadPref = localStorage.getItem('tirita.autoReload') !== '0';
const pausePref = localStorage.getItem('tirita.freezeEditor') === '1';
let audioMuted = localStorage.getItem('tirita.audioMuted') === '1';
const selectedBlockPref = Number(localStorage.getItem('tirita.selectedBlockIdx') || 0);
const focusedId = localStorage.getItem('tirita.focusedElementId');
const cursorStart = Number(localStorage.getItem('tirita.cursorStart') || 0);
const cursorEnd = Number(localStorage.getItem('tirita.cursorEnd') || 0);

// Safety check for activeBlocks to prevent silent crash during initialization
let activeBlocks = pieceConfig.blocks || [];

document.documentElement.style.setProperty('--page-bg', pieceConfig.style.backgroundColor || '#f5f0e8');
const FONT = pieceConfig.style?.font || '20px "EB Garamond"';
const LINE_HEIGHT = pieceConfig.style?.lineHeight || 30;
let BLOCK_GAP = pieceConfig.layout.blockGap;
const MARGIN = pieceConfig.layout.margin;
const TOP_MARGIN = Number(pieceConfig.layout.topMargin ?? 72);
const BOTTOM_MARGIN = Number(pieceConfig.layout.bottomMargin ?? 96);
const CONSTRAINT_DIST = pieceConfig.physics.constraintDistance;
const UNLOCK_THRESHOLD = pieceConfig.peel.unlockThreshold;

// ── Long-strip tearing assist ─────────────────────────────────────────────
// When the strip is long, the constraint solver can't propagate drag force
// to the frontier. These variables control the analytic fallback check.
const LONG_STRIP_MIN_LETTERS  = 50;  // strip must be at least this many letters before assist kicks in
const LONG_STRIP_SENSITIVITY  = 10;  // higher = harder to tear (more px of drag needed per letter in chain)
const LONG_STRIP_VELOCITY_REF = 4;   // px/frame — at this cursor speed the sensitivity halves; faster = easier

// ── Grip migration on very long strips ────────────────────────────────────
// Each time a letter tears off, the grip walks N steps toward the frontier.
// N scales with cursor speed: slow drag → 0 steps (no migration),
// fast drag → up to MIGRATION_STEPS_MAX steps per tear.
const MIGRATION_TARGET_DEPTH  = 25;  // stop migrating once grip is within this many letters of frontier
const MIGRATION_VELOCITY_MIN  = 10;   // px/frame — below this speed, N = 0 (no migration at all)
const MIGRATION_VELOCITY_MAX  = 30;  // px/frame — at or above this speed, N = MIGRATION_STEPS_MAX
const MIGRATION_STEPS_MAX     = 20;   // max letters migrated per tear at full speed

// Lineart peel tuning. Higher stiffness and lower resistance make SVG lines
// feel closer to text strips instead of rubber bands.
const LINEART_STROKE_CONSTRAINT_ITERATIONS = mobileRuntime ? 2 : 8;
const LINEART_STROKE_RESISTANCE_SCALE = 0.52;
const LINEART_STROKE_GRAVITY = 0.12;
const INITIAL_UNLOCK_COUNT = pieceConfig.peel.initialUnlockCount;
const ITERATIONS = pieceConfig.physics.iterations;
const EFFECTIVE_ITERATIONS = mobileRuntime ? Math.min(ITERATIONS, 4) : ITERATIONS;
const DAMPING = pieceConfig.physics.damping;
const GRAVITY = pieceConfig.physics.gravity;
const SIM_HZ = mobileRuntime ? 60 : 80;
const SIM_STEP_SCALE = 120 / SIM_HZ;
const STEP_MS = 1000 / SIM_HZ;
const TICK_DAMPING = Math.pow(DAMPING, SIM_STEP_SCALE);
const TICK_GRAVITY = GRAVITY * SIM_STEP_SCALE;
let FORCE_FIELDS = normalizeForceFields(pieceConfig.forceFields, SIM_STEP_SCALE);
let dynamicLetterLimit = isTouchMobile
  ? pieceConfig.optimization.dynamicLetterLimitMobile
  : (window.innerWidth < 600
    ? pieceConfig.optimization.dynamicLetterLimitNarrow
    : pieceConfig.optimization.dynamicLetterLimitDesktop);
let activeInitialPeelBlockLimit = Math.max(1, Number(pieceConfig.optimization.initialPeelActiveBlocks ?? 4) || 4);
let activeBehaviors = structuredClone(pieceConfig.behaviors || defaultPieceConfig.behaviors);
let gravityOn = pieceConfig.physics.gravityOn;
let simulationPaused = false;
let unlockClock = 0;
let unraveling = false;
let unravelIdx = -1;
let activeBlockFlags = [];
let everActiveBlockFlags = [];
let hiddenBlocks = new Set();
let namedFlags = new Set();
let cachedVisibleBlockWindow = { start: 0, end: 0 };
let frameLetterRange = { start: 0, end: -1 };
let lastBehaviorVisibilityKey = '';
let compactFlowCurrentOffset = 0;
let compactFlowTargetOffset = 0;
let lastOverflowY = '';
let cameraX = 0;
let cameraTargetX = 0;
let cameraAppliedX = NaN;     // last cameraX whose transform/width styles were applied
let cameraAppliedVw = NaN;    // viewport width at last style application
let cameraEditorWidth = NaN;  // last container width applied in editor pan mode
let cameraScrollLocked = false;
let completedBlockTimes = [];
let mobilePrunedBlockCursor = 0;
let frameViewport = {
  containerLeft: 0,
  containerTop: 0,
  effectsLeft: 0,
  effectsTop: 0,
  width: window.innerWidth,
  height: window.innerHeight
};
let lineartOriginSyncToken = 0;
let lineartLastOriginSyncToken = -1;
let lastVisibleBlockSignature = '';
let mobileFpsLastUpdate = 0;
const debugStats = {
  fps: 0,
  frameMs: 0,
  cpuMs: 0,
  renderMs: 0,
  steps: 0,
  looseVisible: 0,
  looseTotal: 0,
  domLetters: 0,
  deletedLetters: 0,
  lockedLetters: 0,
  frameLetters: 0,
  particleCount: 0,
  emitters: 0,
  props: 0,
  memoryMb: null,
  lastUpdate: 0
};
// Restore editor selection and scroll
let selectedBlockIdx = Number(localStorage.getItem('tirita.selectedBlockIdx') || 0);
const savedEditorScroll = Number(localStorage.getItem('tirita.editorScroll') || 0);
const savedUtilityScroll = Number(localStorage.getItem('tirita.utilityScroll') || 0);
const savedSceneScroll = Number(localStorage.getItem('tirita.sceneScroll') || 0);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let restoringSceneScroll = false;
let sceneScrollSaveQueued = false;
let lastKnownSceneScroll = savedSceneScroll;
let sceneScrollRestoreTarget = 0;
let sceneScrollRestoreStartedAt = 0;
let sceneScrollRestoreDuration = 0;

function getCurrentSceneScroll() {
  return Math.max(0, window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0);
}

function getMaxSceneScroll() {
  const doc = document.documentElement;
  const body = document.body;
  return Math.max(0, Math.max(doc.scrollHeight, body?.scrollHeight || 0) - window.innerHeight);
}

function saveSceneScroll() {
  if (restoringSceneScroll) return;
  const current = getCurrentSceneScroll();
  const previous = Number(localStorage.getItem('tirita.sceneScroll') || lastKnownSceneScroll || 0);
  const preserveUntil = Number(localStorage.getItem('tirita.preserveSceneScrollUntil') || 0);
  if (document.body.classList.contains('editor-open') && current <= 1 && previous > 1) return;
  if (current <= 1 && previous > 1 && Date.now() < preserveUntil) return;
  lastKnownSceneScroll = current > 1 ? current : previous;
  try { localStorage.setItem('tirita.sceneScroll', String(current > 1 ? current : lastKnownSceneScroll || 0)); } catch (_) {}
}

function preserveSceneScrollForReload() {
  const current = getCurrentSceneScroll();
  const target = current > 1 ? current : lastKnownSceneScroll || Number(localStorage.getItem('tirita.sceneScroll') || 0);
  if (target > 1) {
    lastKnownSceneScroll = target;
    try {
      localStorage.setItem('tirita.sceneScroll', String(target));
      localStorage.setItem('tirita.restoreSceneScroll', String(target));
      localStorage.setItem('tirita.preserveSceneScrollUntil', String(Date.now() + 8000));
    } catch (_) {}
  }
}

function restoreSceneScrollTo(targetY, durationMs = 1800) {
  const y = Math.max(0, Number(targetY) || 0);
  if (!y) return;
  sceneScrollRestoreTarget = y; state.sceneScrollRestoreTarget = y;
  sceneScrollRestoreStartedAt = performance.now();
  sceneScrollRestoreDuration = durationMs;
  restoringSceneScroll = true;
  requestAnimationFrame(continueSceneScrollRestore);
}

function continueSceneScrollRestore() {
  const target = Math.max(0, sceneScrollRestoreTarget || Number(localStorage.getItem('tirita.restoreSceneScroll') || 0));
  if (!target) {
    restoringSceneScroll = false;
    return;
  }
  const elapsed = performance.now() - (sceneScrollRestoreStartedAt || performance.now());
  const maxScroll = getMaxSceneScroll();
  const desired = Math.min(target, maxScroll);
  window.scrollTo(0, desired);
  const current = getCurrentSceneScroll();
  const hasEnoughPage = maxScroll >= target - 2;
  const reached = Math.abs(current - desired) <= 2 && (hasEnoughPage || elapsed >= sceneScrollRestoreDuration);
  if (!reached) {
    restoringSceneScroll = true;
    requestAnimationFrame(continueSceneScrollRestore);
    return;
  }
  restoringSceneScroll = false;
  sceneScrollRestoreTarget = 0; state.sceneScrollRestoreTarget = 0;
  lastKnownSceneScroll = current || desired || target;
  try {
    localStorage.setItem('tirita.sceneScroll', String(lastKnownSceneScroll));
    localStorage.removeItem('tirita.restoreSceneScroll');
    localStorage.removeItem('tirita.preserveSceneScrollUntil');
  } catch (_) {}
}

function restoreSceneScroll() {
  const target = Number(localStorage.getItem('tirita.restoreSceneScroll') || localStorage.getItem('tirita.sceneScroll') || savedSceneScroll || 0);
  restoreSceneScrollTo(target);
}

function saveEditorScrollState() {
  const editorToolsEl = document.getElementById('editorTools');
  const utilityToolsEl = document.getElementById('utilityTools');
  if (editorToolsEl) localStorage.setItem('tirita.editorScroll', String(editorToolsEl.scrollTop || 0));
  if (utilityToolsEl) localStorage.setItem('tirita.utilityScroll', String(utilityToolsEl.scrollTop || 0));
}

function restoreEditorScrollState(durationMs = 700) {
  const editorToolsEl = document.getElementById('editorTools');
  const utilityToolsEl = document.getElementById('utilityTools');
  const editorTarget = Number(localStorage.getItem('tirita.editorScroll') || savedEditorScroll || 0);
  const utilityTarget = Number(localStorage.getItem('tirita.utilityScroll') || savedUtilityScroll || 0);
  const startedAt = performance.now();
  const apply = () => {
    if (editorToolsEl) editorToolsEl.scrollTop = editorTarget;
    if (utilityToolsEl) utilityToolsEl.scrollTop = utilityTarget;
    if (performance.now() - startedAt < durationMs) requestAnimationFrame(apply);
  };
  requestAnimationFrame(apply);
}

window.addEventListener('beforeunload', saveSceneScroll);
window.addEventListener('beforeunload', saveEditorScrollState);
window.addEventListener('pagehide', saveSceneScroll);
window.addEventListener('pagehide', saveEditorScrollState);
window.addEventListener('scroll', () => {
  if (restoringSceneScroll || sceneScrollSaveQueued) return;
  sceneScrollSaveQueued = true;
  requestAnimationFrame(() => {
    sceneScrollSaveQueued = false;
    saveSceneScroll();
  });
}, { passive: true });

window.addEventListener('keydown', (e) => {
  armAudio();
  if (e.key === 'f' || e.key === 'F') {
    gravityOn = !gravityOn; state.gravityOn = gravityOn;
    if (gravityOn && !unraveling) {
      unraveling = true; state.unraveling = unraveling;
      hint.style.opacity = '0';
      resetUnravelQueue();
    }
  }
  if ((e.ctrlKey || e.altKey) && e.key === 'ArrowRight') {
    e.preventDefault();
    forceCompleteCurrentBlock();
  }
});

const container = document.getElementById('container');
const effectsCanvas = document.getElementById('effectsCanvas');
const effectsCtx = effectsCanvas.getContext('2d');
const pileCanvas = document.getElementById('pileCanvas');
const pileCtx = pileCanvas.getContext('2d');
const debugPanel = document.getElementById('debugPanel');
const debugToggle = document.getElementById('debugToggle');
const debugBody = document.getElementById('debugBody');
const debugHeaderStats = document.getElementById('debugHeaderStats');

// ── Custom dialog helpers (replaces alert / confirm / prompt) ─────────────
const customDialog = document.getElementById('customDialog');
const customDialogMessage = document.getElementById('customDialogMessage');
const customDialogInput = document.getElementById('customDialogInput');
const customDialogCancel = document.getElementById('customDialogCancel');
const customDialogConfirm = document.getElementById('customDialogConfirm');
const toastNotification = document.getElementById('toastNotification');
let _dialogResolve = null;
let _dialogIsPrompt = false;
function _openDialog({ message, inputDefault, confirmLabel = 'OK', confirmDanger = false, hasCancel = true }) {
  return new Promise(resolve => {
    _dialogResolve = resolve;
    _dialogIsPrompt = inputDefault !== undefined;
    customDialogMessage.textContent = message;
    if (_dialogIsPrompt) {
      customDialogInput.style.display = '';
      customDialogInput.value = inputDefault;
    } else {
      customDialogInput.style.display = 'none';
    }
    customDialogConfirm.textContent = confirmLabel;
    customDialogConfirm.className = confirmDanger ? 'danger-button' : '';
    customDialogCancel.style.display = hasCancel ? '' : 'none';
    customDialog.style.display = '';
    requestAnimationFrame(() => (_dialogIsPrompt ? customDialogInput : customDialogConfirm).focus());
  });
}
function _closeDialog(value) {
  customDialog.style.display = 'none';
  _dialogResolve?.(value);
  _dialogResolve = null;
}
customDialogCancel.addEventListener('click', () => _closeDialog(null));
customDialogConfirm.addEventListener('click', () => _closeDialog(_dialogIsPrompt ? customDialogInput.value : true));
customDialogInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); _closeDialog(customDialogInput.value); }
  if (e.key === 'Escape') { e.preventDefault(); _closeDialog(null); }
});
customDialog.addEventListener('click', e => { if (e.target === customDialog) _closeDialog(null); });
document.addEventListener('keydown', e => {
  if (customDialog.style.display === 'none' || _dialogIsPrompt) return;
  if (e.key === 'Escape') { e.preventDefault(); _closeDialog(null); }
  if (e.key === 'Enter') { e.preventDefault(); customDialogConfirm.click(); }
});
function showAlert(message) {
  return _openDialog({ message, hasCancel: false });
}
function showConfirm(message, confirmLabel = 'OK', danger = false) {
  return _openDialog({ message, confirmLabel, confirmDanger: danger });
}
function showPrompt(message, defaultValue = '') {
  return _openDialog({ message, inputDefault: defaultValue });
}
let _toastTimer = null;
function showToast(message, durationMs = 2200) {
  toastNotification.textContent = message;
  toastNotification.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toastNotification.classList.remove('visible'), durationMs);
}
const mobileFps = document.getElementById('mobileFps');
let effectsDpr = 1;
let pileDpr = 1;
const PILE_SEG_W = 24;
let pileHeights = new Float32Array(Math.max(1, Math.ceil(window.innerWidth / PILE_SEG_W)));
const pileStampedSegs = new Set();
const MAX_PILE_H = 60;
const PILE_GROW_SEC = 25;
const measureCtx = document.createElement('canvas').getContext('2d');
// Safe regex match to prevent crash on non-standard font strings
const baseFontSize = (String(FONT).match(/\d+(?:\.\d+)?px/) || [])[0] || '20px';
const baseFontPx = Number.parseFloat(baseFontSize) || 20;
// Early state wiring — layout.js functions use these during init (before late wiring block)
state.FONT = FONT; state.LINE_HEIGHT = LINE_HEIGHT; state.MARGIN = MARGIN;
state.TOP_MARGIN = TOP_MARGIN; state.BOTTOM_MARGIN = BOTTOM_MARGIN;
state.baseFontSize = baseFontSize; state.baseFontPx = baseFontPx;
state.isTouchMobile = isTouchMobile; state.BLOCK_GAP = BLOCK_GAP; state.container = container;
state.pieceConfig = pieceConfig; state.activeBlocks = activeBlocks;
state.spanishHyphenator = spanishHyphenator;
state.CONSTRAINT_DIST = CONSTRAINT_DIST; state.UNLOCK_THRESHOLD = UNLOCK_THRESHOLD;
state.INITIAL_UNLOCK_COUNT = INITIAL_UNLOCK_COUNT; state.EFFECTIVE_ITERATIONS = EFFECTIVE_ITERATIONS;
state.TICK_GRAVITY = TICK_GRAVITY;
// armAudio wraps the imported core to inject the game-state ambient trigger loop
// that must fire once when audio is first armed.
function armAudio() {
  _armAudioCore(() => {
    activeBlockFlags.forEach((isActive, blockIdx) => {
      if (!isActive) return;
      for (const trigger of textBlocks[blockIdx]?.triggers || []) {
        if (trigger.on !== 'blockAppear') continue;
        if (!triggerConditionsPass(trigger)) continue;
        for (const action of trigger.actions || []) {
          if (action.type === 'ambient') runAmbientAction(action);
        }
      }
    });
  });
}

function setAudioMuted(muted) {
  audioMuted = Boolean(muted);
  applyAudioMutedState(muted);
  if (muteButton) {
    muteButton.textContent = muted ? 'Sound' : 'Mute';
    muteButton.title = muted ? 'Unmute sound' : 'Mute sound';
    muteButton.classList.toggle('active', Boolean(muted));
  }
}


await waitForTextFonts();

const textBlocks = activeBlocks.map((blockConfig, blockIdx) => {
  measureCtx.font = getBlockFont(blockIdx);
  const parsedText = parseBBCode(blockConfig.text);
  const graphemes = parsedText.graphemes;
  const transform = {
    x: Number(blockConfig.transform?.x ?? 0),
    y: Number(blockConfig.transform?.y ?? 0),
    scale: Number(blockConfig.transform?.scale ?? 1),
    width: Number(blockConfig.transform?.width ?? getMaxWidth()),
    height: Number(blockConfig.transform?.height ?? 0)
  };
  return {
    id: blockConfig.id,
    text: blockConfig.text,
    plainText: parsedText.plainText,
    style: getBlockStyle(blockIdx),
    font: getBlockFont(blockIdx),
    transform,
    graphemes,
    inlineStyles: parsedText.inlineStyles,
    wordRanges: buildWordRanges(parsedText.plainText, graphemes),
    attachment: blockConfig.attachment || null,
    peel: blockConfig.peel || {},
    hint: blockConfig.hint || {},
    triggers: blockConfig.triggers || [],
    linkButton: blockConfig.linkButton || null,
    timedButton: blockConfig.timedButton || null,
    clipShape: blockConfig.clipShape || null,
    drawPath: blockConfig.drawPath || null,
    ringPath: blockConfig.ringPath || null,
    groupNext: Number(blockConfig.groupNext) || 0,
    groupParallel: Boolean(blockConfig.groupParallel),
    groupOpacity: (() => { const v = Number(blockConfig.groupOpacity); return Number.isFinite(v) ? v : undefined; })(),
    groupGhostLayers: Math.max(1, Number(blockConfig.groupGhostLayers) || 1),
    groupPeelReveal: Boolean(blockConfig.groupPeelReveal),
    eraseCompleted: Boolean(blockConfig.eraseCompleted),
    hidden: Boolean(blockConfig.hidden),
    widths: graphemes.map(g => measureCtx.measureText(g).width)
  };
});
state.textBlocks = textBlocks;

function getBlockConfig(blockIdx) { return pieceConfig.blocks?.[blockIdx] || activeBlocks[blockIdx] || {}; }

const shapeOrigins = new Map();
state.shapeOrigins = shapeOrigins;
const drawPathOrigins = new Map(); state.drawPathOrigins = drawPathOrigins;




// Initial layout — compute positions and zig-zag ordering once
let positions = layoutPositions(getMaxWidth());
state.positions = positions;

// Build letters array. Each block may have multiple physically-independent segments.
let letters = [];
let blockRanges = [];     // blockRanges[blockIdx] = { start, end } — full block span
let segmentRanges = [];   // segmentRanges[blockIdx] = [{ start, end, starterCount }, …]

for (let blockIdx = 0; blockIdx < textBlocks.length; blockIdx++) {
  let start = letters.length;
  const block = textBlocks[blockIdx];
  const segments = buildBlockSegments(blockIdx, positions[blockIdx]);
  const segsForBlock = [];

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx];
    const segStart = letters.length;
    for (const ri of seg.stringOrder) {
      const p = positions[blockIdx].positions[ri];
      if (!p) continue;
      letters.push({
        ch: block.graphemes[ri],
        w: p.w,
        x: p.x, y: p.y,
        ox: p.x, oy: p.y,
        px: p.x, py: p.y,
        angle: p.angle || 0,
        blockIdx,
        segmentIdx: segIdx,
        readingIdx: ri,
        sequenceRatio: block.graphemes.length > 1 ? ri / (block.graphemes.length - 1) : 0,
        scale: block.transform.scale,
        lineHeight: p.lineHeight || getBlockVisualLineHeight(block),
        style: block.style,
        inlineStyle: block.inlineStyles[ri] || cloneInlineStyle(),
        font: block.font,
        locked: true,
        deleted: false,
        unlockedAt: null,
        starterIdle: false,
        tempLockUntil: 0,
        groupKey: seg.groupKeys.get(ri) || null,
        peelGroupIdx: seg.readingIdxToGroupIdx?.get(ri) ?? -1,
        yBaked: false
      });
    }
    segsForBlock.push({ start: segStart, end: letters.length - 1, starterCount: seg.resolvedStarterCount });
  }

  segmentRanges.push(segsForBlock);
  blockRanges.push({ start, end: letters.length - 1 });
}
state.letters = letters;
state.blockRanges = blockRanges;
state.segmentRanges = segmentRanges;
let starterUnlockedSegments = segmentRanges.map(segs => segs.map(() => false));
let completedSegments = segmentRanges.map(segs => segs.map(() => false));
let completedBlocks = blockRanges.map(() => false);
completedBlockTimes = blockRanges.map(() => 0); state.completedBlockTimes = completedBlockTimes;
hiddenBlocks = new Set(textBlocks.reduce((acc, b, i) => { if (b.hidden) acc.push(i); return acc; }, [])); state.hiddenBlocks = hiddenBlocks;
namedFlags = new Set(); state.namedFlags = namedFlags;
let blockStartedFlags = blockRanges.map(() => false);
let blockRenderOffsets = blockRanges.map(() => 0);
let blockWasInVisibleWindow = blockRanges.map(() => false);

// ── Drain ("desagüe") ──────────────────────────────────────────────────────
// A drain block stacks every letter on a single point (the plughole) so the
// text can be pulled out of it like a strand of hair. The locked letters pile
// up at the hole as a visible tangle; as the chain is pulled, letters feed out
// one by one. Rest lengths get a natural spacing (see computeRestLengths) so the
// extracted strand reads as text instead of springing back to zero length.
function getDrainConfig(blockIdx) {
  const drain = getBlockConfig(blockIdx)?.drain;
  return drain?.enabled ? drain : null;
}
function applyDrainCollapse() {
  for (let blockIdx = 0; blockIdx < blockRanges.length; blockIdx++) {
    const drain = getDrainConfig(blockIdx);
    if (!drain) continue;
    const range = blockRanges[blockIdx];
    if (!range) continue;
    const hx = Number(drain.x ?? 360);
    const hy = Number(drain.y ?? 150);
    for (let i = range.start; i <= range.end; i++) {
      const l = letters[i];
      if (!l) continue;
      // Deterministic jitter so the pile stays stable across relayouts.
      const seed = (i - range.start) * 2.3999632;
      l.ox = hx + Math.cos(seed) * 7;
      l.oy = hy + Math.sin(seed * 1.7) * 7;
      if (l.locked) {
        l.x = l.ox; l.y = l.oy;
        l.px = l.ox; l.py = l.oy;
      }
    }
  }
}
state.applyDrainCollapse = applyDrainCollapse;
applyDrainCollapse();
let bugs = []; state.bugs = bugs;

let restLengths = computeRestLengths();
state.restLengths = restLengths;
function computeBreakThresholds() {
  const bt = new Map();
  for (let blockIdx = 0; blockIdx < activeBlocks.length; blockIdx++) {
    const bps = activeBlocks[blockIdx]?.breakPoints;
    if (!bps?.length) continue;
    const range = blockRanges[blockIdx];
    const byRid = new Map(bps.map(p => [p.grapheme, Number(p.threshold ?? 50)]));
    for (let i = range.start; i < range.end; i++) {
      const t = byRid.get(letters[i].readingIdx);
      if (t !== undefined) bt.set(i, t);
    }
  }
  return bt;
}
let breakThresholds = computeBreakThresholds();
state.breakThresholds = breakThresholds;

// Cascade: when a grid-snap letter escapes its cell, shift oy of all letters
// in the same column above it so they slide down to fill the gap.
function cascadeColumn(escapedIdx) {
  const l = letters[escapedIdx];
  if (!l || !textBlocks[l.blockIdx]?.peel?.cascade) return;
  const range = blockRanges[l.blockIdx];
  const colX = l.ox;
  const escapedY = l.oy;
  const lineH = getLetterLineHeight(l);
  for (let i = range.start; i <= range.end; i++) {
    if (i === escapedIdx) continue;
    const cl = letters[i];
    if (cl.deleted || cl.escapedGrid) continue;
    if (Math.abs(cl.ox - colX) > Math.max(cl.w, 2) * 0.72) continue;
    if (cl.oy < escapedY - lineH * 0.3) cl.oy += lineH;
  }
}
state.onLetterEscapedGrid = cascadeColumn;

let gapLinkDecayTargets = null;
gapLinkDecayTargets = computeGapLinkDecayTargets(); state.gapLinkDecayTargets = gapLinkDecayTargets;
const reflowPositions = new Map(); state.reflowPositions = reflowPositions;
const reflowStarted = new Set(); state.reflowStarted = reflowStarted;
const startedPeelSegments = new Map(); // blockIdx -> Set of segmentIdx (for reflowAnchors incremental targets)

function computeReflowPositionsForBlock(blockIdx, excludeReadingIndices) {
  const block = textBlocks[blockIdx];
  if (!block.inlineStyles.some(s => s?.explicitPeel)) return;
  // Include all grapheme indices except those in excludeReadingIndices
  const includedIndices = [];
  for (let i = 0; i < block.graphemes.length; i++) {
    if (!excludeReadingIndices.has(i)) includedIndices.push(i);
  }
  if (!includedIndices.length) return;
  const strippedBlock = {
    ...block,
    graphemes: includedIndices.map(i => block.graphemes[i]),
    widths: includedIndices.map(i => block.widths[i]),
    inlineStyles: includedIndices.map(i => block.inlineStyles[i]),
    peel: {},
    transform: { ...block.transform }
  };
  const origStartY = (positions[blockIdx].positions[0]?.y ?? 0) - block.transform.y;
  let layout;
  try { layout = layoutBlockAtWidth(strippedBlock, getMaxWidth(), origStartY, null); } catch(e) { return; }
  const posMap = new Map();
  includedIndices.forEach((origIdx, si) => {
    const p = layout.positions[si];
    if (p) posMap.set(origIdx, { x: p.x, y: p.y });
  });
  reflowPositions.set(blockIdx, posMap);
}


function updatePartialReflowForBlock(blockIdx) {
  // Exclude only STARTED peel letters. Unstarted peel letters stay in the layout as
  // placeholder text so anchor targets reflect only the gaps that have actually opened.
  const started = startedPeelSegments.get(blockIdx);
  if (!started || started.size === 0) return;
  const excludeRids = new Set();
  for (const segIdx of started) {
    const seg = segmentRanges[blockIdx]?.[segIdx];
    if (!seg) continue;
    for (let li = seg.start; li <= seg.end; li++) excludeRids.add(letters[li].readingIdx);
  }
  computeReflowPositionsForBlock(blockIdx, excludeRids);
}

computeAllReflowPositions();
const anchorPeelNeighbors = new Map(); state.anchorPeelNeighbors = anchorPeelNeighbors;
computeAnchorPeelNeighbors();
const initializedCrossBlockArcs = new Set(); state.initializedCrossBlockArcs = initializedCrossBlockArcs;
const releasedCrossBlockArcs = new Set(); state.releasedCrossBlockArcs = releasedCrossBlockArcs;

let crossBlockConstraints = computeCrossBlockConstraints();
state.crossBlockConstraints = crossBlockConstraints;
let ties = computeTies();
state.ties = ties;
let tangledLines = computeTangledLines();
state.tangledLines = tangledLines;

// Drag maps for rope nodes and tangled-line strand nodes
const tieNodeDrags      = new Map(); state.tieNodeDrags      = tieNodeDrags;
const tangledLineDrags  = new Map(); state.tangledLineDrags  = tangledLineDrags;

function resetGradientTextFill(el) {
  el.style.backgroundImage = 'none';
  el.style.setProperty('background-clip', 'border-box');
  el.style.removeProperty('-webkit-background-clip');
  el.style.removeProperty('-webkit-text-fill-color');
  el.style.color = '';
}

function applyLetterStyle(el, letter, style) {
  letter.style = { ...style, gradient: normalizeGradient(style.gradient) };
  el.classList.toggle('bb-strong', Boolean(letter.inlineStyle.bold));
  el.classList.toggle('bb-em', Boolean(letter.inlineStyle.italic));
  el.classList.toggle('bb-underline', Boolean(letter.inlineStyle.underline));
  el.classList.toggle('bb-strike', Boolean(letter.inlineStyle.strike));
  el.classList.toggle('no-peel', Boolean(letter.inlineStyle.noPeel));
  el.classList.toggle('bb-censor', Boolean(letter.inlineStyle.censor));
  el.classList.toggle('bb-shake', Boolean(letter.inlineStyle.shake));
  el.classList.toggle('bb-float', Boolean(letter.inlineStyle.float));
  el.classList.toggle('bb-url', Boolean(letter.inlineStyle?.url));
  el.style.fontFamily = quoteFontFamily(letter.inlineStyle?.fontFamily || letter.style.fontFamily);
  el.style.fontSize = letter.inlineStyle?.size
    ? `${Number(letter.inlineStyle.size)}px`
    : `${Number.parseFloat(baseFontSize) * (letter.scale || 1)}px`;
  resetGradientTextFill(el);
  const inlineGradient = getGradientPresetByName(letter.inlineStyle?.gradient, currentGradientPresets);
  if (inlineGradient) {
    el.style.color = sampleGradientColor({ gradient: inlineGradient }, letter.sequenceRatio ?? 0);
  } else if (letter.style.colorMode === 'sequential') {
    el.style.color = sampleGradientColor(letter.style, letter.sequenceRatio);
  } else if (letter.style.colorMode === 'random') {
    el.style.color = sampleRandomGradientColor(letter.style);
  } else if (letter.style.colorMode === 'variation') {
    el.style.color = applyHslVariation(letter.style.color || pieceConfig.style.color, letter.style.variationStrength ?? 0.15);
  } else if (letter.style.colorMode === 'linear' && letter.style.gradient) {
    el.style.color = sampleLinearGradientColorForLetter(letter, getBlockBounds);
  } else if (letter.style.colorMode === 'radial' && letter.style.gradient) {
    el.style.color = sampleRadialGradientColorForLetter(letter, getBlockBounds);
  } else {
    el.style.color = letter.inlineStyle?.color || letter.style.color || pieceConfig.style.color;
  }
  if (letter.inlineStyle?.url) el.style.color = letter.inlineStyle?.color || '#3b7abf';
}

// DOM elements – created eagerly but mounted lazily per block
let els = [];
let censorRevealEls = [];
let censorRevealedFlags = [];

for (const l of letters) {
  let span = document.createElement('span');
  span.className = 'letter';
  span.textContent = l.ch;
  span.style.opacity = '0';
  span.style.pointerEvents = 'none';
  span.style.fontFamily = quoteFontFamily(l.style.fontFamily);
  span.style.fontSize = `${Number.parseFloat(baseFontSize) * l.scale}px`;
  span.style.transform = `translate(${l.x}px, ${l.y}px) rotate(${l.angle || 0}rad)`;
  applyLetterStyle(span, l, l.style);
  wireLetterPointerDown(span);
  els.push(span);
}
({ censorRevealEls, censorRevealedFlags } = buildCensorRevealEls()); state.censorRevealEls = censorRevealEls; state.censorRevealedFlags = censorRevealedFlags;

const blockInDom = new Set();
function mountBlock(blockIdx) {
  if (blockInDom.has(blockIdx)) return;
  blockInDom.add(blockIdx);
  const range = blockRanges[blockIdx];
  if (!range) return;
  const mountChunk = (from, to) => {
    const frag = document.createDocumentFragment();
    for (let i = from; i <= to; i++) {
      if (els[i] && !els[i].parentNode) frag.appendChild(els[i]);
      if (censorRevealEls[i] && !censorRevealEls[i].parentNode) frag.appendChild(censorRevealEls[i]);
    }
    container.appendChild(frag);
  };
  const chunkSize = mobileRuntime ? 80 : Infinity;
  mountChunk(range.start, Math.min(range.end, range.start + chunkSize - 1));
  for (let next = range.start + chunkSize; next <= range.end; next += chunkSize) {
    const from = next;
    const to = Math.min(range.end, next + chunkSize - 1);
    requestAnimationFrame(() => mountChunk(from, to));
  }
  lastBehaviorVisibilityKey = ''; state.lastBehaviorVisibilityKey = '';
}

let inlineLinkButtons = textBlocks.map((block, blockIdx) => {
  if (!block.linkButton?.url) return null;
  const el = document.createElement('a');
  el.className = 'inline-link-button';
  el.href = block.linkButton.url;
  el.target = '_blank';
  el.rel = 'noopener noreferrer';
  el.textContent = block.linkButton.text || '+';
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => e.stopPropagation());
  container.appendChild(el);
  return { blockIdx, el };
});

// Timed continue buttons — appear X ms after the block becomes active
let timedButtons = textBlocks.map((block, blockIdx) => {
  if (!block.timedButton) return null;
  const cfg = block.timedButton;
  const delayMs = Math.max(500, Number(cfg.delayMs ?? 6000));
  const action = cfg.action || (cfg.url ? 'url' : 'none');
  const spawnAt = cfg.spawnAt || 'afterNoPeel';

  // Inline button
  const el = document.createElement('button');
  el.className = 'timed-btn';
  el.textContent = cfg.text || '→';
  el.addEventListener('pointerdown', (e) => e.stopPropagation());

  // Optional addText div — shown when button is clicked (action='addText')
  let addTextEl = null;
  if (action === 'addText' && cfg.addText) {
    addTextEl = document.createElement('div');
    addTextEl.className = 'timed-add-text';
    addTextEl.textContent = cfg.addText;
    container.appendChild(addTextEl);
  }

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    item.clicked = true;
    el.classList.remove('visible');
    el.style.display = 'none';
    if (action === 'url' && cfg.url) window.open(cfg.url, '_blank');
    if (action === 'nextBlock') {
      const nextBounds = getRenderedBlockBounds(blockIdx + 1);
      if (nextBounds) window.scrollTo({ top: Math.max(0, nextBounds.top - 60), behavior: 'smooth' });
    }
    if (action === 'addText' && addTextEl) addTextEl.classList.add('visible');
  });

  container.appendChild(el);
  const item = { blockIdx, el, addTextEl, delayMs, spawnAt, triggered: false, timer: null, clicked: false };
  return item;
});

// Generic SVG outline frames for all clipShape types
function createClipShapeFrame(blockIdx, shape) {
  if (!shape) return null;
  const ns = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(ns, 'svg');
  el.setAttribute('class', 'clip-shape-frame');
  el.setAttribute('aria-hidden', 'true');
  const pathEl = document.createElementNS(ns, 'path');
  pathEl.setAttribute('fill', 'none');
  pathEl.setAttribute('stroke', 'rgba(74,74,74,0.22)');
  pathEl.setAttribute('stroke-width', '1.5');
  pathEl.setAttribute('stroke-linejoin', 'round');
  pathEl.setAttribute('stroke-linecap', 'round');
  el.appendChild(pathEl);
  container.appendChild(el);
  return { blockIdx, el, pathEl, shape };
}

let clipShapeFrames = textBlocks.map((block, blockIdx) => createClipShapeFrame(blockIdx, block.clipShape));

function positionClipShapeFrames() {
  for (const item of clipShapeFrames) {
    if (!item) continue;
    const { blockIdx, el, pathEl } = item;
    const origin = shapeOrigins.get(blockIdx);
    if (!origin) {
      if (item.lastFrameKey !== 'hidden') { item.lastFrameKey = 'hidden'; el.style.display = 'none'; }
      continue;
    }
    const { screenX, screenY, W, H, pathD, scale } = origin;
    const shapeScaleValue = Number(item.shape?.scale ?? origin.shape?.scale ?? 1) || 1;
    const rotation = Number(item.shape?.rotation ?? origin.shape?.rotation ?? 0) || 0;
    const strokeOpacity = String(item.shape?.svgOpacity ?? 0.22);
    // Re-setting SVG attributes (especially path d) every frame is expensive — skip when unchanged.
    const frameKey = `${screenX}:${screenY}:${W}:${H}:${scale}:${shapeScaleValue}:${rotation}:${strokeOpacity}:${pathD}`;
    if (item.lastFrameKey === frameKey) continue;
    item.lastFrameKey = frameKey;
    const pw = W * scale, ph = H * scale;
    el.style.display = 'block';
    el.style.transform = `translate(${screenX}px, ${screenY}px)`;
    pathEl.style.strokeOpacity = strokeOpacity;
    el.setAttribute('width', pw);
    el.setAttribute('height', ph);
    el.setAttribute('viewBox', `0 0 ${W} ${H}`);
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('transform', `translate(${W / 2} ${H / 2}) rotate(${rotation}) scale(${shapeScaleValue}) translate(${-W / 2} ${-H / 2})`);
  }
}

function getReadingLastLetterIdx(blockIdx) {
  const range = blockRanges[blockIdx];
  if (!range) return -1;
  let bestIdx = -1;
  let bestReadingIdx = -1;
  for (let i = range.start; i <= range.end; i++) {
    const letter = letters[i];
    if (!letter || letter.deleted) continue;
    if (letter.readingIdx > bestReadingIdx) {
      bestReadingIdx = letter.readingIdx;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function multiplySvgMatrix(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5]
  ];
}

function parseSvgTransform(transform = '') {
  let matrix = [1, 0, 0, 1, 0, 0];
  String(transform).replace(/([a-z]+)\(([^)]*)\)/gi, (_, name, rawArgs) => {
    const args = rawArgs.split(/[\s,]+/).map(Number).filter(Number.isFinite);
    const lower = name.toLowerCase();
    let next = [1, 0, 0, 1, 0, 0];
    if (lower === 'matrix' && args.length >= 6) next = args.slice(0, 6);
    else if (lower === 'translate') next = [1, 0, 0, 1, args[0] || 0, args[1] || 0];
    else if (lower === 'scale') {
      const sx = args[0] ?? 1;
      const sy = args[1] ?? sx;
      next = [sx, 0, 0, sy, 0, 0];
    } else if (lower === 'rotate') {
      const angle = (args[0] || 0) * Math.PI / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      next = [cos, sin, -sin, cos, 0, 0];
      if (args.length >= 3) {
        const [cx, cy] = [args[1], args[2]];
        next = multiplySvgMatrix(multiplySvgMatrix([1, 0, 0, 1, cx, cy], next), [1, 0, 0, 1, -cx, -cy]);
      }
    } else if (lower === 'skewx') {
      next = [1, 0, Math.tan((args[0] || 0) * Math.PI / 180), 1, 0, 0];
    } else if (lower === 'skewy') {
      next = [1, Math.tan((args[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
    }
    matrix = multiplySvgMatrix(matrix, next);
    return '';
  });
  return matrix;
}

function transformSvgPoint(point, matrix) {
  return [
    matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
    matrix[1] * point[0] + matrix[3] * point[1] + matrix[5]
  ];
}

function isSvgElementVisible(el) {
  const attr = name => String(el.getAttribute(name) || '').trim();
  const style = attr('style');
  if (attr('display') === 'none' || attr('visibility') === 'hidden' || attr('opacity') === '0') return false;
  if (/display\s*:\s*none/i.test(style) || /visibility\s*:\s*hidden/i.test(style) || /opacity\s*:\s*0(?:\.0+)?(?:;|$)/i.test(style)) return false;
  return true;
}

function circleLikePoints(cx, cy, rx, ry, count = 48) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const theta = (i / count) * Math.PI * 2;
    points.push([cx + Math.cos(theta) * rx, cy + Math.sin(theta) * ry]);
  }
  return points;
}

function parseSvgLength(value, fallback = 100) {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const parsed = parseFloat(String(value || ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cubicBezierY(t, p1x, p1y, p2x, p2y) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let s = t;
  for (let i = 0; i < 8; i++) {
    const x = ((1 - 3*p2x + 3*p1x)*s*s + (3*p2x - 6*p1x)*s + 3*p1x)*s - t;
    const dx = (3*(1 - 3*p2x + 3*p1x)*s + 2*(3*p2x - 6*p1x))*s + 3*p1x;
    if (Math.abs(dx) < 1e-6) break;
    s -= x / dx;
  }
  return ((1 - 3*p2y + 3*p1y)*s*s + (3*p2y - 6*p1y)*s + 3*p1y)*s;
}

const SVG_ANIM_EASING = {
  linear:        [0, 0, 1, 1],
  ease:          [0.25, 0.1, 0.25, 1.0],
  'ease-in':     [0.42, 0, 1.0, 1.0],
  'ease-out':    [0, 0, 0.58, 1.0],
  'ease-in-out': [0.42, 0, 0.58, 1.0],
};

function svgAnimEase(t, timing) {
  const p = SVG_ANIM_EASING[timing] || SVG_ANIM_EASING['ease-in-out'];
  return cubicBezierY(t, p[0], p[1], p[2], p[3]);
}

// Parse CSS @keyframes and animation rules out of an SVG <style> block.
// Returns a map of '.className' → { stops, duration, timing, origin }.
// Only includes animations that have transform keyframes (not opacity-only).
function parseAnimationsFromSvgText(svgText, svgW = 100, svgH = 100) {
  const styleMatch = svgText.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) return {};
  const css = styleMatch[1];

  // Extract @keyframes bodies with brace counting
  const kfBodies = {};
  let pos = 0;
  while (pos < css.length) {
    const atIdx = css.indexOf('@keyframes', pos);
    if (atIdx < 0) break;
    const m = css.slice(atIdx).match(/^@keyframes\s+([\w-]+)\s*\{/);
    if (!m) { pos = atIdx + 1; continue; }
    const name = m[1];
    let depth = 0, j = atIdx + m[0].length - 1;
    while (j < css.length) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') { if (--depth === 0) break; }
      j++;
    }
    kfBodies[name] = css.slice(atIdx + m[0].length, j);
    pos = j + 1;
  }

  // Parse each @keyframes body into stops — only keep stops with a transform
  const keyframes = {};
  for (const [name, body] of Object.entries(kfBodies)) {
    const stops = [];
    let i = 0;
    while (i < body.length) {
      const braceIdx = body.indexOf('{', i);
      if (braceIdx < 0) break;
      const selector = body.slice(i, braceIdx).trim();
      const closeIdx = body.indexOf('}', braceIdx + 1);
      if (closeIdx < 0) break;
      const decls = body.slice(braceIdx + 1, closeIdx);
      const transformMatch = decls.match(/transform\s*:\s*([^;]+)/i);
      if (transformMatch) {
        const transform = transformMatch[1].trim();
        const pcts = selector.match(/(\d+(?:\.\d+)?%|from|to)/g) || [];
        for (const pct of pcts) {
          const t = pct === 'from' ? 0 : pct === 'to' ? 1 : parseFloat(pct) / 100;
          if (Number.isFinite(t)) stops.push({ t, transform });
        }
      }
      i = closeIdx + 1;
    }
    if (stops.length) {
      stops.sort((a, b) => a.t - b.t);
      keyframes[name] = stops;
    }
  }

  // Parse .classname { animation: ...; transform-origin: ...; } rules
  const animGroups = {};
  const classRule = /\.([\w-]+)\s*\{([^}]*)\}/g;
  let cm;
  while ((cm = classRule.exec(css)) !== null) {
    const decls = cm[2];
    const animM = decls.match(/animation\s*:\s*([\w-]+)\s+([\d.]+)(ms|s)\s+([\w-]+(?:\([^)]*\))?)/i);
    if (!animM) continue;
    const animName = animM[1];
    const durationMs = animM[3] === 'ms' ? parseFloat(animM[2]) : parseFloat(animM[2]) * 1000;
    const timing = animM[4];
    if (!keyframes[animName] || !(durationMs > 0)) continue;
    const originM = decls.match(/transform-origin\s*:\s*([^;]+)/i);
    let origin = null;
    if (originM) {
      const parseC = (v, dim) => {
        v = v.trim();
        if (v.endsWith('px')) return parseFloat(v);
        if (v.endsWith('%')) return parseFloat(v) / 100 * dim;
        if (v === 'center') return dim / 2;
        if (v === 'left' || v === 'top') return 0;
        if (v === 'right' || v === 'bottom') return dim;
        return parseFloat(v) || 0;
      };
      const pts = originM[1].trim().split(/\s+/);
      origin = [parseC(pts[0] || '50%', svgW), parseC(pts[1] || pts[0] || '50%', svgH)];
    }
    animGroups['.' + cm[1]] = { stops: keyframes[animName], duration: durationMs, timing, origin };
  }
  return animGroups;
}

// Compute the 2D affine matrix [a,b,c,d,e,f] for an SVG CSS animation at timeMs.
// Returns null if the animation produces no positional transform (identity or opacity-only).
function computeAnimTransformMatrix(animDef, timeMs) {
  const { stops, duration, timing, origin } = animDef;
  if (!stops || stops.length < 2) return null;
  const cycleT = (timeMs % duration) / duration;
  let lo = 0;
  for (let i = 0; i < stops.length - 1; i++) { if (stops[i].t <= cycleT) lo = i; }
  const hi = Math.min(lo + 1, stops.length - 1);
  const span = stops[hi].t - stops[lo].t;
  const localT = span > 0
    ? svgAnimEase(Math.max(0, Math.min(1, (cycleT - stops[lo].t) / span)), timing)
    : 0;
  const parseT = s => {
    const sm = s.match(/^scale\(\s*([\d.]+)\s*\)$/);
    if (sm) return { type: 'scale', v: parseFloat(sm[1]) };
    const rm = s.match(/^rotate\(\s*(-?[\d.]+)(?:deg)?\s*\)$/);
    if (rm) return { type: 'rotate', v: parseFloat(rm[1]) };
    return { type: 'identity' };
  };
  const ta = parseT(stops[lo].transform), tb = parseT(stops[hi].transform);
  const ox = origin?.[0] ?? 0, oy = origin?.[1] ?? 0;
  if (ta.type === 'scale' || tb.type === 'scale') {
    const s = (ta.type === 'scale' ? ta.v : 1) * (1 - localT) + (tb.type === 'scale' ? tb.v : 1) * localT;
    return [s, 0, 0, s, ox * (1 - s), oy * (1 - s)];
  }
  if (ta.type === 'rotate' || tb.type === 'rotate') {
    const angle = ((ta.type === 'rotate' ? ta.v : 0) * (1 - localT) + (tb.type === 'rotate' ? tb.v : 0) * localT) * (Math.PI / 180);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return [cos, sin, -sin, cos, ox * (1 - cos) + oy * sin, oy * (1 - cos) - ox * sin];
  }
  return null;
}

function mapSvgFracToAttachment(fx, fy, stroke, layout, offsetY) {
  const hasSvgBox = Number(stroke.svgW) > 0 && Number(stroke.svgH) > 0;
  const preserve = String(stroke.preserveAspectRatio || 'xMidYMid meet').trim().toLowerCase();
  if (!hasSvgBox || preserve.includes('none')) {
    return {
      x: layout.x + fx * layout.width,
      y: layout.y + fy * layout.height + offsetY
    };
  }
  const svgW = Math.max(0.001, Number(stroke.svgW || 1));
  const svgH = Math.max(0.001, Number(stroke.svgH || 1));
  const scale = Math.min(layout.width / svgW, layout.height / svgH);
  const drawW = svgW * scale;
  const drawH = svgH * scale;
  const insetX = (layout.width - drawW) / 2;
  const insetY = (layout.height - drawH) / 2;
  return {
    x: layout.x + insetX + fx * drawW,
    y: layout.y + insetY + fy * drawH + offsetY
  };
}

async function extractStrokesFromSvg(src) {
  try {
    const resp = await fetch(src);
    if (!resp.ok) return [];
    const text = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return [];

    let vb = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
    let sw, sh, ox = 0, oy = 0;
    if (vb && vb.length === 4 && vb.every(Number.isFinite)) {
      ox = vb[0]; oy = vb[1]; sw = vb[2]; sh = vb[3];
    } else {
      sw = parseSvgLength(svg.getAttribute('width'), 100);
      sh = parseSvgLength(svg.getAttribute('height'), 100);
    }

    const extracted = [];
    const preserveAspectRatio = svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet';
    const animGroups = parseAnimationsFromSvgText(text, sw, sh);
    const skippedTags = new Set(['defs', 'clippath', 'mask', 'pattern', 'symbol', 'style', 'script', 'metadata', 'title', 'desc']);
    const drawableTags = new Set(['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse']);
    const pushSegments = (segments, matrix, animClass = null) => {
      segments.forEach(seg => {
        if (seg.length < 2) return;
        const normalizedPoints = seg.map(point => {
          const [px, py] = transformSvgPoint(point, matrix);
          return [(px - ox) / sw, (py - oy) / sh];
        });
        let pathLen = 0;
        for (let i = 0; i < normalizedPoints.length - 1; i++) {
          pathLen += Math.hypot(normalizedPoints[i+1][0] - normalizedPoints[i][0], normalizedPoints[i+1][1] - normalizedPoints[i][1]);
        }
        const entry = {
          pathPoints: normalizedPoints,
          nodeCount: Math.max(10, Math.min(160, Math.floor(pathLen * 72))),
          starterCount: 2,
          endStarterCount: 0,
          source: 'svg',
          svgW: sw,
          svgH: sh,
          preserveAspectRatio
        };
        if (animClass && animGroups['.' + animClass]) {
          entry.svgAnim = { ...animGroups['.' + animClass], svgW: sw, svgH: sh };
        }
        extracted.push(entry);
      });
    };

    const walk = (el, parentMatrix, animClass = null) => {
      const tag = el.tagName.toLowerCase();
      if (skippedTags.has(tag) || !isSvgElementVisible(el)) return;
      const matrix = multiplySvgMatrix(parentMatrix, parseSvgTransform(el.getAttribute('transform') || ''));
      const elClasses = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
      const myAnimClass = elClasses.find(c => animGroups['.' + c]) || animClass;
      if (drawableTags.has(tag)) {
        let d = '';
        let directSegments = null;
      if (tag === 'path') d = el.getAttribute('d');
      else if (tag === 'line') {
        const x1 = el.getAttribute('x1')||0, y1 = el.getAttribute('y1')||0, x2 = el.getAttribute('x2')||0, y2 = el.getAttribute('y2')||0;
        d = `M ${x1},${y1} L ${x2},${y2}`;
      } else if (tag === 'polyline' || tag === 'polygon') {
        const pts = el.getAttribute('points');
        if (pts) d = `M ${pts}` + (tag === 'polygon' ? ' Z' : '');
      } else if (tag === 'rect') {
        const x = parseFloat(el.getAttribute('x')||0), y = parseFloat(el.getAttribute('y')||0), w = parseFloat(el.getAttribute('width')||0), h = parseFloat(el.getAttribute('height')||0);
        d = `M ${x},${y} h ${w} v ${h} h ${-w} Z`;
      } else if (tag === 'circle' || tag === 'ellipse') {
        const cx = parseFloat(el.getAttribute('cx')||0), cy = parseFloat(el.getAttribute('cy')||0);
        const rx = tag === 'circle' ? parseFloat(el.getAttribute('r')||0) : parseFloat(el.getAttribute('rx')||0);
        const ry = tag === 'circle' ? rx : parseFloat(el.getAttribute('ry')||0);
        directSegments = [circleLikePoints(cx, cy, rx, ry)];
      }

        if (directSegments) pushSegments(directSegments, matrix, myAnimClass);
        else if (d) pushSegments(pointsOnPath(d, { curveSteps: 28 }), matrix, myAnimClass);
      }
      for (const child of el.children) walk(child, matrix, myAnimClass);
    };
    walk(svg, [1, 0, 0, 1, 0, 0], null);
    return extracted;
  } catch (e) {
    console.error("SVG stroke extraction error:", e);
    return [];
  }
}

async function initializePeelStrokesForBlock(block, blockIdx) {
  if (block.attachment?.type !== 'lineart') return;
  const att = block.attachment;
  const extractedDefs = att.src ? await extractStrokesFromSvg(att.src) : [];
  const manualDefs = (att.strokes || []).filter(stroke => stroke?.source === 'manual' || !att.src);
  const strokeDefs = extractedDefs.length ? extractedDefs.concat(manualDefs) : manualDefs;
  if (!strokeDefs.length) return;

  const requestedQuantity = Number(att.lineQuantity);
  const quantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0
    ? Math.min(strokeDefs.length, requestedQuantity)
    : strokeDefs.length;
  const precision = Math.max(0.5, Math.min(2.5, Number(att.linePrecision ?? 1) || 1));
  const initialPeeled = Math.max(1, Math.min(30, Number(att.initialPeeled ?? 2) || 2));
  for (const ls of strokeDefs.slice(0, quantity)) {
    const nodeCount    = Math.max(4, Math.min(160, Math.round(Number(ls.nodeCount ?? 22) * precision)));
    const starterCount = Math.max(1, Math.min(Math.floor(nodeCount / 2), Number(ls.starterCount ?? initialPeeled)));
    const endStarter   = Math.max(0, Math.min(Math.floor(nodeCount / 2), Number(ls.endStarterCount ?? 0)));
    const attachResistance = Number(block.attachment?.strokeResistance ?? 20);
    const unlockThresh = Number(ls.unlockThreshold ?? attachResistance) * LINEART_STROKE_RESISTANCE_SCALE;
    const pts = ls.pathPoints || [[Number(ls.startFrac?.[0] ?? 0.85), Number(ls.startFrac?.[1] ?? 0.05)],
                                  [Number(ls.endFrac?.[0]   ?? 0.85), Number(ls.endFrac?.[1]   ?? 0.95)]];
    const nodes = strokeNodesFromPath(pts, nodeCount, starterCount, endStarter);
    peelStrokes.push({
      blockIdx, nodes,
      strokeColor: ls.color || '#4a4a4a',
      strokeLW: Number(ls.lineWidth ?? 2) * Math.max(0.4, Math.min(5, Number(att.lineWidth ?? 1) || 1)),
      texture: att.roughPreset || 'solid',
      unlockThresh,
      constraintDist: 0, initialized: false, fullyPeeled: false, started: false,
      svgAnim: ls.svgAnim || null,
      svgW: ls.svgW || null,
      svgH: ls.svgH || null,
      preserveAspectRatio: ls.preserveAspectRatio || null
    });
  }
}


// Returns the last noPeel letter — i.e. the end of the text that stays on screen.
// Used to anchor the timed button next to the remaining (locked) text.
function getLastNoPeelLetterIdx(blockIdx) {
  const range = blockRanges[blockIdx];
  if (!range) return -1;
  let bestIdx = -1, bestReadingIdx = -1;
  for (let i = range.start; i <= range.end; i++) {
    const letter = letters[i];
    if (!letter || letter.deleted || !letter.inlineStyle?.noPeel) continue;
    if (letter.readingIdx > bestReadingIdx) {
      bestReadingIdx = letter.readingIdx;
      bestIdx = i;
    }
  }
  return bestIdx !== -1 ? bestIdx : getReadingLastLetterIdx(blockIdx);
}

function positionInlineLinkButtons() {
  for (const item of inlineLinkButtons) {
    if (!item) continue;
    const { blockIdx, el } = item;
    const blockAllowed = Boolean(activeBlockFlags[blockIdx] || isBlockVisible(blockIdx) || everActiveBlockFlags[blockIdx]);
    const idx = getReadingLastLetterIdx(blockIdx);
    const letter = letters[idx];
    if (!blockAllowed || !letter || letter.deleted) {
      if (item.lastKey !== 'hidden') { item.lastKey = 'hidden'; el.style.display = 'none'; }
      continue;
    }
    const color = letter.inlineStyle?.color || letter.style.color || pieceConfig.style.color;
    const transform = `translate(${letter.x + letter.w + 7}px, ${getRenderedY(idx) + 1}px)`;
    const key = color + transform;
    if (item.lastKey === key) continue;
    item.lastKey = key;
    el.style.display = 'block';
    el.style.color = color;
    el.style.transform = transform;
  }
}

function positionTimedButtons() {
  for (const item of timedButtons) {
    if (!item) continue;
    const { blockIdx, el, addTextEl, spawnAt } = item;
    const blockActive = Boolean(activeBlockFlags[blockIdx] || everActiveBlockFlags[blockIdx]);
    const blockDone = isBlockComplete(blockIdx);
    const anchorIdx = spawnAt === 'afterAll' ? getReadingLastLetterIdx(blockIdx) : getLastNoPeelLetterIdx(blockIdx);
    const letter = letters[anchorIdx];

    // Hide and cancel timer if block is no longer active
    if (!blockActive || !letter || letter.deleted) {
      if (!item.clicked) el.style.display = 'none';
      if (item.timer) { clearTimeout(item.timer); item.timer = null; item.triggered = false; }
      continue;
    }

    // Button anchors to the last noPeel letter (= end of the remaining text)
    if (!item.clicked) el.style.display = blockDone ? 'block' : 'none';
    el.style.color = letter.inlineStyle?.color || letter.style.color || pieceConfig.style.color;
    const stableX = letter.ox + letter.w + 10;
    const stableY = letter.oy + getLetterRenderOffsetY(anchorIdx);
    el.style.transform = `translate(${stableX}px, ${stableY}px)`;

    // Position addText div at block left margin, below the last text line
    if (addTextEl) {
      const lastIdx = getReadingLastLetterIdx(blockIdx);
      const lastLetter = letters[lastIdx];
      if (lastLetter) {
        // addText appears as a new paragraph: left margin, below the block
        const addX = MARGIN; // same left start as regular text
        const addY = lastLetter.oy + getLetterRenderOffsetY(lastIdx) + LINE_HEIGHT * (lastLetter.scale || 1) + 16;
        addTextEl.style.transform = `translate(${addX}px, ${addY}px)`;
        addTextEl.style.color = letter.inlineStyle?.color || letter.style.color || pieceConfig.style.color;
        // Match block font
        const blockStyle = textBlocks[blockIdx]?.style;
        const scale = textBlocks[blockIdx]?.transform?.scale || 1;
        addTextEl.style.fontSize = `${Number.parseFloat(baseFontSize) * scale}px`;
        addTextEl.style.fontFamily = blockStyle?.fontFamily || 'Georgia';
      }
    }

    // Only start the timer once the peelable part is fully gone
    if (!item.triggered && blockDone) {
      item.triggered = true;
      item.timer = setTimeout(() => { el.classList.add('visible'); }, item.delayMs);
    }
  }
}

// Mount blocks within the initial viewport + 2 screens of buffer
{
  const earlyThreshold = window.innerHeight * 2.5;
  for (let blockIdx = 0; blockIdx < blockRanges.length; blockIdx++) {
    const range = blockRanges[blockIdx];
    if (!range) continue;
    const firstLetter = letters[range.start];
    if (!firstLetter || firstLetter.oy > earlyThreshold) break;
    mountBlock(blockIdx);
  }
}

let lastRenderedX = new Array(letters.length).fill(NaN);
let lastRenderedY = new Array(letters.length).fill(NaN);
let lastRenderedAngle = new Array(letters.length).fill(NaN);


function getDragHintTarget() {
  for (let blockIdx = 0; blockIdx < textBlocks.length; blockIdx++) {
    const hintConfig = textBlocks[blockIdx]?.hint;
    if (!hintConfig?.enabled) continue;
    if (hiddenBlocks.has(blockIdx)) continue;
    if (!isBlockVisible(blockIdx) && !activeBlockFlags[blockIdx]) continue;
    if (blockStartedFlags[blockIdx]) continue;
    const pointIndex = Math.max(0, Number(hintConfig.peelPointIndex) || 0);
    const segs = segmentRanges[blockIdx] || [];
    let segIdx = pointIndex;
    while (segIdx < segs.length && !segs[segIdx].starterCount) segIdx++;
    const segment = segs[segIdx] || segs[pointIndex] || segs[0];
    if (!segment || !segment.starterCount) continue;
    const idx = segment.end;
    const letter = letters[idx];
    if (!letter || letter.deleted) continue;
    return { blockIdx, idx };
  }
  return null;
}

function unlockPeelStarter(segment) {
  const starterCount = Math.max(0, Number(segment.starterCount ?? pieceConfig.peel.initialUnlockCount ?? INITIAL_UNLOCK_COUNT));
  if (!starterCount) return;
  let placed = 0;
  for (let i = segment.end; i >= segment.start && placed < starterCount; i--) {
    if (letters[i]?.inlineStyle?.noPeel) continue; // skip nopeel letters — place starters on peelable letters only
    const wasLocked = letters[i].locked;
    unlockLetter(i, true, { bakeY: false });
    if (wasLocked) letters[i].starterIdle = true;
    els[i].classList.add('draggable');
    placed++;
  }
}

function getSegmentStarterStart(segment) {
  const starterCount = Math.max(0, Number(segment.starterCount ?? pieceConfig.peel.initialUnlockCount ?? INITIAL_UNLOCK_COUNT));
  return Math.max(segment.start, segment.end - starterCount + 1);
}

function findSegmentForIndex(blockIdx, idx) {
  const letter = letters[idx];
  if (letter?.blockIdx === blockIdx && Number.isInteger(letter.segmentIdx)) {
    return segmentRanges[blockIdx]?.[letter.segmentIdx] || null;
  }
  return segmentRanges[blockIdx]?.find(segment => idx >= segment.start && idx <= segment.end) || null;
}

function findSegmentIndexForIndex(blockIdx, idx) {
  const letter = letters[idx];
  if (letter?.blockIdx === blockIdx && Number.isInteger(letter.segmentIdx)) return letter.segmentIdx;
  return segmentRanges[blockIdx]?.findIndex(segment => idx >= segment.start && idx <= segment.end) ?? -1;
}

function isSegmentStarterIndex(blockIdx, idx) {
  const segment = findSegmentForIndex(blockIdx, idx);
  return Boolean(segment && idx >= getSegmentStarterStart(segment));
}

function segmentHasLockedLetters(segment) {
  if (!segment) return false;
  for (let i = segment.start; i <= segment.end; i++) {
    if (letters[i] && !letters[i].deleted && letters[i].locked) return true;
  }
  return false;
}

function bakeLetterRenderY(idx) {
  const letter = letters[idx];
  if (!letter || letter.yBaked) return;
  letter.y += getBlockRenderOffsetY(letter.blockIdx);
  letter.py = letter.y;
  letter.yBaked = true;
}

function prepareForceCompletedLetter(idx) {
  const letter = letters[idx];
  if (!letter || letter.deleted) return;
  letter.starterIdle = false;
  const lineHeight = getLetterLineHeight(letter);
  const floor = getPileFloor(letter.x + frameViewport.containerLeft, letter.w);
  const bottomY = frameViewport.height - frameViewport.containerTop - floor - lineHeight;
  const releaseHeadroom = Math.max(120, Math.min(220, frameViewport.height * 0.24));
  if (letter.y + lineHeight >= bottomY - 8) {
    const minY = -frameViewport.containerTop;
    letter.y = Math.max(minY, bottomY - releaseHeadroom - (idx % 9) * 3);
  }
  letter.px = letter.x;
  letter.py = letter.y;
}

function wakeStarterIdleSegment(idx) {
  const letter = letters[idx];
  if (!letter) return;
  const segment = findSegmentForIndex(letter.blockIdx, idx);
  if (!segment) {
    bakeLetterRenderY(idx);
    letter.starterIdle = false;
    return;
  }
  for (let i = segment.start; i <= segment.end; i++) {
    if (letters[i].starterIdle) {
      bakeLetterRenderY(i);
      letters[i].starterIdle = false;
    }
  }
}

function getInitialPeelActivationWindow() {
  const limit = Math.max(1, Number(activeInitialPeelBlockLimit) || 4);
  const start = getFirstIncompleteBlock();
  return { start, end: Math.min(blockRanges.length, start + limit) };
}

// ── Layers (matrioska despellejada) ───────────────────────────────────────────
function unlockActivePeelStarters() {
  for (let blockIdx = 0; blockIdx < segmentRanges.length; blockIdx++) {
    if (!activeBlockFlags[blockIdx] || hiddenBlocks.has(blockIdx)) continue;
    if (!isGroupActiveBlock(blockIdx)) continue;
    const segs = segmentRanges[blockIdx];
    const isSingleHandle = textBlocks[blockIdx]?.peel?.singleHandle && segs.some(s => s.starterCount > 0);
    if (isSingleHandle) {
      // Find ongoing peel segment and first deferred one
      let ongoing = false;
      let firstDeferred = -1;
      for (let si = 0; si < segs.length; si++) {
        if (!segs[si].starterCount) continue;
        if (starterUnlockedSegments[blockIdx][si]) {
          if (segmentHasLockedLetters(segs[si])) ongoing = true;
        } else if (firstDeferred < 0) {
          firstDeferred = si;
        }
      }
      if (!ongoing && firstDeferred >= 0) {
        unlockPeelStarter(segs[firstDeferred]);
        starterUnlockedSegments[blockIdx][firstDeferred] = true;
      }
    } else {
      for (let segIdx = 0; segIdx < segs.length; segIdx++) {
        if (starterUnlockedSegments[blockIdx][segIdx]) continue;
        unlockPeelStarter(segs[segIdx]);
        starterUnlockedSegments[blockIdx][segIdx] = true;
      }
    }
  }
  applyCrossBlockIdleArcs(true);

  // popGrid: bypass peel chain — unlock every letter at once.
  // grid-snap letterMotion holds them in their original cell positions.
  for (let blockIdx = 0; blockIdx < activeBlocks.length; blockIdx++) {
    if (!activeBlockFlags[blockIdx] || hiddenBlocks.has(blockIdx)) continue;
    if (!textBlocks[blockIdx]?.peel?.popGrid) continue;
    const range = blockRanges[blockIdx];
    for (let i = range.start; i <= range.end; i++) {
      const l = letters[i];
      if (!l.locked || l.deleted) continue;
      l.locked = false;
      l.unlockedAt = ++unlockClock;
      l.starterIdle = false;
      l.yBaked = true;
      if (els[i]) { els[i].style.opacity = '1'; els[i].classList.add('draggable'); }
    }
  }
}

function sleepInactiveUnlockedLetters() {
  const isEditor = document.body.classList.contains('editor-open');
  if (isEditor) return;
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    if (!letter || letter.deleted || letter.locked || isDragged(i)) continue;
    if (letter.starterIdle && !activeBlockFlags[letter.blockIdx]) {
      letter.x = letter.ox;
      letter.y = letter.oy;
      letter.px = letter.x;
      letter.py = letter.y;
      continue;
    }
    if (isLetterFrozen(i)) {
      letter.px = letter.x;
      letter.py = letter.y;
    }
  }
}

function forceStarterVisibilityForBlock(blockIdx) {
  if (hiddenBlocks.has(blockIdx)) return;
  const segments = segmentRanges[blockIdx] || [];
  mountBlock(blockIdx);
  const isSingleHandle = textBlocks[blockIdx]?.peel?.singleHandle && segments.some(s => s.starterCount > 0);
  if (isSingleHandle) {
    let ongoing = false;
    let firstDeferred = -1;
    for (let si = 0; si < segments.length; si++) {
      if (!segments[si].starterCount) continue;
      if (starterUnlockedSegments[blockIdx][si]) {
        if (segmentHasLockedLetters(segments[si])) ongoing = true;
      } else if (firstDeferred < 0) {
        firstDeferred = si;
      }
    }
    if (!ongoing && firstDeferred >= 0) {
      unlockPeelStarter(segments[firstDeferred]);
      starterUnlockedSegments[blockIdx][firstDeferred] = true;
    }
  } else {
    for (let segIdx = 0; segIdx < segments.length; segIdx++) {
      const segment = segments[segIdx];
      if (!starterUnlockedSegments[blockIdx][segIdx]) {
        unlockPeelStarter(segment);
        starterUnlockedSegments[blockIdx][segIdx] = true;
      }
    }
  }
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    if (!starterUnlockedSegments[blockIdx][segIdx]) continue;
    const segment = segments[segIdx];
    const starterStart = getSegmentStarterStart(segment);
    for (let i = starterStart; i <= segment.end; i++) {
      const letter = letters[i];
      if (!letter || letter.deleted || letter.locked) continue;
      els[i].style.opacity = String(getLetterDisplayOpacity(letter, 1));
      els[i].style.pointerEvents = 'auto';
      els[i].classList.add('draggable');
    }
  }
}

function ensureCurrentPeelStarters() {
  const currentBlockIdx = getStepWindowAnchorBlock();
  if (!Number.isInteger(currentBlockIdx) || currentBlockIdx < 0 || currentBlockIdx >= blockRanges.length) return;
  forceStarterVisibilityForBlock(currentBlockIdx);
}
// "DRAG ME" hint
const hint = document.createElement('img');
hint.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG0AAABiCAYAAABarl2DAAAQAElEQVR4AeydC5RUxZmAq3uY4S3Gd0A3atQY3xvAuDnJrpMcRIcBFYVdY9SAD9wYZMDjwY1RBo6GGFAGCBuJDyRq4o4bgZmByG4U89g18ZWc1UR21XWzMWDUxEdwIDAzne+vvre7bt+6r763Z8SkT/1dVX/9r/r/qrp1q7tv51XEq7Ozc1hXV9engEkbNmyYsHHjxg9FsGTenKtWYtWM1SrMii/c8MigFQqFm/v6+jrJv5PP59sp/4RAPgYsJpATCeTIqkwNt8sjsuCpVVTC5IQyVsipshqmvkqRsIUbHhm0XC7XDIxAUh0wCNgPOA2YSyAfJJBPE8CHgBkEcey6desO37x583DawvsTbhfiY6as5MRUV0mWjfqyq8qlSk3luiVoZbb29nYJ1ijIhW4rgZhOAG+k/u/k28mF+K/AN1NeSb550KBBj+/evVsC+QSBfAS4D7iVgM7v6Og4b/369YdB600ixYtRFlQFhVs1KI2i21r7PAul5dCXS8GWSzAqWstsw4cPl6DJ8pcjICcSqMuZWd+YzIvAjKN+Icx3kD9P3g0MhW5/8sPBnUT5U5TPB66ivAjc2rq6uvUsqSeBKydHpdl9B1WmCSwZlEYxkDzzhv5XaglauVeTJk16ldpvgQIOF5+e1dvb+0NmzPipU6f+rrm5uYP4zR4xYsRYgnImNJcS1GugX0h5FfBdyo8CvwBeA3aD24/A+Wcbjf3ffZRKkp5JnhkECQzCJ1McHLSy/D8gcjfwHIH5I/mxwAYCd55L0tjY2DNlypRnCOIDwEoCuZh8HvkFQBNlmZUy885FxgzqG5Hx3kmZj5YggUH4ZK4IDppf/gZm0RzEv8ls2R/4BpGbRT0yQVsgUG8S2B9MmTz5sUiG9x2BO7yz6Vhw0Mry6ymK1gYcv5aZMo26LJujcjm1mBl3c/uD7bKzBB2d/GMhmmfvp8i213GCtgeniVZZIhWz5ccErgncS0rlhuVyuS8OHTL0/s7OjmGqJi9HqAwbp/jnnvmCFsc3BE42FhNw3jOAzMQpSuU2sys8WNXqJcOmVrJD5cbxiEpwi6JSv3xBK/mmbKsERWoNpjY2GL9paGiQwHWA7wXGc817hPuxEyjHTCI2JumAkZU8EmpBPKpQEb7GIO/4glbiLFvhWR5L7RQmTpz4Lte5CyiuBHYCH2bp7Ojs7Dydsk5BinWjKisp1v/ybnogyDvBQTO5Q8pc0wrMui9B8k+A3B58kFxOQeS6Zw9LeCRhj0qpBUQpyLC9WluD+eIEzbo8VvaKwN1OAK8E/3tgf2bcncw4HThVueIHDSEV95VaQFxFGdBlb2ucoL1KAHYSkN9F9YCl8iHoZkL3e3IdOD7K+Vtlm2/BAwn293eK1/XgYEcGjc3FV4E7gG/FcSWB20zAZhJoCfIBfJRzH/dyH/PxWm2K152yrKT0Zc6BLFm7nsCgyKBx/vgwgbi2qanp9bhyoZfAzSJ4bxK8Q8gfZMYdE5c/Pl3a7sfXNCCU5pg0ypFBq9ZYrnGdBOsa4B1kHErw1nEfN5pySEobBKNnIVoybzIEZmqB6Q6jXLOgST+YcfcRrEWUu8mPZIld73xGB6oWyehZLcTHkNkfFtQ0aDLqOD1ZQV/b6Iwcg50wdOjQzk2bvjcYXP8nMaj/tabQaDe4pkEjUNpgZtwi1N9DpQ84rbe356EtW7bIVxeo1jaht6zANaiMSVnySE8py8ZuN7imQXPN4LomH820UP8XQCxp3LFjR/tTTz0l94CgapdEmV16Fg4Plm7XmQ22X4Impkrg2JxcSr5e6sCZ27dt/7Y1cOJPAYiCUkRzEJuBHxiHGwboYjX96LegaQt5I0ifY1PyPYqKg5Kmbdu23e1bKsWfAir4VWquptfBYvunxbC51A+bZoPObI4RtABOU0qCcmtra9+uXbvkkPkx2Jh4ubNZKr9CubpUqI5tQLni2hxAFyNoAZwpej19+nTZScq3tJ5GjFzXLuva2CXHX0w+MFWn4AEW3FK1sgFjjBG02tjG9a2bIy4J3K9YLkf09fbdxKnJx9MNkYIOui1AhVjdsHHGYowgCpIbhA8XV03QwiUmaD377LN/y/p4IfA6sD9B/OamTZtS3cPFC06Qkem4g6RaD8w1cXX6BjRoYjf3cE8z0xZQli+7Ht3b23sH5VSpOleYKoszoPhu4mtQNpQYxVBFmQQtrrIgS9iYrGGm/RvtIuqcrq6uf6QcOwmTSVxZN9vilYthL77bONJrKEk1lBjFUrOtkEnQ4iqzGSA4Nia9gwcPvoLyL4EGZt71BO6jlGOlSv3FepWOjcVW1BDLuMyIyoZlErQs7JowYcLbHCh/HlnyOZx8gHpPusPlKh1bJRt21ziVDTOCVo5kjbUHiuezu2dZJpdAIN/uOpHD5dWtra2GjbTsRalWHjUcUo6kxy+OZifzNNWiwsakDbmdgKTmsWPHXiqFzKEfOlSokQ4jaAFucWJZKwNsWhsaGi4DLz+fku3/jZ2dnfKjD1DVJov3nH5VKzEWX410RAfNta5GBrjizVy+T8lm5CpwbwMHAWsIXIqvndfSeMuAwGBrSkBq5XeQ8YPmMPRXxoenP0HXUkB+XiU/QpR7OaqSonovNMGQitvHnGBAJCANtl6pfC6sdYDbOOqSTcmPMUN+lfN5ZpvzzeV0vU/FnYqZnmSQ8lnZUHXwIxidZfI18g/Q3+Vpj7mQkSxF2JdMWDbUmS2PnuAn6aiHUekDX2W8WCZf5jbgJlByzHVUT0/PQuWjUrV7VdhXO0XxJWcWNI/KFB21sfLB6Z3IfxwYRABndHV1foLyn22qTdAydic32H0cJMt5pPxofxRLpVzrMtZSe3FJFqAwazxB8wktIUqFMFk1bTv33HP/DwW3AvIB6skdHR3XU96rkm0VqaYDnqD5hJYQpUI1OjLjqauru51Z9jME1rNMfmHDhg0foZw6BQ3JIHxqhTEEhOn2BC2GLA9JmGAPIRUfrQ8BUURqamr6I0GTTwPegHQ/DpiXkadOQUMyCB9fYcJOGuRhulMFLUxwZcd8tD5EJYe9zqfd/03LA4BI+CQf4cjTFqgmS4Z/kjEmohYT/Qxatx+tbL8Is5GlCppNoBcXaJ6XLGGNZXIh7vgf2AYz877MMimPgqIaP8Efn9hGGdC1ALRHQizdIYLsQQth8GiPrMQyL1JKJQHL5Dv5XE5+2CGbkqNZJuWhNJVkta0HdC0AndwWERQQB3vQhCGhmgD5CaXEJz/kkEPk45un4JA+XMQR1wGU95qUi3NAYMQhZ/RMOmxUqykWxRnyqxGSmGfc+HF7mGHXwShPVTiM3aT8VoBqdqnYs+zkmZIKcS9gDpPpX2vQTGPNssNfkZniyk1WPiuyzJOohNoneXFNk08D8uR/z7nkgYlkRBCjIoJiYJqtQTONNctJTLTyWZFJpHpp5aSETckNYOVccgynJvMov++TNWjeXiefHsk5vBqT1NiUyFfL9WyD7/ysZxsy33NJBy3cycmnR3KO6v3CtawAyGyTa5vMti/EkRbe5zgSBoomp3TQ+tPJKtXL7mo+BfgZgXsS0dIfmW37UA5Nus92caF8A99YKAatHwzJSIV2tU+WXNtALgd6gCO5tsmDsClGJLu4CKYBajYGmIzMAbIiqVrDagtrd3e3PCtZjrjkt9wzCGRGfQvXazGlNihjgGXUsQztTOgjl3z69Ok7WSLlp8F9WHPKuHHjMvkEIPaBIEr7KyUKmuug9Mb5JZUwxojy6rE3mFiWxbvgkaeSj+C+Tb6CR9VJJQVOfS/NpBuJgmY6KF2f/ZL8mOQa+ARgG1w/BaRfZ6xbt25fysWUWoG4qyiqXFJxDqOU+TJ5TXzcsnRDOheXPmO6tObb+Zlht2PoLmBMfX39VPJispMX22K9i7uKhOVS8sXT5C1KS/5e86AF+yqt+Xb+kSNH/idu2AoM6uvru4S8mAzyYJuKpO+F9zAb84nnd8IeGb5KyFkdeWNjo8wyechMLxuTE+R33JWS+tsmVYWTw2zMRx02h0VcxXil5Y+hwkYiz6b8DQ3DmW2Zn/4jN2EKC0GUKL8H81EsadSJ7Pj8fuOEvxqYPHnyG1zb5L5NhJ6+fv1663/beGX7a8Lsx1ZgYhFV8CSqej0o6uxBk5ZEgrMg9hqXViJL4z8jQ351M4pPAuRhM1STdSyWRbGIUJ1REnX2oElLRkoGSszOnTufQ/cvmXHyreQplEn91DHGBgl9thTcYqOuxAl3voprZKUc6iKKzJZCmmzk6XBlZZyQ9LIh72DG7SFwx7AhOaU62WWZsfkZG6QA8uCWAAYPuoA5kRsRD0dgJcSQkKZAcVU3eJXl83Xy/23yyPmRbEicJdIvHD/4kSWMV2YJPVAFzMkPlO40esOdXJY8adKkX1H7OTNNft92xpZH7Q8GxQ+Q7T1prwxaQic/yBIpvyb90I53d3xy7wlNsKV7ZdCCu+NvIWDyVTt5PP1wWj8LpE5xZ3pqRQEC3vdBa25ufpO+/xCQ2eb5JnK1zpeZXi0vdiRLFkU1DZpFXzyDq2a0i+c+7cu03MG1bRV5KYnzS5WEhTS8HlVRfTUVOYw1DZpFn6M2Iqua0S63qanplclTJl8zZcoU+dG9nWigsEn66gQ4X3mf5uAHqgu10xvgnJr311RAmVR9H50++O7THHz1gvcyzpr311Ug0aJMSu2hfGoJfxEQzwNZRMvRlF+2bNlUoNWEtra264CLly9f3njbbbcd1draKt9wcljsGfw+OfAvAD8bOB85R9o5y1gZjG5t6a23HgZf67LblrWSlz+BdgkicvSdClxBP74K/CvwMHLuI8es5XNWrFhxaIQIazMyzH7ewObGNNvHs3LlyiPgkT5oQP9JlUS0mzI1HThrDv94mWlTuZdZYAJCFwNrMejRfD7/wqhRo95FyF04oeh4u5k+OfC3IncFIDe4Lzgy9kO2NZmDcVBd3RXwLcjlc2Lb7a2t8R4h2NbWdjDQjt0/BVajaD5wHjAReReSX41dbRxr/T90a1etWjUCXOyEjPMAsUlgETL+Loy5p6fnyiJ9XugXoPvkSnraTZmaDpw1h/9UCZor4yUQCwVA3ET+HXL5UfouBDQAM4HncPwFyvQuRBXJlLOINvlnp1/Dmwdm4shvgwtN6M4BlzhE8keyB+67776RX0DFgRPhk+8+6p/0Upbfry0r9BUup9wMXIPMu8jlCXcy9C7GqYeDi53gLTibNw6klaJPF6uAV3t7uxyfyYNHoSi49AUqnqRlFjEl34HTsajM0feEOFKMVzS+NHfu3FaBlpaWG8g/S/6xt956ayRtFwPyAM2hMN1L4E4p6rC+vwivK2cBMi4aM2bMEVDKqCdTE1mfmqQQBMifgJ7DaJeTDHkMhdg3k3pguuWWW8ROeRayPGfkDey9GDvGo3/e3Hlz76S8EbiN+mUtc1qOp13+iUPOJgNlBjbgdvi3APIdy2lr7WKiQwAAB4VJREFU1qwZYqPdvn279OMg6P4D6BYacu1vKbtAXzWOtlIMsFX7sDLH/ifNmebK8OQsSz0w3guxTOv/QnodSu4HH3mdcwXJxyR79uyRUU53lerr7RNZbrMvZza6AbqPG+NvOgSTuQ4F/v6soaFBlmL5518Ff6PY7PD5slw+V6D9/mHDhh09ZMiQ//URxEPIY+m7IB3BwNYzm7InEQRnlin5RyuVzSsX/7v8BEocfpm8KaWOY7lqJI+drr322nfphHwvUeG0D7uMDAK3qPPVq1ePojA1p5TC+ffOnj37ZfieyOVyea5DzlJUyaUU7Vcq0NCunTNnjnwAqqJes2bN2gPoGRBFa2tH5z2oVOTuUl4iY7WQ71zKBmoXS7Bcakpt6QqF+EETRcw2+WXKVinjnFMljwtLliwZzrVQzwR4tgM6OYNAl+WNT5wvIq8Hv/Xqq6+Wa6o4ZS04SZfLm0JQMS++s0E6itIwQePA+yn3SxoyZHAXdr6Fsk9jwxhyM8nnd/X46bsyYM2GtOW8jJQgIbY2jHjBoR/v5EpBmMsVRdFOTfle9fX1syHRyzEzZoMQWAmV0ksjcuQr3kIm1zPZvMiG5CM4xzdYCFTpGsvslE2G5sviTWwUcGWhS1clnzXrSrFJvvmVQ2/lbNNLI/2IXBqhIfZKIfMDzNDTw0A2N3lNreyvgDY3aH9T4oKwwBZN6qZiNhyNbW1tlwL3FwqFm6UdWDNv3jzZ1cnEoFpO0Mk9zF+D6eVatpZcJ64/Mprl+qFwzgyN1K7TJemse43cwex8pYj1vmPL0TZncB8V+nxkuuaz05SMPW5QLnPxK1auPBY/yODahu2PuPigHFq3N+MpbwmDV199dbj8wFzsko7rPEiwgX9Dygg+SKIu5QooKSZQj9Imj/2Tz7HepXzV6NGjnSWOWkWC3u3493G+7BxLFLTJiJZZd5HerXmtPdghlK8WOEVvxuyeg80+h3C9kSckeIkT1LBTlvCtsBzBRuk0ctXb01McWErdjU6vpUJQAfTNpXmT8g/CYPDgwT15hOooQ6jzCnm26pEO8mXZFTplM3uJSbcQeQJLyeU5jTIoZEs+dtq0aX0msS6jmQ2I/CWX3mhgkw6QbnPe2OltpPgWbcPfeecducBTLSZ0vCgl8kODdrXMiBdoNx0SGGCRlRD0DpeBcQn6xac6aKwWd4fKod/STp90CfueZGaeHgaycdLXGGGMCyjQOz8UyOiysb3IfZF7j3EtBnwCWrkv64Z3JstU8ZF/2kyHnXHGBuQc2mXnKLPpJJYyzzFOd3e38OndJ87RTnG4ZcnUSzb8eU5vrMdT7CiXY0vJIdA+IfzkpiWCSgwMCDlAkMH4D/vss88kBBxIn38kO1/KwYl+BzcGtyQKWltbmyxD+lpGZ7eaYqnrzmOszs02nCV/JykP2RR0K5uJoywXCr0BEQJgPvJ8xzjgjwNk1n6Ga9FoKQv09vbKc7KUo/gcwdUK6J/ragmSVsMSKUu5fK1hX+zWhwgEco1udN7Aaz43d9BVZXm3p3G4MViOpeTuv8Bo9xhFW6hR3C58C5pn0FNHh4xH/uUUQZTt8pm0KexZDZ0srVZQSsnDOnMEyr3+KQaF/LHQz7UBSl2PvKGqRi+cztggKZU3VdAnvXGiXW5rdu3evbvdbKdPOam7uZRLoFtKtchCvtBX0H1Fmc6DOFiuzqJNOwrFX2cH+CwOBlVM8GvVtOm8iPW+Q7PAwTQjz9mmFxR4d3v82ugPjr6KILjLqy9HvmxsRMwMyloX/BQL+lEUlA/AgV/j2hJ6YiMMIsTNpRwHivQFIe1TSrIicLLSRdv3AbluLqm8N8MuzeTmRS7nXbc45RiZZ7S49CjOLV269ACWoGNx7ultbW0bUbYJEPrXGUVyfVGWJc4VoXPtUV0qvrW0tMi2XXZbgviKcgiQqwcD+QMBmxuh18DFXY9oKoevWLHCeU6/ktn2OHbfC17SF7m2/QK7J9qCB16W+UQHxSJUABsdq70zjQ3CHgbbBECumzcKrQnYpvmYJDo325KWZafjCplIZwoCbBb6Bg0a9DpL0PMYuQWhspGQ3319HeUnz58//w/gAlJ52JRLHtJWqSH3rLZlbR/H8fLRhutAuYmW5kDg+vEKNugdKUs0GxLXfMZQoTCLtsVAH/KPQcjDHLe9zcDbBCyib4vJHwMvnzp8FLrnmZXuIABtS2X5ttbEuBBx2HwGNuoYhORr8xhu8+0u8LKNloDJ9vsGjDucmTKbkVQ6ggJnSSFWQY2MDjK5BpGphTje3YC8RJv8XlrwUaCPqhhx05Ys+Zp8n1HTs2TvxL4vsf2UpXczfRBbh+GMswDpw3Xkx4H/EXAu+o5nV7kl3GKbe7S6fnzzWpifO3fu5zA+VwFDwR8N7tPAJcBNgDxePdBQ2i8EcvBNDCRyGqA7HhCdZ5KLfCnL+aFDEZ6hYxV8uTktLUMrrx3COXfevGdpPxO60QwKCdqJBGvcoPr6keAPAv8ZYD04HRH9JowxAH7dT3I5WzQ4HMc6mdGgi+jbBx7xj7uEa7y8gXdlih8sMMfEXfInAAAA//+PLdGrAAAABklEQVQDABLsu4FxBBl7AAAAAElFTkSuQmCC"//'drag.png';
hint.style.cssText = 'display:none;';
container.appendChild(hint);
const peelHint = document.createElement('div');
peelHint.className = 'peel-hint';
const hintText = currentLocale.lang === 'en' ? 'drag here' : 'arrastra aquí';
peelHint.innerHTML = `<span class="arrow"></span><span class="finger">☝️</span><span class="hint-text">${hintText}</span>`;
container.appendChild(peelHint);
let hintStartTime = performance.now();
let lastHintBlockIdx = -1;
let lastHintTransform = '';
let lastHintMaxWidth = 0;
const peelHintTextEl = peelHint.querySelector('.hint-text');
const DEFAULT_HINT_APPEAR_MS = 2600;
const DEFAULT_HINT_TEXT_MS = 8200;
function positionHint() {
  const target = getDragHintTarget();
  const endpoint = target ? letters[target.idx] : null;
  if (!endpoint) {
    peelHint.classList.remove('visible');
    lastHintBlockIdx = -1;
    return;
  }
  // hide hint whenever any drag is active
  try { if (drags.size > 0) { peelHint.classList.remove('visible'); lastHintBlockIdx = -1; return; } } catch(_) {}
  // reset timer when hint advances to a new block
  if (target.blockIdx !== lastHintBlockIdx) {
    lastHintBlockIdx = target.blockIdx;
    hintStartTime = performance.now();
  }
  // Reuse the container width measured by refreshFrameViewport this frame —
  // calling getMaxWidth() here would force an extra layout read per frame.
  lastHintMaxWidth = (frameViewport.containerWidth || getMaxWidth() + MARGIN * 2) - MARGIN * 2;
  const now = performance.now();
  const hintConfig = textBlocks[target.blockIdx]?.hint || {};
  const hintLabel = hintConfig.text || hintText;
  if (peelHintTextEl.textContent !== hintLabel) peelHintTextEl.textContent = hintLabel;
  peelHint.classList.toggle('visible', now - hintStartTime > Number(hintConfig.appearMs ?? DEFAULT_HINT_APPEAR_MS));
  peelHint.classList.toggle('text-mode', now - hintStartTime > Number(hintConfig.textMs ?? DEFAULT_HINT_TEXT_MS));
  const endpointX = endpoint.x + endpoint.w / 2;
  const endpointY = getRenderedY(target.idx) + getLetterLineHeight(endpoint) * 0.5;
  const placeRight = endpointX < lastHintMaxWidth - 150;
  const x = placeRight ? endpointX + 10 : endpointX - 118;
  const y = endpointY - 10;
  peelHint.classList.toggle('points-left', placeRight);
  peelHint.style.flexDirection = placeRight ? 'row' : 'row-reverse';
  const transform = `translate(${x}px, ${y}px)`;
  if (transform !== lastHintTransform) {
    lastHintTransform = transform;
    peelHint.style.transform = transform;
  }
}
positionHint();
//setTimeout(() => { hint.style.opacity = '1'; }, 500);

// --- Custom Tooltip Logic ---
const tooltip = document.getElementById('editorTooltip');
document.body.addEventListener('mouseover', (e) => {
  const target = e.target.closest('[data-help]');
  if (!target) return;
  const text = target.getAttribute('data-help');
  if (!text) return;
  tooltip.textContent = text;
  tooltip.style.opacity = '1';
  tooltip.style.display = 'block';
  
  const updatePos = (ev) => {
    const x = ev.clientX + 14;
    const y = ev.clientY + 14;
    const rect = tooltip.getBoundingClientRect();
    const outX = x + rect.width > window.innerWidth;
    const outY = y + rect.height > window.innerHeight;
    tooltip.style.left = (outX ? x - rect.width - 20 : x) + 'px';
    tooltip.style.top = (outY ? y - rect.height - 20 : y) + 'px';
  };
  updatePos(e);

  const onMove = (mv) => updatePos(mv);
  const onOut = () => {
    tooltip.style.opacity = '0';
    tooltip.style.display = 'none';
    target.removeEventListener('mousemove', onMove);
    target.removeEventListener('mouseout', onOut);
  };
  target.addEventListener('mousemove', onMove);
  target.addEventListener('mouseout', onOut);
});

function createAttachmentElement(attachment) {
  const el = document.createElement('div');
  el.className = `scene-attachment type-${attachment.type || 'placeholder'}`;
  el.style.display = 'none';
  el.style.opacity = '0';
  if ((attachment.type === 'image' || attachment.type === 'lineart') && attachment.src) {
    // Lineart can be purely procedural (strokes only, no SVG); skip the <img>
    // when there's no source so we don't render a broken-image icon.
    const img = document.createElement('img');
    img.dataset.src = attachment.src;
    img.loading = 'lazy';
    img.alt = attachment.label || '';
    img.draggable = false;
    if (attachment.type === 'lineart') {
      img.style.objectFit = 'fill';
      if (attachment.svgOpacity !== undefined) img.style.opacity = String(attachment.svgOpacity);
    }
    el.appendChild(img);
  } else if (attachment.type !== 'image' && attachment.type !== 'lineart') {
    el.textContent = attachment.label || 'Illustration placeholder';
  }
  return el;
}

function setFadedDisplay(el, visible, displayValue = 'grid') {
  if (!el) return;
  if (visible) {
    if (el._hideAfterFadeTimer) {
      clearTimeout(el._hideAfterFadeTimer);
      el._hideAfterFadeTimer = null;
    }
    if (el.style.display === 'none') {
      el.style.opacity = '0';
      el.style.display = displayValue;
      el.getBoundingClientRect();
    }
    return;
  }
  if (el._hideAfterFadeTimer) clearTimeout(el._hideAfterFadeTimer);
  el._hideAfterFadeTimer = setTimeout(() => {
    if (Number(el.style.opacity || 0) <= 0.01) el.style.display = 'none';
    el._hideAfterFadeTimer = null;
  }, 320);
}

function getCurrentTranslate(el) {
  const matrix = getComputedStyle(el).transform;
  const match = matrix && matrix !== 'none' ? matrix.match(/matrix\(([^)]+)\)/) : null;
  if (!match) return null;
  const parts = match[1].split(',').map(Number);
  if (parts.length < 6 || !parts.every(Number.isFinite)) return null;
  return { x: parts[4], y: parts[5] };
}

function beginAttachmentExit(blockIdx, driftY = 22) {
  const attachment = attachments.find(item => item?.blockIdx === blockIdx);
  const layout = positions[blockIdx]?.attachment;
  if (!attachment || !layout || attachment.exitLocked) return;
  const current = getCurrentTranslate(attachment.el);
  const x = current?.x ?? attachment.lastVisibleX ?? layout.x;
  const y = current?.y ?? attachment.lastVisibleY ?? (layout.y + getBlockRenderOffsetY(blockIdx));
  attachment.exitLocked = true;
  attachment.exitX = x;
  attachment.exitY = y + driftY;
  attachment.el.style.display = 'grid';
  attachment.el.style.transition = 'none';
  attachment.el.style.transform = `translate(${x}px, ${y}px)`;
  attachment.el.getBoundingClientRect();
  attachment.el.style.transition = '';
  attachment.el.classList.add('is-exiting');
  attachment.el.style.transform = `translate(${attachment.exitX}px, ${attachment.exitY}px)`;
  attachment.el.style.opacity = '0';
  for (const stroke of peelStrokes) {
    if (stroke.blockIdx !== blockIdx || stroke.exitStartedAt) continue;
    stroke.exitStartedAt = performance.now();
    stroke.exitDriftY = driftY;
  }
}

let attachments = textBlocks.map((block, blockIdx) => {
  if (!block.attachment) return null;
  const el = createAttachmentElement(block.attachment);
  container.appendChild(el);
  return { blockIdx, el };
});
const looseParts = [];
const loosePartDrags = new Map();
const peelStrokes = [];
const peelStrokeDrags = new Map();
const lineartAuthoring = {
  tool: 'off',
  pointerId: null,
  points: [],
  previewPoint: null
};
const drawTextAuthoring = {
  tool: 'off',
  pointerId: null,
  points: [],
  selected: null,
  drag: null
};
const drawTextToolStatus = document.getElementById('drawTextToolStatus');
const drawTextToolButtons = [...document.querySelectorAll('[data-draw-text-tool]')];
const lineartToolStatus = document.getElementById('lineartToolStatus');
const lineartToolButtons = [...document.querySelectorAll('[data-lineart-tool]')];

function setLineartCanvasTool(tool) {
  lineartAuthoring.tool = lineartAuthoring.tool === tool ? 'off' : tool;
  lineartAuthoring.pointerId = null;
  lineartAuthoring.points = [];
  lineartAuthoring.previewPoint = null;
  lineartToolButtons.forEach(button => button.classList.toggle('active', button.dataset.lineartTool === lineartAuthoring.tool));
  lineartToolButtons.forEach(button => button.setAttribute('aria-pressed', button.dataset.lineartTool === lineartAuthoring.tool ? 'true' : 'false'));
  if (lineartToolStatus) {
    const label = lineartAuthoring.tool === 'off' ? 'Off' : lineartAuthoring.tool;
    lineartToolStatus.textContent = label;
    lineartToolStatus.classList.toggle('active', lineartAuthoring.tool !== 'off');
  }
  document.body.classList.toggle('lineart-authoring-active', lineartAuthoring.tool !== 'off');
}

// Distribute N nodes along a piecewise-linear path (normalised 0–1 coords)
function strokeNodesFromPath(pts, nodeCount, starterCount, endStarter) {
  // cumulative arc length
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], len, start: total });
    total += len;
  }
  return Array.from({ length: nodeCount }, (_, i) => {
    const t = (total > 0) ? (i / Math.max(1, nodeCount - 1)) * total : 0;
    let seg = segs[segs.length - 1];
    for (const s of segs) { if (s.start <= t && s.start + s.len >= t - 0.0001) { seg = s; break; } }
    const tl = seg.len > 0 ? Math.min(1, (t - seg.start) / seg.len) : 0;
    const locked = i >= starterCount && i < nodeCount - endStarter;
    return { x: 0, y: 0, px: 0, py: 0, ox: 0, oy: 0,
             tx: seg.ax + (seg.bx - seg.ax) * tl,
             ty: seg.ay + (seg.by - seg.ay) * tl, locked };
  });
}

// Initialise peelable SVG strokes lazily. Extracting every illustration at startup
// is the biggest paragraph-transition spike on mobile.
const initializedStrokeBlocks = new Set();
const pendingStrokeBlocks = new Set();
const queuedStrokeBlocks = [];
let strokeQueueScheduled = false;

function scheduleStrokeQueue() {
  if (strokeQueueScheduled) return;
  strokeQueueScheduled = true;
  requestAnimationFrame(processStrokeQueue);
}

async function processStrokeQueue() {
  strokeQueueScheduled = false;
  const blockIdx = queuedStrokeBlocks.shift();
  if (blockIdx === undefined) return;
  const block = textBlocks[blockIdx];
  if (block?.attachment?.type === 'lineart') {
    try {
      await initializePeelStrokesForBlock(block, blockIdx);
      syncPeelStrokeOrigins(true);
    } finally {
      pendingStrokeBlocks.delete(blockIdx);
      initializedStrokeBlocks.add(blockIdx);
    }
  } else {
    pendingStrokeBlocks.delete(blockIdx);
    initializedStrokeBlocks.add(blockIdx);
  }
  if (queuedStrokeBlocks.length) scheduleStrokeQueue();
}

function ensurePeelStrokesForBlock(blockIdx) {
  if (initializedStrokeBlocks.has(blockIdx) || pendingStrokeBlocks.has(blockIdx)) return;
  if (textBlocks[blockIdx]?.attachment?.type !== 'lineart') {
    initializedStrokeBlocks.add(blockIdx);
    return;
  }
  pendingStrokeBlocks.add(blockIdx);
  queuedStrokeBlocks.push(blockIdx);
  scheduleStrokeQueue();
}

function ensureVisiblePeelStrokes() {
  const isEditor = document.body.classList.contains('editor-open');
  if (isEditor) {
    for (let blockIdx = 0; blockIdx < textBlocks.length; blockIdx++) ensurePeelStrokesForBlock(blockIdx);
    return;
  }
  const start = Math.max(0, cachedVisibleBlockWindow.start - 1);
  const end = Math.min(textBlocks.length, cachedVisibleBlockWindow.end + 1);
  for (let blockIdx = start; blockIdx < end; blockIdx++) ensurePeelStrokesForBlock(blockIdx);
}

// Initialise loose SVG parts for lineart attachments
textBlocks.forEach((block, blockIdx) => {
  if (block.attachment?.type !== 'lineart') return;
  const loose = block.attachment.loose;
  if (!loose?.src) return;
  const el = document.createElement('img');
  el.className = 'lineart-loose';
  el.src = loose.src;
  el.draggable = false;
  const w = Math.max(10, Number(loose.width  || 44));
  const h = Math.max(10, Number(loose.height || 92));
  el.style.width  = `${w}px`;
  el.style.height = `${h}px`;
  el.style.opacity = '0';
  container.appendChild(el);
  const part = {
    el, blockIdx, w, h,
    x: 0, y: 0, px: 0, py: 0,
    pinFracX:   Number(loose.pinFracX   ?? 0.82),
    pinFracY:   Number(loose.pinFracY   ?? 0.44),
    restLength: Number(loose.restLength ?? 55),
    attached: true,
    angle: 0, angularVelocity: 0,
    sleeping: false, groundedFrames: 0
  };
  el.addEventListener('pointerdown', (e) => {
    armAudio();
    const rect = container.getBoundingClientRect();
    part.attached = false;
    part.sleeping  = false;
    armAudio();
    playGrabSound();
    loosePartDrags.set(e.pointerId, {
      part,
      offsetX: e.clientX - rect.left - part.x,
      offsetY: e.clientY - rect.top  - part.y,
      lastX: e.clientX,
      lastY: e.clientY
    });
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  });
  looseParts.push(part);
});

const particles = [];
const particleEmitters = [];
const MAX_PARTICLES = mobileRuntime ? 55 : 120;
const MAX_PARTICLES_PER_STEP = mobileRuntime ? 10 : 26;
let particlesSpawnedThisStep = 0;
const physicsProps = [];
const physicsPropDrags = new Map();
const firedTriggerKeys = new Set();

function blockHasStarted(blockIdx) {
  return Boolean(blockStartedFlags[blockIdx]);
}

function syncPeelStrokeOrigins(forceSnap = false) {
  if (!forceSnap && lineartLastOriginSyncToken === lineartOriginSyncToken) return;
  lineartLastOriginSyncToken = lineartOriginSyncToken;
  const isEditor = document.body.classList.contains('editor-open');
  const now = performance.now();
  for (const stroke of peelStrokes) {
    if (stroke.exitStartedAt && !isEditor && !forceSnap) continue;
    const layout = positions[stroke.blockIdx]?.attachment;
    if (!layout) continue;
    const offsetY = getBlockRenderOffsetY(stroke.blockIdx);
    // Compute CSS animation transform matrix for this stroke (null = no animation)
    const animMatrix = stroke.svgAnim ? computeAnimTransformMatrix(stroke.svgAnim, now) : null;
    for (const n of stroke.nodes) {
      // Static (non-animated) origin — always derived from the fixed tx/ty fractions
      const staticOrigin = mapSvgFracToAttachment(n.tx, n.ty, stroke, layout, offsetY);
      const staticOx = staticOrigin.x;
      const staticOy = staticOrigin.y;
      // Animated origin — applies the CSS transform at the current animation phase
      let nextOx = staticOx, nextOy = staticOy;
      if (animMatrix) {
        const { svgW, svgH } = stroke.svgAnim;
        const [apx, apy] = transformSvgPoint([n.tx * svgW, n.ty * svgH], animMatrix);
        const animatedOrigin = mapSvgFracToAttachment(apx / svgW, apy / svgH, stroke, layout, offsetY);
        nextOx = animatedOrigin.x;
        nextOy = animatedOrigin.y;
      }
      // Track only structural displacement (layout moves, scroll, resize) for free nodes.
      // Animation displacement is intentionally excluded so peeled nodes aren't dragged by the animation.
      const prevStaticOx = Number.isFinite(n._sOx) ? n._sOx : staticOx;
      const prevStaticOy = Number.isFinite(n._sOy) ? n._sOy : staticOy;
      const structDx = staticOx - prevStaticOx;
      const structDy = staticOy - prevStaticOy;
      n._sOx = staticOx;
      n._sOy = staticOy;
      n.ox = nextOx;
      n.oy = nextOy;
      if (forceSnap || !stroke.initialized) {
        n.x = nextOx; n.y = nextOy; n.px = nextOx; n.py = nextOy;
      } else if (structDx || structDy) {
        n.x += structDx; n.y += structDy; n.px += structDx; n.py += structDy;
      }
    }
    if (!stroke.initialized) {
      let pathLen = 0;
      for (let i = 0; i < stroke.nodes.length - 1; i++) {
        const a = stroke.nodes[i], b = stroke.nodes[i + 1];
        pathLen += Math.hypot(b.ox - a.ox, b.oy - a.oy);
      }
      stroke.constraintDist = Math.max(2, pathLen / Math.max(1, stroke.nodes.length - 1));
      stroke.initialized = true;
    }
  }
}

function positionAttachments() {
  const isEditor = document.body.classList.contains('editor-open');
  const exitDriftY = 22;
  for (const attachment of attachments) {
    if (!attachment) continue;
    const layout = positions[attachment.blockIdx]?.attachment;
    const blockVisible = isBlockVisible(attachment.blockIdx) && activeBlockFlags[attachment.blockIdx];
    const visible = Boolean(layout && (blockVisible || isEditor));
    const configuredOpacity = Math.max(0, Math.min(1, Number(textBlocks[attachment.blockIdx]?.attachment?.opacity ?? 1) || 0));
    setFadedDisplay(attachment.el, Boolean(layout), 'grid');
    // setFadedDisplay rewrites opacity when re-showing, so the style cache
    // must be invalidated while hidden or the re-show write would be skipped.
    if (!layout) { attachment.lastStyleKey = null; continue; }
    if (visible && !attachment.lazyImgChecked) {
      attachment.lazyImgChecked = true;
      const img = attachment.el.querySelector('img[data-src]');
      if (img && !img.getAttribute('src')) img.src = img.dataset.src;
    }
    let transform;
    let opacity;
    if (attachment.exitLocked && !isEditor) {
      transform = `translate(${attachment.exitX}px, ${attachment.exitY}px)`;
      opacity = '0';
      attachment.wasVisible = false;
    } else {
      const renderX = layout.x;
      const renderY = layout.y + getBlockRenderOffsetY(attachment.blockIdx);
      if (visible) {
        attachment.el.classList.remove('is-exiting');
        attachment.exitLocked = false;
        attachment.lastVisibleX = renderX;
        attachment.lastVisibleY = renderY;
        attachment.exitX = null;
        attachment.exitY = null;
        transform = `translate(${renderX}px, ${renderY}px)`;
      } else {
        if (attachment.wasVisible) {
          attachment.el.classList.add('is-exiting');
          attachment.exitX = attachment.lastVisibleX ?? renderX;
          attachment.exitY = (attachment.lastVisibleY ?? renderY) + exitDriftY;
        }
        const exitX = attachment.exitX ?? attachment.lastVisibleX ?? renderX;
        const exitY = attachment.exitY ?? ((attachment.lastVisibleY ?? renderY) + exitDriftY);
        transform = `translate(${exitX}px, ${exitY}px)`;
      }
      opacity = visible ? String(configuredOpacity) : '0';
      attachment.wasVisible = visible;
    }
    // Skip the DOM writes when nothing changed (this runs twice per frame).
    const styleKey = `${layout.width}:${layout.height}:${transform}:${opacity}`;
    if (attachment.lastStyleKey !== styleKey) {
      attachment.lastStyleKey = styleKey;
      attachment.el.style.width = `${layout.width}px`;
      attachment.el.style.height = `${layout.height}px`;
      attachment.el.style.transform = transform;
      attachment.el.style.opacity = opacity;
    }
  }
}

function getLineartAuthoringLayout(blockIdx = selectedBlockIdx) {
  const block = textBlocks[blockIdx];
  const layout = positions[blockIdx]?.attachment;
  if (!block?.attachment || block.attachment.type !== 'lineart' || !layout) return null;
  return { block, layout, offsetY: getBlockRenderOffsetY(blockIdx) };
}

function pointerToLineartPoint(event, blockIdx = selectedBlockIdx) {
  const target = getLineartAuthoringLayout(blockIdx);
  if (!target) return null;
  const { layout, offsetY } = target;
  const x = event.clientX - frameViewport.containerLeft;
  const y = event.clientY - frameViewport.containerTop;
  const nx = (x - layout.x) / Math.max(1, layout.width);
  const ny = (y - layout.y - offsetY) / Math.max(1, layout.height);
  const brushPx = Number(lineartBrushSize?.value) || 18;
  const padX = brushPx / Math.max(1, layout.width);
  const padY = brushPx / Math.max(1, layout.height);
  if (nx < -padX || nx > 1 + padX || ny < -padY || ny > 1 + padY) return null;
  return [
    Math.max(0, Math.min(1, nx)),
    Math.max(0, Math.min(1, ny))
  ];
}

function strokesFromCurrentLineart(blockIdx = selectedBlockIdx) {
  return peelStrokes
    .filter(stroke => stroke.blockIdx === blockIdx && stroke.nodes?.length >= 2)
    .map(stroke => ({
      pathPoints: stroke.nodes.map(node => [node.tx, node.ty]),
      nodeCount: stroke.nodes.length,
      starterCount: Math.max(1, stroke.nodes.findIndex(node => node.locked)),
      endStarterCount: 0,
      lineWidth: stroke.strokeLW || 2,
      color: stroke.strokeColor || '#4a4a4a',
      unlockThreshold: stroke.unlockThresh
    }));
}

function updateLineartAttachmentStrokes(mutator, scheduleReload = true) {
  const nextConfig = buildConfigFromVisualControls();
  const block = getEditableBlocks(nextConfig)[selectedBlockIdx];
  if (!block || block.attachment?.type !== 'lineart') return false;
  const att = block.attachment;
  const beforeAttachment = cloneAttachmentForSync(att);
  if (!Array.isArray(att.strokes) || !att.strokes.length) {
    att.strokes = strokesFromCurrentLineart(selectedBlockIdx);
  } else {
    att.strokes = att.strokes.map(stroke => ({ ...stroke, pathPoints: (stroke.pathPoints || []).map(point => [...point]) }));
  }
  mutator(att.strokes, att);
  recordAttachmentEditForLocale(block, beforeAttachment, att, storedLocale, pieceConfig, selectedBlockIdx);
  editorJson.value = JSON.stringify(nextConfig, null, 2);
  pieceConfig = nextConfig; state.pieceConfig = pieceConfig;
  if (textBlocks[selectedBlockIdx]) textBlocks[selectedBlockIdx].drawPath = structuredClone(block.drawPath);
  if (textBlocks[selectedBlockIdx]) textBlocks[selectedBlockIdx].attachment = structuredClone(att);
  persistPieceConfig(nextConfig);
  if (scheduleReload) {
    clearTimeout(textReloadTimer);
    textReloadTimer = setTimeout(performSoftReload, 80);
  }
  return true;
}

function distPointToSegmentSq(point, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = point[0] - a[0];
  const wy = point[1] - a[1];
  const lenSq = vx * vx + vy * vy;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq)) : 0;
  const px = a[0] + vx * t;
  const py = a[1] + vy * t;
  const dx = point[0] - px;
  const dy = point[1] - py;
  return dx * dx + dy * dy;
}

function pathPointAt(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function pushPathPoint(path, point) {
  const prev = path[path.length - 1];
  if (!prev || Math.hypot(prev[0] - point[0], prev[1] - point[1]) > 0.0001) path.push(point);
}

function normalizedPathLength(points) {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    length += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  }
  return length;
}

function segmentEraseRange(point, a, b, radius) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = a[0] - point[0];
  const wy = a[1] - point[1];
  const aa = vx * vx + vy * vy;
  if (aa <= 0.0000001) return null;
  const bb = 2 * (wx * vx + wy * vy);
  const cc = wx * wx + wy * wy - radius * radius;
  const disc = bb * bb - 4 * aa * cc;
  if (disc < 0) return distPointToSegmentSq(point, a, b) <= radius * radius ? [0, 1] : null;
  const root = Math.sqrt(disc);
  const t0 = Math.max(0, Math.min(1, (-bb - root) / (2 * aa)));
  const t1 = Math.max(0, Math.min(1, (-bb + root) / (2 * aa)));
  if (t1 < 0 || t0 > 1 || t1 <= t0) return null;
  return [t0, t1];
}

function makeErasedStrokeChunk(source, points) {
  const baseLength = Math.max(0.0001, normalizedPathLength(source.pathPoints || []));
  const chunkLength = normalizedPathLength(points);
  const nodeRatio = chunkLength / baseLength;
  const nodeCount = Math.max(4, Math.min(160, Math.round(Number(source.nodeCount || points.length) * nodeRatio)));
  return {
    ...source,
    pathPoints: points.map(point => [...point]),
    nodeCount,
    starterCount: Math.max(1, Math.min(nodeCount - 1, Number(source.starterCount ?? 2) || 2)),
    endStarterCount: Math.max(0, Math.min(nodeCount - 1, Number(source.endStarterCount ?? 0) || 0))
  };
}

function eraseStrokeWithBrush(stroke, point, radius) {
  const pts = stroke.pathPoints || [];
  if (pts.length < 2) return [stroke];
  const chunks = [];
  let current = [];
  const finishCurrent = () => {
    if (current.length >= 2 && normalizedPathLength(current) > 0.0005) {
      chunks.push(makeErasedStrokeChunk(stroke, current));
    }
    current = [];
  };

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const erased = segmentEraseRange(point, a, b, radius);
    if (!erased) {
      if (!current.length) pushPathPoint(current, [...a]);
      pushPathPoint(current, [...b]);
      continue;
    }

    const [t0, t1] = erased;
    if (t0 > 0.001) {
      if (!current.length) pushPathPoint(current, [...a]);
      pushPathPoint(current, pathPointAt(a, b, t0));
      finishCurrent();
    } else {
      finishCurrent();
    }
    if (t1 < 0.999) {
      current = [pathPointAt(a, b, t1), [...b]];
    } else {
      current = [];
    }
  }
  finishCurrent();
  return chunks;
}

function eraseLineartAt(point) {
  const target = getLineartAuthoringLayout();
  if (!target) return;
  const brushPx = Number(lineartBrushSize?.value) || 18;
  const radius = Math.max(0.006, brushPx / Math.max(target.layout.width, target.layout.height));
  updateLineartAttachmentStrokes((strokes) => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const nextPieces = eraseStrokeWithBrush(strokes[i], point, radius);
      if (nextPieces.length !== 1 || nextPieces[0] !== strokes[i]) {
        strokes.splice(i, 1, ...nextPieces);
      }
    }
  }, false);
}

function finishLineartDraw() {
  if (lineartAuthoring.points.length < 2) return;
  const points = lineartAuthoring.points.map(point => [...point]);
  updateLineartAttachmentStrokes((strokes) => {
    strokes.push({
      pathPoints: points,
      nodeCount: Math.max(8, Math.min(120, Math.round(points.length * 2.5))),
      starterCount: Math.max(1, Math.min(8, Number(roughInitialPeeled?.value) || 2)),
      endStarterCount: 0,
      lineWidth: 2,
      source: 'manual'
    });
  });
}

function handleLineartAuthorPointerDown(event) {
  if (lineartAuthoring.tool === 'off' || !document.body.classList.contains('editor-open')) return false;
  const point = pointerToLineartPoint(event);
  if (!point) return false;
  lineartAuthoring.pointerId = event.pointerId;
  lineartAuthoring.points = [point];
  lineartAuthoring.previewPoint = point;
  if (lineartAuthoring.tool === 'erase') eraseLineartAt(point);
  try { container.setPointerCapture(event.pointerId); } catch (_) {}
  event.preventDefault();
  return true;
}

function handleLineartAuthorPointerMove(event) {
  if (lineartAuthoring.pointerId !== event.pointerId) return false;
  const point = pointerToLineartPoint(event);
  if (!point) return true;
  lineartAuthoring.previewPoint = point;
  if (lineartAuthoring.tool === 'erase') {
    eraseLineartAt(point);
  } else {
    const prev = lineartAuthoring.points[lineartAuthoring.points.length - 1];
    const minDist = 0.006;
    if (!prev || Math.hypot(point[0] - prev[0], point[1] - prev[1]) >= minDist) {
      lineartAuthoring.points.push(point);
    }
  }
  event.preventDefault();
  return true;
}

function endLineartAuthorPointer(event) {
  if (lineartAuthoring.pointerId !== event.pointerId) return false;
  if (lineartAuthoring.tool === 'draw') finishLineartDraw();
  if (lineartAuthoring.tool === 'erase') {
    clearTimeout(textReloadTimer);
    textReloadTimer = setTimeout(performSoftReload, 80);
  }
  lineartAuthoring.pointerId = null;
  lineartAuthoring.points = [];
  lineartAuthoring.previewPoint = null;
  event.preventDefault();
  return true;
}

function getSelectedDrawPath() {
  return textBlocks[selectedBlockIdx]?.drawPath || null;
}

function pointerToContainerPoint(event) {
  return {
    x: event.clientX - frameViewport.containerLeft,
    y: event.clientY - frameViewport.containerTop
  };
}

function getDrawPathOrigin(blockIdx = selectedBlockIdx) {
  return drawPathOrigins.get(blockIdx) || {
    screenX: Number(textBlocks[blockIdx]?.transform?.x || 0),
    screenY: getBlockBounds(blockIdx).top + Number(textBlocks[blockIdx]?.transform?.y || 0),
    scale: Math.max(0.1, Number(textBlocks[blockIdx]?.transform?.scale || 1))
  };
}

function pointerToDrawPathPoint(event) {
  const p = pointerToContainerPoint(event);
  const origin = getDrawPathOrigin();
  const scale = origin.scale || 1;
  return {
    x: (p.x - origin.screenX) / scale,
    y: (p.y - origin.screenY) / scale
  };
}

function drawPathPointToScreen(point, blockIdx = selectedBlockIdx) {
  const origin = getDrawPathOrigin(blockIdx);
  const scale = origin.scale || 1;
  return {
    x: origin.screenX + (Number(point.x) || 0) * scale,
    y: origin.screenY + (Number(point.y) || 0) * scale
  };
}

function setDrawTextTool(tool) {
  drawTextAuthoring.tool = drawTextAuthoring.tool === tool ? 'off' : tool;
  drawTextAuthoring.pointerId = null;
  drawTextAuthoring.points = [];
  drawTextAuthoring.drag = null;
  drawTextToolButtons.forEach(button => button.classList.toggle('active', button.dataset.drawTextTool === drawTextAuthoring.tool));
  document.body.classList.toggle('draw-text-authoring-active', drawTextAuthoring.tool !== 'off');
  if (drawTextToolStatus) {
    drawTextToolStatus.textContent = drawTextAuthoring.tool === 'off' ? 'Off' : drawTextAuthoring.tool;
    drawTextToolStatus.classList.toggle('active', drawTextAuthoring.tool !== 'off');
  }
  if (drawTextAuthoring.tool !== 'off') setLineartCanvasTool('off');
}

function isCanvasAuthoringToolActive() {
  return drawTextAuthoring.tool !== 'off' || lineartAuthoring.tool !== 'off';
}

function mutateSelectedDrawPath(mutator, reload = true) {
  const nextConfig = buildConfigFromVisualControls();
  const block = getEditableBlocks(nextConfig)[selectedBlockIdx];
  if (!block) return false;
  block.drawPath ||= { enabled: true, anchors: [], spacing: Number(drawTextSpacing?.value) || 2, angleMix: Number(drawTextAngleMix?.value) || 1 };
  mutator(block.drawPath, block);
  block.drawPath.enabled = true;
  editorJson.value = JSON.stringify(nextConfig, null, 2);
  pieceConfig = nextConfig; state.pieceConfig = pieceConfig;
  if (textBlocks[selectedBlockIdx]) textBlocks[selectedBlockIdx].drawPath = structuredClone(block.drawPath);
  persistPieceConfig(nextConfig);
  if (reload) {
    clearTimeout(textReloadTimer);
    textReloadTimer = setTimeout(performSoftReload, 80);
  }
  return true;
}

function drawPathHitTest(point, radius = 13) {
  const drawPath = getSelectedDrawPath();
  const anchors = drawPath?.anchors || [];
  const localRadius = radius / Math.max(0.1, getDrawPathOrigin().scale || 1);
  let best = null;
  let bestDist = localRadius;
  anchors.forEach((anchor, anchorIdx) => {
    const candidates = [
      { kind: 'anchor', x: anchor.x, y: anchor.y },
      { kind: 'in', x: anchor.x + (anchor.in?.x || 0), y: anchor.y + (anchor.in?.y || 0) },
      { kind: 'out', x: anchor.x + (anchor.out?.x || 0), y: anchor.y + (anchor.out?.y || 0) }
    ];
    for (const candidate of candidates) {
      const dist = Math.hypot(point.x - candidate.x, point.y - candidate.y);
      if (dist <= bestDist) {
        bestDist = dist;
        best = { anchorIdx, kind: candidate.kind };
      }
    }
  });
  return best;
}

function insertDrawAnchorAt(point) {
  mutateSelectedDrawPath((drawPath) => {
    const anchors = drawPath.anchors ||= [];
    const nextAnchor = { x: Math.round(point.x), y: Math.round(point.y), in: { x: -28, y: 0 }, out: { x: 28, y: 0 } };
    if (anchors.length < 2) {
      anchors.push(nextAnchor);
      return;
    }
    let bestIdx = anchors.length;
    let bestDist = Infinity;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      const d = distPointToSegmentSq([point.x, point.y], [a.x, a.y], [b.x, b.y]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i + 1;
      }
    }
    anchors.splice(bestIdx, 0, nextAnchor);
  }, false);
  relayoutLockedLetters();
}

function handleDrawTextPointerDown(event) {
  if (drawTextAuthoring.tool === 'off' || !document.body.classList.contains('editor-open')) return false;
  const point = pointerToDrawPathPoint(event);
  if (drawTextAuthoring.tool === 'draw') {
    drawTextAuthoring.pointerId = event.pointerId;
    drawTextAuthoring.points = [point];
    try { container.setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
    return true;
  }
  if (drawTextAuthoring.tool === 'add') {
    insertDrawAnchorAt(point);
    event.preventDefault();
    return true;
  }
  const hit = drawPathHitTest(point, event.pointerType === 'touch' ? 24 : 14);
  if (drawTextAuthoring.tool === 'delete') {
    if (hit?.kind === 'anchor') {
      mutateSelectedDrawPath((drawPath) => {
        drawPath.anchors.splice(hit.anchorIdx, 1);
      }, false);
      relayoutLockedLetters();
    }
    event.preventDefault();
    return true;
  }
  if (drawTextAuthoring.tool === 'edit' && hit) {
    drawTextAuthoring.pointerId = event.pointerId;
    drawTextAuthoring.drag = { ...hit, lastX: point.x, lastY: point.y };
    try { container.setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
    return true;
  }
  return false;
}

function handleDrawTextPointerMove(event) {
  if (drawTextAuthoring.pointerId !== event.pointerId) return false;
  const point = pointerToDrawPathPoint(event);
  if (drawTextAuthoring.tool === 'draw') {
    const prev = drawTextAuthoring.points[drawTextAuthoring.points.length - 1];
    if (!prev || Math.hypot(point.x - prev.x, point.y - prev.y) >= 8) drawTextAuthoring.points.push(point);
    event.preventDefault();
    return true;
  }
  if (drawTextAuthoring.tool === 'edit' && drawTextAuthoring.drag) {
    const drag = drawTextAuthoring.drag;
    const dx = point.x - drag.lastX;
    const dy = point.y - drag.lastY;
    drag.lastX = point.x;
    drag.lastY = point.y;
    mutateSelectedDrawPath((drawPath) => {
      const anchor = drawPath.anchors?.[drag.anchorIdx];
      if (!anchor) return;
      if (drag.kind === 'anchor') {
        anchor.x = Math.round((Number(anchor.x) || 0) + dx);
        anchor.y = Math.round((Number(anchor.y) || 0) + dy);
      } else {
        anchor[drag.kind] ||= { x: 0, y: 0 };
        anchor[drag.kind].x = Math.round((Number(anchor[drag.kind].x) || 0) + dx);
        anchor[drag.kind].y = Math.round((Number(anchor[drag.kind].y) || 0) + dy);
      }
    }, false);
    relayoutLockedLetters();
    event.preventDefault();
    return true;
  }
  return false;
}

function endDrawTextPointer(event) {
  if (drawTextAuthoring.pointerId !== event.pointerId) return false;
  if (drawTextAuthoring.tool === 'draw' && drawTextAuthoring.points.length >= 2) {
    const anchors = anchorsFromDrawnPoints(drawTextAuthoring.points);
    mutateSelectedDrawPath((drawPath) => {
      drawPath.anchors = anchors;
      drawPath.spacing = Number(drawTextSpacing?.value) || 2;
      drawPath.angleMix = Number(drawTextAngleMix?.value) || 1;
    }, false);
    relayoutLockedLetters();
  } else if (drawTextAuthoring.tool === 'edit') {
    persistPieceConfig(pieceConfig);
  }
  drawTextAuthoring.pointerId = null;
  drawTextAuthoring.points = [];
  drawTextAuthoring.drag = null;
  event.preventDefault();
  return true;
}

function getLetterCenter(idx) {
  const l = letters[idx];
  return {
    x: l.x + l.w / 2,
    y: getRenderedY(idx) + LINE_HEIGHT / 2,
    vx: l.x - l.px,
    vy: l.y - l.py
  };
}

function runBgColorAction(action = {}) {
  const color = action.color || '#f5f0e8';
  const duration = Number(action.duration ?? 1400);
  const tr = `background ${duration}ms ease`;
  document.documentElement.style.transition = tr;
  document.body.style.transition = tr;
  document.documentElement.style.background = color;
  document.body.style.background = color;
}

function simulateLooseParts() {
  const minX = -frameViewport.containerLeft;
  const minY = -frameViewport.containerTop;
  const maxX = frameViewport.width  - frameViewport.containerLeft;
  const maxY = frameViewport.height - frameViewport.containerTop;

  for (const part of looseParts) {
    let isDragged = false;
    for (const drag of loosePartDrags.values()) {
      if (drag.part === part) { isDragged = true; break; }
    }
    if (isDragged) continue;

    if (part.attached) {
      const layout   = positions[part.blockIdx]?.attachment;
      const blockVis = isBlockVisible(part.blockIdx) && activeBlockFlags[part.blockIdx];
      if (!layout || !blockVis) { part.px = part.x; part.py = part.y; continue; }

      const offsetY = getBlockRenderOffsetY(part.blockIdx);
      const pinX = layout.x + layout.width  * part.pinFracX - part.w / 2;
      const pinY = layout.y + layout.height * part.pinFracY + offsetY - part.h / 2;

      // Gentle spring toward pin point (soft pendulum)
      const vx = (part.x - part.px) * 0.86;
      const vy = (part.y - part.py) * 0.86;
      const dx = pinX - part.x;
      const dy = pinY - part.y;
      part.px = part.x;
      part.py = part.y;
      part.x += vx + dx * 0.14;
      part.y += vy + dy * 0.14 + 0.06;
    } else {
      if (part.sleeping) { part.px = part.x; part.py = part.y; continue; }
      const vx = (part.x - part.px) * Math.pow(0.982, SIM_STEP_SCALE);
      const vy = (part.y - part.py) * Math.pow(0.982, SIM_STEP_SCALE);
      part.px = part.x;
      part.py = part.y;
      part.x += vx;
      part.y += vy + 0.30 * SIM_STEP_SCALE;
      part.angle += part.angularVelocity;
      part.angularVelocity = part.angularVelocity * 0.96 + vx / Math.max(20, part.w) * 0.06;
      if (part.x < minX) { part.x = minX; part.px = part.x + vx * 0.5; }
      if (part.x + part.w > maxX) { part.x = maxX - part.w; part.px = part.x + vx * 0.5; }
      if (part.y < minY) { part.y = minY; }
      const floor = getPileFloor(part.x + frameViewport.containerLeft, part.w);
      const floorY = maxY - floor - part.h;
      if (part.y > floorY) {
        part.y = floorY;
        if (Math.abs(vx) < 0.07 && Math.abs(vy) < 0.35) {
          part.px = part.x; part.py = part.y;
          part.angularVelocity = 0;
          part.groundedFrames++;
          if (part.groundedFrames > 6) part.sleeping = true;
        } else {
          part.py = part.y + vy * 0.2;
          part.groundedFrames = 0;
        }
      } else {
        part.groundedFrames = 0;
      }
    }
  }
}

function simulatePeelStrokes() {
  const minX = -frameViewport.containerLeft;
  const minY = -frameViewport.containerTop;
  const maxX = frameViewport.width  - frameViewport.containerLeft;
  const maxY = frameViewport.height - frameViewport.containerTop;

  syncPeelStrokeOrigins(false);
  const isEditor = document.body.classList.contains('editor-open');
  const draggedNodesByStroke = new Map();
  for (const drag of peelStrokeDrags.values()) {
    if (!drag?.stroke) continue;
    let dragged = draggedNodesByStroke.get(drag.stroke);
    if (!dragged) {
      dragged = new Set();
      draggedNodesByStroke.set(drag.stroke, dragged);
    }
    dragged.add(drag.nodeIdx);
  }
  for (const stroke of peelStrokes) {
    const layout   = positions[stroke.blockIdx]?.attachment;
    const blockVis = isBlockVisible(stroke.blockIdx) && activeBlockFlags[stroke.blockIdx];
    const draggedIdx = draggedNodesByStroke.get(stroke) || null;

    if (!layout || (!blockVis && !draggedIdx?.size)) {
      for (const n of stroke.nodes) { n.px = n.x; n.py = n.y; }
      continue;
    }
    if (stroke.exitStartedAt && !isEditor) {
      for (const n of stroke.nodes) { n.px = n.x; n.py = n.y; }
      continue;
    }
    if (!stroke.started && !isEditor && !draggedIdx?.size) {
      for (const n of stroke.nodes) {
        n.x = n.ox; n.y = n.oy; n.px = n.ox; n.py = n.oy;
      }
      continue;
    }

    // One-time init: exact constraint distance from path geometry + snap all to origin
    if (!stroke.initialized) {
      stroke.initialized = true;
      const N = stroke.nodes.length;
      let pathLen = 0;
      for (let i = 0; i < N - 1; i++) {
        const a = stroke.nodes[i], b = stroke.nodes[i + 1];
        pathLen += Math.hypot(b.ox - a.ox, b.oy - a.oy);
      }
      stroke.constraintDist = Math.max(2, pathLen / Math.max(1, N - 1));
      for (const n of stroke.nodes) { n.x = n.ox; n.y = n.oy; n.px = n.ox; n.py = n.oy; }
    }

    // Verlet — locked nodes stay at origin, free nodes have gravity+damping
    for (let i = 0; i < stroke.nodes.length; i++) {
      const n = stroke.nodes[i];
      if (n.locked)          { n.x = n.ox; n.y = n.oy; n.px = n.ox; n.py = n.oy; continue; }
      if (draggedIdx?.has(i)) continue;  // pointer drives it
      const vx = (n.x - n.px) * Math.pow(0.97, SIM_STEP_SCALE);
      const vy = (n.y - n.py) * Math.pow(0.97, SIM_STEP_SCALE);
      n.px = n.x; n.py = n.y;
      n.x += vx;
      n.y += vy + LINEART_STROKE_GRAVITY * SIM_STEP_SCALE;
      if (n.x < minX) n.x = minX;
      if (n.x > maxX) n.x = maxX;
      const floor = getPileFloor(n.x + frameViewport.containerLeft, Math.max(1, stroke.strokeLW || 1));
      const floorY = maxY - floor - Math.max(1, (stroke.strokeLW || 1) * 0.5);
      if (n.y > floorY) { n.y = floorY; n.py = n.y + vy * 0.22; }
    }

    // Distance constraints
    const cd = stroke.constraintDist;
    for (let iter = 0; iter < LINEART_STROKE_CONSTRAINT_ITERATIONS; iter++) {
      for (let i = 0; i < stroke.nodes.length - 1; i++) {
        const a = stroke.nodes[i], b = stroke.nodes[i + 1];
        if (a.locked && b.locked) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const push = (dist - cd) / dist * 0.5;
        const fx = dx * push, fy = dy * push;
        const aPinned = a.locked || draggedIdx?.has(i);
        const bPinned = b.locked || draggedIdx?.has(i + 1);
        if (!aPinned) { a.x += fx; a.y += fy; }
        if (!bPinned) { b.x -= fx; b.y -= fy; }
      }
    }

    // Progressive unlock from BOTH ends
    // From start: check if last-free-from-start is far enough from next locked toward end
    if (!stroke.fullyPeeled) {
      const N = stroke.nodes.length;
      // Start-side: scan from front to find boundary
      let lastFreeStart = -1;
      for (let i = 0; i < N; i++) { if (!stroke.nodes[i].locked) lastFreeStart = i; else break; }
      if (lastFreeStart >= 0 && lastFreeStart < N - 1) {
        const nextL = stroke.nodes[lastFreeStart + 1];
        if (nextL.locked) {
          const lf = stroke.nodes[lastFreeStart];
          if (Math.hypot(lf.x - nextL.ox, lf.y - nextL.oy) > stroke.unlockThresh) {
            nextL.locked = false;
            playPeelSound();
          }
        }
      }
      // End-side: scan from back
      let lastFreeEnd = -1;
      for (let i = N - 1; i >= 0; i--) { if (!stroke.nodes[i].locked) lastFreeEnd = i; else break; }
      if (lastFreeEnd >= 0 && lastFreeEnd > 0) {
        const nextL = stroke.nodes[lastFreeEnd - 1];
        if (nextL.locked) {
          const lf = stroke.nodes[lastFreeEnd];
          if (Math.hypot(lf.x - nextL.ox, lf.y - nextL.oy) > stroke.unlockThresh) {
            nextL.locked = false;
            playPeelSound();
          }
        }
      }
      if (stroke.nodes.every(n => !n.locked)) { stroke.fullyPeeled = true; playPeelPointCompleteSound(); }
    }
  }
}

function renderLooseParts() {
  const isEditor = document.body.classList.contains('editor-open');
  for (const part of looseParts) {
    const layout   = positions[part.blockIdx]?.attachment;
    const blockVis = isBlockVisible(part.blockIdx) && activeBlockFlags[part.blockIdx];
    const show = Boolean(layout && (blockVis || isEditor || !part.attached));
    const configuredOpacity = getAttachmentOpacity(part.blockIdx);
    part.el.style.opacity = show ? String(configuredOpacity) : '0';
    if (!show) continue;
    const angle = part.attached ? 0 : (part.angle || 0);
    part.el.style.transform = `translate(${part.x}px, ${part.y}px) rotate(${angle}rad)`;
  }
}

// Resize: relayout locked letters using their fixed reading-order index
window.addEventListener('resize', () => {
  const newPositions = layoutPositions(getMaxWidth());
  positions = newPositions; state.positions = positions;
  for (let i = 0; i < letters.length; i++) {
    const np = newPositions[letters[i].blockIdx].positions[letters[i].readingIdx];
    if (!np) continue;
    if (letters[i].locked) {
      letters[i].x = np.x;
      letters[i].y = np.y;
      letters[i].ox = np.x;
      letters[i].oy = np.y;
      letters[i].px = np.x;
      letters[i].py = np.y;
    } else {
      letters[i].ox = np.x;
      letters[i].oy = np.y;
    }
  }
  applyDrainCollapse();
  restLengths = computeRestLengths(); state.restLengths = restLengths; gapLinkDecayTargets = computeGapLinkDecayTargets(); state.gapLinkDecayTargets = gapLinkDecayTargets;
  crossBlockConstraints = computeCrossBlockConstraints(); state.crossBlockConstraints = crossBlockConstraints;
  ties = computeTies(); state.ties = ties;
  tangledLines = computeTangledLines(); state.tangledLines = tangledLines;
  computeAllReflowPositions(); computeAnchorPeelNeighbors();
  positionHint();
  positionAttachments();
});

function resetUnravelQueue() {
  unravelIdx = letters.length - 1;
  while (unravelIdx >= 0 && unravelIdx < letters.length && !letters[unravelIdx].locked) {
    unravelIdx--;
  }
  state.unravelIdx = unravelIdx;
}

function advanceUnravelQueue() {
  unravelIdx--;
  state.unravelIdx = unravelIdx;
}

function isUnravelDone() {
  return unravelIdx < 0;
}

function unlockLetter(idx, silent = false, options = {}) {
  const l = letters[idx];
  if (!l || l.deleted || !l.locked) return;
  if (l.inlineStyle?.noPeel) return;
  const now = performance.now();
  if (!silent && l.tempLockUntil > now) return;
  if (!silent && runTriggers('beforeLetterUnlock', l.blockIdx, { idx, anchor: getLetterCenter(idx) })) return;
  if (options.bakeY !== false && !l.yBaked) {
    bakeLetterRenderY(idx);
    l.px = l.x;
  }
  l.lineLockY ??= l.y;
  l.locked = false;
  l.unlockedAt = ++unlockClock; state.unlockClock = unlockClock;
  if (l.inlineStyle?.explicitPeel && (textBlocks[l.blockIdx]?.peel?.reflow || textBlocks[l.blockIdx]?.peel?.reflowAnchors)) {
    const bIdx = l.blockIdx;
    // Dynamic reflowAnchors (!allWords): reflow triggers on segment completion (checkCompletionSounds),
    // not on first unlock, so anchor words only start moving once a full strip is gone.
    if (!(textBlocks[bIdx]?.peel?.reflowAnchors && !textBlocks[bIdx]?.peel?.allWords)) {
      if (!reflowStarted.has(bIdx)) reflowStarted.add(bIdx);
    }
  }
  if (l.inlineStyle?.censor) {
    const revealEl = censorRevealEls[idx];
    if (revealEl) {
      revealEl.style.transform = `translate(${l.x}px, ${l.y}px)`;
      revealEl.style.opacity = '1';
      censorRevealedFlags[idx] = true;
    }
  }
  if (!silent) {
    blockStartedFlags[l.blockIdx] = true;
    playPeelSound();
    runTriggers('letterUnlock', l.blockIdx, { idx, anchor: getLetterCenter(idx) });
    checkWordTriggers(idx);
    checkCompletionSounds(idx);
    schedulePeelStateSave();
    if (l.groupKey && !options.skipGroup) unlockLetterGroup(idx, l.groupKey);
  }
}

function unlockLetterGroup(sourceIdx, groupKey) {
  const source = letters[sourceIdx];
  if (!source || !groupKey) return;
  const segment = findSegmentForIndex(source.blockIdx, sourceIdx);
  if (!segment) return;
  for (let i = segment.start; i <= segment.end; i++) {
    if (i === sourceIdx) continue;
    const letter = letters[i];
    if (!letter || letter.deleted || !letter.locked || letter.groupKey !== groupKey) continue;
    unlockLetter(i, false, { skipGroup: true });
  }
}

function checkCompletionSounds(idx) {
  const letter = letters[idx];
  if (!letter) return;
  const blockIdx = letter.blockIdx;
  const segmentIdx = findSegmentIndexForIndex(blockIdx, idx);
  const segment = segmentRanges[blockIdx]?.[segmentIdx];
  if (segment && !completedSegments[blockIdx][segmentIdx]) {
    let segmentDone = true;
    for (let i = segment.start; i <= segment.end; i++) {
      if (letters[i].locked) { segmentDone = false; break; }
    }
    if (segmentDone) {
      completedSegments[blockIdx][segmentIdx] = true;
      runTriggers('peelPointComplete', blockIdx, { idx, segmentIdx, anchor: getLetterCenter(idx) });
      playPeelPointCompleteSound();
      // Dynamic reflowAnchors (!allWords): start anchor reflow now that this strip is fully gone
      if (textBlocks[blockIdx]?.peel?.reflowAnchors && !textBlocks[blockIdx]?.peel?.allWords) {
        if (!reflowStarted.has(blockIdx)) reflowStarted.add(blockIdx);
        if (!startedPeelSegments.has(blockIdx)) startedPeelSegments.set(blockIdx, new Set());
        const segsStarted = startedPeelSegments.get(blockIdx);
        if (!segsStarted.has(segmentIdx)) {
          segsStarted.add(segmentIdx);
          updatePartialReflowForBlock(blockIdx);
        }
      }
    }
  }
  if (!completedBlocks[blockIdx] && isBlockComplete(blockIdx)) {
    beginAttachmentExit(blockIdx);
    completedBlocks[blockIdx] = true;
    completedBlockTimes[blockIdx] = performance.now();
    runTriggers('blockComplete', blockIdx, { idx, anchor: getLetterCenter(idx) });
    playParagraphCompleteSound();
  }
}

function isElementVisibleOnScreen(el) {
  if (!el || el.classList.contains('deleted')) return false;
  if (Number(el.style.opacity || 1) <= 0.01) return false;
  const rect = el.getBoundingClientRect();
  return rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
}

function isLooseLetterForLimit(idx, visibleOnly = false) {
  const letter = letters[idx];
  if (!letter || letter.deleted || letter.locked) return false;
  if (letter.starterIdle || isDragged(idx)) return false;
  if (isSegmentStarterIndex(letter.blockIdx, idx)) return false;
  if (segmentHasLockedLetters(findSegmentForIndex(letter.blockIdx, idx))) return false;
  return !visibleOnly || isLetterInViewport(idx);
}

function countLooseLetters(visibleOnly = false) {
  let count = 0;
  for (let i = 0; i < letters.length; i++) {
    if (isLooseLetterForLimit(i, visibleOnly)) count++;
  }
  return count;
}

function deleteLetter(idx) {
  const letter = letters[idx];
  if (!letter || letter.deleted) return;
  letter.deleted = true;
  letter.locked = false;
  letter.x = -9999;
  letter.y = -9999;
  els[idx].classList.remove('draggable', 'dragging', 'selected-block');
  els[idx].classList.add('deleted');
  for (const [pointerId, drag] of drags) {
    if (drag.idx === idx) {
      drags.delete(pointerId);
      markDragStateDirty();
    }
  }
}

function pruneMobileInactiveBlocks() {
  const keepStart = cachedVisibleBlockWindow.start;
  for (let blockIdx = mobilePrunedBlockCursor; blockIdx < keepStart; blockIdx++) {
    const range = blockRanges[blockIdx];
    if (!range) continue;
    let keptLiveLetters = false;
    for (let i = range.start; i <= range.end; i++) {
      if (isDragged(i)) continue;
      if (letters[i] && !letters[i].deleted && !letters[i].locked) {
        keptLiveLetters = true;
        continue;
      }
      deleteLetter(i);
      if (els[i]?.parentNode) els[i].parentNode.removeChild(els[i]);
    }
    if (!keptLiveLetters) blockInDom.delete(blockIdx);
  }
  mobilePrunedBlockCursor = Math.max(mobilePrunedBlockCursor, keepStart);
}

function deleteDynamicOverflow() {
  const loose = [];
  const scanStart = mobileRuntime ? Math.max(0, frameLetterRange.start) : 0;
  const scanEnd = mobileRuntime ? Math.min(letters.length - 1, frameLetterRange.end) : letters.length - 1;
  for (let idx = scanStart; idx <= scanEnd; idx++) {
    const letter = letters[idx];
    if (!isLooseLetterForLimit(idx, true)) continue;
    if (!textBlocks[letter.blockIdx]?.eraseCompleted) continue;
    loose.push({ letter, idx });
  }

  if (loose.length <= dynamicLetterLimit) return;
  const overflow = loose.length - dynamicLetterLimit;
  const toDeleteCount = Math.min(10, Math.ceil(overflow / 5));

  loose
    .sort((a, b) => (a.letter.unlockedAt ?? 0) - (b.letter.unlockedAt ?? 0))
    .slice(0, toDeleteCount)
    .forEach(({ idx }) => { stampLetterToPile(idx); deleteLetter(idx); });
	    }

function updateDebugStats(now, frameMs, cpuMs, renderMs, steps) {
  if (mobileRuntime) {
    if (now - mobileFpsLastUpdate > 500) {
      mobileFpsLastUpdate = now;
      const fps = frameMs > 0 ? 1000 / frameMs : 0;
      mobileFps.textContent = `${fps.toFixed(0)} fps`;
    }
    return;
  }
  debugStats.frameMs = frameMs;
  debugStats.fps = frameMs > 0 ? 1000 / frameMs : 0;
  debugStats.cpuMs = cpuMs;
  debugStats.renderMs = renderMs;
  debugStats.steps = steps;
  if (now - debugStats.lastUpdate < 250) return;
  debugStats.lastUpdate = now;

  let deleted = 0;
  let locked = 0;
  let domAlive = 0;
  for (const letter of letters) {
    if (letter.deleted) deleted++;
    else domAlive++;
    if (letter.locked) locked++;
  }
  debugStats.looseVisible = countLooseLetters(true);
  debugStats.looseTotal = countLooseLetters(false);
  debugStats.domLetters = domAlive;
  debugStats.deletedLetters = deleted;
  debugStats.lockedLetters = locked;
  debugStats.frameLetters = Math.max(0, frameLetterRange.end - frameLetterRange.start + 1);
  debugStats.particleCount = particles.length;
  debugStats.emitters = particleEmitters.length;
  debugStats.props = physicsProps.length;
  debugStats.memoryMb = performance.memory
    ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
    : null;

  const rows = [
    ['fps', debugStats.fps.toFixed(0)],
    ['cpu frame', `${debugStats.frameMs.toFixed(1)}ms`],
    ['sim', `${debugStats.cpuMs.toFixed(1)}ms / ${debugStats.steps}`],
    ['render', `${debugStats.renderMs.toFixed(1)}ms`],
    ['loose visible', `${debugStats.looseVisible} / ${dynamicLetterLimit}`],
    ['loose total', String(debugStats.looseTotal)],
    ['letters dom', `${debugStats.domLetters} alive, ${debugStats.deletedLetters} del`],
    ['letters locked', String(debugStats.lockedLetters)],
    ['active range', String(debugStats.frameLetters)],
    ['particles', `${debugStats.particleCount} + ${debugStats.emitters} emit`],
    ['props', String(debugStats.props)],
    ['gpu canvas', `${effectsCanvas.width}x${effectsCanvas.height} @${effectsDpr.toFixed(1)}x`],
    ['heap', debugStats.memoryMb === null ? 'n/a' : `${debugStats.memoryMb}mb`]
  ];
  debugBody.innerHTML = rows
    .map(([label, value]) => `<span>${label}</span><span>${value}</span>`)
    .join('');
  const usedPct = dynamicLetterLimit > 0
    ? Math.round(debugStats.looseVisible / dynamicLetterLimit * 100)
    : 0;
  const heapStr = debugStats.memoryMb !== null ? ` · ${debugStats.memoryMb}mb` : '';
  debugHeaderStats.textContent = ` ${debugStats.fps.toFixed(0)}fps · ${usedPct}%${heapStr}`;
}

const blockGizmos = [];
const blockOverlay = document.createElement('div');
blockOverlay.className = 'editor-overlay';
const moveHandle = document.createElement('button');
moveHandle.className = 'transform-handle move';
moveHandle.type = 'button';
moveHandle.textContent = 'M';
moveHandle.title = 'Move paragraph';
const scaleHandle = document.createElement('button');
scaleHandle.className = 'transform-handle scale';
scaleHandle.type = 'button';
scaleHandle.textContent = 'S';
scaleHandle.title = 'Scale letters';
const resizeHandle = document.createElement('button');
resizeHandle.className = 'transform-handle resize';
resizeHandle.type = 'button';
resizeHandle.textContent = 'W';
resizeHandle.title = 'Resize paragraph width';
const overflowGizmo = document.createElement('button');
overflowGizmo.className = 'overflow-gizmo';
overflowGizmo.type = 'button';
overflowGizmo.textContent = '+';
overflowGizmo.title = 'Text overflows paragraph area';
const addParagraphGizmo = document.createElement('button');
addParagraphGizmo.className = 'add-paragraph-gizmo';
addParagraphGizmo.type = 'button';
addParagraphGizmo.textContent = '+';
addParagraphGizmo.title = 'Add paragraph below';
const groupHandlesEl = document.createElement('div');
groupHandlesEl.className = 'group-handles';
container.append(blockOverlay, moveHandle, scaleHandle, resizeHandle, overflowGizmo, addParagraphGizmo, groupHandlesEl);
state.groupHandlesEl = groupHandlesEl;
const groupModes = new Map(); // anchorIdx → 'all' | 'preview'
state.groupModes = groupModes;
let groupModesRevision = 0;
state.groupModesRevision = 0;
let lastGroupHandleKey = null;

// Returns { anchorIdx, indices } for the group containing blockIdx, or null.
function getBlockGroupInfo(blockIdx) {
  // Check if blockIdx itself starts a group
  if (textBlocks[blockIdx]?.groupNext > 0) {
    const n = textBlocks[blockIdx].groupNext;
    return { anchorIdx: blockIdx, indices: Array.from({ length: n + 1 }, (_, k) => blockIdx + k) };
  }
  // Scan backward to find an anchor block whose groupNext covers blockIdx
  for (let i = Math.max(0, blockIdx - 20); i < blockIdx; i++) {
    const n = textBlocks[i]?.groupNext;
    if (n > 0 && i + n >= blockIdx) {
      return { anchorIdx: i, indices: Array.from({ length: n + 1 }, (_, k) => i + k) };
    }
  }
  return null;
}
state.getBlockGroupInfo = getBlockGroupInfo;

function isGroupActiveBlock(blockIdx) {
  const gi = getBlockGroupInfo(blockIdx);
  if (!gi) return true;
  // groupParallel: side-by-side columns — every member peels simultaneously
  // (vs. the default matrioska behavior of one layer at a time).
  if (textBlocks[gi.anchorIdx]?.groupParallel) return true;
  for (const idx of gi.indices) {
    if (!completedBlocks[idx]) return idx === blockIdx;
  }
  return gi.indices[gi.indices.length - 1] === blockIdx;
}
state.isGroupActiveBlock = isGroupActiveBlock;

function getBlockVisibleCenter(blockIdx) {
  const range = blockRanges[blockIdx];
  if (!range) return { x: 0, y: 0 };
  const offsetY = getBlockRenderOffsetY(blockIdx);
  const blockLetters = letters
    .slice(range.start, range.end + 1)
    .filter(letter => !letter.deleted);
  if (!blockLetters.length) return { x: 0, y: 0 };
  const sum = blockLetters.reduce((acc, letter) => {
    acc.x += letter.ox + letter.w / 2;
    acc.y += letter.oy + offsetY + LINE_HEIGHT / 2;
    return acc;
  }, { x: 0, y: 0 });
  return {
    x: sum.x / blockLetters.length,
    y: sum.y / blockLetters.length
  };
}

function getBlockBounds(blockIdx) {
  const range = blockRanges[blockIdx];
  if (!range) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const blockLetters = letters
    .slice(range.start, range.end + 1)
    .filter(letter => !letter.deleted);
  if (!blockLetters.length) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const attachmentLayout = positions[blockIdx]?.attachment || null;
  const left = Math.min(...blockLetters.map(letter => letter.ox), attachmentLayout?.x ?? Infinity);
  const top = Math.min(...blockLetters.map(letter => letter.oy), attachmentLayout?.y ?? Infinity);
  const right = Math.max(...blockLetters.map(letter => letter.ox + letter.w), attachmentLayout ? attachmentLayout.x + attachmentLayout.width : -Infinity);
  const bottom = Math.max(...blockLetters.map(letter => letter.oy + LINE_HEIGHT * letter.scale), attachmentLayout ? attachmentLayout.y + attachmentLayout.height : -Infinity);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function getRenderedBlockBounds(blockIdx) {
  const bounds = getBlockBounds(blockIdx);
  const offsetY = getBlockRenderOffsetY(blockIdx);
  return {
    ...bounds,
    top: bounds.top + offsetY,
    bottom: bounds.bottom + offsetY
  };
}

function getBlockConfiguredArea(blockIdx) {
  const bounds = getBlockBounds(blockIdx);
  const block = textBlocks[blockIdx];
  const areaWidth = Number(block?.transform?.width || bounds.width);
  const areaHeight = Number(block?.transform?.height || bounds.height);
  const offsetY = getBlockRenderOffsetY(blockIdx);
  return {
    left: bounds.left,
    top: bounds.top + offsetY,
    right: bounds.left + areaWidth * Number(block?.transform?.scale || 1),
    bottom: bounds.top + offsetY + areaHeight,
    width: areaWidth * Number(block?.transform?.scale || 1),
    height: areaHeight
  };
}

function updateSelectedBlockVisuals(config = pieceConfig) {
  for (let i = 0; i < els.length; i++) {
    els[i].classList.toggle('selected-block', letters[i].blockIdx === selectedBlockIdx && !letters[i].deleted);
  }
  for (let i = 0; i < blockGizmos.length; i++) {
    const peelFromStart = getBlockPeelFromConfig(config, i);
    blockGizmos[i].classList.toggle('active', i === selectedBlockIdx);
    blockGizmos[i].classList.toggle('peel-start', peelFromStart);
    blockGizmos[i].classList.toggle('peel-end', !peelFromStart);
    blockGizmos[i].textContent = peelFromStart ? 'S' : 'E';
    blockGizmos[i].title = `Block ${i + 1}: peel ${peelFromStart ? 'start' : 'end'}`;
  }
  blockOverlay.classList.toggle('active', selectedBlockIdx >= 0);
}

function positionBlockGizmos() {
  if (!document.body.classList.contains('editor-open')) {
    groupHandlesEl.style.display = '';
    return;
  }
  for (let i = 0; i < blockGizmos.length; i++) {
    const center = getBlockVisibleCenter(i);
    blockGizmos[i].style.left = `${center.x}px`;
    blockGizmos[i].style.top = `${center.y}px`;
    // For groups: only show the anchor gizmo (to select the group), or the selected block's gizmo
    const memberGroup = getBlockGroupInfo(i);
    if (memberGroup) {
      const selectedGroup = getBlockGroupInfo(selectedBlockIdx);
      const inSelectedGroup = selectedGroup && memberGroup.anchorIdx === selectedGroup.anchorIdx;
      // In the selected group: show only selected block's gizmo (number handles replace the rest)
      // In other groups: show only the anchor so the group can be clicked to select
      const showGizmo = inSelectedGroup ? i === selectedBlockIdx : i === memberGroup.anchorIdx;
      blockGizmos[i].style.display = showGizmo ? '' : 'none';
    } else {
      blockGizmos[i].style.display = '';
    }
  }
  if (!blockRanges[selectedBlockIdx]) return;
  const bounds = getRenderedBlockBounds(selectedBlockIdx);
  blockOverlay.style.left = `${bounds.left - 6}px`;
  blockOverlay.style.top = `${bounds.top - 6}px`;
  blockOverlay.style.width = `${bounds.width + 12}px`;
  blockOverlay.style.height = `${bounds.height + 12}px`;
  moveHandle.style.left = `${bounds.left - 18}px`;
  moveHandle.style.top = `${bounds.top - 18}px`;
  scaleHandle.style.left = `${bounds.right + 6}px`;
  scaleHandle.style.top = `${bounds.top - 18}px`;
  resizeHandle.style.left = `${bounds.right + 6}px`;
  resizeHandle.style.top = `${bounds.bottom + 6}px`;
  const area = getBlockConfiguredArea(selectedBlockIdx);
  const overflowing = bounds.right > area.right + 4 || bounds.bottom > area.bottom + 4;
  overflowGizmo.classList.toggle('active', overflowing);
  overflowGizmo.style.left = `${area.right + 34}px`;
  overflowGizmo.style.top = `${area.bottom + 6}px`;
  const lastVisibleIdx = Math.max(0, cachedVisibleBlockWindow.end - 1);
  const lastBounds = getRenderedBlockBounds(lastVisibleIdx);
  addParagraphGizmo.style.left = `${lastBounds.left + lastBounds.width / 2 - 12}px`;
  addParagraphGizmo.style.top = `${lastBounds.bottom + 18}px`;
  // Group next handles — rebuild only when selection or group structure/mode changes
  const gi = getBlockGroupInfo(selectedBlockIdx);
  const anchorIdx = gi?.anchorIdx;
  const currentMode = gi ? (groupModes.get(anchorIdx) ?? 'normal') : 'normal';
  const handleKey = gi && gi.indices.length > 1
    ? `${anchorIdx}:${gi.indices.join(',')}:${selectedBlockIdx}:${currentMode}`
    : 'none';
  if (handleKey !== lastGroupHandleKey) {
    lastGroupHandleKey = handleKey;
    groupHandlesEl.innerHTML = '';
    if (gi && gi.indices.length > 1) {
      gi.indices.forEach((idx, k) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'group-handle' + (idx === selectedBlockIdx && currentMode === 'normal' ? ' active' : '');
        btn.textContent = String(k + 1);
        btn.title = `Block ${k + 1} of group`;
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          groupModes.delete(anchorIdx); groupModesRevision++; state.groupModesRevision = groupModesRevision;
          selectedBlockIdx = idx; state.selectedBlockIdx = idx;
          refreshVisualEditor?.(undefined, { allowNonAnchor: true });
        });
        groupHandlesEl.appendChild(btn);
      });
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'group-handle group-handle-all' + (currentMode === 'all' ? ' active' : '');
      allBtn.textContent = 'all';
      allBtn.title = 'Show all group blocks at full opacity';
      allBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
      allBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentMode === 'all') groupModes.delete(anchorIdx); else groupModes.set(anchorIdx, 'all');
        groupModesRevision++; state.groupModesRevision = groupModesRevision;
        lastGroupHandleKey = null; positionBlockGizmos();
      });
      groupHandlesEl.appendChild(allBtn);
      const previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.className = 'group-handle group-handle-preview' + (currentMode === 'preview' ? ' active' : '');
      previewBtn.textContent = 'preview';
      previewBtn.title = 'Preview play-mode visibility';
      previewBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentMode === 'preview') groupModes.delete(anchorIdx); else groupModes.set(anchorIdx, 'preview');
        groupModesRevision++; state.groupModesRevision = groupModesRevision;
        lastGroupHandleKey = null; positionBlockGizmos();
      });
      groupHandlesEl.appendChild(previewBtn);
      groupHandlesEl.style.display = 'flex';
    } else {
      groupHandlesEl.style.display = 'none';
    }
  }
  // Always update position (centered above block, not overlapping the Move handle)
  if (gi && gi.indices.length > 1) {
    groupHandlesEl.style.left = `${bounds.left + bounds.width / 2}px`;
    groupHandlesEl.style.top = `${bounds.top - 42}px`;
    groupHandlesEl.style.transform = 'translateX(-50%)';
  }
}

function createBlockGizmos() {
  blockGizmos.forEach(gizmo => gizmo.remove());
  blockGizmos.length = 0;
  selectedBlockIdx = Math.min(selectedBlockIdx, Math.max(0, blockRanges.length - 1)); state.selectedBlockIdx = selectedBlockIdx;
  for (let i = 0; i < blockRanges.length; i++) {
    const gizmo = document.createElement('button');
    gizmo.className = 'block-gizmo';
    gizmo.type = 'button';
    gizmo.title = `Select block ${i + 1}`;
    gizmo.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    gizmo.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedBlockIdx = i; state.selectedBlockIdx = selectedBlockIdx;
      if (!editorPanel.classList.contains('open')) toggleEditor(true);
      refreshVisualEditor();
    });
    gizmo.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedBlockIdx = i; state.selectedBlockIdx = selectedBlockIdx;
      if (!editorPanel.classList.contains('open')) toggleEditor(true);
      const nextConfig = getMutableConfigFromEditor();
      const blocks = getEditableBlocks(nextConfig);
      blocks[i] ||= { id: `block-${i + 1}`, text: '' };
      blocks[i].peel ||= {};
      const current = blocks[i].peel.fromBeginning ?? nextConfig.peel?.fromBeginning ?? true;
      blocks[i].peel.fromBeginning = !current;
      setEditorConfig(nextConfig);
    });
    container.appendChild(gizmo);
    blockGizmos.push(gizmo);
  }
  updateSelectedBlockVisuals();
  positionBlockGizmos();
}

if (!mobileRuntime) createBlockGizmos();

// Drag state — multitouch: map pointerId -> { idx, offsetX, offsetY }
const drags = new Map();
const draggedIndices = new Set();
const draggedSegmentKeys = new Set();
const cursorForcePointers = new Map();
let dragStateDirty = true;
let currentForceFields = [];

// Wire state.js to live variables — maintained in sync with every reassignment below.
// Const arrays/maps are live by reference; scalars need explicit sync on each reassignment.
state.letters = letters;
state.blockRanges = blockRanges;
state.segmentRanges = segmentRanges;
state.textBlocks = textBlocks;
state.blockInDom = blockInDom;
state.looseParts = looseParts;
state.peelStrokes = peelStrokes;
state.particles = particles;
state.physicsProps = physicsProps;
state.firedTriggerKeys = firedTriggerKeys;
state.shapeOrigins = shapeOrigins;
state.drags = drags;
state.cursorForcePointers = cursorForcePointers;
state.pieceConfig = pieceConfig;
state.activeBlocks = activeBlocks;
state.selectedBlockIdx = selectedBlockIdx;
state.gravityOn = gravityOn;
state.simulationPaused = simulationPaused;
state.unraveling = unraveling;
state.activeBehaviors = activeBehaviors;
state.BLOCK_GAP = BLOCK_GAP;
state.FORCE_FIELDS = FORCE_FIELDS;
state.frameViewport = frameViewport;
state.currentPalette = currentPalette;
state.currentGradientPresets = currentGradientPresets;
state.currentGradientStops = currentGradientStops;
// Runtime visibility/frame helpers used by the engine and editor.
function isBlockComplete(blockIdx) {
  const range = blockRanges[blockIdx];
  if (!range) return true;
  const hasSelectivePeel = textBlocks[blockIdx]?.inlineStyles?.some(s => s?.explicitPeel);
  for (let i = range.start; i <= range.end; i++) {
    const l = letters[i];
    if (!l.locked || l.inlineStyle?.noPeel) continue;
    if (hasSelectivePeel && !l.inlineStyle?.explicitPeel) continue; // anchor in [peel] block — never peels
    return false;
  }
  return true;
}

function forceCompleteCurrentBlock() {
  const blockIdx = getFirstIncompleteBlock();
  const range = blockRanges[blockIdx];
  if (!range) return;
  const hasSelectivePeel = textBlocks[blockIdx]?.inlineStyles?.some(s => s?.explicitPeel);
  for (let i = range.start; i <= range.end; i++) {
    if (!letters[i].deleted) bakeLetterRenderY(i);
    prepareForceCompletedLetter(i);
    if (letters[i].locked && (!hasSelectivePeel || letters[i].inlineStyle?.explicitPeel)) unlockLetter(i, true);
  }
  if (hasSelectivePeel) {
    for (let i = range.start; i <= range.end; i++) {
      const al = letters[i];
      if (al && al.locked && !al.inlineStyle?.explicitPeel && !al.inlineStyle?.noPeel) {
        al.deleted = true;
        if (els[i]) els[i].style.display = 'none';
      }
    }
  }
  if (!completedBlocks[blockIdx]) {
    beginAttachmentExit(blockIdx);
    completedBlocks[blockIdx] = true;
    completedBlockTimes[blockIdx] = performance.now();
    for (let si = 0; si < (segmentRanges[blockIdx]?.length || 0); si++) {
      completedSegments[blockIdx][si] = true;
    }
    runTriggers('blockComplete', blockIdx, { idx: range.end, anchor: getLetterCenter(range.end) });
    playParagraphCompleteSound();
  }
}

function relayoutLockedLetters() {
  positions = layoutPositions(getMaxWidth()); state.positions = positions;
  for (let i = 0; i < letters.length; i++) {
    const np = positions[letters[i].blockIdx].positions[letters[i].readingIdx];
    if (!np) continue;
    letters[i].w = np.w;
    letters[i].ox = np.x;
    letters[i].oy = np.y;
    letters[i].angle = np.angle || 0;
    if (letters[i].locked) {
      letters[i].x = np.x;
      letters[i].y = np.y;
      letters[i].px = np.x;
      letters[i].py = np.y;
    }
  }
  applyDrainCollapse();
  restLengths = computeRestLengths(); state.restLengths = restLengths; gapLinkDecayTargets = computeGapLinkDecayTargets(); state.gapLinkDecayTargets = gapLinkDecayTargets;
  crossBlockConstraints = computeCrossBlockConstraints(); state.crossBlockConstraints = crossBlockConstraints;
  ties = computeTies(); state.ties = ties;
  tangledLines = computeTangledLines(); state.tangledLines = tangledLines;
  reflowStarted.clear(); startedPeelSegments.clear(); computeAllReflowPositions(); computeAnchorPeelNeighbors();
  for (const l of letters) delete l._peelTargetY;
  positionHint();
  positionAttachments();
  positionClipShapeFrames();
  positionBlockGizmos();
}

function getFirstIncompleteBlock() {
  for (let i = 0; i < blockRanges.length; i++) {
    if (!completedBlocks[i]) return i;
  }
  return Math.max(0, blockRanges.length - 1);
}

function getVisibleBlockWindow() {
  if (mobileRuntime && !activeBehaviors?.stepParagraphs?.enabled) {
    const vTop = -frameViewport.containerTop;
    const vBottom = vTop + frameViewport.height;
    let start = 0;
    let end = blockRanges.length;
    for (let i = 0; i < blockRanges.length; i++) {
      const range = blockRanges[i];
      if (!range) continue;
      const lastLetter = letters[range.end];
      if ((lastLetter?.oy ?? 0) + LINE_HEIGHT < vTop) start = i + 1;
      else break;
    }
    for (let i = blockRanges.length - 1; i >= start; i--) {
      const range = blockRanges[i];
      if (!range) continue;
      const firstLetter = letters[range.start];
      if ((firstLetter?.oy ?? 0) > vBottom) end = i;
      else break;
    }
    return { start, end };
  }
  if (!activeBehaviors?.stepParagraphs?.enabled) return { start: 0, end: blockRanges.length };
  const firstIncomplete = getFirstIncompleteBlock();
  const anchorBlock = getStepWindowAnchorBlock(firstIncomplete);
  const visibleCount = getStepVisibleCountForBlock(anchorBlock);
  if (activeBehaviors.stepParagraphs.compactFlow) {
    const start = anchorBlock;
    return { start, end: Math.min(blockRanges.length, start + visibleCount) };
  }
  let cutoff = Math.min(blockRanges.length, visibleCount);
  const delayedPrevious = anchorBlock < firstIncomplete ? anchorBlock : -1;
  for (let i = 0; i < blockRanges.length; i++) {
    if (i === delayedPrevious) break;
    if (completedBlocks[i]) cutoff = Math.min(blockRanges.length, Math.max(cutoff, i + 1 + visibleCount));
    else break;
  }
  return { start: 0, end: cutoff };
}

function getStepAdvanceDelayMs(blockIdx = -1) {
  const blockId = blockIdx >= 0 ? (textBlocks[blockIdx]?.id || String(blockIdx)) : '';
  const override = blockId ? activeBehaviors?.stepParagraphs?.perBlockAdvanceDelayMs?.[blockId] : undefined;
  return Math.max(0, Number(override ?? activeBehaviors?.stepParagraphs?.advanceDelayMs) || 0);
}

function getStepWindowAnchorBlock(firstIncomplete = getFirstIncompleteBlock()) {
  if (firstIncomplete <= 0) return firstIncomplete;
  const previous = firstIncomplete - 1;
  const delayMs = getStepAdvanceDelayMs(previous);
  if (!delayMs) return firstIncomplete;
  const completedAt = completedBlockTimes[previous] || 0;
  if (!completedAt) return firstIncomplete;
  return performance.now() - completedAt < delayMs ? previous : firstIncomplete;
}

function getStepVisibleCountForBlock(blockIdx) {
  const blockId = textBlocks[blockIdx]?.id || String(blockIdx);
  const override = activeBehaviors?.stepParagraphs?.perBlockVisibleCount?.[blockId];
  return Math.max(1, Number(override ?? activeBehaviors?.stepParagraphs?.visibleCount) || 2);
}

function blockIntersectsViewport(blockIdx) {
  const viewportTop = -frameViewport.containerTop;
  const viewportBottom = viewportTop + frameViewport.height;
  if (mobileRuntime) {
    const range = blockRanges[blockIdx];
    if (!range) return false;
    const offsetY = getBlockRenderOffsetY(blockIdx);
    const top = (letters[range.start]?.oy ?? Infinity) + offsetY;
    const bottom = (letters[range.end]?.oy ?? -Infinity) + LINE_HEIGHT + offsetY;
    return bottom >= viewportTop && top <= viewportBottom;
  }
  const bounds = getRenderedBlockBounds(blockIdx);
  return bounds.bottom >= viewportTop && bounds.top <= viewportBottom;
}

function refreshFrameViewport() {
  const visualViewport = window.visualViewport;
  const viewportWidth = visualViewport?.width || window.innerWidth;
  const viewportHeight = visualViewport?.height || window.innerHeight;
  const containerRect = container.getBoundingClientRect();
  const effectsRect = effectsCanvas.getBoundingClientRect();
  frameViewport = {
    containerLeft: containerRect.left,
    containerTop: containerRect.top,
    containerWidth: containerRect.width,
    effectsLeft: effectsRect.left,
    effectsTop: effectsRect.top,
    width: viewportWidth,
    height: viewportHeight
  };
  state.frameViewport = frameViewport;
  resizeEffectsCanvas();
  resizePileCanvas();
}

function resizePileCanvas() {
  const nextDpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = `${frameViewport.width}px`;
  const cssH = `${frameViewport.height}px`;
  if (pileCanvas.style.width !== cssW) pileCanvas.style.width = cssW;
  if (pileCanvas.style.height !== cssH) pileCanvas.style.height = cssH;
  const width = Math.max(1, Math.ceil(frameViewport.width * nextDpr));
  const height = Math.max(1, Math.ceil(frameViewport.height * nextDpr));
  if (pileCanvas.width === width && pileCanvas.height === height && pileDpr === nextDpr) return;
  // Preserve existing pile drawing across the resize
  const tmp = document.createElement('canvas');
  tmp.width = pileCanvas.width; tmp.height = pileCanvas.height;
  tmp.getContext('2d').drawImage(pileCanvas, 0, 0);
  pileDpr = nextDpr;
  pileCanvas.width = width;
  pileCanvas.height = height;
  pileCtx.setTransform(pileDpr, 0, 0, pileDpr, 0, 0);
  pileCtx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, width / pileDpr, height / pileDpr);
  pileHeights = new Float32Array(Math.max(1, Math.ceil(frameViewport.width / PILE_SEG_W))); state.pileHeights = pileHeights;
}

function getPileFloor(vx, vw) {
  const n = pileHeights.length;
  const s0 = Math.max(0, Math.min(n - 1, Math.floor(vx / PILE_SEG_W)));
  const s1 = Math.max(0, Math.min(n - 1, Math.floor((vx + vw) / PILE_SEG_W)));
  let h = 0;
  for (let s = s0; s <= s1; s++) if (pileHeights[s] > h) h = pileHeights[s];
  return h;
}

function getLetterCanvasColor(idx) {
  const l = letters[idx];
  if (!l) return '#4a4a4a';
  if (l.style?.colorMode === 'sequential') return sampleGradientColor(l.style, l.sequenceRatio ?? 0);
  return l.inlineStyle?.color || l.style?.color || pieceConfig.style.color || '#4a4a4a';
}

function stampLetterToPile(idx) {
  const l = letters[idx];
  if (!l || !l.ch || !/\S/.test(l.ch)) return;
  const offsetY = getLetterRenderOffsetY(idx);
  const vx = l.x + frameViewport.containerLeft;
  const vy = l.y + offsetY + frameViewport.containerTop;
  const fontSize = Number.parseFloat(baseFontSize) * (l.scale || 1);
  const fontFamily = quoteFontFamily(l.style?.fontFamily || 'EB Garamond');
  const weight = l.inlineStyle?.bold ? '700' : '400';
  const fontStyle = l.inlineStyle?.italic ? 'italic' : 'normal';
  pileCtx.save();
  pileCtx.font = `${fontStyle} ${weight} ${fontSize}px ${fontFamily}`;
  pileCtx.textBaseline = 'top';
  pileCtx.globalAlpha = 0.82;
  pileCtx.fillStyle = getLetterCanvasColor(idx);
  pileCtx.fillText(l.ch, vx, vy);
  pileCtx.restore();
  const n = pileHeights.length;
  const s0 = Math.max(0, Math.min(n - 1, Math.floor(vx / PILE_SEG_W)));
  const s1 = Math.max(0, Math.min(n - 1, Math.floor((vx + l.w) / PILE_SEG_W)));
  for (let s = s0; s <= s1; s++) pileStampedSegs.add(s);
}

function resizeEffectsCanvas() {
  const nextDpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = `${frameViewport.width}px`;
  const cssH = `${frameViewport.height}px`;
  if (effectsCanvas.style.width !== cssW) effectsCanvas.style.width = cssW;
  if (effectsCanvas.style.height !== cssH) effectsCanvas.style.height = cssH;
  const width = Math.max(1, Math.ceil(frameViewport.width * nextDpr));
  const height = Math.max(1, Math.ceil(frameViewport.height * nextDpr));
  if (effectsCanvas.width === width && effectsCanvas.height === height && effectsDpr === nextDpr) return;
  effectsDpr = nextDpr;
  effectsCanvas.width = width;
  effectsCanvas.height = height;
  effectsCtx.setTransform(effectsDpr, 0, 0, effectsDpr, 0, 0);
}

function getRawVisibleWindowBounds(windowRange) {
  let top = Infinity;
  let bottom = -Infinity;
  for (let blockIdx = windowRange.start; blockIdx < windowRange.end; blockIdx++) {
    const bounds = getBlockBounds(blockIdx);
    top = Math.min(top, bounds.top);
    bottom = Math.max(bottom, bounds.bottom);
  }
  if (!Number.isFinite(top)) return { top: TOP_MARGIN, bottom: TOP_MARGIN, height: 0 };
  return { top, bottom, height: bottom - top };
}

function mountVisibleBlocks() {
  const viewportTop = -frameViewport.containerTop - LINE_HEIGHT;
  const viewportBottom = -frameViewport.containerTop + frameViewport.height * 2;
  for (let blockIdx = 0; blockIdx < blockRanges.length; blockIdx++) {
    if (blockInDom.has(blockIdx)) continue;
    const range = blockRanges[blockIdx];
    if (!range) continue;
    const firstLetter = letters[range.start];
    if (!firstLetter) continue;
    if (firstLetter.oy > viewportBottom) break;
    const lastLetter = letters[range.end];
    if ((lastLetter?.oy ?? firstLetter.oy) + LINE_HEIGHT < viewportTop) continue;
    mountBlock(blockIdx);
  }
}

function updateFrameState() {
  refreshFrameViewport();
  lineartOriginSyncToken++;
  const isEditor = document.body.classList.contains('editor-open');
  mountVisibleBlocks();
  cachedVisibleBlockWindow = getVisibleBlockWindow();
  ensureVisiblePeelStrokes();
  if (mobileRuntime) pruneMobileInactiveBlocks();

  // Toggle scrollbar based on compact mode, cable-camera lock and editor state
  const isCompact = activeBehaviors?.stepParagraphs?.enabled && activeBehaviors.stepParagraphs.compactFlow;
  const cameraLockY = Boolean(activeBehaviors?.cablePull?.enabled) && activeBehaviors.cablePull.lockVerticalScroll !== false;
  const nextOverflowY = ((isCompact || cameraLockY) && !isEditor) ? 'hidden' : 'auto';
  if (nextOverflowY !== lastOverflowY) {
    lastOverflowY = nextOverflowY;
    document.body.style.overflowY = nextOverflowY;
    document.documentElement.style.overflowY = nextOverflowY;
  }

  if (activeBehaviors?.stepParagraphs?.enabled && activeBehaviors.stepParagraphs.compactFlow) {
    const rawBounds = getRawVisibleWindowBounds(cachedVisibleBlockWindow);
    const viewportTopInContainer = -frameViewport.containerTop;
    const contentH = rawBounds.height || 0;
    const centeredTop = viewportTopInContainer + Math.max(TOP_MARGIN, (frameViewport.height - contentH) / 2);
    compactFlowTargetOffset = centeredTop - rawBounds.top;
    compactFlowCurrentOffset += (compactFlowTargetOffset - compactFlowCurrentOffset) * (isEditor ? 1 : 0.12);
  } else {
    compactFlowTargetOffset = 0;
    compactFlowCurrentOffset += (0 - compactFlowCurrentOffset) * 0.18;
  }
  const fitVisibleActive = activeBehaviors?.stepParagraphs?.enabled && activeBehaviors.stepParagraphs.compactFlow;
  const now = performance.now();
  for (let blockIdx = 0; blockIdx < blockRenderOffsets.length; blockIdx++) {
    const inWindow = blockIdx >= cachedVisibleBlockWindow.start && blockIdx < cachedVisibleBlockWindow.end;
    let targetOffset = fitVisibleActive && inWindow
      ? (isEditor ? 0 : compactFlowCurrentOffset)
      : 0;
    if (fitVisibleActive && !isEditor) {
      if (inWindow && !blockWasInVisibleWindow[blockIdx]) {
        blockRenderOffsets[blockIdx] = targetOffset;
      } else if (!inWindow && blockWasInVisibleWindow[blockIdx]) {
        beginAttachmentExit(blockIdx);
      } else if (!inWindow && completedBlockTimes[blockIdx] && now - completedBlockTimes[blockIdx] < 430) {
        targetOffset = blockRenderOffsets[blockIdx];
      }
    }
    blockRenderOffsets[blockIdx] += (targetOffset - blockRenderOffsets[blockIdx]) * 0.18;
    if (Math.abs(blockRenderOffsets[blockIdx] - targetOffset) < 0.02) blockRenderOffsets[blockIdx] = targetOffset;
    blockWasInVisibleWindow[blockIdx] = inWindow;
  }
  activeBlockFlags = blockRanges.map(() => false); state.activeBlockFlags = activeBlockFlags;
  for (let blockIdx = cachedVisibleBlockWindow.start; blockIdx < cachedVisibleBlockWindow.end; blockIdx++) {
    activeBlockFlags[blockIdx] = blockIntersectsViewport(blockIdx);
  }
  updateFrameLetterRange();
  const visibleSignature = activeBlockFlags.map(flag => flag ? '1' : '0').join('');
  if (isSoundArmed() && lastVisibleBlockSignature && visibleSignature !== lastVisibleBlockSignature) playParagraphAppearSound();
  lastVisibleBlockSignature = visibleSignature;
  activeBlockFlags.forEach((isActive, blockIdx) => {
    if (isActive && !everActiveBlockFlags[blockIdx] && !hiddenBlocks.has(blockIdx)) {
      runTriggers('blockAppear', blockIdx, { anchor: getBlockVisibleCenter(blockIdx) });
    }
  });
  everActiveBlockFlags = blockRanges.map((_, blockIdx) => Boolean(everActiveBlockFlags[blockIdx] || activeBlockFlags[blockIdx]));
  unlockActivePeelStarters();
  wakeWindForceStarters({ FORCE_FIELDS, segmentRanges, activeBlockFlags, textBlocks, getSegmentStarterStart, letters, bakeLetterRenderY });
  ensureCurrentPeelStarters();
  sleepInactiveUnlockedLetters();
}

function isBlockVisible(blockIdx) {
  const windowRange = cachedVisibleBlockWindow;
  return blockIdx >= windowRange.start && blockIdx < windowRange.end;
}

function updateFrameLetterRange() {
  const isEditor = document.body.classList.contains('editor-open');
  if (mobileRuntime && !activeBehaviors?.stepParagraphs?.enabled && !isEditor) {
    const viewportTop = -frameViewport.containerTop - LINE_HEIGHT;
    const viewportBottom = -frameViewport.containerTop + frameViewport.height + LINE_HEIGHT;
    let start = letters.length;
    let end = -1;
    for (let blockIdx = mobilePrunedBlockCursor; blockIdx < blockRanges.length; blockIdx++) {
      const range = blockRanges[blockIdx];
      if (!range) continue;
      const firstLetter = letters[range.start];
      const lastLetter = letters[range.end];
      const blockTop = firstLetter?.oy ?? Infinity;
      const blockBottom = (lastLetter?.oy ?? -Infinity) + LINE_HEIGHT;
      if (blockTop > viewportBottom) break;
      if (blockBottom < viewportTop) continue;
      start = Math.min(start, range.start);
      end = Math.max(end, range.end);
    }
    if (start > end) { frameLetterRange.start = 0; frameLetterRange.end = -1; return; }
    for (const drag of drags?.values?.() || []) {
      const segment = findSegmentForIndex(letters[drag.idx]?.blockIdx, drag.idx);
      if (!segment) continue;
      start = Math.min(start, segment.start);
      end = Math.max(end, segment.end);
    }
    const currentRange = blockRanges[getFirstIncompleteBlock()];
    if (currentRange) {
      start = Math.min(start, currentRange.start);
      end = Math.max(end, currentRange.end);
    }
    frameLetterRange.start = start; frameLetterRange.end = end;
    return;
  }
  if (!activeBehaviors?.stepParagraphs?.enabled && !isEditor) {
    frameLetterRange.start = 0; frameLetterRange.end = letters.length - 1;
    return;
  }
  const firstBlock = blockRanges[cachedVisibleBlockWindow.start];
  const lastBlock = blockRanges[cachedVisibleBlockWindow.end - 1];
  let start = firstBlock?.start ?? 0;
  let end = lastBlock?.end ?? -1;
  for (const drag of drags?.values?.() || []) {
    const segment = findSegmentForIndex(letters[drag.idx]?.blockIdx, drag.idx);
    if (!segment) continue;
    start = Math.min(start, segment.start);
    end = Math.max(end, segment.end);
  }
  const currentRange = blockRanges[getFirstIncompleteBlock()];
  if (currentRange) {
    start = Math.min(start, currentRange.start);
    end = Math.max(end, currentRange.end);
  }
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    if (!letter || letter.deleted || letter.locked) continue;
    if (!isLetterInViewport(i)) continue;
    start = Math.min(start, i);
    end = Math.max(end, i);
  }
  frameLetterRange.start = start; frameLetterRange.end = end;
}

function forEachFrameLetter(callback) {
  for (let i = frameLetterRange.start; i <= frameLetterRange.end; i++) {
    if (letters[i]) callback(i, letters[i]);
  }
}

function forEachFrameConstraint(callback) {
  for (let i = frameLetterRange.start; i <= Math.min(frameLetterRange.end - 1, letters.length - 2); i++) callback(i);
}

function isLetterInViewport(idx) {
  const letter = letters[idx];
  if (!letter || letter.deleted) return false;
  const y = getRenderedY(idx) + frameViewport.containerTop;
  const x = letter.x + frameViewport.containerLeft;
  return y + getLetterLineHeight(letter) > 0 && y < frameViewport.height && x + letter.w > 0 && x < frameViewport.width;
}

function isLetterFrozen(idx) {
  const letter = letters[idx];
  if (!letter) return true;
  if (!letter.locked && isInDraggedSegment(idx)) return false;
  // starterIdle letters keep gravity so the strip droops visually as a peel hint
  if (activeBlockFlags[letter.blockIdx] && isLetterInViewport(idx)) return false;
  if (!letter.locked && everActiveBlockFlags[letter.blockIdx] && isLetterInViewport(idx)) return false;
  return true;
}

function isCollidableLetter(idx) {
  const letter = letters[idx];
  return Boolean(letter && !letter.deleted && !letter.locked && /\S/.test(letter.ch) && !isLetterFrozen(idx));
}

function getLetterCollisionRadius(idx) {
  const letter = letters[idx];
  if (!letter) return 0;
  return Math.max(2.5, Math.min(6, letter.w * 0.42, LINE_HEIGHT * 0.22));
}

function getBlockRenderOffsetY(blockIdx) {
  return blockRenderOffsets[blockIdx] || 0;
}

function getBlockTargetRenderOffsetY(blockIdx) {
  if (!activeBehaviors?.stepParagraphs?.compactFlow) return 0;
  const inWindow = blockIdx >= cachedVisibleBlockWindow.start && blockIdx < cachedVisibleBlockWindow.end;
  return inWindow ? compactFlowTargetOffset : 0;
}

function getLetterRenderOffsetY(idx) {
  const letter = letters[idx];
  if (!letter) return 0;
  return !letter.yBaked ? getBlockRenderOffsetY(letter.blockIdx) : 0;
}

function getRenderedY(idx) {
  return letters[idx].y + getLetterRenderOffsetY(idx);
}

function getLetterVisualOffset(idx, options = {}) {
  const letter = letters[idx];
  if (!letter || !letter.locked) return { x: 0, y: 0 };
  const includeInline = options.includeInline !== false;
  const motion = includeInline ? getInlineLetterMotionOffset(letter) : { x: 0, y: 0, angle: 0 };
  return {
    x: (letter.fieldOffsetX || 0) + motion.x,
    y: (letter.fieldOffsetY || 0) + motion.y,
    angle: motion.angle || 0
  };
}

function getInlineLetterMotionOffset(letter) {
  const inline = letter.inlineStyle || {};
  if (!inline.shake && !inline.float) return { x: 0, y: 0, angle: 0 };
  const t = performance.now() / 1000;
  const phase = letter.readingIdx * 0.74 + letter.blockIdx * 1.91 + (inline.float?.phase || 0);
  let x = 0;
  let y = 0;
  let angle = 0;
  if (inline.float) {
    const speed = Number(inline.float.speed || 1);
    y += Math.sin(t * 2.1 * speed + phase) * Number(inline.float.ampY || 0);
  }
  if (inline.shake) {
    const speed = Number(inline.shake.speed || 1);
    const tremor = Math.sin(t * 18.5 * speed + phase * 2.3);
    const fine = Math.sin(t * 31 * speed + phase * 1.2);
    x += (tremor * 0.7 + fine * 0.3) * Number(inline.shake.ampX || 0);
    y += Math.sin(t * 23 * speed + phase * 1.7) * Number(inline.shake.ampY || 0);
    angle += Math.sin(t * 20 * speed + phase * 1.4) * Number(inline.shake.rot || 0);
  }
  return { x, y, angle };
}

function getLetterConstraintCenter(idx) {
  const letter = letters[idx];
  if (!letter) return { x: 0, y: 0 };
  const visualOffset = getLetterVisualOffset(idx, { includeInline: false });
  return {
    x: letter.x + visualOffset.x + letter.w / 2,
    y: letter.y + getLetterRenderOffsetY(idx) + visualOffset.y + getLetterLineHeight(letter) / 2
  };
}

function updateForceFieldVisualOffsets() {
  forEachFrameLetter((idx, letter) => {
    if (!letter || letter.deleted || !letter.locked) return;
    const push = getForceFieldVisualPush(idx, letter, { FORCE_FIELDS, textBlocks, getRenderedY, LINE_HEIGHT, cursorForcePointers });
    const targetX = Math.max(-48, Math.min(48, (push?.x || 0) * 26));
    const targetY = Math.max(-36, Math.min(36, (push?.y || 0) * 26));
    letter.fieldOffsetX = (letter.fieldOffsetX || 0) + (targetX - (letter.fieldOffsetX || 0)) * 0.16;
    letter.fieldOffsetY = (letter.fieldOffsetY || 0) + (targetY - (letter.fieldOffsetY || 0)) * 0.16;
    if (Math.abs(letter.fieldOffsetX) < 0.02) letter.fieldOffsetX = 0;
    if (Math.abs(letter.fieldOffsetY) < 0.02) letter.fieldOffsetY = 0;
  });
}

function getBlockUnlockedCount(blockIdx) {
  const range = blockRanges[blockIdx];
  if (!range) return 0;
  let count = 0;
  for (let i = range.start; i <= range.end; i++) {
    if (!letters[i].locked || letters[i].deleted) count++;
  }
  return count;
}

function getSegmentUnlockedCount(segment) {
  if (!segment) return 0;
  let count = 0;
  for (let i = segment.start; i <= segment.end; i++) {
    if (!letters[i].locked || letters[i].deleted) count++;
  }
  return count;
}

function updateCamera() {
  const cfg = activeBehaviors?.cablePull;
  if (!cfg?.enabled) {
    if (cameraX !== 0 || !Number.isNaN(cameraEditorWidth)) {
      cameraX = 0;
      cameraAppliedX = NaN;
      cameraEditorWidth = NaN;
      container.style.transform = '';
      container.style.width = '';
      document.body.style.overflowX = '';
    }
    cameraScrollLocked = false;
    document.body.classList.remove('camera-pull-active');
    return;
  }

  // Expand container to full viewport width so letters beyond 760px are interactable
  document.body.classList.add('camera-pull-active');

  // Resolve which block indices are cable blocks
  let cableIndices = [];
  if (cfg.followBlockIds?.length) {
    cfg.followBlockIds.forEach(id => {
      const idx = textBlocks.findIndex(b => b.id === id);
      if (idx >= 0) cableIndices.push(idx);
    });
  }
  if (!cableIndices.length) {
    // cable: true property is on the raw block config, not on the textBlocks map
    textBlocks.forEach((b, i) => { if (getBlockConfig(i).cable) cableIndices.push(i); });
  }
  if (!cableIndices.length) {
    cableIndices = blockRanges.map((_, i) => i);
  }

  const ease = Math.min(1, Math.max(0.01, Number(cfg.ease) || 0.12));
  const leadMarginRaw = Number(cfg.leadMargin);
  const leadMargin = Number.isFinite(leadMarginRaw) ? leadMarginRaw : 380;
  const viewportW = frameViewport.width;
  // naturalContainerLeft: the container's left edge in viewport coords with no camera applied.
  // The container is centered (margin:0 auto), so this equals containerLeft + cameraX.
  // We need screen-space math so the formula works regardless of container centering.
  const naturalContainerLeft = frameViewport.containerLeft + cameraX;

  // maxPan: how far the camera can travel so the rightmost cable letter sits at
  // (viewportW - leadMargin) on screen when cameraX = maxPan.
  let maxPan = Number(cfg.maxPan) || 0;
  if (!maxPan) {
    let rightmost = 0;
    for (const blockIdx of cableIndices) {
      const range = blockRanges[blockIdx];
      if (!range) continue;
      for (let i = range.start; i <= range.end; i++) {
        const l = letters[i];
        if (l && !l.deleted) rightmost = Math.max(rightmost, l.ox + l.w);
      }
    }
    // screen pos of rightmost (no camera) = rightmost + naturalContainerLeft
    maxPan = Math.max(0, rightmost + naturalContainerLeft - (viewportW - leadMargin));
  }

  // Check if all cable letters are peeled (for lockOnComplete)
  let allCablePeeled = cfg.lockOnComplete;
  if (allCablePeeled) {
    outer: for (const blockIdx of cableIndices) {
      const range = blockRanges[blockIdx];
      if (!range) { allCablePeeled = false; break; }
      for (let i = range.start; i <= range.end; i++) {
        const l = letters[i];
        if (l && !l.deleted && l.locked) { allCablePeeled = false; break outer; }
      }
    }
  }

  if (!allCablePeeled) {
    if (cfg.mode === 'progress') {
      let total = 0, unlocked = 0;
      for (const blockIdx of cableIndices) {
        const range = blockRanges[blockIdx];
        if (!range) continue;
        for (let i = range.start; i <= range.end; i++) {
          const l = letters[i];
          if (!l || l.deleted) continue;
          total++;
          if (!l.locked) unlocked++;
        }
      }
      const progress = total > 0 ? unlocked / total : 0;
      cameraTargetX = progress * maxPan;
    } else {
      // Frontier (sequential): follow cables in followBlockIds order.
      // Track only the first cable that still has locked letters. Once that cable
      // is complete the next one becomes active. This prevents the camera from
      // jumping ahead to a later cable's position at the start.
      // Use l.ox (original layout position) not l.x (physics) so dragging loose
      // letters doesn't move the camera — only unlocking new letters does.
      let activeIdx = -1;
      for (const blockIdx of cableIndices) {
        const range = blockRanges[blockIdx];
        if (!range) continue;
        let hasLocked = false;
        for (let i = range.start; i <= range.end; i++) {
          const l = letters[i];
          if (l && !l.deleted && l.locked) { hasLocked = true; break; }
        }
        if (hasLocked) { activeIdx = blockIdx; break; }
      }
      // Track the frontier of the active cable only.
      // If the active cable has no unlocked letters yet (user hasn't started it),
      // leave cameraTargetX unchanged so the camera holds its position.
      const trackIdx = activeIdx >= 0 ? activeIdx : (cableIndices[cableIndices.length - 1] ?? -1);
      if (trackIdx >= 0) {
        const range = blockRanges[trackIdx];
        if (range) {
          let frontierX = null;
          let bestClock = -1;
          for (let i = range.start; i <= range.end; i++) {
            const l = letters[i];
            if (!l || l.deleted || l.locked) continue;
            if ((l.unlockedAt ?? 0) > bestClock) {
              bestClock = l.unlockedAt ?? 0;
              frontierX = l.ox;
            }
          }
          if (frontierX !== null) {
            cameraTargetX = Math.max(0, frontierX + naturalContainerLeft - (viewportW - leadMargin));
          }
          // else: no unlocked letters on active cable yet — camera holds position
        }
      }
    }
  }
  // if allCablePeeled && lockOnComplete: cameraTargetX stays at its last value (frozen)

  cameraTargetX = Math.max(0, Math.min(maxPan, cameraTargetX));

  const isEditorMode = document.body.classList.contains('editor-open');
  if (isEditorMode) {
    // In editor: expose full scene width via native horizontal scroll so the user
    // can pan freely to reach off-screen elements. cameraX tracks window.scrollX
    // so all letter visibility / hit-testing remains accurate.
    const sceneWidth = Math.max(maxPan + viewportW, viewportW);
    if (cameraEditorWidth !== sceneWidth) {
      cameraEditorWidth = sceneWidth;
      cameraAppliedX = NaN;
      container.style.transform = '';
      container.style.width = `${sceneWidth}px`;
      document.body.style.overflowX = 'auto';
    }
    cameraX = window.scrollX;
    cameraScrollLocked = false;
  } else {
    if (!Number.isNaN(cameraEditorWidth)) {
      cameraEditorWidth = NaN;
      cameraAppliedX = NaN;
      document.body.style.overflowX = '';
    }
    cameraX += (cameraTargetX - cameraX) * ease;
    if (Math.abs(cameraX - cameraTargetX) < 0.1) cameraX = cameraTargetX;
    if (cameraX !== cameraAppliedX || viewportW !== cameraAppliedVw) {
      cameraAppliedX = cameraX;
      cameraAppliedVw = viewportW;
      if (cameraX > 0.1) {
        container.style.transform = `translateX(${-cameraX}px)`;
        // Expand container width so its pointer-event area always covers the full viewport.
        // Without this, translateX(-cameraX) shifts the container left, creating a dead zone
        // on the right side of the screen where the container's hit area doesn't reach.
        container.style.width = `${viewportW + cameraX}px`;
      } else {
        container.style.transform = '';
        container.style.width = '';
      }
    }

    // Lock vertical scroll while the cable camera is active. updateFrameState owns
    // the overflowY style; here we only reset the scroll position once on engage.
    if (cfg.lockVerticalScroll !== false) {
      if (!cameraScrollLocked) {
        cameraScrollLocked = true;
        window.scrollTo(0, 0);
      }
    } else {
      cameraScrollLocked = false;
    }
  }
}

function updateBehaviorVisibility() {
  const isEditor = document.body.classList.contains('editor-open');
  const isCompact = activeBehaviors?.stepParagraphs?.enabled && activeBehaviors.stepParagraphs.compactFlow;
  const visibilityKey = `${isEditor ? 'editor' : 'play'}:${lastVisibleBlockSignature}:${unlockClock}:${cachedVisibleBlockWindow.start}:${cachedVisibleBlockWindow.end}`;
  if (visibilityKey === state.lastBehaviorVisibilityKey) return;
  lastBehaviorVisibilityKey = visibilityKey; state.lastBehaviorVisibilityKey = visibilityKey;
  const fadeEnabled = Boolean(activeBehaviors?.fadeReveal?.enabled);
  const visibleLetters = Math.max(1, Number(activeBehaviors?.fadeReveal?.visibleLetters) || 24);
  const fadeSteps = Math.max(0, Number(activeBehaviors?.fadeReveal?.fadeSteps) || 0);
  const blockStart = mobileRuntime ? cachedVisibleBlockWindow.start : 0;
  const blockEnd = (mobileRuntime && !isEditor) ? cachedVisibleBlockWindow.end : blockRanges.length;
  const currentBlockIdx = getFirstIncompleteBlock();
  const behaviorStart = isCompact && !isEditor
    ? Math.max(0, Math.min(blockStart, currentBlockIdx) - 1)
    : Math.min(blockStart, currentBlockIdx);
  const behaviorEnd = Math.max(blockEnd, currentBlockIdx + 1);
  for (let blockIdx = behaviorStart; blockIdx < behaviorEnd; blockIdx++) {
    const range = blockRanges[blockIdx];
    if (!range) continue;
    if (hiddenBlocks.has(blockIdx) && !isEditor) {
      for (let i = range.start; i <= range.end; i++) {
        els[i].style.opacity = '0';
        els[i].style.pointerEvents = 'none';
      }
      continue;
    }
    const blockAllowed = Boolean(activeBlockFlags[blockIdx] || isBlockVisible(blockIdx));
    const blockWasActive = Boolean(everActiveBlockFlags[blockIdx]);
    const blockEraseCompleted = Boolean(textBlocks[blockIdx]?.eraseCompleted);
    for (let i = range.start; i <= range.end; i++) {
      const segment = findSegmentForIndex(blockIdx, i);
      const revealCount = fadeEnabled ? getSegmentUnlockedCount(segment) + visibleLetters : Infinity;
      const fromPeelTail = (segment?.end ?? range.end) - i;
      let opacity = (blockAllowed || (!letters[i].locked && blockWasActive && !blockEraseCompleted) || isEditor) ? 1 : 0;
      if (blockAllowed && fadeEnabled && letters[i].locked) {
        if (isEditor) opacity = 1;
        else if (fromPeelTail < revealCount) {
          opacity = 1;
        } else if (fadeSteps > 0 && fromPeelTail < revealCount + fadeSteps) {
          opacity = 1 - ((fromPeelTail - revealCount + 1) / (fadeSteps + 1));
        } else {
          opacity = 0;
        }
      }
      const finalOpacity = getLetterDisplayOpacity(letters[i], opacity);
      const url = letters[i].inlineStyle?.url;
      els[i].style.opacity = String(finalOpacity);
      els[i].style.pointerEvents = (url || (finalOpacity > 0.01 && !letters[i].locked && (blockAllowed || blockWasActive))) ? 'auto' : 'none';
      if (url) els[i].style.cursor = 'pointer';
      const revealEl = censorRevealEls[i];
      if (revealEl && censorRevealedFlags[i]) {
        revealEl.style.opacity = (!blockEraseCompleted || blockAllowed || !completedBlocks[blockIdx]) ? '1' : '0';
      }
    }
  }
}

function normalizeBlockOpacity(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function getLetterDisplayOpacity(letter, baseOpacity = 1) {
  if (!letter) return 0;
  let opacity = Number.isFinite(Number(baseOpacity)) ? Number(baseOpacity) : 1;
  if (letter.inlineStyle?.noPeel && opacity > 0) opacity = 0.42;
  return opacity * normalizeBlockOpacity(letter.style?.opacity);
}

// Session 7 — effects.js
state.particleEmitters = particleEmitters;
state.MAX_PARTICLES = MAX_PARTICLES;
state.MAX_PARTICLES_PER_STEP = MAX_PARTICLES_PER_STEP;
state.particlesSpawnedThisStep = particlesSpawnedThisStep;
state.STEP_MS = STEP_MS;
state.SIM_STEP_SCALE = SIM_STEP_SCALE;
state.physicsPropDrags = physicsPropDrags;
state.effectsCtx = effectsCtx;
state.completedBlockTimes = completedBlockTimes;
state.activeBlockFlags = activeBlockFlags;
state.lineartAuthoring = lineartAuthoring;
state.drawTextAuthoring = drawTextAuthoring;
state.isBlockVisible = isBlockVisible;
state.getStepAdvanceDelayMs = getStepAdvanceDelayMs;
state.getLineartAuthoringLayout = getLineartAuthoringLayout;
state.drawPathPointToScreen = drawPathPointToScreen;
state.renderLooseParts = renderLooseParts;
state.armAudio = armAudio;
state.getSelectedDrawPath = getSelectedDrawPath;
// Session 8a — events.js
state.currentForceFields = currentForceFields;
state.hiddenBlocks = hiddenBlocks;
state.namedFlags = namedFlags;
state.completedBlocks = completedBlocks;
state.lastBehaviorVisibilityKey = lastBehaviorVisibilityKey;
state.runBgColorAction = runBgColorAction;
state.getLetterCenter = getLetterCenter;
state.getBlockVisibleCenter = getBlockVisibleCenter;
// Session 8b — physics.js
state.TICK_DAMPING = TICK_DAMPING;
state.LONG_STRIP_MIN_LETTERS = LONG_STRIP_MIN_LETTERS;
state.LONG_STRIP_SENSITIVITY = LONG_STRIP_SENSITIVITY;
state.LONG_STRIP_VELOCITY_REF = LONG_STRIP_VELOCITY_REF;
state.MIGRATION_TARGET_DEPTH = MIGRATION_TARGET_DEPTH;
state.MIGRATION_VELOCITY_MIN = MIGRATION_VELOCITY_MIN;
state.MIGRATION_VELOCITY_MAX = MIGRATION_VELOCITY_MAX;
state.MIGRATION_STEPS_MAX = MIGRATION_STEPS_MAX;
state.mobileRuntime = mobileRuntime;
state.SIM_HZ = SIM_HZ;
state.gapLinkDecayTargets = gapLinkDecayTargets;
state.blockStartedFlags = blockStartedFlags;
state.startedPeelSegments = startedPeelSegments;
state.pileStampedSegs = pileStampedSegs;
state.pileHeights = pileHeights;
state.PILE_GROW_SEC = PILE_GROW_SEC;
state.MAX_PILE_H = MAX_PILE_H;
state.unlockClock = unlockClock;
state.unravelIdx = unravelIdx;
state.frameLetterRange = frameLetterRange;
state.hint = hint;
state.sceneScrollRestoreTarget = sceneScrollRestoreTarget;
state.censorRevealEls = censorRevealEls;
state.censorRevealedFlags = censorRevealedFlags;
state.els = els;
state.lastRenderedX = lastRenderedX;
state.lastRenderedY = lastRenderedY;
state.lastRenderedAngle = lastRenderedAngle;
state.isDragged = isDragged;
state.isLetterFrozen = isLetterFrozen;
state.getPileFloor = getPileFloor;
state.isUnravelDone = isUnravelDone;
state.unlockLetter = unlockLetter;
state.advanceUnravelQueue = advanceUnravelQueue;
state.updateForceFieldVisualOffsets = updateForceFieldVisualOffsets;
state.getLetterConstraintCenter = getLetterConstraintCenter;
state.getLetterCollisionRadius = getLetterCollisionRadius;
state.isCollidableLetter = isCollidableLetter;
state.wakeStarterIdleSegment = wakeStarterIdleSegment;
state.getLetterRenderOffsetY = getLetterRenderOffsetY;
state.markDragStateDirty = markDragStateDirty;
state.forEachFrameLetter = forEachFrameLetter;
state.forEachFrameConstraint = forEachFrameConstraint;
state.deleteDynamicOverflow = deleteDynamicOverflow;
state.simulateLooseParts = simulateLooseParts;
state.simulatePeelStrokes = simulatePeelStrokes;
state.getRenderedY = getRenderedY;
state.updateFrameState = updateFrameState;
state.continueSceneScrollRestore = continueSceneScrollRestore;
state.positionAttachments = positionAttachments;
state.syncPeelStrokeOrigins = syncPeelStrokeOrigins;
state.positionInlineLinkButtons = positionInlineLinkButtons;
state.positionTimedButtons = positionTimedButtons;
state.positionClipShapeFrames = positionClipShapeFrames;
state.positionHint = positionHint;
state.positionBlockGizmos = positionBlockGizmos;
state.getLetterVisualOffset = getLetterVisualOffset;
state.getBlockRenderOffsetY = getBlockRenderOffsetY;
state.updateBehaviorVisibility = updateBehaviorVisibility;
state.updateCamera = updateCamera;
state.updateDebugStats = updateDebugStats;

function hasCursorForceFields() {
  return FORCE_FIELDS.some(field => field.type === 'cursor' || field.type === 'cursorRepel');
}

function updateCursorForcePointer(e, dragging = false) {
  if (!hasCursorForceFields()) return;
  cursorForcePointers.set(e.pointerId, {
    x: e.clientX - frameViewport.containerLeft,
    y: e.clientY - frameViewport.containerTop,
    dragging: Boolean(dragging || e.buttons)
  });
}

function getSegmentKey(blockIdx, segmentIdx) {
  return `${blockIdx}:${segmentIdx}`;
}

function markDragStateDirty() {
  dragStateDirty = true;
}

function refreshDragState() {
  if (!dragStateDirty) return;
  draggedIndices.clear();
  draggedSegmentKeys.clear();
  for (const drag of drags.values()) {
    const letter = letters[drag.idx];
    if (!letter) continue;
    draggedIndices.add(drag.idx);
    const segmentIdx = findSegmentIndexForIndex(letter.blockIdx, drag.idx);
    if (segmentIdx >= 0) draggedSegmentKeys.add(getSegmentKey(letter.blockIdx, segmentIdx));
  }
  dragStateDirty = false;
}

function isDragged(idx) {
  refreshDragState();
  return draggedIndices.has(idx);
}

function getLineLockY(idx) {
  const letter = letters[idx];
  if (!letter) return null;
  const motion = getBlockConfig(letter.blockIdx).letterMotion || pieceConfig.letterMotion;
  const motions = Array.isArray(motion) ? motion : (motion ? [motion] : []);
  return motions.some(item => item?.enabled !== false && item?.type === 'line-lock')
    ? (letter.lineLockY ?? letter.y)
    : null;
}

function isInDraggedSegment(idx) {
  refreshDragState();
  if (!draggedSegmentKeys.size) return false;
  const letter = letters[idx];
  if (!letter) return false;
  const segmentIdx = findSegmentIndexForIndex(letter.blockIdx, idx);
  if (segmentIdx < 0) return false;
  return draggedSegmentKeys.has(getSegmentKey(letter.blockIdx, segmentIdx));
}

function clampLetterToViewport(idx) {
  const l = letters[idx];
  if (!l || l.deleted) return false;
  const rect = container.getBoundingClientRect();
  const pad = 10;
  const minX = -rect.left + pad;
  const maxX = window.innerWidth - rect.left - l.w - pad;
  const minRenderedY = -rect.top + pad;
  const maxRenderedY = window.innerHeight - rect.top - LINE_HEIGHT - pad;
  const offsetY = getLetterRenderOffsetY(idx);
  const nextX = Math.max(minX, Math.min(maxX, l.x));
  const nextY = Math.max(minRenderedY - offsetY, Math.min(maxRenderedY - offsetY, l.y));
  const changed = nextX !== l.x || nextY !== l.y;
  l.x = nextX;
  l.y = nextY;
  if (changed) {
    l.px = l.x;
    l.py = l.y;
  }
  return changed;
}

function clampDraggedSegmentToViewport(idx) {
  clampLetterToViewport(idx);
}

function clampPhysicsPropToViewport(prop) {
  const rect = container.getBoundingClientRect();
  const size = prop.radius * 2;
  const minX = -rect.left;
  const minY = -rect.top;
  const maxX = window.innerWidth - rect.left - size;
  const maxY = window.innerHeight - rect.top - size;
  prop.x = Math.max(minX, Math.min(maxX, prop.x));
  prop.y = Math.max(minY, Math.min(maxY, prop.y));
}

function isPickableLetterIdx(idx) {
  const letter = letters[idx];
  if (!letter || letter.deleted || letter.locked) return false;
  if (isDragged(idx)) return false;
  if (!isLetterInViewport(idx)) return false;
  if (Number(els[idx]?.style.opacity || 1) < 0.2) return false;
  return true;
}

function getNearDraggableLetterIdx(e) {
  const directIdx = els.indexOf(e.target);
  if (directIdx >= 0 && isPickableLetterIdx(directIdx)) return directIdx;
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const radius = e.pointerType === 'touch' ? 120 : 96;
  const radiusSq = radius * radius;
  let bestIdx = -1;
  let bestScore = Infinity;
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    if (!isPickableLetterIdx(i)) continue;
    const left = letter.x;
    const top = getRenderedY(i);
    const right = left + Math.max(letter.w, 8);
    const bottom = top + getLetterLineHeight(letter);
    const nearestX = Math.max(left, Math.min(x, right));
    const nearestY = Math.max(top, Math.min(y, bottom));
    const dx = x - nearestX;
    const dy = y - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq > radiusSq) continue;
    const score = distSq + (letter.starterIdle ? 900 : 0) + (isLetterFrozen(i) ? 250 : 0);
    if (score <= bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function startLetterDrag(e, idx) {
  if (idx === -1) return false;
  const l = letters[idx];
  if (!l || l.locked || l.deleted) {
    return false;
  }
  if (l.inlineStyle?.url) {
    window.open(l.inlineStyle.url, '_blank');
    return true;
  }
  if (simulationPaused) return false;
  if (isLetterFrozen(idx) && !letters[idx].starterIdle && !isLetterInViewport(idx)) return false;
  if (isDragged(idx)) return false;
  wakeStarterIdleSegment(idx);
  const rect = container.getBoundingClientRect();
  const rawOffsetX = e.clientX - rect.left - letters[idx].x;
  const rawOffsetY = e.clientY - rect.top - getRenderedY(idx);
  const pointerId = e.pointerId ?? 'mouse';
  const pointerType = e.pointerType || 'mouse';
  drags.set(pointerId, {
    idx,
    offsetX: pointerType === 'touch' ? Math.max(0, Math.min(Math.max(letters[idx].w, 8), rawOffsetX)) : rawOffsetX,
    offsetY: pointerType === 'touch' ? Math.max(0, Math.min(getLetterLineHeight(letters[idx]), rawOffsetY)) : rawOffsetY,
    grabX: letters[idx].x,
    grabY: letters[idx].y,
    lastX: e.clientX,
    lastY: e.clientY,
    speed: 0,
  });
  markDragStateDirty();
  els[idx].classList.add('dragging');
  hint.style.opacity = '0';
  peelHint.classList.remove('visible');
  if (Number.isFinite(e.pointerId)) {
    try { container.setPointerCapture(e.pointerId); } catch (err) {}
  }
  playGrabSound();
  e.preventDefault();
  return true;
}

function wireLetterPointerDown(el) {
  el.addEventListener('pointerdown', (e) => {
    const idx = els.indexOf(e.currentTarget);
    if (idx >= 0 && isPickableLetterIdx(idx) && startLetterDrag(e, idx)) {
      e.stopPropagation();
    }
  });
  el.addEventListener('mousedown', (e) => {
    const idx = els.indexOf(e.currentTarget);
    if (idx >= 0 && isPickableLetterIdx(idx) && startLetterDrag(e, idx)) {
      e.stopPropagation();
    }
  });
}

function moveActiveLetterDrag(e, pointerId) {
  const d = drags.get(pointerId);
  if (!d) return false;
  const rect = container.getBoundingClientRect();
  d.speed = Math.hypot(e.clientX - d.lastX, e.clientY - d.lastY);
  d.lastX = e.clientX;
  d.lastY = e.clientY;
  const l = letters[d.idx];
  if (l.deleted) return true;
  l.x = e.clientX - rect.left - d.offsetX;
  l.y = e.clientY - rect.top - d.offsetY - getLetterRenderOffsetY(d.idx);
  const lineLockY = getLineLockY(d.idx);
  if (Number.isFinite(lineLockY)) l.y = lineLockY;
  if (!clampLetterToViewport(d.idx)) {
    l.px = l.x;
    l.py = l.y;
  }
  unlockLetter(d.idx);
  clampDraggedSegmentToViewport(d.idx);
  e.preventDefault();
  return true;
}

function endActiveLetterDrag(pointerId) {
  const d = drags.get(pointerId);
  if (!d) return false;
  clampDraggedSegmentToViewport(d.idx);
  els[d.idx]?.classList.remove('dragging');
  drags.delete(pointerId);
  markDragStateDirty();
  for (const ni of [d.idx - 1, d.idx + 1]) {
    const nl = letters[ni];
    if (nl && !nl.deleted && !nl.locked && nl.blockIdx === letters[d.idx].blockIdx) {
      nl.px = nl.x;
      nl.py = nl.y;
    }
  }
  playDropSound();
  schedulePeelStateSave();
  return true;
}

window.addEventListener('mousemove', (e) => {
  if (moveActiveLetterDrag(e, 'mouse')) e.preventDefault();
});

window.addEventListener('mouseup', () => {
  endActiveLetterDrag('mouse');
});

container.addEventListener('pointerdown', (e) => {
  armAudio();
  if (handleDrawTextPointerDown(e)) return;
  if (handleLineartAuthorPointerDown(e)) return;
  updateCursorForcePointer(e, true);
  // ── Tie rope node hit-test ─────────────────────────────────────────────
  {
    const hitRadius   = e.pointerType === 'touch' ? 44 : 26;
    const hitRadiusSq = hitRadius * hitRadius;
    const cx = e.clientX - frameViewport.containerLeft;
    const cy = e.clientY - frameViewport.containerTop;
    const tieHit = hitTestTieRope(cx, cy, hitRadiusSq);
    if (tieHit) {
      const { tie, ni } = tieHit;
      const n = tie.nodes[ni];
      tieNodeDrags.set(e.pointerId, {
        tieId: tie.id, ni,
        offsetX: cx - n.x, offsetY: cy - n.y
      });
      // Wake the nearer endpoint letter so it can be pulled through the rope
      const ac = state.getLetterConstraintCenter(tie.aIdx);
      const bc = state.getLetterConstraintCenter(tie.bIdx);
      const dA = Math.hypot(n.x - ac.x, n.y - ac.y);
      const dB = Math.hypot(n.x - bc.x, n.y - bc.y);
      wakeStarterIdleSegment(dA <= dB ? tie.aIdx : tie.bIdx);
      container.style.cursor = 'grabbing';
      try { container.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
      return;
    }
  }
  // ── Stroke hit-test: grab the nearest free node ───────────────────────
  {
    const hitRadius = e.pointerType === 'touch' ? 44 : 24;
    const hitRadiusSq = hitRadius * hitRadius;
    const cx = e.clientX - frameViewport.containerLeft;
    const cy = e.clientY - frameViewport.containerTop;
    let bestStroke = null, bestNodeIdx = -1, bestDistSq = Infinity;
    for (const stroke of peelStrokes) {
      if (!stroke.initialized) continue;
      const layout = positions[stroke.blockIdx]?.attachment;
      if (!layout || !isBlockVisible(stroke.blockIdx) || !activeBlockFlags[stroke.blockIdx]) continue;
      for (let ni = 0; ni < stroke.nodes.length; ni++) {
        const n = stroke.nodes[ni];
        if (n.locked) continue;
        const dx = n.x - cx, dy = n.y - cy;
        const dSq = dx * dx + dy * dy;
        if (dSq < hitRadiusSq && dSq < bestDistSq) {
          bestDistSq = dSq; bestStroke = stroke; bestNodeIdx = ni;
        }
      }
    }
    if (bestStroke) {
      bestStroke.started = true;
      const n = bestStroke.nodes[bestNodeIdx];
      peelStrokeDrags.set(e.pointerId, {
        stroke: bestStroke,
        nodeIdx: bestNodeIdx,
        offsetX: cx - n.x,
        offsetY: cy - n.y
      });
      container.style.cursor = 'grabbing';
      try { container.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
      return;
    }
  }
  // ─────────────────────────────────────────────────────────────────────
  const idx = getNearDraggableLetterIdx(e);
  startLetterDrag(e, idx);
});

window.addEventListener('pointermove', (e) => {
  updateCursorForcePointer(e, e.buttons !== 0);
  if (handleDrawTextPointerMove(e)) return;
  if (handleLineartAuthorPointerMove(e)) return;
  if (drawTextAuthoring.tool !== 'off') {
    if (!document.body.classList.contains('editor-open')) {
      setDrawTextTool('off');
      container.style.cursor = '';
      return;
    }
    container.style.cursor = drawTextAuthoring.tool === 'delete' ? 'not-allowed' : 'crosshair';
    return;
  }
  if (lineartAuthoring.tool !== 'off') {
    container.style.cursor = lineartAuthoring.tool === 'draw' ? 'crosshair' : 'not-allowed';
    return;
  }
  // Hover cursor for peel strokes (drawings) when not dragging
  if (e.buttons === 0) {
    const hitRadius = e.pointerType === 'touch' ? 44 : 24;
    const hitRadiusSq = hitRadius * hitRadius;
    const cx = e.clientX - frameViewport.containerLeft;
    const cy = e.clientY - frameViewport.containerTop;
    // Also show grab cursor over tie rope nodes
    const tieHit       = hitTestTieRope(cx, cy, hitRadiusSq);
    if (tieHit) { container.style.cursor = 'grab'; }
    let hit = tieHit;
    for (const stroke of peelStrokes) {
      if (!stroke.initialized) continue;
      const layout = positions[stroke.blockIdx]?.attachment;
      if (!layout || !isBlockVisible(stroke.blockIdx) || !activeBlockFlags[stroke.blockIdx]) continue;
      for (const n of stroke.nodes) {
        if (n.locked) continue;
        const dx = n.x - cx, dy = n.y - cy;
        if (dx * dx + dy * dy < hitRadiusSq) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    container.style.cursor = hit ? 'grab' : '';
  }

  // ── Tie rope node drag ────────────────────────────────────────────────
  const tieNodeDrag = tieNodeDrags.get(e.pointerId);
  if (tieNodeDrag) {
    const tie = (state.ties || []).find(t => t.id === tieNodeDrag.tieId);
    if (tie?.nodes?.[tieNodeDrag.ni]) {
      const n = tie.nodes[tieNodeDrag.ni];
      const prevX = n.x, prevY = n.y;
      n.x  = e.clientX - frameViewport.containerLeft - tieNodeDrag.offsetX;
      n.y  = e.clientY - frameViewport.containerTop  - tieNodeDrag.offsetY;
      n.px = n.x - (n.x - prevX) * 0.78;
      n.py = n.y - (n.y - prevY) * 0.78;
    }
    e.preventDefault();
    return;
  }
  const strokeDrag = peelStrokeDrags.get(e.pointerId);
  if (strokeDrag) {
    const n = strokeDrag.stroke.nodes[strokeDrag.nodeIdx];
    const prevX = n.x, prevY = n.y;
    n.x = e.clientX - frameViewport.containerLeft - strokeDrag.offsetX;
    n.y = e.clientY - frameViewport.containerTop  - strokeDrag.offsetY;
    n.px = n.x - (n.x - prevX) * 0.75;
    n.py = n.y - (n.y - prevY) * 0.75;
    e.preventDefault();
    return;
  }
  const looseDrag = loosePartDrags.get(e.pointerId);
  if (looseDrag) {
    const rect = container.getBoundingClientRect();
    const part  = looseDrag.part;
    const prevX = part.x;
    const prevY = part.y;
    part.x = e.clientX - rect.left - looseDrag.offsetX;
    part.y = e.clientY - rect.top  - looseDrag.offsetY;
    part.px = part.x - (part.x - prevX);
    part.py = part.y - (part.y - prevY);
    part.angularVelocity = (e.clientX - looseDrag.lastX) * 0.008;
    looseDrag.lastX = e.clientX;
    looseDrag.lastY = e.clientY;
    e.preventDefault();
    return;
  }
  const propDrag = physicsPropDrags.get(e.pointerId);
  if (propDrag) {
    const rect = container.getBoundingClientRect();
    const prop = propDrag.prop;
    const prevX = prop.x;
    const prevY = prop.y;
    prop.x = e.clientX - rect.left - propDrag.offsetX;
    prop.y = e.clientY - rect.top - propDrag.offsetY;
    clampPhysicsPropToViewport(prop);
    prop.px = prop.x - (prop.x - prevX);
    prop.py = prop.y - (prop.y - prevY);
    prop.angularVelocity = (e.clientX - propDrag.lastX) * 0.012;
    prop.angle += prop.angularVelocity;
    propDrag.lastX = e.clientX;
    propDrag.lastY = e.clientY;
    e.preventDefault();
    return;
  }
  const d = drags.get(e.pointerId);
  if (!d) return;
  moveActiveLetterDrag(e, e.pointerId);
});

// ── Peel state persistence ────────────────────────────────────────────────

function getPeelStateKey() {
  const ids = textBlocks
    .map((b) => `${b.id || ''}:${b.text || ''}:${JSON.stringify(b.peelPoints || [])}`)
    .join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < ids.length; i++) { h ^= ids.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `tirita.state.v5.${(h >>> 0).toString(16)}`;
}

function canPersistPeelStateForBlock(blockIdx) {
  return Boolean(textBlocks[blockIdx]?.peel?.persistState);
}

let _peelSaveTimer = null;
function schedulePeelStateSave() {
  if (_peelSaveTimer) return;
  _peelSaveTimer = setTimeout(() => {
    _peelSaveTimer = null;
    savePeelState();
  }, 800);
}

function savePeelState() {
  const blocks = {};
  for (let blockIdx = 0; blockIdx < blockRanges.length; blockIdx++) {
    if (!canPersistPeelStateForBlock(blockIdx)) continue;
    const id = textBlocks[blockIdx]?.id;
    if (!id) continue;
    const range = blockRanges[blockIdx];
    const unlocked = [];
    for (let i = range.start; i <= range.end; i++) {
      const l = letters[i];
      if (!l || l.deleted || l.locked) continue;
      unlocked.push([l.readingIdx, Math.round(l.x), Math.round(l.y), Math.round(l.px), Math.round(l.py)]);
    }
    if (unlocked.length) blocks[id] = unlocked;
  }
  try {
    if (Object.keys(blocks).length)
      localStorage.setItem(getPeelStateKey(), JSON.stringify({ v: 1, blocks }));
    else
      localStorage.removeItem(getPeelStateKey());
  } catch (e) {}
}

function clearPeelState() {
  try { localStorage.removeItem(getPeelStateKey()); } catch (e) {}
}

function clearAllPeelStates() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('tirita.state.v5.')) localStorage.removeItem(key);
    }
  } catch (e) {}
}

let editorPanel = null;
let autoReloadHeader = null;
let editorJson = null;
let pauseInput = null;
let textReloadTimer = null;
let getMutableConfigFromEditor = null;
let setEditorConfig = null;
let getEditableBlocks = null;
let buildConfigFromVisualControls = null;
let saveConfigAndReload = null;
let refreshVisualEditor = null;
let toggleEditor = null;
let restorePeelState = null;

const editorRuntimeSource = await fetch(`./js/editor.js?v=${_v}`).then((response) => {
  if (!response.ok) throw new Error(`Failed to load editor runtime: ${response.status}`);
  return response.text();
});
eval(editorRuntimeSource);


function triggerAutoReload() {
  if (autoReloadHeader.checked) {
    preserveSceneScrollForReload();
    saveEditorScrollState();
    clearTimeout(textReloadTimer);
    textReloadTimer = setTimeout(performSoftReload, 650);
  }
}

async function performSoftReload() {
  preserveSceneScrollForReload();
  const sceneScrollBeforeReload = Number(localStorage.getItem('tirita.restoreSceneScroll') || localStorage.getItem('tirita.sceneScroll') || getCurrentSceneScroll() || savedSceneScroll || 0);
  saveEditorScrollState();
  const nextConfig = buildConfigFromVisualControls();
  pieceConfig = nextConfig; state.pieceConfig = pieceConfig;
  activeBlocks = nextConfig.blocks || []; state.activeBlocks = activeBlocks;
  persistPieceConfig(nextConfig);
  
  // 1. Teardown existing scene components
  if (_peelSaveTimer) { clearTimeout(_peelSaveTimer); _peelSaveTimer = null; }
  container.replaceChildren(); // Wipes letters, buttons, etc.
  blockInDom.clear();
  drags.clear();
  looseParts.forEach(p => p.el?.remove());
  looseParts.length = 0;
  loosePartDrags.clear();
  peelStrokes.length = 0;
  peelStrokeDrags.clear();
  tieNodeDrags.clear();
  tangledLineDrags.clear();
  initializedStrokeBlocks.clear();
  pendingStrokeBlocks.clear();
  queuedStrokeBlocks.length = 0;
  strokeQueueScheduled = false;
  physicsProps.forEach(p => p.el?.remove());
  physicsProps.length = 0;
  bugs.forEach(b => b.el?.remove());
  bugs.length = 0;
  physicsPropDrags.clear();
  firedTriggerKeys.clear();
  shapeOrigins.clear();
  initializedCrossBlockArcs.clear();
  releasedCrossBlockArcs.clear();
  reflowStarted.clear();
  startedPeelSegments.clear();
  everActiveBlockFlags = [];
  cachedVisibleBlockWindow = { start: 0, end: 0 };
  compactFlowCurrentOffset = 0;
  mobilePrunedBlockCursor = 0;
  lastVisibleBlockSignature = '';
  lastRenderedX = []; state.lastRenderedX = lastRenderedX;
  lastRenderedY = []; state.lastRenderedY = lastRenderedY;
  lastRenderedAngle = []; state.lastRenderedAngle = lastRenderedAngle;

  // 2. Rebuild block data structures
  const activeBlocksSrc = nextConfig.blocks || [];
  const newBlocks = activeBlocksSrc.map((bc, idx) => {
    measureCtx.font = getBlockFont(idx);
    const parsed = parseBBCode(bc.text);
    return {
      id: bc.id, text: bc.text, plainText: parsed.plainText, style: getBlockStyle(idx), font: getBlockFont(idx),
      transform: { x: Number(bc.transform?.x ?? 0), y: Number(bc.transform?.y ?? 0), scale: Number(bc.transform?.scale ?? 1), width: Number(bc.transform?.width ?? getMaxWidth()), height: Number(bc.transform?.height ?? 0) },
      graphemes: parsed.graphemes, inlineStyles: parsed.inlineStyles, wordRanges: buildWordRanges(parsed.plainText, parsed.graphemes),
      attachment: bc.attachment || null, peel: bc.peel || {}, hint: bc.hint || {}, triggers: bc.triggers || [],
      linkButton: bc.linkButton || null, timedButton: bc.timedButton || null, clipShape: bc.clipShape || null, drawPath: bc.drawPath || null,
      ringPath: bc.ringPath || null,
      groupNext: Number(bc.groupNext) || 0,
      groupOpacity: (() => { const v = Number(bc.groupOpacity); return Number.isFinite(v) ? v : undefined; })(),
      groupGhostLayers: Math.max(1, Number(bc.groupGhostLayers) || 1),
      groupPeelReveal: Boolean(bc.groupPeelReveal),
      eraseCompleted: Boolean(bc.eraseCompleted),
      hidden: Boolean(bc.hidden),
      widths: parsed.graphemes.map(g => measureCtx.measureText(g).width)
    };
  });

  // Swap global textBlocks reference
  textBlocks.splice(0, textBlocks.length, ...newBlocks);
  
  // 3. Re-run initialization logic in-place
  positions = layoutPositions(getMaxWidth()); state.positions = positions;
  letters = []; blockRanges = []; segmentRanges = [];
  state.letters = letters; state.blockRanges = blockRanges; state.segmentRanges = segmentRanges;
  for (let bIdx = 0; bIdx < textBlocks.length; bIdx++) {
    const start = letters.length;
    const segments = buildBlockSegments(bIdx, positions[bIdx]);
    const segsForBlock = [];
    for (let sIdx = 0; sIdx < segments.length; sIdx++) {
      const seg = segments[sIdx]; const segStart = letters.length;
      for (const ri of seg.stringOrder) {
        const p = positions[bIdx].positions[ri]; if (!p) continue;
        letters.push({ ch: textBlocks[bIdx].graphemes[ri], w: p.w, x: p.x, y: p.y, ox: p.x, oy: p.y, px: p.x, py: p.y, angle: p.angle || 0, blockIdx: bIdx, segmentIdx: sIdx, readingIdx: ri, sequenceRatio: textBlocks[bIdx].graphemes.length > 1 ? ri / (textBlocks[bIdx].graphemes.length - 1) : 0, scale: textBlocks[bIdx].transform.scale, lineHeight: p.lineHeight || getBlockVisualLineHeight(textBlocks[bIdx]), style: textBlocks[bIdx].style, inlineStyle: textBlocks[bIdx].inlineStyles[ri] || cloneInlineStyle(), font: textBlocks[bIdx].font, locked: true, deleted: false, unlockedAt: null, starterIdle: false, tempLockUntil: 0, groupKey: seg.groupKeys.get(ri) || null, yBaked: false });
      }
      segsForBlock.push({ start: segStart, end: letters.length - 1, starterCount: seg.resolvedStarterCount });
    }
    segmentRanges.push(segsForBlock); blockRanges.push({ start, end: letters.length - 1 });
  }
  applyDrainCollapse();
  restLengths = computeRestLengths(); state.restLengths = restLengths; gapLinkDecayTargets = computeGapLinkDecayTargets(); state.gapLinkDecayTargets = gapLinkDecayTargets;
  breakThresholds = computeBreakThresholds(); state.breakThresholds = breakThresholds;
  crossBlockConstraints = computeCrossBlockConstraints(); state.crossBlockConstraints = crossBlockConstraints;
  ties = computeTies(); state.ties = ties;
  tangledLines = computeTangledLines(); state.tangledLines = tangledLines;
  reflowStarted.clear(); startedPeelSegments.clear(); computeAllReflowPositions(); computeAnchorPeelNeighbors();
  lastRenderedX = new Array(letters.length).fill(NaN); state.lastRenderedX = lastRenderedX;
  lastRenderedY = new Array(letters.length).fill(NaN); state.lastRenderedY = lastRenderedY;
  lastRenderedAngle = new Array(letters.length).fill(NaN); state.lastRenderedAngle = lastRenderedAngle;
  els = letters.map(l => {
    const s = document.createElement('span');
    s.className = 'letter';
    s.textContent = l.ch;
    s.style.opacity = '0';
    s.style.pointerEvents = 'none';
    s.style.fontFamily = quoteFontFamily(l.style.fontFamily);
    s.style.fontSize = `${Number.parseFloat(baseFontSize) * l.scale}px`;
    s.style.transform = `translate(${l.x}px, ${l.y}px) rotate(${l.angle || 0}rad)`;
    applyLetterStyle(s, l, l.style);
    wireLetterPointerDown(s);
    return s;
  }); state.els = els;
  ({ censorRevealEls, censorRevealedFlags } = buildCensorRevealEls()); state.censorRevealEls = censorRevealEls; state.censorRevealedFlags = censorRevealedFlags;
  starterUnlockedSegments = segmentRanges.map(segs => segs.map(() => false));
  completedSegments = segmentRanges.map(segs => segs.map(() => false));
  completedBlocks = blockRanges.map(() => false); state.completedBlocks = completedBlocks;
  completedBlockTimes = blockRanges.map(() => 0); state.completedBlockTimes = completedBlockTimes;
  hiddenBlocks = new Set(textBlocks.reduce((acc, b, i) => { if (b.hidden) acc.push(i); return acc; }, [])); state.hiddenBlocks = hiddenBlocks;
  namedFlags = new Set(); state.namedFlags = namedFlags;
  blockStartedFlags = blockRanges.map(() => false); state.blockStartedFlags = blockStartedFlags;
  blockRenderOffsets = blockRanges.map(() => 0);
  blockWasInVisibleWindow = blockRanges.map(() => false);

  // 4. Reset display components
  container.append(blockOverlay, moveHandle, scaleHandle, resizeHandle, overflowGizmo, addParagraphGizmo, hint, peelHint);
  if (!mobileRuntime) createBlockGizmos();

  inlineLinkButtons = textBlocks.map((block, blockIdx) => {
    if (!block.linkButton?.url) return null;
    const el = document.createElement('a'); el.className = 'inline-link-button';
    el.href = block.linkButton.url; el.target = '_blank'; el.rel = 'noopener noreferrer';
    el.textContent = block.linkButton.text || '+';
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => e.stopPropagation());
    container.appendChild(el); return { blockIdx, el };
  });

  timedButtons = textBlocks.map((block, blockIdx) => {
    if (!block.timedButton) return null;
    const cfg = block.timedButton; const el = document.createElement('button'); el.className = 'timed-btn';
    el.textContent = cfg.text || '→'; el.addEventListener('pointerdown', (e) => e.stopPropagation());
    let addTextEl = null;
    if (cfg.action === 'addText' && cfg.addText) {
      addTextEl = document.createElement('div'); addTextEl.className = 'timed-add-text';
      addTextEl.textContent = cfg.addText; container.appendChild(addTextEl);
    }
    const item = { blockIdx, el, addTextEl, delayMs: Math.max(500, Number(cfg.delayMs ?? 6000)), spawnAt: cfg.spawnAt || 'afterNoPeel', triggered: false, timer: null, clicked: false };
    el.addEventListener('click', (e) => {
      e.stopPropagation(); item.clicked = true; el.classList.remove('visible'); el.style.display = 'none';
      if (cfg.action === 'url' && cfg.url) window.open(cfg.url, '_blank');
      if (cfg.action === 'addText' && addTextEl) addTextEl.classList.add('visible');
    });
    container.appendChild(el); return item;
  });

  clipShapeFrames = textBlocks.map((block, blockIdx) => {
    return createClipShapeFrame(blockIdx, block.clipShape);
  });

  attachments = textBlocks.map((block, blockIdx) => {
    if (!block.attachment) return null;
    const el = createAttachmentElement(block.attachment);
    container.appendChild(el); return { blockIdx, el };
  });

  // Re-init loose parts
  textBlocks.forEach((block, blockIdx) => {
    if (block.attachment?.type !== 'lineart' || !block.attachment.loose?.src) return;
    const loose = block.attachment.loose; const el = document.createElement('img');
    el.className = 'lineart-loose'; el.src = loose.src; el.draggable = false;
    const w = Math.max(10, Number(loose.width || 44)), h = Math.max(10, Number(loose.height || 92));
    el.style.width = `${w}px`; el.style.height = `${h}px`; el.style.opacity = '0';
    container.appendChild(el);
    const part = { el, blockIdx, w, h, x: 0, y: 0, px: 0, py: 0, pinFracX: Number(loose.pinFracX ?? 0.82), pinFracY: Number(loose.pinFracY ?? 0.44), restLength: Number(loose.restLength ?? 55), attached: true, angle: 0, angularVelocity: 0, sleeping: false, groundedFrames: 0 };
    el.addEventListener('pointerdown', (e) => {
      armAudio(); const rect = container.getBoundingClientRect(); part.attached = false; part.sleeping = false;
      playGrabSound();
      loosePartDrags.set(e.pointerId, { part, offsetX: e.clientX - rect.left - part.x, offsetY: e.clientY - rect.top - part.y, lastX: e.clientX, lastY: e.clientY });
      el.classList.add('dragging'); el.setPointerCapture(e.pointerId); e.stopPropagation(); e.preventDefault();
    });
    looseParts.push(part);
  });

  ensureVisiblePeelStrokes();
  restorePeelState();
  refreshVisualEditor();
  restoreEditorScrollState();
  restoreSceneScrollTo(sceneScrollBeforeReload, 1800);
}

// Wrap final startup calls to ensure we hit requestAnimationFrame
try { restorePeelState(); } catch(e) { console.error("Peel state restoration failed:", e); }
requestAnimationFrame(render);
restoreSceneScroll();
}

initTirita().catch((err) => {
  console.error("FATAL STARTUP ERROR:", err);
  const debugBody = document.getElementById('debugBody');
  if (debugBody) {
    debugBody.textContent = `${err?.name || 'Error'}: ${err?.message || err}`;
  }
});
