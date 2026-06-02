// Editor/control-panel runtime loaded by main.js with direct eval so it can share the engine scope.
function persistEditorPrefs() {
  localStorage.setItem('tirita.autoReload', autoReloadHeader.checked ? '1' : '0');
  localStorage.setItem('tirita.freezeEditor', pauseInput.checked ? '1' : '0');
  localStorage.setItem('tirita.editorCollapsed', editorPanel.classList.contains('collapsed') ? '1' : '0');
  localStorage.setItem('tirita.utilityCollapsed', editorUtilityPanel?.classList.contains('collapsed') ? '1' : '0');
}

restorePeelState = function restorePeelState() {
  if (new URLSearchParams(location.search).has('reset')) { clearPeelState(); return; }
  try {
    const raw = localStorage.getItem(getPeelStateKey());
    if (!raw) return;
    const savedState = JSON.parse(raw);
    if (savedState?.v !== 1 || !savedState.blocks) return;
    for (let blockIdx = 0; blockIdx < blockRanges.length; blockIdx++) {
      if (!canPersistPeelStateForBlock(blockIdx)) continue;
      const id = textBlocks[blockIdx]?.id;
      if (!id || !savedState.blocks[id]) continue;
      const saved = new Map(savedState.blocks[id].map(([ri, x, y, px, py]) => [ri, { x, y, px, py }]));
      const range = blockRanges[blockIdx];
      let restored = 0;
      for (let i = range.start; i <= range.end; i++) {
        const l = letters[i];
        if (!l || !l.locked) continue;
        const s = saved.get(l.readingIdx);
        if (!s) continue;
        l.locked = false;
        l.unlockedAt = ++unlockClock; state.unlockClock = unlockClock;
        l.yBaked = true;
        l.starterIdle = false;
        l.x = s.x; l.y = s.y; l.px = s.px; l.py = s.py;
        restored++;
      }
      if (restored > 0) blockStartedFlags[blockIdx] = true;
    }
    hint.style.opacity = '0';
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────────────

window.addEventListener('pointerup', (e) => {
  cursorForcePointers.delete(e.pointerId);
  if (endDrawTextPointer(e)) return;
  if (endLineartAuthorPointer(e)) return;
  const strokeDrag = peelStrokeDrags.get(e.pointerId);
  if (strokeDrag) {
    peelStrokeDrags.delete(e.pointerId);
    container.style.cursor = '';
    return;
  }
  const looseDrag = loosePartDrags.get(e.pointerId);
  if (looseDrag) {
    looseDrag.part.el.classList.remove('dragging');
    looseDrag.part.sleeping = false;
    loosePartDrags.delete(e.pointerId);
    playDropSound();
    return;
  }
  const propDrag = physicsPropDrags.get(e.pointerId);
  if (propDrag) {
    propDrag.prop.el.classList.remove('dragging');
    physicsPropDrags.delete(e.pointerId);
    playDropSound();
    return;
  }
  const d = drags.get(e.pointerId);
  if (!d) return;
  clampDraggedSegmentToViewport(d.idx);
  els[d.idx].classList.remove('dragging');
  // Palindrome worm: on release, flip/relocate the whole word to the next row.
  // (This is the real drop handler for pointer drags — endActiveLetterDrag only
  // fires for the legacy mouse path, so the commit must live here too.)
  const palindromeMotion = getPalindromeMotionForLetter(d.idx);
  if (palindromeMotion) {
    const rowSpacing = getPalindromeRowSpacing(letters[d.idx], palindromeMotion);
    const advance = (letters[d.idx].y - d.grabY) >= rowSpacing * 0.5;
    releasePalindromeWordFromDrag(d.idx, palindromeMotion, advance);
  }
  drags.delete(e.pointerId);
  markDragStateDirty();
  // Kill velocity on constraint-neighbors so they don't jump when the drag anchor releases
  for (const ni of [d.idx - 1, d.idx + 1]) {
    const nl = letters[ni];
    if (nl && !nl.deleted && !nl.locked && nl.blockIdx === letters[d.idx].blockIdx) { nl.px = nl.x; nl.py = nl.y; }
  }
  playDropSound();
  schedulePeelStateSave();
});

window.addEventListener('pointercancel', (e) => {
  cursorForcePointers.delete(e.pointerId);
  if (endDrawTextPointer(e)) return;
  if (endLineartAuthorPointer(e)) return;
  const strokeDrag = peelStrokeDrags.get(e.pointerId);
  if (strokeDrag) {
    peelStrokeDrags.delete(e.pointerId);
    container.style.cursor = '';
    return;
  }
  const looseDrag = loosePartDrags.get(e.pointerId);
  if (looseDrag) {
    looseDrag.part.el.classList.remove('dragging');
    loosePartDrags.delete(e.pointerId);
    return;
  }
  const propDrag = physicsPropDrags.get(e.pointerId);
  if (propDrag) {
    propDrag.prop.el.classList.remove('dragging');
    physicsPropDrags.delete(e.pointerId);
    return;
  }
  const d = drags.get(e.pointerId);
  if (!d) return;
  clampDraggedSegmentToViewport(d.idx);
  els[d.idx].classList.remove('dragging');
  drags.delete(e.pointerId);
  markDragStateDirty();
  for (const ni of [d.idx - 1, d.idx + 1]) {
    const nl = letters[ni];
    if (nl && !nl.deleted && !nl.locked && nl.blockIdx === letters[d.idx].blockIdx) { nl.px = nl.x; nl.py = nl.y; }
  }
  schedulePeelStateSave();
});
window.addEventListener('pointerleave', (e) => {
  cursorForcePointers.delete(e.pointerId);
});

const editorToggle = document.getElementById('editorToggle');
const skipButton = document.getElementById('skipButton');
const reloadButton = document.getElementById('reloadButton');
const muteButton = document.getElementById('muteButton');
const sceneSelect = document.getElementById('sceneSelect');
const sceneResetBtn = document.getElementById('sceneResetBtn');
const sceneClearOnceBtn = document.getElementById('sceneClearOnceBtn');
const sceneNewBtn = document.getElementById('sceneNewBtn');
const languageSelect = document.getElementById('languageSelect');
editorPanel = document.getElementById('editorPanel');
const editorUtilityPanel = document.getElementById('editorUtilityPanel');
const editorCollapseToggle = document.getElementById('editorCollapseToggle');
const utilityCollapseToggle = document.getElementById('utilityCollapseToggle');
const rawToggle = document.getElementById('rawToggle');
const headerApply = document.getElementById('headerApply');
autoReloadHeader = document.getElementById('autoReloadHeader');
editorJson = document.getElementById('editorJson');
const editorApply = document.getElementById('editorApply');
const editorReset = document.getElementById('editorReset');
const editorDownload = document.getElementById('editorDownload');
const editorQuickAdd = document.getElementById('editorQuickAdd');
const editorHistoryList = document.getElementById('editorHistoryList');
const historySection = document.getElementById('historySection');
const editorUndo = document.getElementById('editorUndo');
const editorRedo = document.getElementById('editorRedo');
const historySnapshotMinutes = document.getElementById('historySnapshotMinutes');
const editorOptionResetPanels = document.getElementById('editorOptionResetPanels');
const editorOptionOpenGroups = document.getElementById('editorOptionOpenGroups');
const editorOptionCloseGroups = document.getElementById('editorOptionCloseGroups');
const editorOptionToggleRaw = document.getElementById('editorOptionToggleRaw');
const editorOptionClearPeel = document.getElementById('editorOptionClearPeel');
const editorOptionClearHistory = document.getElementById('editorOptionClearHistory');
const editorOptionResetApp = document.getElementById('editorOptionResetApp');
const EDITOR_HISTORY_KEY = 'tirita.editorHistory';
const EDITOR_UNDO_KEY    = 'tirita.editorUndoRedo';
const EDITOR_HISTORY_MAX = 20;
const EDITOR_UNDO_MAX    = 20;
let historyAutoSaveTimer = null;
// Tracks the last config string that was pushed to the undo stack (or the page-load config).
// maybePushUndo receives the *incoming* new config string and pushes lastUndoPushedStr if different.
let lastUndoPushedStr = localStorage.getItem('tirita.pieceConfig');
const bulkTextInput = document.getElementById('bulkTextInput');
const bulkPeelMode = document.getElementById('bulkPeelMode');
const bulkStarterMode = document.getElementById('bulkStarterMode');
const bulkStarterFixed = document.getElementById('bulkStarterFixed');
const bulkStarterMin = document.getElementById('bulkStarterMin');
const bulkStarterMax = document.getElementById('bulkStarterMax');
const bulkImportReplace = document.getElementById('bulkImportReplace');
const bulkImportAppend = document.getElementById('bulkImportAppend');
const labTrueText = document.getElementById('labTrueText');
const labDecoyText = document.getElementById('labDecoyText');
const labThreads = document.getElementById('labThreads');
const labRows = document.getElementById('labRows');
const labWidth = document.getElementById('labWidth');
const labSpacing = document.getElementById('labSpacing');
const labJitter = document.getElementById('labJitter');
const labSeed = document.getElementById('labSeed');
const labGenReplace = document.getElementById('labGenReplace');
const labGenAppend = document.getElementById('labGenAppend');
const blockSelect = document.getElementById('blockSelect');
const blockText = document.getElementById('blockText');
const bbColorBtn = document.getElementById('bbColorBtn');
const bbColorPicker = document.getElementById('bbColorPicker');
const bbMoreToggle = document.getElementById('bbMoreToggle');
const bbGradientBtn = document.getElementById('bbGradientBtn');
const bbGradientPreset = document.getElementById('bbGradientPreset');
const bbFontBtn = document.getElementById('bbFontBtn');
const bbFontValue = document.getElementById('bbFontValue');
const bbSizeBtn = document.getElementById('bbSizeBtn');
const bbSizeValue = document.getElementById('bbSizeValue');
const bbUrlBtn = document.getElementById('bbUrlBtn');
const bbUrlValue = document.getElementById('bbUrlValue');
const blockAdd = document.getElementById('blockAdd');
const blockRemove = document.getElementById('blockRemove');
const copyBlockIdBtn = document.getElementById('copyBlockIdBtn');
const peelFromBeginningInput = document.getElementById('peelFromBeginningInput');
const peelStartLabel = document.getElementById('peelStartLabel');
const peelModeInput = document.getElementById('peelModeInput');
const starterLettersInput = document.getElementById('starterLettersInput');
const peelPointsList = document.getElementById('peelPointsList');
const peelPointAddLeft = document.getElementById('peelPointAddLeft');
const peelPointAddRight = document.getElementById('peelPointAddRight');
const drawTextEnabled = document.getElementById('drawTextEnabled');
const drawTextFields = document.getElementById('drawTextFields');
const drawTextSpacing = document.getElementById('drawTextSpacing');
const drawTextAngleMix = document.getElementById('drawTextAngleMix');
const drawTextToolStatus = document.getElementById('drawTextToolStatus');
const drawTextToolButtons = [...document.querySelectorAll('[data-draw-text-tool]')];
const drawTextClearBtn = document.getElementById('drawTextClearBtn');
const drawTextExampleWave = document.getElementById('drawTextExampleWave');
const drawTextExampleSpiral = document.getElementById('drawTextExampleSpiral');
const drawTextExampleMargin = document.getElementById('drawTextExampleMargin');
const drawTextExampleUnderline = document.getElementById('drawTextExampleUnderline');
const drawTextExampleFall = document.getElementById('drawTextExampleFall');
const drawTextExampleLoop = document.getElementById('drawTextExampleLoop');
pauseInput = document.getElementById('pauseInput');
const editorPalette = document.getElementById('editorPalette');
const fadeRevealInput = document.getElementById('fadeRevealInput');
const persistPeelInput = document.getElementById('persistPeelInput');
const peelSeqSelector = document.getElementById('peelSeqSelector');
const peelHandlesRow = document.getElementById('peelHandlesRow');
const reflowAnchorsInput = document.getElementById('reflowAnchorsInput');
const reflowMotionInput = document.getElementById('reflowMotionInput');
const shrinkGapsInput = document.getElementById('shrinkGapsInput');
const popGridInput = document.getElementById('popGridInput');
const motionOrbitInput = document.getElementById('motionOrbitInput');
const motionOrbitFields = document.getElementById('motionOrbitFields');
const motionOrbitCx = document.getElementById('motionOrbitCx');
const motionOrbitCy = document.getElementById('motionOrbitCy');
const motionOrbitRadius = document.getElementById('motionOrbitRadius');
const motionOrbitStrength = document.getElementById('motionOrbitStrength');
const motionOrbitSpin = document.getElementById('motionOrbitSpin');
const motionOrbitBand = document.getElementById('motionOrbitBand');
const motionBuoyancyInput = document.getElementById('motionBuoyancyInput');
const motionBuoyancyFields = document.getElementById('motionBuoyancyFields');
const motionBuoyancyStrength = document.getElementById('motionBuoyancyStrength');
const motionBuoyancyLift = document.getElementById('motionBuoyancyLift');
const motionBuoyancyWave = document.getElementById('motionBuoyancyWave');
const motionBuoyancyDrift = document.getElementById('motionBuoyancyDrift');
const motionBuoyancyFrequency = document.getElementById('motionBuoyancyFrequency');
const motionLineLockInput = document.getElementById('motionLineLockInput');
const motionLineLockFields = document.getElementById('motionLineLockFields');
const motionLineLockStrength = document.getElementById('motionLineLockStrength');
const motionLineLockDamping = document.getElementById('motionLineLockDamping');
const motionPalindromeInput = document.getElementById('motionPalindromeInput');
const motionPalindromeFields = document.getElementById('motionPalindromeFields');
const motionPalindromeLineGap = document.getElementById('motionPalindromeLineGap');
const motionPalindromeStrength = document.getElementById('motionPalindromeStrength');
const motionPalindromeDamping = document.getElementById('motionPalindromeDamping');
const motionPalindromeManual = document.getElementById('motionPalindromeManual');
const motionPalindromeLoop = document.getElementById('motionPalindromeLoop');
function getPeelSeqMode() {
  return peelSeqSelector?.querySelector('button.active')?.dataset?.peelMode ?? 'none';
}
function setPeelSeqMode(mode) {
  peelSeqSelector?.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.peelMode === mode));
}
function updatePeelHandlesRowVisibility() {
  if (!peelHandlesRow) return;
  const hasPeelTags = /\[peel\]/i.test(blockText?.value ?? '');
  const display = hasPeelTags ? '' : 'none';
  peelHandlesRow.style.display = hasPeelTags ? 'grid' : 'none';
  if (peelSeqSelector) peelSeqSelector.style.display = display;
  const reflowRow = document.getElementById('reflowAnchorsRow');
  if (reflowRow) reflowRow.style.display = display;
  const reflowMotionRow = document.getElementById('reflowMotionRow');
  if (reflowMotionRow) reflowMotionRow.style.display = display;
}
function updateLetterMotionFieldVisibility() {
  // Each motion is a card; toggling `.active` expands it (CSS reveals the fields).
  const setMotionActive = (input, fields) => {
    fields?.closest('.letter-motion-item')?.classList.toggle('active', !!input?.checked);
  };
  setMotionActive(motionOrbitInput, motionOrbitFields);
  setMotionActive(motionBuoyancyInput, motionBuoyancyFields);
  setMotionActive(motionLineLockInput, motionLineLockFields);
  setMotionActive(motionPalindromeInput, motionPalindromeFields);
}
const dragHintInput = document.getElementById('dragHintInput');
const dragHintFields = document.getElementById('dragHintFields');
const dragHintPeelPoint = document.getElementById('dragHintPeelPoint');
const dragHintAppearMs = document.getElementById('dragHintAppearMs');
const dragHintTextMs = document.getElementById('dragHintTextMs');
const dragHintText = document.getElementById('dragHintText');
const fadeRevealVisible = document.getElementById('fadeRevealVisible');
const fadeRevealSteps = document.getElementById('fadeRevealSteps');
const stepParagraphsInput = document.getElementById('stepParagraphsInput');
const compactFlowInput = document.getElementById('compactFlowInput');
const visibleParagraphs = document.getElementById('visibleParagraphs');
const blockVisibleOverride = document.getElementById('blockVisibleOverride');
const globalStepAdvanceDelay = document.getElementById('globalStepAdvanceDelay');
const stepAdvanceDelay = document.getElementById('stepAdvanceDelay');
const fadeRevealFields = document.getElementById('fadeRevealFields');
const stepParagraphFields = document.getElementById('stepParagraphFields');
const layersEnabledInput = document.getElementById('layersEnabledInput');
const layersFields = document.getElementById('layersFields');
const layersBleedInput = document.getElementById('layersBleedInput');
const layersHideCompletedInput = document.getElementById('layersHideCompletedInput');
const layersRevealOpacity = document.getElementById('layersRevealOpacity');
const layerGroupInput = document.getElementById('layerGroupInput');
const layerDepthInput = document.getElementById('layerDepthInput');
const layerRevealOpacityBlock = document.getElementById('layerRevealOpacityBlock');
const shapeToggle = document.getElementById('shapeToggle');
const shapeOpacity = document.getElementById('shapeOpacity');
const shapeTypeSelect = document.getElementById('shapeTypeSelect');
const shapeCustomPathD = document.getElementById('shapeCustomPathD');
const shapeScale = document.getElementById('shapeScale');
const shapeRotation = document.getElementById('shapeRotation');
const shapeClipOverflow = document.getElementById('shapeClipOverflow');
const paragraphGapInput = document.getElementById('paragraphGapInput');
const blockXInput = document.getElementById('blockXInput');
const blockYInput = document.getElementById('blockYInput');
const blockScaleInput = document.getElementById('blockScaleInput');
const blockOpacityRange = document.getElementById('blockOpacityRange');
const blockOpacityInput = document.getElementById('blockOpacityInput');
const blockWidthInput = document.getElementById('blockWidthInput');
const blockHeightInput = document.getElementById('blockHeightInput');
const colorModeButtons = [...document.querySelectorAll('#colorModeButtons button')];
const desktopDynamicLimit = document.getElementById('desktopDynamicLimit');
const mobileDynamicLimit = document.getElementById('mobileDynamicLimit');
const initialPeelActiveBlocks = document.getElementById('initialPeelActiveBlocks');
const fontSearch = document.getElementById('fontSearch');
const solidTools = document.getElementById('solidTools');
const paletteEditRow = document.getElementById('paletteEditRow');
const gradientTools = document.getElementById('gradientTools');
const variationTools = document.getElementById('variationTools');
const variationStrength = document.getElementById('variationStrength');
const gradientAngle = document.getElementById('gradientAngle');
const gradientRadiusX = document.getElementById('gradientRadiusX');
const gradientRadiusY = document.getElementById('gradientRadiusY');
const gradientStops = document.getElementById('gradientStops');
const gradientStopAdd = document.getElementById('gradientStopAdd');
const gradientPresetPalette = document.getElementById('gradientPresetPalette');
const gradientPresetSave = document.getElementById('gradientPresetSave');
const gradientPresetDelete = document.getElementById('gradientPresetDelete');
const blockColor = document.getElementById('blockColor');
const backgroundColor = document.getElementById('backgroundColor');
const attachTypeSelect  = document.getElementById('attachTypeSelect');
const attachFields      = document.getElementById('attachFields');
const attachLabelRow    = document.getElementById('attachLabelRow');
const attachSrcRow      = document.getElementById('attachSrcRow');
const attachLooseSrcRow         = document.getElementById('attachLooseSrcRow');
const attachSvgOpacityRow       = document.getElementById('attachSvgOpacityRow');
const attachStrokeResistanceRow = document.getElementById('attachStrokeResistanceRow');
const attachLabel               = document.getElementById('attachLabel');
const shapeTypeRow              = document.getElementById('shapeTypeRow');
const shapeCustomPathDRow       = document.getElementById('shapeCustomPathDRow');
const shapeFields               = document.getElementById('shapeFields');
const shapeOpacityRow           = document.getElementById('shapeOpacityRow');
const shapeScaleRow             = document.getElementById('shapeScaleRow');
const shapeRotationRow          = document.getElementById('shapeRotationRow');
const shapeClipOverflowRow      = document.getElementById('shapeClipOverflowRow');
const attachSrc         = document.getElementById('attachSrc');
const attachLooseSrc          = document.getElementById('attachLooseSrc');
const attachSrcSelect         = document.getElementById('attachSrcSelect');
const attachLooseSrcSelect    = document.getElementById('attachLooseSrcSelect');
const attachOpen              = document.getElementById('attachOpen');
const attachLooseOpen         = document.getElementById('attachLooseOpen');
const roughPresetSelect       = document.getElementById('roughPresetSelect');
const roughPresetRow          = document.getElementById('roughPresetRow');
const lineartPeelTuningRows   = document.getElementById('lineartPeelTuningRows');
const roughLineQuantity       = document.getElementById('roughLineQuantity');
const roughLineQuantityValue  = document.getElementById('roughLineQuantityValue');
const roughLinePrecision      = document.getElementById('roughLinePrecision');
const roughLinePrecisionValue = document.getElementById('roughLinePrecisionValue');
const roughInitialPeeled      = document.getElementById('roughInitialPeeled');
const roughInitialPeeledValue = document.getElementById('roughInitialPeeledValue');
const roughStrokeWidth        = document.getElementById('roughStrokeWidth');
const roughStrokeWidthValue   = document.getElementById('roughStrokeWidthValue');
const lineartCanvasToolRow    = document.getElementById('lineartCanvasToolRow');
const lineartBrushSize        = document.getElementById('lineartBrushSize');
const lineartToolStatus       = document.getElementById('lineartToolStatus');
const lineartToolButtons      = [...document.querySelectorAll('[data-lineart-tool]')];
const attachSvgOpacity        = document.getElementById('attachSvgOpacity');
const attachStrokeResistance  = document.getElementById('attachStrokeResistance');
const attachX                 = document.getElementById('attachX');
const attachY                 = document.getElementById('attachY');
const attachScale             = document.getElementById('attachScale');
const attachScaleValue        = document.getElementById('attachScaleValue');
const attachOpacity           = document.getElementById('attachOpacity');
const attachOpacityValue      = document.getElementById('attachOpacityValue');
const attachWidth             = document.getElementById('attachWidth');
const attachHeight            = document.getElementById('attachHeight');
const attachGap               = document.getElementById('attachGap');
const attachOffsetY           = document.getElementById('attachOffsetY');
const timedBtnDelay    = document.getElementById('timedBtnDelay');
const timedBtnLabel    = document.getElementById('timedBtnLabel');
const timedBtnAction   = document.getElementById('timedBtnAction');
const timedBtnAddText  = document.getElementById('timedBtnAddText');
const timedBtnAddTextRow = document.getElementById('timedBtnAddTextRow');
const timedBtnUrl      = document.getElementById('timedBtnUrl');
const timedBtnUrlRow   = document.getElementById('timedBtnUrlRow');
const timedBtnSpawnAt  = document.getElementById('timedBtnSpawnAt');
const blockHiddenToggle = document.getElementById('blockHiddenToggle');
const timedBtnEnabled = document.getElementById('timedBtnEnabled');
const timedBtnFields = document.getElementById('timedBtnFields');
const timedBtnEnable   = document.getElementById('timedBtnEnable');
const timedBtnDisable  = document.getElementById('timedBtnDisable');
const eventTriggerList = document.getElementById('eventTriggerList');
const eventTriggerAdd = document.getElementById('eventTriggerAdd');
const forceFieldList = document.getElementById('forceFieldList');
const forceFieldAddWind = document.getElementById('forceFieldAddWind');
const forceFieldAddMagnet = document.getElementById('forceFieldAddMagnet');
const forceFieldAddCursor = document.getElementById('forceFieldAddCursor');
const editorTabs = document.getElementById('editorTabs');
textReloadTimer = null;
autoReloadHeader.checked = autoReloadPref;
pauseInput.checked = pausePref;

function refreshEditorJson() {
  editorJson.value = JSON.stringify(pieceConfig, null, 2);
}

getMutableConfigFromEditor = function getMutableConfigFromEditor() {
  try {
    return JSON.parse(editorJson.value);
  } catch {
    return structuredClone(pieceConfig);
  }
}

setEditorConfig = function setEditorConfig(nextConfig) {
  editorJson.value = JSON.stringify(nextConfig, null, 2);
  refreshVisualEditor(nextConfig);
}

function getForceFieldsFromEditor() {
  return currentForceFields.map(field => structuredClone(field));
}

function setForceFieldsInEditor(fields) {
  currentForceFields = Array.isArray(fields) ? fields.map(field => structuredClone(field)) : []; state.currentForceFields = currentForceFields;
  renderForceFields();
}

function addForceFieldToEditor(field) {
  currentForceFields.push(field);
  renderForceFields();
  applyLiveEditorState();
}

let activeEditorTab = localStorage.getItem('tirita.editorTab') || 'content';
if (!['content', 'design', 'behavior'].includes(activeEditorTab)) activeEditorTab = 'content';
function assignEditorTabs() {
  document.querySelectorAll('[data-editor-tab]').forEach(el => el.removeAttribute('data-editor-tab'));
  document.querySelector('#contentMetaRow')?.setAttribute('data-editor-tab', 'content');
  blockSelect.closest('.editor-row')?.setAttribute('data-editor-tab', 'content');
  blockText.closest('.editor-row')?.setAttribute('data-editor-tab', 'content');
  [...editorPanel.querySelectorAll('.editor-section')].forEach(section => {
    const title = section.querySelector('summary')?.textContent?.trim().toLowerCase() || '';
    if (title === 'peel') section.dataset.editorTab = 'content';
    if (title === 'color' || title === 'illustration' || title === 'shape constraint' || title === 'draw text path') section.dataset.editorTab = 'design';
    if (title === 'dynamics' || title === 'layers' || title === 'timed button' || title === 'events & effects' || title === 'force fields' || title === 'global' || title === 'bulk import' || title === 'history') section.dataset.editorTab = 'behavior';
  });
  fontSearch.closest('.editor-row')?.setAttribute('data-editor-tab', 'design');
}

function setEditorTab(tab) {
  activeEditorTab = tab;
  localStorage.setItem('tirita.editorTab', tab);
  editorTabs.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('[data-editor-tab]').forEach(el => {
    el.classList.toggle('editor-tab-hidden', el.dataset.editorTab !== tab);
  });
}

function setPanelCollapsed(panel, button, collapsed) {
  if (!panel) return;
  const isCollapsing = Boolean(collapsed);
  if (isCollapsing) {
    const rect = panel.getBoundingClientRect();
    if (rect.height > 46) panel.dataset.lastOpenHeight = String(rect.height);
  }
  panel.classList.toggle('collapsed', Boolean(collapsed));
  if (isCollapsing) {
    panel.style.height = 'auto';
  } else {
    const lastOpenHeight = Number(panel.dataset.lastOpenHeight);
    if (Number.isFinite(lastOpenHeight) && lastOpenHeight > 46) panel.style.height = `${lastOpenHeight}px`;
    else panel.style.height = '';
  }
  if (button) button.textContent = collapsed ? '⌄' : '⌃';
}
setPanelCollapsed(editorPanel, editorCollapseToggle, localStorage.getItem('tirita.editorCollapsed') === '1');
setPanelCollapsed(editorUtilityPanel, utilityCollapseToggle, localStorage.getItem('tirita.utilityCollapsed') === '1');

const PANEL_LAYOUT_PREFIX = 'tirita.panelLayout.v2.';

function clampPanelRect(rect) {
  const margin = 8;
  const width = Math.min(Math.max(rect.width, 320), Math.max(320, window.innerWidth - margin * 2));
  const height = Math.min(Math.max(rect.height, 46), Math.max(46, window.innerHeight - margin * 2));
  return {
    left: Math.min(Math.max(rect.left, margin), Math.max(margin, window.innerWidth - width - margin)),
    top: Math.min(Math.max(rect.top, margin), Math.max(margin, window.innerHeight - height - margin)),
    width,
    height
  };
}

function writePanelLayout(panel, layout) {
  if (!panel || !layout) return;
  panel.style.right = 'auto';
  panel.style.left = `${layout.left}px`;
  panel.style.top = `${layout.top}px`;
  panel.style.width = `${layout.width}px`;
  panel.style.height = panel.classList.contains('collapsed') ? 'auto' : `${layout.height}px`;
}

function getPanelLayout(panel) {
  const rect = panel.getBoundingClientRect();
  return clampPanelRect({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: Math.max(rect.height, Number(panel.dataset.lastOpenHeight || rect.height))
  });
}

function savePanelLayout(panel, key) {
  if (!panel || !key) return;
  const rect = panel.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  const layout = getPanelLayout(panel);
  if (!panel.classList.contains('collapsed')) panel.dataset.lastOpenHeight = String(layout.height);
  try { localStorage.setItem(`${PANEL_LAYOUT_PREFIX}${key}`, JSON.stringify(layout)); } catch {}
}

function restorePanelLayout(panel, key) {
  if (!panel || !key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(`${PANEL_LAYOUT_PREFIX}${key}`) || 'null');
    if (saved) writePanelLayout(panel, clampPanelRect(saved));
  } catch {}
}

function resetPanelLayouts() {
  localStorage.removeItem(`${PANEL_LAYOUT_PREFIX}scene`);
  localStorage.removeItem(`${PANEL_LAYOUT_PREFIX}tools`);
  localStorage.removeItem('tirita.panelLayout.scene');
  localStorage.removeItem('tirita.panelLayout.tools');
  [editorPanel, editorUtilityPanel].forEach(panel => {
    if (!panel) return;
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.dataset.lastOpenHeight = '';
  });
}

function makePanelDraggable(panel, key) {
  if (!panel) return;
  const header = panel.querySelector('header');
  if (!header) return;
  restorePanelLayout(panel, key);
  let resizeTimer = null;
  const resizeObserver = new ResizeObserver(() => {
    if (!panel.isConnected || panel.classList.contains('collapsed')) return;
    const rect = panel.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => savePanelLayout(panel, key), 140);
  });
  resizeObserver.observe(panel);
  header.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('button, label, input, select, textarea, a, summary')) return;
    const start = getPanelLayout(panel);
    writePanelLayout(panel, start);
    const pointerStart = { x: event.clientX, y: event.clientY };
    header.setPointerCapture?.(event.pointerId);
    panel.classList.add('dragging-panel');
    event.preventDefault();
    const move = (moveEvent) => {
      const next = clampPanelRect({
        ...start,
        left: start.left + moveEvent.clientX - pointerStart.x,
        top: start.top + moveEvent.clientY - pointerStart.y
      });
      writePanelLayout(panel, next);
    };
    const up = () => {
      header.removeEventListener('pointermove', move);
      header.removeEventListener('pointerup', up);
      header.removeEventListener('pointercancel', up);
      panel.classList.remove('dragging-panel');
      savePanelLayout(panel, key);
    };
    header.addEventListener('pointermove', move);
    header.addEventListener('pointerup', up);
    header.addEventListener('pointercancel', up);
  });
}

makePanelDraggable(editorPanel, 'scene');
makePanelDraggable(editorUtilityPanel, 'tools');

getEditableBlocks = function getEditableBlocks(config) {
  config.blocks ||= [];
  return config.blocks;
}

// Color Picker tracking for Palette
let lastFocusedColorInput = blockColor;
[blockColor, backgroundColor].forEach(input => {
  input.addEventListener('focus', () => lastFocusedColorInput = input);
  input.addEventListener('mousedown', () => lastFocusedColorInput = input);
});

let isPaletteEditing = false;

function setActiveColorMode(mode) {
  activeColorMode = mode;
  colorModeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  variationTools.style.display = mode === 'variation' ? 'grid' : 'none';
  gradientTools.classList.toggle('open', mode === 'linear' || mode === 'radial' || mode === 'sequential');
  gradientAngle.closest('.editor-row').style.display = (mode === 'linear' || mode === 'sequential') ? 'grid' : 'none';
  gradientRadiusX.closest('.editor-row').style.display = mode === 'radial' ? 'grid' : 'none';
  gradientRadiusY.closest('.editor-row').style.display = mode === 'radial' ? 'grid' : 'none';
}

function collectGradientFromControls() {
  return {
    type: activeColorMode === 'radial' ? 'radial' : 'linear',
    angle: Number(gradientAngle.value) || 0,
    centerX: Number(gradientRadiusX.value) || 50,
    centerY: Number(gradientRadiusY.value) || 50,
    stops: currentGradientStops.map(stop => ({ ...stop }))
  };
}

function renderGradientStops() {
  gradientStops.innerHTML = '';
  currentGradientStops.forEach((stop, idx) => {
    const row = document.createElement('div');
    row.className = 'gradient-stop-item';
    row.innerHTML = `
      <input class="gradient-stop-color" type="color" value="${stop.color}">
      <div class="gradient-stop-slider">
        <span>Alpha</span>
        <input class="gradient-stop-alpha-range" type="range" value="${stop.alpha}" min="0" max="1" step="0.01">
        <input class="gradient-stop-alpha" type="number" value="${stop.alpha}" min="0" max="1" step="0.01" data-help="Opacity for this gradient stop">
      </div>
      <div class="gradient-stop-slider">
        <span>Pos</span>
        <input class="gradient-stop-pos-range" type="range" value="${stop.position}" min="0" max="100" step="1">
        <input class="gradient-stop-pos" type="number" value="${stop.position}" min="0" max="100" data-help="Position of this gradient stop">
      </div>
      <button type="button" class="danger-icon-button" data-help="Delete this color stop">×</button>
    `;
    const colorIn = row.querySelector('.gradient-stop-color');
    const alphaRange = row.querySelector('.gradient-stop-alpha-range');
    const alphaIn = row.querySelector('.gradient-stop-alpha');
    const posRange = row.querySelector('.gradient-stop-pos-range');
    const posIn = row.querySelector('.gradient-stop-pos');
    const removeBtn = row.querySelector('button');
    const update = () => {
      stop.color = colorIn.value;
      stop.alpha = Number(alphaIn.value);
      stop.position = Number(posIn.value);
      alphaRange.value = alphaIn.value;
      posRange.value = posIn.value;
      applyLiveEditorState();
    };
    const updateAlphaFromRange = () => {
      alphaIn.value = alphaRange.value;
      update();
    };
    const updatePosFromRange = () => {
      posIn.value = posRange.value;
      update();
    };
    colorIn.addEventListener('input', update);
    alphaIn.addEventListener('input', update);
    posIn.addEventListener('input', update);
    alphaRange.addEventListener('input', updateAlphaFromRange);
    posRange.addEventListener('input', updatePosFromRange);
    removeBtn.addEventListener('click', () => {
      if (currentGradientStops.length > 2) {
        currentGradientStops.splice(idx, 1);
        renderGradientStops();
        applyLiveEditorState();
      }
    });
    gradientStops.appendChild(row);
  });
}

paletteEditBtn.addEventListener('click', () => {
  isPaletteEditing = !isPaletteEditing;
  paletteEditBtn.textContent = isPaletteEditing ? '✔' : '✎';
  paletteEditBtn.classList.toggle('active', isPaletteEditing);
  initPalette();
});

function initPalette(colors) {
  const targetColors = colors || currentPalette || DEFAULT_PALETTE;
  editorPalette.innerHTML = '';
  targetColors.forEach((hex, idx) => {
    const swatch = document.createElement('div');
    swatch.className = 'palette-swatch' + (isPaletteEditing ? ' is-editing' : '');
    swatch.style.background = hex;
    swatch.addEventListener('click', () => {
      if (isPaletteEditing) {
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.value = hex;
        picker.oninput = () => {
          currentPalette[idx] = picker.value;
          swatch.style.background = picker.value;
          localStorage.setItem('tirita.palette', JSON.stringify(currentPalette));
        };
        picker.click();
      } else {
        lastFocusedColorInput.value = hex;
        applyLiveEditorState();
      }
    });
    editorPalette.appendChild(swatch);
  });
}

function renderGradientPresetOptions() {
  if (!bbGradientPreset) return;
  const selected = bbGradientPreset.value;
  bbGradientPreset.innerHTML = '';
  gradientPresetPalette.innerHTML = '';
  currentGradientPresets.forEach((preset, idx) => {
    const option = document.createElement('option');
    option.value = preset.name;
    option.textContent = preset.name;
    bbGradientPreset.appendChild(option);
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'gradient-preset-swatch';
    swatch.title = preset.name;
    swatch.dataset.help = `Apply gradient preset: ${preset.name}`;
    swatch.style.background = gradientToCss({ colorMode: 'linear', gradient: { angle: preset.angle ?? 90, stops: preset.stops } });
    swatch.addEventListener('click', () => {
      currentGradientStops = normalizeGradient({ angle: preset.angle ?? 90, stops: preset.stops }).stops; state.currentGradientStops = currentGradientStops;
      gradientAngle.value = preset.angle ?? 90;
      setActiveColorMode('linear');
      renderGradientStops();
      applyLiveEditorState();
    });
    gradientPresetPalette.appendChild(swatch);
  });
  if ([...bbGradientPreset.options].some(option => option.value === selected)) bbGradientPreset.value = selected;
}

function wrapBlockSelection(openTag, closeTag = null) {
  const start = blockText.selectionStart ?? blockText.value.length;
  const end = blockText.selectionEnd ?? start;
  const before = blockText.value.slice(0, start);
  const selected = blockText.value.slice(start, end);
  const after = blockText.value.slice(end);
  const closing = closeTag ?? openTag.replace(/^\[([a-z]+)(?:=[^\]]+)?\]$/i, '[/$1]');
  blockText.value = `${before}${openTag}${selected}${closing}${after}`;
  const nextStart = start + openTag.length;
  const nextEnd = nextStart + selected.length;
  blockText.focus();
  blockText.setSelectionRange(nextStart, nextEnd);
  blockText.dispatchEvent(new Event('input', { bubbles: true }));
}

function updateShapeFieldVisibility() {
  const shapeEnabled = shapeToggle.checked;
  shapeFields.style.display = shapeEnabled ? 'grid' : 'none';
  shapeOpacityRow.style.display = shapeEnabled ? 'grid' : 'none';
  shapeScaleRow.style.display = shapeEnabled ? 'grid' : 'none';
  shapeRotationRow.style.display = shapeEnabled ? 'grid' : 'none';
  shapeClipOverflowRow.style.display = shapeEnabled ? 'flex' : 'none';
  shapeTypeRow.style.display = shapeEnabled ? 'grid' : 'none';
  shapeCustomPathDRow.style.display = (shapeEnabled && shapeTypeSelect.value === 'custom') ? 'grid' : 'none';
}

function updateDrawTextFieldVisibility() {
  if (!drawTextFields) return;
  drawTextFields.style.display = drawTextEnabled?.checked ? 'grid' : 'none';
  if (!drawTextEnabled?.checked) setDrawTextTool('off');
}
shapeToggle.addEventListener('change', updateShapeFieldVisibility);
shapeTypeSelect.addEventListener('change', updateShapeFieldVisibility);
// Initial call to set correct visibility on load
updateShapeFieldVisibility();

function updateAttachFieldVisibility() {
  const t = attachTypeSelect.value;
  attachFields.style.display              = t ? 'grid' : 'none';
  attachLabelRow.style.display            = t === 'placeholder' ? 'grid' : 'none';
  attachSrcRow.style.display              = (t === 'image' || t === 'lineart') ? 'grid' : 'none';
  attachLooseSrcRow.style.display         = t === 'lineart' ? 'grid' : 'none';
  roughPresetRow.style.display            = t === 'lineart' ? 'grid' : 'none';
  lineartPeelTuningRows.style.display     = t === 'lineart' ? 'grid' : 'none';
  lineartCanvasToolRow.style.display      = t === 'lineart' ? 'grid' : 'none';
  attachSvgOpacityRow.style.display       = t === 'lineart' ? 'grid' : 'none';
  attachStrokeResistanceRow.style.display = t === 'lineart' ? 'grid' : 'none';
  if (t !== 'lineart') setLineartCanvasTool('off');
  updateShapeFieldVisibility(); // Re-evaluate shape visibility when attachment changes
  // All other attach fields are handled by their parent attachFields div
}

const localeSyncControlGroups = {
  attachment: () => [
    attachTypeSelect, attachLabel, attachSrc, attachSrcSelect, attachLooseSrc, attachLooseSrcSelect,
    attachSvgOpacity, attachStrokeResistance, roughPresetSelect, roughLineQuantity, roughLineQuantityValue,
    roughLinePrecision, roughLinePrecisionValue, roughInitialPeeled, roughInitialPeeledValue,
    roughStrokeWidth, roughStrokeWidthValue, attachScale, attachScaleValue, attachOpacity,
    attachOpacityValue, attachWidth, attachHeight, attachGap, attachOffsetY, attachX, attachY
  ],
  peel: () => [
    peelFromBeginningInput, persistPeelInput, peelModeInput, peelSeqSelector, reflowAnchorsInput, shrinkGapsInput, popGridInput,
    motionOrbitInput, motionOrbitCx, motionOrbitCy, motionOrbitRadius, motionOrbitStrength, motionOrbitSpin, motionOrbitBand,
    motionBuoyancyInput, motionBuoyancyStrength, motionBuoyancyLift, motionBuoyancyWave, motionBuoyancyDrift, motionBuoyancyFrequency,
    motionLineLockInput, motionLineLockStrength, motionLineLockDamping,
    motionPalindromeInput, motionPalindromeLineGap, motionPalindromeStrength, motionPalindromeDamping, motionPalindromeManual, motionPalindromeLoop
  ],
  peelPoints: () => [peelPointsList, peelPointAddLeft, peelPointAddRight],
  breakPoints: () => [breakPointsList, breakPointAdd, breakPointsHeaderRow],
  hint: () => [dragHintInput, dragHintPeelPoint, dragHintAppearMs, dragHintTextMs, dragHintText],
  transform: () => [blockXInput, blockYInput, blockScaleInput, blockWidthInput, blockHeightInput],
  style: () => [
    fontSearch, blockColor, blockOpacityRange, blockOpacityInput, ...colorModeButtons,
    variationStrength, gradientAngle, gradientRadiusX, gradientRadiusY, gradientStops
  ],
  clipShape: () => [shapeToggle, shapeTypeSelect, shapeCustomPathD, shapeOpacity, shapeScale, shapeRotation, shapeClipOverflow],
  drawPath: () => [drawTextEnabled, drawTextSpacing, drawTextAngleMix, drawTextToolButtons[0], drawTextToolButtons[1], drawTextClearBtn],
  timedButton: () => [timedBtnEnabled, timedBtnDelay, timedBtnLabel, timedBtnAction, timedBtnAddText, timedBtnUrl, timedBtnSpawnAt, timedBtnEnable, timedBtnDisable],
  triggers: () => [eventTriggerList, eventTriggerAdd],
  hidden: () => [blockHiddenToggle]
};
const localeSyncFieldLabels = {
  attachment: 'illustration',
  transform: 'layout',
  style: 'style',
  peel: 'peel settings',
  peelPoints: 'peel points',
  breakPoints: 'seam points',
  hint: 'drag hint',
  clipShape: 'shape',
  drawPath: 'draw path',
  timedButton: 'timed button',
  triggers: 'events',
  hidden: 'visibility'
};
const localeSyncMenu = document.createElement('div');
localeSyncMenu.className = 'locale-sync-menu';
localeSyncMenu.innerHTML = '<button type="button">Use main language value</button>';
document.body.appendChild(localeSyncMenu);

function hideLocaleSyncMenu() {
  localeSyncMenu.style.display = 'none';
  localeSyncMenu.dataset.field = '';
}

function hasLocaleOverrideForField(block, idx, field, locale = storedLocale) {
  if (locale === getMainLocale()) return false;
  const record = loadAttachmentSyncStore().blocks[getAttachmentSyncBlockKey(block, idx)];
  if (!record) return false;
  if (field === 'attachment') return Boolean(record.locales?.[locale]?.diverged);
  return Boolean(record.fields?.[field]?.locales?.[locale]?.diverged);
}

function resetLocaleOverrideForField(block, idx, field, locale = storedLocale) {
  const store = loadAttachmentSyncStore();
  const record = store.blocks[getAttachmentSyncBlockKey(block, idx)];
  if (!record) return false;
  if (field === 'attachment') {
    if (!record.locales?.[locale]) return false;
    delete record.locales[locale];
  } else {
    if (!record.fields?.[field]?.locales?.[locale]) return false;
    delete record.fields[field].locales[locale];
  }
  saveAttachmentSyncStore(store);
  return true;
}

function updateLocaleSyncMarkers() {
  const block = getEditableBlocks(pieceConfig)[selectedBlockIdx];
  const mainLocale = getMainLocale();
  for (const [field, getControls] of Object.entries(localeSyncControlGroups)) {
    const diverged = pieceConfig?.id === 'tirita-poema' && hasLocaleOverrideForField(block, selectedBlockIdx, field);
    for (const control of getControls()) {
      if (!control) continue;
      if (control.dataset.localeSyncBaseTitle === undefined) control.dataset.localeSyncBaseTitle = control.title || '';
      const baseTitle = control.dataset.localeSyncBaseTitle;
      control.classList.toggle('locale-diverged', diverged);
      if (diverged) control.title = `${baseTitle}\nLanguage-specific ${localeSyncFieldLabels[field] || field} override. Right-click to use ${mainLocale.toUpperCase()} value.`.trim();
      else if (baseTitle) control.title = baseTitle;
      else control.removeAttribute('title');
    }
  }
}

function bindLocaleSyncContextMenus() {
  for (const [field, getControls] of Object.entries(localeSyncControlGroups)) {
    for (const control of getControls()) {
      if (!control || control.dataset.localeSyncContextBound) continue;
      control.dataset.localeSyncContextBound = 'true';
      control.addEventListener('contextmenu', (event) => {
        const block = getEditableBlocks(pieceConfig)[selectedBlockIdx];
        if (!hasLocaleOverrideForField(block, selectedBlockIdx, field)) return;
        event.preventDefault();
        localeSyncMenu.dataset.field = field;
        localeSyncMenu.querySelector('button').textContent = `Use ${getMainLocale().toUpperCase()} ${localeSyncFieldLabels[field] || field}`;
        localeSyncMenu.style.left = `${event.clientX}px`;
        localeSyncMenu.style.top = `${event.clientY}px`;
        localeSyncMenu.style.display = 'block';
      });
    }
  }
  localeSyncMenu.querySelector('button')?.addEventListener('click', () => {
    const field = localeSyncMenu.dataset.field;
    const block = getEditableBlocks(pieceConfig)[selectedBlockIdx];
    hideLocaleSyncMenu();
    if (field && resetLocaleOverrideForField(block, selectedBlockIdx, field)) {
          preserveSceneScrollForReload();
          window.location.reload();
    }
  });
  window.addEventListener('pointerdown', (event) => {
    if (!localeSyncMenu.contains(event.target)) hideLocaleSyncMenu();
  });
}

function setControlValue(control, value) {
  if (!control || value === undefined || value === null) return;
  control.value = String(value);
  if (control.dataset?.numberInput) control.dataset.lastNumericValue = control.value;
}

function secondsInputToMs(value) {
  return Math.max(0, Math.round((Number(value) || 0) * 1000));
}

function msToSecondsInput(value) {
  const ms = Math.max(0, Number(value) || 0);
  if (!ms) return '0';
  return String(Number((ms / 1000).toFixed(2)));
}

function applyLastAttachmentSettingsToControls(type) {
  if (!type) return;
  const currentBlock = getEditableBlocks(getMutableConfigFromEditor())[selectedBlockIdx];
  if (currentBlock?.attachment) return;
  const last = loadLastAttachmentSettings();
  if (!last || !Object.keys(last).length) return;
  setControlValue(attachWidth, last.width ?? 300);
  setControlValue(attachHeight, last.height ?? 180);
  setControlValue(attachScale, last.scale ?? 1);
  syncPairedRange(attachScale, attachScaleValue);
  setControlValue(attachOpacity, last.opacity ?? 1);
  syncPairedRange(attachOpacity, attachOpacityValue);
  setControlValue(attachGap, last.gap ?? 16);
  setControlValue(attachOffsetY, last.opticalOffsetY ?? 0);
  setControlValue(attachX, last.x ?? 0);
  setControlValue(attachY, last.y ?? 0);
  if (type === 'lineart') {
    setControlValue(attachSvgOpacity, last.svgOpacity ?? 0.15);
    setControlValue(attachStrokeResistance, last.strokeResistance ?? 15);
    if (last.roughPreset) roughPresetSelect.value = last.roughPreset;
    setControlValue(roughLineQuantity, last.lineQuantity ?? 30);
    setControlValue(roughLinePrecision, last.linePrecision ?? 1);
    setControlValue(roughInitialPeeled, last.initialPeeled ?? 2);
    setControlValue(roughStrokeWidth, last.lineWidth ?? 1);
    syncPairedRange(roughLineQuantity, roughLineQuantityValue);
    syncPairedRange(roughLinePrecision, roughLinePrecisionValue);
    syncPairedRange(roughInitialPeeled, roughInitialPeeledValue);
    syncPairedRange(roughStrokeWidth, roughStrokeWidthValue);
  }
}

attachTypeSelect.addEventListener('change', () => {
  applyLastAttachmentSettingsToControls(attachTypeSelect.value);
  if (attachTypeSelect.value && illustrationSizeLooksAuto()) {
    setControlValue(attachHeight, 195);
  }
  updateAttachFieldVisibility();
});

function setLineartCanvasTool(tool) {
  lineartAuthoring.tool = lineartAuthoring.tool === tool ? 'off' : tool;
  lineartAuthoring.pointerId = null;
  lineartAuthoring.points = [];
  lineartAuthoring.previewPoint = null;
  lineartToolButtons.forEach(button => button.classList.toggle('active', button.dataset.lineartTool === lineartAuthoring.tool));
  lineartToolButtons.forEach(button => button.setAttribute('aria-pressed', button.dataset.lineartTool === lineartAuthoring.tool ? 'true' : 'false'));
  if (lineartToolStatus) {
    const label = lineartAuthoring.tool === 'draw' ? 'Draw' : lineartAuthoring.tool === 'erase' ? 'Erase' : 'Off';
    lineartToolStatus.textContent = label;
    lineartToolStatus.classList.toggle('active', lineartAuthoring.tool !== 'off');
  }
  document.body.classList.toggle('lineart-authoring-active', lineartAuthoring.tool !== 'off');
  container.style.cursor = lineartAuthoring.tool === 'draw' ? 'crosshair' : lineartAuthoring.tool === 'erase' ? 'not-allowed' : '';
  if (lineartAuthoring.tool !== 'off' && drawTextAuthoring.tool !== 'off') setDrawTextTool('off');
}

function updateEffectFieldVisibility() {
  fadeRevealFields.classList.toggle('open', fadeRevealInput.checked);
  stepParagraphFields.classList.toggle('open', stepParagraphsInput.checked);
  stepParagraphsInput.closest('.effect-item').style.display = 'grid';
  if (layersFields) layersFields.classList.toggle('open', layersEnabledInput.checked);
}

function updateHintFieldVisibility() {
  dragHintFields.classList.toggle('open', dragHintInput.checked);
}

function updateTimedButtonFieldVisibility() {
  timedBtnFields.classList.toggle('open', timedBtnEnabled.checked);
  timedBtnAddTextRow.style.display = (timedBtnEnabled.checked && timedBtnAction.value === 'addText') ? 'grid' : 'none';
  timedBtnUrlRow.style.display = (timedBtnEnabled.checked && timedBtnAction.value === 'url') ? 'grid' : 'none';
}

timedBtnAction.addEventListener('change', () => {
  updateTimedButtonFieldVisibility();
  applyLiveEditorState();
});

timedBtnEnable.addEventListener('click', () => {
  const nextConfig = buildConfigFromVisualControls();
  const blocks = getEditableBlocks(nextConfig);
  const block = blocks[selectedBlockIdx];
  if (!block) return;
  block.timedButton = {
    delayMs: Number(timedBtnDelay.value) || 7000,
    text: timedBtnLabel.value || '→',
    action: timedBtnAction.value || 'none',
    addText: timedBtnAddText.value || '',
    url: timedBtnUrl.value.trim(),
    spawnAt: timedBtnSpawnAt.value || 'afterNoPeel'
  };
  saveConfigAndReload(nextConfig);
});

timedBtnDisable.addEventListener('click', () => {
  const nextConfig = buildConfigFromVisualControls();
  const blocks = getEditableBlocks(nextConfig);
  const block = blocks[selectedBlockIdx];
  if (!block) return;
  delete block.timedButton;
  saveConfigAndReload(nextConfig);
});

let currentPeelPoints = [];
let currentBreakPoints = [];
const breakPointsList = document.getElementById('breakPointsList');
const breakPointAdd = document.getElementById('breakPointAdd');
const breakPointsHeaderRow = document.getElementById('breakPointsHeaderRow');
const peelAutoRow = document.getElementById('peelAutoRow');
const peelModeRow = peelModeInput.closest('.editor-row');
const savePeelRow = persistPeelInput.closest('.peel-save-row');

function updatePeelManualMetaLayout(hasManualPoints) {
  if (peelAutoRow) peelAutoRow.style.display = hasManualPoints ? 'none' : 'grid';
  if (peelModeRow) peelModeRow.style.display = 'grid';
  if (savePeelRow) savePeelRow.style.display = 'flex';
}

function renderPeelPoints() {
  peelPointsList.innerHTML = '';
  const hasManualPoints = currentPeelPoints.length > 0;
  updatePeelManualMetaLayout(hasManualPoints);

  document.querySelector('.peel-point-header').style.display = hasManualPoints ? 'grid' : 'none';
  document.getElementById('peelPointsLabel').style.display = hasManualPoints ? '' : 'none';
  
  currentPeelPoints.forEach((pt, idx) => {
    const row = document.createElement('div');
    row.className = 'peel-point-item';
    row.innerHTML = `
      <input type="number" value="${pt.line}" min="0" data-help="Line index for this peel handle"> 
      <input type="number" value="${pt.fromGrapheme ?? ''}" min="0" data-help="First grapheme index for this handle" placeholder="all">
      <input type="number" value="${pt.toGrapheme ?? ''}" min="0" data-help="Last grapheme index for this handle" placeholder="all">
      <select data-help="Direction this handle peels">
        <option value="right" ${pt.direction === 'right' ? 'selected' : ''}>Right</option>
        <option value="left" ${pt.direction === 'left' ? 'selected' : ''}>Left</option>
      </select>
      <input type="number" value="${pt.starterCount ?? 3}" min="0" data-help="How many letters start detached for this handle">
      <button type="button" class="danger-icon-button" data-help="Delete this peel point">×</button>
    `;
    const [lineInput, fromGraphemeInput, toGraphemeInput, dirSelect, starterInput, removeBtn] = row.children;
    const updatePt = () => {
      pt.line = parseInt(lineInput.value, 10) || 0;

      const fg = parseInt(fromGraphemeInput.value, 10);
      if (isNaN(fg)) delete pt.fromGrapheme; else pt.fromGrapheme = fg;

      const tg = parseInt(toGraphemeInput.value, 10);
      if (isNaN(tg)) delete pt.toGrapheme; else pt.toGrapheme = tg;

      pt.direction = dirSelect.value;
      pt.starterCount = parseInt(starterInput.value, 10) || 0;
      applyLiveEditorState();
      triggerAutoReload();
    };
    lineInput.addEventListener('change', updatePt);
    fromGraphemeInput.addEventListener('change', updatePt);
    toGraphemeInput.addEventListener('change', updatePt);
    dirSelect.addEventListener('change', updatePt);
    starterInput.addEventListener('change', updatePt);
    removeBtn.addEventListener('click', () => {
      currentPeelPoints.splice(idx, 1);
      renderPeelPoints();
      applyLiveEditorState();
      triggerAutoReload();
    });
    peelPointsList.appendChild(row);
  });
}

function addPeelPoint(direction) {
  currentPeelPoints.push({
    line: 0,
    direction,
    starterCount: randomStarterCount()
  });
  renderPeelPoints();
  applyLiveEditorState();
  triggerAutoReload();
}

function renderBreakPoints() {
  if (!breakPointsList) return;
  breakPointsList.innerHTML = '';
  if (breakPointsHeaderRow) breakPointsHeaderRow.style.display = currentBreakPoints.length ? '' : 'none';
  currentBreakPoints.forEach((bp, idx) => {
    const row = document.createElement('div');
    row.className = 'seam-point-item';
    row.innerHTML = `
      <div class="editor-row inline"><label data-help="Index of the grapheme that acts as the seam (0-based reading order)">Grapheme</label><input type="number" value="${bp.grapheme ?? 0}" min="0" step="1"></div>
      <div class="editor-row inline"><label data-help="Distance in px beyond rest length needed to snap the seam">Force</label><input type="number" value="${bp.threshold ?? 50}" min="1" max="500" step="1"></div>
      <button type="button" class="danger-icon-button" data-help="Remove this seam">×</button>
    `;
    const [graphemeInput, thresholdInput] = row.querySelectorAll('input');
    const removeBtn = row.querySelector('button');
    const update = () => {
      bp.grapheme = parseInt(graphemeInput.value, 10) || 0;
      bp.threshold = parseInt(thresholdInput.value, 10) || 50;
      applyLiveEditorState();
      triggerAutoReload();
    };
    graphemeInput.addEventListener('change', update);
    thresholdInput.addEventListener('change', update);
    removeBtn.addEventListener('click', () => {
      currentBreakPoints.splice(idx, 1);
      renderBreakPoints();
      applyLiveEditorState();
      triggerAutoReload();
    });
    breakPointsList.appendChild(row);
  });
}

breakPointAdd?.addEventListener('click', () => {
  currentBreakPoints.push({ grapheme: 0, threshold: 50 });
  renderBreakPoints();
  applyLiveEditorState();
  triggerAutoReload();
});

let currentTriggers = [];
function getDefaultActionForType(type) {
  if (type === 'bgColor') return { type, color: backgroundColor.value || '#f5f0e8', duration: 1400 };
  if (type === 'textColor') return { type, color: blockColor.value || '#4a4a4a' };
  if (type === 'ambient') return { type, name: 'sigilo', mode: 'crossfade', gain: 0.035 };
  if (type === 'sound') return { type, name: 'spark' };
  if (type === 'physicsObject') return { type, label: 'prop', radius: 42 };
  if (type === 'revealBlock') return { type, blockId: '' };
  if (type === 'hideBlock') return { type, blockId: '' };
  if (type === 'skipBlock') return { type, blockId: '' };
  if (type === 'setFlag') return { type, name: '' };
  if (type === 'setForceField') return { type, fieldId: '', enabled: true };
  return { type: 'particles', preset: 'spark', count: 12, duration: 900, color: blockColor.value || '#4a4a4a' };
}

function normalizeTrigger(trigger = {}) {
  const condition = trigger.condition || (trigger.conditions?.length ? trigger.conditions[0] : null);
  const normalized = {
    on: trigger.on || 'blockAppear',
    once: trigger.once ?? true,
    word: trigger.word || '',
    target: trigger.target || '',
    holdMs: Number(trigger.holdMs || 0),
    actions: (trigger.actions?.length ? trigger.actions : [getDefaultActionForType('particles')]).map(action => ({ ...action }))
  };
  if (Array.isArray(trigger.words)) normalized.words = [...trigger.words];
  if (condition) normalized.condition = { ...condition };
  return normalized;
}

function normalizeEditableForceField(field = {}) {
  const type = field.type || 'wind';
  return {
    id: field.id || `${type}-${Date.now().toString(36)}`,
    type,
    enabled: field.enabled !== false,
    global: Boolean(field.global ?? (type === 'wind' && !field.width && !field.height)),
    autoWake: field.autoWake !== false,
    mode: field.mode || (type === 'magnetic' ? 'attract' : 'repel'),
    active: field.active || 'hover',
    blocks: Array.isArray(field.blocks) ? field.blocks.map(String) : [],
    x: Number(field.x ?? 0),
    y: Number(field.y ?? 80),
    width: Number(field.width ?? 760),
    height: Number(field.height ?? 240),
    direction: field.direction || 'right',
    cx: Number(field.cx ?? field.centerX ?? 390),
    cy: Number(field.cy ?? field.centerY ?? 320),
    radius: Number(field.radius ?? (type === 'cursor' || type === 'cursorRepel' ? 220 : 260)),
    strength: Number(field.strength ?? 0.5),
    feather: Number(field.feather ?? 140),
    lockedStrength: Number(field.lockedStrength ?? 0),
    gust: Number(field.gust ?? 0)
  };
}

function fieldUsesBox(field) {
  return field.type === 'wind';
}

function fieldUsesCenter(field) {
  return field.type === 'magnetic';
}

function fieldUsesCursor(field) {
  return field.type === 'cursor' || field.type === 'cursorRepel';
}

function renderForceFields() {
  if (!forceFieldList) return;
  forceFieldList.innerHTML = '';
  currentForceFields = currentForceFields.map(normalizeEditableForceField); state.currentForceFields = currentForceFields;
  currentForceFields.forEach((field, fieldIdx) => {
    const row = document.createElement('div');
    row.className = 'force-field-item';
    row.innerHTML = `
      <div class="force-field-top">
        <input class="force-id" type="text" value="${field.id}" data-help="Field id">
        <select class="force-type" data-help="Force field type">
          <option value="wind">wind</option>
          <option value="magnetic">magnetic</option>
          <option value="cursor">cursor</option>
        </select>
        <button type="button" class="force-remove danger-icon-button" data-help="Delete this force field">×</button>
      </div>
      <div class="editor-grid-2 force-field-fields">
        <div class="editor-row inline"><label data-help="Enable or disable this field without deleting its settings">Enabled</label><input class="force-enabled" type="checkbox" data-help="Enable or disable this field without deleting its settings"></div>
        <div class="editor-row inline force-global-row"><label data-help="Affect the whole scene instead of a rectangular area">Global</label><input class="force-global" type="checkbox" data-help="Affect the whole scene instead of a rectangular area"></div>
        <div class="editor-row inline force-auto-row"><label data-help="Wake the starter strip automatically when wind reaches a visible paragraph">Auto peel</label><input class="force-auto-wake" type="checkbox" data-help="Wake the starter strip automatically when wind reaches a visible paragraph"></div>
        <div class="editor-row inline force-mode-row"><label data-help="Choose whether a magnetic or cursor field pulls letters inward or pushes them away">Mode</label><select class="force-mode" data-help="Choose whether a magnetic or cursor field pulls letters inward or pushes them away"><option value="attract">attract</option><option value="repel">repel</option></select></div>
        <div class="editor-row inline force-active-row"><label data-help="Choose whether cursor repel runs on hover or only while dragging">Cursor</label><select class="force-active" data-help="Choose whether cursor repel runs on hover or only while dragging"><option value="hover">hover</option><option value="drag">drag only</option></select></div>
        <div class="editor-row inline force-direction-row"><label data-help="Direction a wind field pushes loose letters">Direction</label><select class="force-direction" data-help="Direction a wind field pushes loose letters"><option value="right">right</option><option value="left">left</option><option value="up">up</option><option value="down">down</option><option value="down-right">down-right</option><option value="down-left">down-left</option><option value="up-right">up-right</option><option value="up-left">up-left</option></select></div>
        <div class="editor-row inline force-x-row"><label data-help="Left edge of the rectangular wind area">X</label><input class="force-x" type="number" step="1" data-help="Left edge of the rectangular wind area"></div>
        <div class="editor-row inline force-y-row"><label data-help="Top edge of the rectangular wind area">Y</label><input class="force-y" type="number" step="1" data-help="Top edge of the rectangular wind area"></div>
        <div class="editor-row inline force-w-row"><label data-help="Width of the rectangular wind area">Width</label><input class="force-width" type="number" min="1" step="1" data-help="Width of the rectangular wind area"></div>
        <div class="editor-row inline force-h-row"><label data-help="Height of the rectangular wind area">Height</label><input class="force-height" type="number" min="1" step="1" data-help="Height of the rectangular wind area"></div>
        <div class="editor-row inline force-cx-row"><label data-help="Horizontal center of the magnetic field">Center X</label><input class="force-cx" type="number" step="1" data-help="Horizontal center of the magnetic field"></div>
        <div class="editor-row inline force-cy-row"><label data-help="Vertical center of the magnetic field">Center Y</label><input class="force-cy" type="number" step="1" data-help="Vertical center of the magnetic field"></div>
        <div class="editor-row inline force-radius-row"><label data-help="Distance from the magnet or cursor where the field has influence">Radius</label><input class="force-radius" type="number" min="1" step="1" data-help="Distance from the magnet or cursor where the field has influence"></div>
        <div class="editor-row inline"><label data-help="Overall force applied to loose letters; negative values reverse the effect">Strength</label><input class="force-strength" type="number" min="-5" max="5" step="0.01" data-help="Overall force applied to loose letters; negative values reverse the effect"></div>
        <div class="editor-row inline"><label data-help="How much still-attached letters visually bend under this field">Attached</label><input class="force-locked-strength" type="number" min="0" max="5" step="0.01" data-help="How much still-attached letters visually bend under this field"></div>
        <div class="editor-row inline force-gust-row"><label data-help="Random-feeling wind variation over time and position">Gust</label><input class="force-gust" type="number" min="0" max="2" step="0.01" data-help="Random-feeling wind variation over time and position"></div>
        <div class="editor-row inline"><label data-help="Soft edge distance where the field fades in or out">Feather</label><input class="force-feather" type="number" min="0" step="1" data-help="Soft edge distance where the field fades in or out"></div>
        <div class="editor-row"><label data-help="Optional comma-separated block ids this field affects">Blocks</label><input class="force-blocks" type="text" placeholder="block-a, block-b" data-help="Optional comma-separated block ids this field affects"></div>
      </div>
    `;
    const q = selector => row.querySelector(selector);
    q('.force-type').value = field.type === 'cursorRepel' ? 'cursor' : field.type;
    q('.force-enabled').checked = field.enabled;
    q('.force-global').checked = field.global;
    q('.force-auto-wake').checked = field.autoWake;
    q('.force-mode').value = field.mode;
    q('.force-active').value = field.active;
    q('.force-direction').value = field.direction;
    q('.force-x').value = field.x;
    q('.force-y').value = field.y;
    q('.force-width').value = field.width;
    q('.force-height').value = field.height;
    q('.force-cx').value = field.cx;
    q('.force-cy').value = field.cy;
    q('.force-radius').value = field.radius;
    q('.force-strength').value = field.strength;
    q('.force-locked-strength').value = field.lockedStrength;
    q('.force-gust').value = field.gust;
    q('.force-feather').value = field.feather;
    q('.force-blocks').value = field.blocks.join(', ');

    const updateVisibility = () => {
      const nextType = q('.force-type').value;
      const isGlobalWind = nextType === 'wind' && q('.force-global').checked;
      q('.force-global-row').style.display = nextType === 'wind' ? 'grid' : 'none';
      q('.force-auto-row').style.display = nextType === 'wind' ? 'grid' : 'none';
      q('.force-gust-row').style.display = nextType === 'wind' ? 'grid' : 'none';
      row.querySelectorAll('.force-x-row, .force-y-row, .force-w-row, .force-h-row, .force-direction-row').forEach(el => {
        el.style.display = nextType === 'wind' && !isGlobalWind ? 'grid' : 'none';
      });
      q('.force-direction-row').style.display = nextType === 'wind' ? 'grid' : 'none';
      row.querySelectorAll('.force-cx-row, .force-cy-row').forEach(el => {
        el.style.display = nextType === 'magnetic' ? 'grid' : 'none';
      });
      q('.force-active-row').style.display = nextType === 'cursor' ? 'grid' : 'none';
      q('.force-mode-row').style.display = nextType === 'wind' ? 'none' : 'grid';
    };

    const updateField = () => {
      const blocks = q('.force-blocks').value.split(',').map(value => value.trim()).filter(Boolean);
      currentForceFields[fieldIdx] = {
        id: q('.force-id').value || `field-${fieldIdx + 1}`,
        type: q('.force-type').value,
        enabled: q('.force-enabled').checked,
        global: q('.force-global').checked,
        autoWake: q('.force-auto-wake').checked,
        mode: q('.force-mode').value,
        active: q('.force-active').value,
        blocks,
        x: Number(q('.force-x').value) || 0,
        y: Number(q('.force-y').value) || 0,
        width: Math.max(1, Number(q('.force-width').value) || 1),
        height: Math.max(1, Number(q('.force-height').value) || 1),
        direction: q('.force-direction').value,
        cx: Number(q('.force-cx').value) || 0,
        cy: Number(q('.force-cy').value) || 0,
        radius: Math.max(1, Number(q('.force-radius').value) || 1),
        strength: Number(q('.force-strength').value) || 0,
        lockedStrength: Math.max(0, Number(q('.force-locked-strength').value) || 0),
        gust: Math.max(0, Number(q('.force-gust').value) || 0),
        feather: Math.max(0, Number(q('.force-feather').value) || 0)
      };
      FORCE_FIELDS = normalizeForceFields(currentForceFields, SIM_STEP_SCALE); state.FORCE_FIELDS = FORCE_FIELDS;
      applyLiveEditorState();
    };

    row.querySelectorAll('input, select').forEach(control => {
      control.addEventListener('input', updateField);
      control.addEventListener('change', () => {
        updateVisibility();
        updateField();
      });
    });
    q('.force-remove').addEventListener('click', () => {
      currentForceFields.splice(fieldIdx, 1);
      renderForceFields();
      applyLiveEditorState();
    });
    updateVisibility();
    forceFieldList.appendChild(row);
  });
}

function renderEventTriggers() {
  eventTriggerList.innerHTML = '';
  currentTriggers.forEach((rawTrigger, triggerIdx) => {
    const trigger = normalizeTrigger(rawTrigger);
    currentTriggers[triggerIdx] = trigger;
    const action = trigger.actions[0] || getDefaultActionForType('particles');
    const row = document.createElement('div');
    row.className = 'event-trigger-item';
    row.innerHTML = `
      <div class="event-trigger-top">
        <select class="event-on" data-help="Choose when this trigger fires">
          <option value="blockAppear">block appear</option>
          <option value="letterUnlock">letter unlock</option>
          <option value="wordComplete">word complete</option>
          <option value="peelPointComplete">peel point complete</option>
          <option value="blockComplete">block complete</option>
          <option value="beforeLetterUnlock">before unlock</option>
        </select>
        <select class="event-action" data-help="Choose the effect to run when the event fires">
          <option value="particles">particles</option>
          <option value="bgColor">bg color</option>
          <option value="textColor">text color</option>
          <option value="sound">sound</option>
          <option value="ambient">ambient</option>
          <option value="physicsObject">physics object</option>
          <option value="revealBlock">reveal block</option>
          <option value="hideBlock">hide block</option>
          <option value="skipBlock">skip block</option>
          <option value="setFlag">set flag</option>
          <option value="setForceField">set force field</option>
        </select>
        <button type="button" class="event-remove danger-icon-button" data-help="Delete this event trigger">×</button>
      </div>
      <div class="editor-grid-2 event-trigger-fields">
        <div class="editor-row inline"><label data-help="Run this trigger only once for this paragraph">Once</label><input class="event-once" type="checkbox"></div>
        <div class="editor-row inline event-word-row"><label data-help="Word that must complete before the trigger fires">Word</label><input class="event-word" type="text" placeholder="cruel"></div>
        <div class="editor-row inline event-target-row"><label data-help="Letter target used by before-unlock triggers">Target</label><select class="event-target"><option value="">any</option><option value="last">last DOM</option><option value="readingLast">reading last</option></select></div>
        <div class="editor-row inline event-hold-row"><label data-help="Delay before the target letter unlocks">Hold ms</label><input class="event-hold" type="number" min="0" max="10000" step="100"></div>
        <div class="editor-row inline"><label data-help="Only fire if this block is completed. Prefix ! to require NOT completed (e.g. !choice-b).">If done</label><input class="event-condition-block" type="text" placeholder="choice-b or !choice-b"></div>
        <div class="editor-row inline"><label data-help="Only fire if this flag is set. Prefix ! to require NOT set (e.g. !chose-left).">If flag</label><input class="event-flag-cond" type="text" placeholder="chose-left or !chose-left"></div>
        <div class="editor-row inline event-name-row"><label data-help="Sound, ambient, or physics object name">Name</label><input class="event-name" type="text" placeholder="spark"></div>
        <div class="editor-row inline event-preset-row"><label data-help="Particle preset to emit">Preset</label><select class="event-preset"><option value="spark">spark</option><option value="smokePoof">smoke</option><option value="redDrops">red drops</option><option value="violentGeyser">geyser</option><option value="tears">tears</option></select></div>
        <div class="editor-row inline event-color-row"><label data-help="Color used by this event action">Color</label><input class="event-color" type="color"></div>
        <div class="editor-row inline event-count-row"><label data-help="Number of particles to emit">Count</label><input class="event-count" type="number" min="1" max="400" step="1"></div>
        <div class="editor-row inline event-duration-row"><label data-help="Effect duration in milliseconds">Duration</label><input class="event-duration" type="number" min="0" max="10000" step="100"></div>
        <div class="editor-row inline event-mode-row"><label data-help="How ambient audio blends with the current layer">Mode</label><select class="event-mode"><option value="crossfade">crossfade</option><option value="layer">layer</option></select></div>
        <div class="editor-row inline event-gain-row"><label data-help="Ambient audio volume">Gain</label><input class="event-gain" type="number" min="0" max="0.2" step="0.005"></div>
        <div class="editor-row inline event-radius-row"><label data-help="Physics object radius in pixels">Radius</label><input class="event-radius" type="number" min="10" max="200" step="1"></div>
        <div class="editor-row inline event-block-id-row"><label data-help="ID of the block to reveal or skip">Block ID</label><input class="event-block-id" type="text" placeholder="ending-left"></div>
        <div class="editor-row inline event-flag-name-row"><label data-help="Name of the flag to set">Flag name</label><input class="event-flag-name" type="text" placeholder="chose-left"></div>
        <div class="editor-row inline event-force-id-row"><label data-help="ID of the force field to enable, disable, or toggle">Force ID</label><input class="event-force-id" type="text" placeholder="wind-main"></div>
        <div class="editor-row inline event-force-state-row"><label data-help="How this event changes the force field">Force state</label><select class="event-force-state"><option value="enable">enable</option><option value="disable">disable</option><option value="toggle">toggle</option></select></div>
      </div>
    `;
    const q = selector => row.querySelector(selector);
    q('.event-on').value = trigger.on;
    q('.event-action').value = action.type || 'particles';
    q('.event-once').checked = Boolean(trigger.once);
    q('.event-word').value = trigger.word || '';
    q('.event-target').value = trigger.target || '';
    q('.event-hold').value = trigger.holdMs || 0;
    const condSrc = trigger.condition || trigger.conditions?.[0] || {};
    const condBlockRaw = condSrc.completedBlock ?? condSrc.blockId ?? condSrc.block ?? condSrc.blockIndex ?? '';
    q('.event-condition-block').value = condBlockRaw ? (condSrc.completed === false ? `!${condBlockRaw}` : String(condBlockRaw)) : '';
    q('.event-flag-cond').value = condSrc.flag ? condSrc.flag : (condSrc.flagNot ? `!${condSrc.flagNot}` : '');
    q('.event-name').value = action.name || action.label || '';
    q('.event-preset').value = action.preset || 'spark';
    q('.event-color').value = action.color || blockColor.value || '#4a4a4a';
    q('.event-count').value = action.count ?? 12;
    q('.event-duration').value = action.duration ?? 1400;
    q('.event-mode').value = action.mode || 'crossfade';
    q('.event-gain').value = action.gain ?? 0.035;
    q('.event-radius').value = action.radius ?? 42;
    q('.event-block-id').value = action.blockId || '';
    q('.event-flag-name').value = action.name && action.type === 'setFlag' ? action.name : '';
    q('.event-force-id').value = action.fieldId || action.id || (action.type === 'setForceField' ? action.name : '') || '';
    q('.event-force-state').value = action.mode === 'toggle' ? 'toggle' : action.enabled === false ? 'disable' : 'enable';

    const updateVisibility = () => {
      const eventName = q('.event-on').value;
      const actionType = q('.event-action').value;
      row.querySelector('.event-word-row').style.display = eventName === 'wordComplete' ? 'grid' : 'none';
      row.querySelector('.event-target-row').style.display = eventName === 'beforeLetterUnlock' ? 'grid' : 'none';
      row.querySelector('.event-hold-row').style.display = eventName === 'beforeLetterUnlock' ? 'grid' : 'none';
      row.querySelector('.event-preset-row').style.display = actionType === 'particles' ? 'grid' : 'none';
      row.querySelector('.event-name-row').style.display = ['sound', 'ambient', 'physicsObject'].includes(actionType) ? 'grid' : 'none';
      row.querySelector('.event-color-row').style.display = ['particles', 'bgColor', 'textColor'].includes(actionType) ? 'grid' : 'none';
      row.querySelector('.event-count-row').style.display = actionType === 'particles' ? 'grid' : 'none';
      row.querySelector('.event-duration-row').style.display = ['particles', 'bgColor'].includes(actionType) ? 'grid' : 'none';
      row.querySelector('.event-mode-row').style.display = actionType === 'ambient' ? 'grid' : 'none';
      row.querySelector('.event-gain-row').style.display = actionType === 'ambient' ? 'grid' : 'none';
      row.querySelector('.event-radius-row').style.display = actionType === 'physicsObject' ? 'grid' : 'none';
      row.querySelector('.event-block-id-row').style.display = ['revealBlock', 'hideBlock', 'skipBlock'].includes(actionType) ? 'grid' : 'none';
      row.querySelector('.event-flag-name-row').style.display = actionType === 'setFlag' ? 'grid' : 'none';
      row.querySelector('.event-force-id-row').style.display = actionType === 'setForceField' ? 'grid' : 'none';
      row.querySelector('.event-force-state-row').style.display = actionType === 'setForceField' ? 'grid' : 'none';
    };
    const updateTrigger = () => {
      const type = q('.event-action').value;
      const nextAction = getDefaultActionForType(type);
      if (type === 'particles') Object.assign(nextAction, { preset: q('.event-preset').value, color: q('.event-color').value, count: Number(q('.event-count').value) || 12, duration: Number(q('.event-duration').value) || 0 });
      if (type === 'bgColor') Object.assign(nextAction, { color: q('.event-color').value, duration: Number(q('.event-duration').value) || 1400 });
      if (type === 'textColor') nextAction.color = q('.event-color').value;
      if (type === 'sound') nextAction.name = q('.event-name').value || 'spark';
      if (type === 'ambient') Object.assign(nextAction, { name: q('.event-name').value || 'sigilo', mode: q('.event-mode').value, gain: Number(q('.event-gain').value) || 0.035 });
      if (type === 'physicsObject') Object.assign(nextAction, { label: q('.event-name').value || 'prop', radius: Number(q('.event-radius').value) || 42 });
      if (type === 'revealBlock' || type === 'hideBlock' || type === 'skipBlock') nextAction.blockId = q('.event-block-id').value || '';
      if (type === 'setFlag') nextAction.name = q('.event-flag-name').value || '';
      if (type === 'setForceField') {
        const state = q('.event-force-state').value;
        nextAction.fieldId = q('.event-force-id').value || '';
        if (state === 'toggle') {
          nextAction.mode = 'toggle';
          delete nextAction.enabled;
        } else {
          nextAction.enabled = state !== 'disable';
          delete nextAction.mode;
        }
      }
      currentTriggers[triggerIdx] = {
        on: q('.event-on').value,
        once: q('.event-once').checked,
        actions: [nextAction]
      };
      if (q('.event-word').value) currentTriggers[triggerIdx].word = q('.event-word').value;
      if (q('.event-target').value) currentTriggers[triggerIdx].target = q('.event-target').value;
      if (Number(q('.event-hold').value) > 0) currentTriggers[triggerIdx].holdMs = Number(q('.event-hold').value);
      const condition = {};
      const rawBlock = q('.event-condition-block').value.trim();
      if (rawBlock.startsWith('!')) { condition.completedBlock = rawBlock.slice(1); condition.completed = false; }
      else if (rawBlock) condition.completedBlock = rawBlock;
      const rawFlag = q('.event-flag-cond').value.trim();
      if (rawFlag.startsWith('!')) condition.flagNot = rawFlag.slice(1);
      else if (rawFlag) condition.flag = rawFlag;
      if (Object.keys(condition).length > 0) currentTriggers[triggerIdx].condition = condition;
      else delete currentTriggers[triggerIdx].condition;
      applyLiveEditorState();
    };
    row.querySelectorAll('input, select').forEach(control => {
      control.addEventListener('input', () => { updateTrigger(); updateVisibility(); });
      control.addEventListener('change', () => { updateTrigger(); updateVisibility(); });
    });
    q('.event-remove').addEventListener('click', () => {
      currentTriggers.splice(triggerIdx, 1);
      renderEventTriggers();
      applyLiveEditorState();
    });
    updateVisibility();
    eventTriggerList.appendChild(row);
  });
}

function randomStarterCount() {
  return 1 + Math.floor(Math.random() * 4);
}

function getMotionItemsFromBlock(block) {
  const motion = block?.letterMotion;
  return Array.isArray(motion) ? motion : (motion ? [motion] : []);
}

function getMotionItem(block, type) {
  return getMotionItemsFromBlock(block).find(item => item?.type === type) || null;
}

function numberControlValue(control, fallback) {
  if (!control || control.value === '') return fallback;
  const n = Number(control.value);
  return Number.isFinite(n) ? n : fallback;
}

function buildLetterMotionFromControls(previousBlock = {}) {
  const previous = getMotionItemsFromBlock(previousBlock);
  const supportedTypes = ['orbit', 'buoyancy', 'line-lock', 'palindrome-flip'];
  const unsupported = previous.filter(item => item && !supportedTypes.includes(item.type));
  const next = [...unsupported.map(item => structuredClone(item))];
  if (motionOrbitInput?.checked) {
    next.push({
      type: 'orbit',
      cx: numberControlValue(motionOrbitCx, 380),
      cy: numberControlValue(motionOrbitCy, 220),
      radius: numberControlValue(motionOrbitRadius, 270),
      strength: numberControlValue(motionOrbitStrength, 0.08),
      spin: numberControlValue(motionOrbitSpin, 0.9),
      band: numberControlValue(motionOrbitBand, 0.48)
    });
  }
  if (motionBuoyancyInput?.checked) {
    next.push({
      type: 'buoyancy',
      strength: numberControlValue(motionBuoyancyStrength, 0.018),
      lift: numberControlValue(motionBuoyancyLift, 7),
      wave: numberControlValue(motionBuoyancyWave, 4),
      drift: numberControlValue(motionBuoyancyDrift, 2),
      frequency: numberControlValue(motionBuoyancyFrequency, 0.16)
    });
  }
  if (motionLineLockInput?.checked) {
    next.push({
      type: 'line-lock',
      strength: numberControlValue(motionLineLockStrength, 0.55),
      damping: numberControlValue(motionLineLockDamping, 0.86)
    });
  }
  if (motionPalindromeInput?.checked) {
    next.push({
      type: 'palindrome-flip',
      lineGap: numberControlValue(motionPalindromeLineGap, 56),
      strength: numberControlValue(motionPalindromeStrength, 0.18),
      damping: numberControlValue(motionPalindromeDamping, 0.68),
      loop: Boolean(motionPalindromeLoop?.checked)
    });
  }
  if (next.length === 0) return null;
  return next.length === 1 ? next[0] : next;
}

buildConfigFromVisualControls = function buildConfigFromVisualControls(config = getMutableConfigFromEditor()) {
  config.style ||= {};
  config.layout ||= {};
  config.peel ||= {};
  config.optimization ||= {};
  config.behaviors ||= {};
  config.behaviors.fadeReveal ||= {};
  config.behaviors.stepParagraphs ||= {};
  config.behaviors.stepParagraphs.perBlockAdvanceDelayMs ||= {};
  config.behaviors.stepParagraphs.perBlockVisibleCount ||= {};
  config.behaviors.layers ||= {};
  const blocks = getEditableBlocks(config);
  const block = blocks[selectedBlockIdx];
  config.style.backgroundColor = backgroundColor.value || config.style.backgroundColor || '#f5f0e8';
  config.layout.blockGap = Number(paragraphGapInput.value) || 0;
  config.peel.initialUnlockCount = Number(starterLettersInput.value) || 0;
  config.peel.mode ||= 'zigzag';
  config.peel.zigzag = config.peel.mode !== 'linear';
  const optimizationDefaults = pieceConfig.optimization || DEFAULT_OPTIMIZATION;
  config.optimization.dynamicLetterLimitDesktop = Number(desktopDynamicLimit.value) || optimizationDefaults.dynamicLetterLimitDesktop;
  config.optimization.dynamicLetterLimitMobile = Number(mobileDynamicLimit.value) || optimizationDefaults.dynamicLetterLimitMobile;
  config.optimization.dynamicLetterLimitNarrow = config.optimization.dynamicLetterLimitNarrow || optimizationDefaults.dynamicLetterLimitNarrow;
  config.optimization.initialPeelActiveBlocks = Math.max(1, Number(initialPeelActiveBlocks.value) || 4);
  config.behaviors.fadeReveal.enabled = fadeRevealInput.checked;
  config.behaviors.fadeReveal.visibleLetters = Number(fadeRevealVisible.value) || 24;
  config.behaviors.fadeReveal.fadeSteps = Number(fadeRevealSteps.value) || 0;
  config.behaviors.stepParagraphs.enabled = stepParagraphsInput.checked;
  config.behaviors.stepParagraphs.visibleCount = Number(visibleParagraphs.value) || 2;
  config.behaviors.stepParagraphs.compactFlow = compactFlowInput.checked;
  config.behaviors.stepParagraphs.advanceDelayMs = secondsInputToMs(globalStepAdvanceDelay.value);
  config.behaviors.layers.enabled = layersEnabledInput.checked;
  config.behaviors.layers.bleedThrough = layersBleedInput.checked;
  config.behaviors.layers.hideCompleted = layersHideCompletedInput.checked;
  config.behaviors.layers.revealOpacity = Math.max(0, Math.min(1, Number(layersRevealOpacity.value) || 1));
  config.forceFields = getForceFieldsFromEditor();
  const selectedId = block?.id || String(selectedBlockIdx);
  const overrideValue = Number(blockVisibleOverride.value);
  if (Number.isFinite(overrideValue) && blockVisibleOverride.value !== '') {
    config.behaviors.stepParagraphs.perBlockVisibleCount[selectedId] = Math.max(1, Math.min(20, overrideValue));
  } else {
    delete config.behaviors.stepParagraphs.perBlockVisibleCount[selectedId];
  }
  if (stepAdvanceDelay.value !== '') {
    config.behaviors.stepParagraphs.perBlockAdvanceDelayMs[selectedId] = secondsInputToMs(stepAdvanceDelay.value);
  } else {
    delete config.behaviors.stepParagraphs.perBlockAdvanceDelayMs[selectedId];
  }

  if (block) {
    const prevBlock = textBlocks[selectedBlockIdx]; // Get previous block for comparison
    block.text = blockText.value;
    block.transform ||= { x: 0, y: 0, scale: 1, width: 660, height: 0 };
    block.transform.x = Number(blockXInput.value) || 0;
    block.transform.y = Number(blockYInput.value) || 0;
    block.transform.scale = Math.max(0.2, Math.min(3, Number(blockScaleInput.value) || 1));
    block.transform.width = Math.max(80, Math.min(1200, Number(blockWidthInput.value) || block.transform.width || 660));
    block.transform.height = Math.max(0, Number(blockHeightInput.value) || 0);
    block.peel ||= {};
    block.peel.fromBeginning = peelFromBeginningInput.checked;
    block.peel.persistState = persistPeelInput.checked;
    const _seqMode = getPeelSeqMode();
    block.peel.singleHandle = _seqMode === 'multi';
    block.peel.allWords = _seqMode === 'single';
    block.peel.reflowAnchors = reflowAnchorsInput?.checked ?? false;
    block.peel.reflowMotion = reflowMotionInput?.value || 'pathfind';
    block.peel.shrinkGaps = shrinkGapsInput?.checked ?? false;
    block.peel.popGrid = popGridInput?.checked ?? false;
    block.peel.cascade = block.peel.popGrid;
    block.peel.manualOneByOne = Boolean(motionPalindromeInput?.checked && motionPalindromeManual?.checked);
    block.peel.mode = peelModeInput.value || config.peel.mode || 'zigzag';
    const nextLetterMotion = buildLetterMotionFromControls(block);
    if (nextLetterMotion) block.letterMotion = nextLetterMotion;
    else delete block.letterMotion;
    if (dragHintInput.checked) {
      block.hint ||= {};
      block.hint.enabled = true;
      block.hint.peelPointIndex = Math.max(0, Number(dragHintPeelPoint.value) || 0);
      block.hint.appearMs = Math.max(0, Number(dragHintAppearMs.value) || 2600);
      block.hint.textMs = Math.max(0, Number(dragHintTextMs.value) || 8200);
      block.hint.text = dragHintText.value || '';
    } else {
      delete block.hint;
    }
    if (currentPeelPoints.length) block.peelPoints = currentPeelPoints.map(p => ({...p}));
    else delete block.peelPoints;
    if (currentBreakPoints.length) block.breakPoints = currentBreakPoints.map(p => ({...p}));
    else delete block.breakPoints;
    if (currentTriggers.length) block.triggers = currentTriggers.map(trigger => structuredClone(trigger));
    else delete block.triggers;
    if (blockHiddenToggle.checked) block.hidden = true;
    else delete block.hidden;
    const layerGroupVal = layerGroupInput.value.trim();
    if (layerGroupVal) {
      block.layer = { group: layerGroupVal, depth: Math.max(0, Number(layerDepthInput.value) || 0) };
      const ro = Number(layerRevealOpacityBlock.value);
      if (layerRevealOpacityBlock.value !== '' && Number.isFinite(ro)) {
        block.layer.revealOpacity = Math.max(0, Math.min(1, ro));
      }
    } else {
      delete block.layer;
    }
    if (timedBtnEnabled.checked) {
      block.timedButton = {
        delayMs: Number(timedBtnDelay.value) || 7000,
        text: timedBtnLabel.value || '→',
        action: timedBtnAction.value || 'none',
        addText: timedBtnAddText.value || '',
        url: timedBtnUrl.value.trim(),
        spawnAt: timedBtnSpawnAt.value || 'afterNoPeel'
      };
    } else {
      delete block.timedButton;
    }

    // Shape Constraint
    if (shapeToggle.checked) {
      block.clipShape ||= { type: 'circle', svgOpacity: 0.22 };
      block.clipShape.svgOpacity = Number(shapeOpacity.value);
      block.clipShape.scale = Number(shapeScale.value) || 1;
      block.clipShape.rotation = Number(shapeRotation.value) || 0;
      block.clipShape.clipOverflow = shapeClipOverflow.checked;
    } else {
      delete block.clipShape;
    }
    if (block.clipShape) block.clipShape.type = shapeTypeSelect.value;
    if (block.clipShape?.type === 'custom') block.clipShape.pathD = shapeCustomPathD.value;
    if (drawTextEnabled.checked) {
      block.drawPath ||= { enabled: true, anchors: [] };
      block.drawPath.enabled = true;
      block.drawPath.spacing = Number(drawTextSpacing.value) || 0;
      block.drawPath.angleMix = Math.max(0, Math.min(1, Number(drawTextAngleMix.value) || 0));
      block.drawPath.anchors ||= [];
    } else {
      delete block.drawPath;
    }
    block.style ||= {};
    block.style.fontFamily = fontSearch.value.trim() || block.style.fontFamily || 'Georgia';
    block.style.colorMode = activeColorMode;
    block.style.color = blockColor.value || block.style.color || config.style.color || '#4a4a4a';
    block.style.opacity = normalizeBlockOpacity(blockOpacityInput.value);
    block.style.variationStrength = Number(variationStrength.value);
    block.style.gradient = collectGradientFromControls();
    const attType = attachTypeSelect.value;
    if (!attType) {
      delete block.attachment;
    } else {
      const prevAttachment = prevBlock?.attachment || {};
      const currentAttachment = block.attachment || {};
      const next = {
        // Preserve existing strokes if src hasn't changed, otherwise clear them.
        // Prefer the editor JSON copy so canvas-authored strokes survive a soft reload.
        strokes: (currentAttachment.type === 'lineart' && currentAttachment.src === attachSrc.value)
          ? (currentAttachment.strokes || [])
          : ((prevAttachment.type === 'lineart' && prevAttachment.src === attachSrc.value) ? (prevAttachment.strokes || []) : []),
        type:           attType,
        width:          Number(attachWidth.value)  || 300,
        height:         Number(attachHeight.value) || 180,
        scale:          Math.max(0.1, Math.min(5, Number(attachScale.value) || 1)),
        opacity:        Number.isFinite(Number(attachOpacity.value)) ? Math.max(0, Math.min(1, Number(attachOpacity.value))) : 1,
        gap:            Number(attachGap.value)    || 16,
        opticalOffsetY: Number(attachOffsetY.value) || 0
      };
      if (attType === 'placeholder') next.label = attachLabel.value || 'Illustration placeholder';
      if (attType === 'image')       next.src   = attachSrc.value || '';
      if (attType === 'lineart') {
        next.src = attachSrc.value || '';
        const svgOp = parseFloat(attachSvgOpacity.value);
        if (!isNaN(svgOp)) next.svgOpacity = Math.max(0, Math.min(1, svgOp));
        const resistance = parseInt(attachStrokeResistance.value, 10);
        if (!isNaN(resistance) && resistance > 0) next.strokeResistance = resistance;
        
        // If the source SVG has changed, explicitly clear existing strokes.
        // User will need to define new strokes for the new SVG in the JSON config.
        next.roughPreset = roughPresetSelect.value || 'solid';
        next.lineQuantity = Number(roughLineQuantity.value) || 30;
        next.linePrecision = Number(roughLinePrecision.value) || 1;
        next.initialPeeled = Number(roughInitialPeeled.value) || 2;
        next.lineWidth = Number(roughStrokeWidth.value) || 1;
        if (prevAttachment.type === 'lineart' && prevAttachment.src !== next.src) {
          next.strokes = [];
        } else if (currentAttachment.type === 'lineart' && currentAttachment.src === next.src && currentAttachment.strokes) {
          next.strokes = currentAttachment.strokes;
        } else if (prevAttachment.strokes) {
          next.strokes = prevAttachment.strokes;
        } else {
          next.strokes = [];
        }

        if (attachLooseSrc.value) { // Loose part is separate from main strokes
          next.loose = {
            ...(prevAttachment.loose || {}),
            src: attachLooseSrc.value,
            width:  prevAttachment.loose?.width  ?? 44,
            height: prevAttachment.loose?.height ?? 92
          };
        }
      }
      next.x = Number(attachX.value) || 0;
      next.y = Number(attachY.value) || 0;
      block.attachment = next;
      saveLastAttachmentSettings(next);
    }
  }
  return config;
}

function makeNewBlock() {
  return {
    id: `block-${Date.now().toString(36)}`,
    text: 'Nuevo párrafo',
    peel: { fromBeginning: true },
    transform: { x: 0, y: 0, scale: 1, width: 660 },
    style: {
      color: '#4a4a4a',
      colorMode: 'solid',
      fontFamily: fontSearch.value.trim() || 'Georgia',
      gradient: collectGradientFromControls()
    }
  };
}

function addBlockAfterSelected() {
  const nextConfig = buildConfigFromVisualControls();
  const blocks = getEditableBlocks(nextConfig);
  blocks.splice(selectedBlockIdx + 1, 0, makeNewBlock());
  selectedBlockIdx += 1;
  saveConfigAndReload(nextConfig);
}

function addBlockAtEnd() {
  const nextConfig = buildConfigFromVisualControls();
  const blocks = getEditableBlocks(nextConfig);
  blocks.push(makeNewBlock());
  selectedBlockIdx = blocks.length - 1; state.selectedBlockIdx = selectedBlockIdx;
  saveConfigAndReload(nextConfig);
}

function splitImportedParagraphs(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

function starterCountForImport(text = '') {
  const charCount = [...text].filter(ch => !/\s/.test(ch)).length;
  if (bulkStarterMode.value === 'random') {
    const min = Math.max(0, Number(bulkStarterMin.value) || 0);
    const max = Math.max(min, Number(bulkStarterMax.value) || min);
    const lengthAwareMax = Math.max(min, Math.min(max, Math.ceil(charCount / 40)));
    return Math.min(charCount, min + Math.floor(Math.random() * (lengthAwareMax - min + 1)));
  }
  return Math.min(charCount, Math.max(0, Number(bulkStarterFixed.value) || 0));
}

function peelDirectionForImport(idx) {
  if (bulkPeelMode.value === 'end') return 'left';
  if (bulkPeelMode.value === 'alternating') return idx % 2 === 0 ? 'right' : 'left';
  if (bulkPeelMode.value === 'random') return Math.random() < 0.5 ? 'right' : 'left';
  return 'right';
}

function importFullText(replaceExisting) {
  const paragraphs = splitImportedParagraphs(bulkTextInput.value);
  if (!paragraphs.length) return;
  const nextConfig = buildConfigFromVisualControls();
  const blocks = getEditableBlocks(nextConfig);
  const importedBlocks = paragraphs.map((text, idx) => {
    const direction = peelDirectionForImport(idx);
    return {
      id: `import-${idx + 1}`,
      text,
      peel: { fromBeginning: direction === 'right' },
      transform: { x: 0, y: 0, scale: 1, width: 660 },
      peelPoints: [{ line: 0, direction, starterCount: starterCountForImport(text) }],
      style: {
        color: blockColor.value || '#4a4a4a',
        colorMode: activeColorMode,
        fontFamily: fontSearch.value.trim() || 'Georgia',
        gradient: collectGradientFromControls()
      }
    };
  });
  if (replaceExisting) {
    blocks.splice(0, blocks.length, ...importedBlocks);
    selectedBlockIdx = 0; state.selectedBlockIdx = selectedBlockIdx;
  } else {
    blocks.push(...importedBlocks);
    selectedBlockIdx = blocks.length - importedBlocks.length; state.selectedBlockIdx = selectedBlockIdx;
  }
  saveConfigAndReload(nextConfig);
}

function generateLabyrinth(replaceExisting) {
  const trueText = labTrueText.value.trim();
  if (!trueText) { labTrueText.focus(); return; }
  const nextConfig = buildConfigFromVisualControls();
  const blocks = getEditableBlocks(nextConfig);
  const decoyTexts = labDecoyText.value.split('\n').map(line => line.trim()).filter(Boolean);
  const threads = buildLabyrinthThreads({
    trueText,
    decoyTexts,
    threads: Number(labThreads.value) || 4,
    rows: Number(labRows.value) || 6,
    width: Number(labWidth.value) || 640,
    fontPx: state.baseFontPx,
    lineHeight: state.LINE_HEIGHT,
    blockGap: nextConfig.layout?.blockGap ?? state.BLOCK_GAP,
    spacing: Number(labSpacing.value) || 0,
    jitter: Number(labJitter.value) || 0,
    seed: Number(labSeed.value) || 1,
    idPrefix: `lab-${Date.now().toString(36)}`,
    color: blockColor.value || '#4a4a4a',
    fontFamily: fontSearch.value.trim() || (state.FONT.replace(state.baseFontSize, '').trim() || 'Georgia')
  });
  if (!threads.length) return;
  if (replaceExisting) {
    blocks.splice(0, blocks.length, ...threads);
    selectedBlockIdx = 0; state.selectedBlockIdx = selectedBlockIdx;
  } else {
    blocks.push(...threads);
    selectedBlockIdx = blocks.length - threads.length; state.selectedBlockIdx = selectedBlockIdx;
  }
  saveConfigAndReload(nextConfig);
}

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
    completedBlocks[blockIdx] = true;
    completedBlockTimes[blockIdx] = performance.now();
    for (let si = 0; si < (segmentRanges[blockIdx]?.length || 0); si++) {
      completedSegments[blockIdx][si] = true;
    }
    runTriggers('blockComplete', blockIdx, { idx: range.end, anchor: getLetterCenter(range.end) });
    playParagraphCompleteSound();
  }
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
  const containerRect = container.getBoundingClientRect();
  frameViewport = {
    containerLeft: containerRect.left,
    containerTop: containerRect.top,
    width: window.innerWidth,
    height: window.innerHeight
  };
  resizeEffectsCanvas();
  resizePileCanvas();
}

function resizePileCanvas() {
  const nextDpr = Math.min(2, window.devicePixelRatio || 1);
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
  const isEditor = document.body.classList.contains('editor-open');
  mountVisibleBlocks();
  cachedVisibleBlockWindow = getVisibleBlockWindow();
  if (mobileRuntime) pruneMobileInactiveBlocks();

  // Toggle scrollbar based on compact mode and editor state
  const isCompact = activeBehaviors?.stepParagraphs?.enabled && activeBehaviors.stepParagraphs.compactFlow;
  const nextOverflowY = (isCompact && !isEditor) ? 'hidden' : 'auto';
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
  for (let blockIdx = 0; blockIdx < blockRenderOffsets.length; blockIdx++) {
    const inWindow = blockIdx >= cachedVisibleBlockWindow.start && blockIdx < cachedVisibleBlockWindow.end;
    const targetOffset = activeBehaviors?.stepParagraphs?.enabled && activeBehaviors.stepParagraphs.compactFlow && inWindow
      ? (isEditor ? 0 : compactFlowCurrentOffset)
      : 0;
    blockRenderOffsets[blockIdx] += (targetOffset - blockRenderOffsets[blockIdx]) * 0.18;
    if (Math.abs(blockRenderOffsets[blockIdx] - targetOffset) < 0.02) blockRenderOffsets[blockIdx] = targetOffset;
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
  const behaviorStart = Math.min(blockStart, currentBlockIdx);
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
    for (let i = range.start; i <= range.end; i++) {
      const segment = findSegmentForIndex(blockIdx, i);
      const revealCount = fadeEnabled ? getSegmentUnlockedCount(segment) + visibleLetters : Infinity;
      const fromPeelTail = (segment?.end ?? range.end) - i;
      const isLooseInCompact = isCompact && blockWasActive && isLooseLetterForLimit(i);
      let opacity = (blockAllowed || (!isCompact && !letters[i].locked && blockWasActive) || isLooseInCompact || isEditor) ? 1 : 0;
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
      // Hide censor reveal elements for blocks that have scrolled out in compact flow
      const revealEl = censorRevealEls[i];
      if (revealEl && censorRevealedFlags[i]) {
        revealEl.style.opacity = (!isCompact || blockAllowed || !completedBlocks[blockIdx]) ? '1' : '0';
      }
    }
  }
}

saveConfigAndReload = function saveConfigAndReload(config) {
  localStorage.setItem('tirita.editorOpen', editorPanel.classList.contains('open') ? '1' : '0');
  localStorage.setItem('tirita.rawOpen', editorPanel.classList.contains('raw-open') ? '1' : '0');
  localStorage.setItem('tirita.historyOpen', historySection?.open ? '1' : '0');
  persistEditorPrefs();
  saveEditorScrollState();
  preserveSceneScrollForReload();
  localStorage.setItem('tirita.selectedBlockIdx', String(selectedBlockIdx));
  
  if (document.activeElement && document.activeElement.id) {
    localStorage.setItem('tirita.focusedElementId', document.activeElement.id);
    localStorage.setItem('tirita.cursorStart', String(document.activeElement.selectionStart || 0));
    localStorage.setItem('tirita.cursorEnd', String(document.activeElement.selectionEnd || 0));
  }

  persistAttachmentSyncFromConfig(config);
  const configStr = JSON.stringify(config);
  maybePushUndo(configStr);
  persistPieceConfig(configStr);
  window.location.reload();
}

// ── Undo/Redo (per Save+Reload) ──────────────────────────────────────────────

function getUndoRedo() {
  try { return JSON.parse(localStorage.getItem(EDITOR_UNDO_KEY) || '{"past":[],"future":[]}'); }
  catch { return { past: [], future: [] }; }
}
function saveUndoRedo(ur) {
  try { localStorage.setItem(EDITOR_UNDO_KEY, JSON.stringify(ur)); }
  catch { if (ur.past.length > 0) { ur.past.shift(); try { localStorage.setItem(EDITOR_UNDO_KEY, JSON.stringify(ur)); } catch {} } }
}
function maybePushUndo(incomingStr) {
  if (!lastUndoPushedStr || lastUndoPushedStr === incomingStr) return;
  const ur = getUndoRedo();
  ur.past.push(lastUndoPushedStr);
  if (ur.past.length > EDITOR_UNDO_MAX) ur.past.shift();
  ur.future = [];
  saveUndoRedo(ur);
  lastUndoPushedStr = incomingStr;
  updateUndoRedoButtons();
}
function clearUndoRedo() { localStorage.removeItem(EDITOR_UNDO_KEY); }
function updateUndoRedoButtons() {
  const ur = getUndoRedo();
  editorUndo.disabled = ur.past.length === 0;
  editorRedo.disabled = ur.future.length === 0;
  editorUndo.title = ur.past.length ? `Undo (${ur.past.length} step${ur.past.length !== 1 ? 's' : ''}) — Ctrl+Z` : 'Nothing to undo';
  editorRedo.title = ur.future.length ? `Redo (${ur.future.length} step${ur.future.length !== 1 ? 's' : ''}) — Ctrl+Shift+Z` : 'Nothing to redo';
}
function undoConfig() {
  const ur = getUndoRedo();
  if (!ur.past.length) return;
  const current = localStorage.getItem('tirita.pieceConfig');
  const restored = ur.past.pop();
  if (current) { ur.future.push(current); if (ur.future.length > EDITOR_UNDO_MAX) ur.future.shift(); }
  saveUndoRedo(ur);
  persistEditorPrefs();
  saveSceneScroll();
  localStorage.setItem('tirita.editorOpen', '1');
  localStorage.setItem('tirita.historyOpen', historySection?.open ? '1' : '0');
  persistPieceConfig(restored);
  window.location.reload();
}
function redoConfig() {
  const ur = getUndoRedo();
  if (!ur.future.length) return;
  const current = localStorage.getItem('tirita.pieceConfig');
  const restored = ur.future.pop();
  if (current) { ur.past.push(current); if (ur.past.length > EDITOR_UNDO_MAX) ur.past.shift(); }
  saveUndoRedo(ur);
  persistEditorPrefs();
  saveSceneScroll();
  localStorage.setItem('tirita.editorOpen', '1');
  localStorage.setItem('tirita.historyOpen', historySection?.open ? '1' : '0');
  persistPieceConfig(restored);
  window.location.reload();
}

// ── History snapshots ────────────────────────────────────────────────────────

function getHistorySnapshotMinutes() {
  const stored = Number(localStorage.getItem('tirita.historySnapshotMinutes') || 5);
  const current = Number(historySnapshotMinutes?.value || stored);
  const minutes = Number.isFinite(current) && current > 0 ? current : stored;
  return Math.max(1, Math.min(120, minutes));
}

function getEditorHistory() {
  try { return JSON.parse(localStorage.getItem(EDITOR_HISTORY_KEY) || '{"snapshots":[]}'); }
  catch { return { snapshots: [] }; }
}
function saveEditorHistory(h) {
  try { localStorage.setItem(EDITOR_HISTORY_KEY, JSON.stringify(h)); }
  catch { if (h.snapshots.length > 0) { h.snapshots.shift(); try { localStorage.setItem(EDITOR_HISTORY_KEY, JSON.stringify(h)); } catch {} } }
}
function clearEditorHistory() { localStorage.removeItem(EDITOR_HISTORY_KEY); }

function autoSaveHistorySnapshot() {
  const currentStr = localStorage.getItem('tirita.pieceConfig');
  if (!currentStr) return;
  const h = getEditorHistory();
  const last = h.snapshots[h.snapshots.length - 1];
  if (last && last.config === currentStr) return;
  h.snapshots.push({ ts: Date.now(), config: currentStr });
  if (h.snapshots.length > EDITOR_HISTORY_MAX) h.snapshots.shift();
  saveEditorHistory(h);
  if (historySection?.open) renderHistoryList();
}
function startHistoryAutoSave() {
  clearInterval(historyAutoSaveTimer);
  historyAutoSaveTimer = setInterval(autoSaveHistorySnapshot, getHistorySnapshotMinutes() * 60 * 1000);
}
function stopHistoryAutoSave() {
  clearInterval(historyAutoSaveTimer);
  historyAutoSaveTimer = null;
}

function formatRelativeTime(ts) {
  const sec = (Date.now() - ts) / 1000;
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function renderHistoryList() {
  if (!editorHistoryList) return;
  const h = getEditorHistory();
  editorHistoryList.innerHTML = '';
  if (!h.snapshots.length) {
    const em = document.createElement('em');
    em.className = 'editor-history-empty';
    em.textContent = 'Auto-saves every 5 min while the editor is open.';
    editorHistoryList.appendChild(em);
    return;
  }
  [...h.snapshots].reverse().forEach(snap => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'editor-history-item';
    const d = new Date(snap.ts);
    const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    btn.innerHTML = `<span class="editor-history-rel">${formatRelativeTime(snap.ts)}</span><span class="editor-history-abs">${dateStr} ${timeStr}</span>`;
    btn.addEventListener('click', () => {
      persistEditorPrefs();
      saveSceneScroll();
      localStorage.setItem('tirita.editorOpen', '1');
      persistPieceConfig(snap.config);
      window.location.reload();
    });
    editorHistoryList.appendChild(btn);
  });
}

function normalizeBlockTransform(transform = {}) {
  return {
    x: Number(transform.x ?? 0) || 0,
    y: Number(transform.y ?? 0) || 0,
    scale: Math.max(0.2, Math.min(3, Number(transform.scale ?? 1) || 1)),
    width: Math.max(80, Math.min(1200, Number(transform.width ?? getMaxWidth()) || getMaxWidth())),
    height: Math.max(0, Number(transform.height ?? 0) || 0)
  };
}

function transformSignature(transform = {}) {
  const t = normalizeBlockTransform(transform);
  return `${t.x}:${t.y}:${t.scale}:${t.width}:${t.height}`;
}

function syncTransformControls(transform = {}) {
  const t = normalizeBlockTransform(transform);
  blockXInput.value = Math.round(t.x);
  blockYInput.value = Math.round(t.y);
  blockScaleInput.value = Number(t.scale.toFixed(2));
  blockWidthInput.value = Math.round(t.width);
  blockHeightInput.value = Math.round(t.height);
  [blockXInput, blockYInput, blockScaleInput, blockWidthInput, blockHeightInput].forEach(input => {
    input.dataset.lastNumericValue = input.value;
  });
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

const syncedBlockFields = ['transform', 'style', 'peel', 'peelPoints', 'hint', 'clipShape', 'drawPath', 'timedButton', 'triggers', 'hidden'];
function getSyncedBlockFieldValue(block, field) {
  if (!block) return null;
  return block[field] !== undefined ? structuredClone(block[field]) : null;
}

function syncOpacityControls(value) {
  const opacity = normalizeBlockOpacity(value);
  blockOpacityRange.value = String(opacity);
  blockOpacityInput.value = Number(opacity.toFixed(2));
}

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
  el.style.fontFamily = quoteFontFamily(letter.inlineStyle?.fontFamily || letter.style.fontFamily);
  el.style.fontSize = letter.inlineStyle?.size
    ? `${Number(letter.inlineStyle.size)}px`
    : `${Number.parseFloat(baseFontSize) * (letter.scale || 1)}px`;

  // Reset advanced properties to prevent "ghost" gradients or transparent text
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
}

function applyLiveEditorState() {
  const previousTransform = transformSignature(textBlocks[selectedBlockIdx]?.transform);
  const nextConfig = buildConfigFromVisualControls();
  pieceConfig = nextConfig; state.pieceConfig = pieceConfig;
  activeBlocks = nextConfig.blocks || []; state.activeBlocks = activeBlocks;
  const activeBlock = getEditableBlocks(nextConfig)[selectedBlockIdx];
  editorJson.value = JSON.stringify(nextConfig, null, 2);
  document.documentElement.style.setProperty('--page-bg', nextConfig.style.backgroundColor || '#f5f0e8');
  dynamicLetterLimit = isTouchMobile
    ? nextConfig.optimization.dynamicLetterLimitMobile
    : (window.innerWidth < 600
      ? nextConfig.optimization.dynamicLetterLimitNarrow
      : nextConfig.optimization.dynamicLetterLimitDesktop);
  activeInitialPeelBlockLimit = Math.max(1, Number(nextConfig.optimization.initialPeelActiveBlocks ?? 4) || 4);
  FORCE_FIELDS = normalizeForceFields(nextConfig.forceFields, SIM_STEP_SCALE); state.FORCE_FIELDS = FORCE_FIELDS;
  const nextBlockGap = Number(nextConfig.layout?.blockGap ?? BLOCK_GAP) || 0;
  if (nextBlockGap !== BLOCK_GAP) {
    BLOCK_GAP = nextBlockGap; state.BLOCK_GAP = BLOCK_GAP;
    relayoutLockedLetters();
  }
  activeBehaviors = structuredClone(nextConfig.behaviors); state.activeBehaviors = activeBehaviors;
  if (activeBlock && textBlocks[selectedBlockIdx]) {
    const nextTransform = normalizeBlockTransform(activeBlock.transform);
    const previousBlock = textBlocks[selectedBlockIdx];
    const previousSyncedValues = Object.fromEntries(
      syncedBlockFields.map(field => [field, field === 'transform' ? previousBlock.transform : getSyncedBlockFieldValue(previousBlock, field)])
    );
    activeBlock.transform = nextTransform;
    for (const field of syncedBlockFields) {
      recordSyncedBlockFieldEdit(
        activeBlock,
        selectedBlockIdx,
        field,
        previousSyncedValues[field],
        getSyncedBlockFieldValue(activeBlock, field),
        storedLocale,
        pieceConfig
      );
    }
    if (previousTransform !== transformSignature(nextTransform)) {
      textBlocks[selectedBlockIdx].transform = nextTransform;
      relayoutLockedLetters();
      
      // Update numeric inputs only if they aren't being actively edited.
      // This prevents typed '0' or empty states from being immediately snapped back.
      const active = document.activeElement;
      if (![blockXInput, blockYInput, blockScaleInput, blockWidthInput, blockHeightInput].includes(active)) {
        syncTransformControls(nextTransform);
      }
    }

    const prevAtt = textBlocks[selectedBlockIdx].attachment;
    const nextAtt = activeBlock.attachment;
    const attChanged = attachmentSignature(prevAtt) !== attachmentSignature(nextAtt);
    if (attChanged) recordAttachmentEditForLocale(activeBlock, prevAtt, nextAtt, storedLocale, pieceConfig, selectedBlockIdx);
    const attLayoutChanged = (prevAtt?.type !== nextAtt?.type) ||
                             (prevAtt?.width !== nextAtt?.width) ||
                             (prevAtt?.height !== nextAtt?.height) ||
                             (prevAtt?.scale !== nextAtt?.scale) ||
                             (prevAtt?.opacity !== nextAtt?.opacity) ||
                             (prevAtt?.gap !== nextAtt?.gap) ||
                             (prevAtt?.opticalOffsetY !== nextAtt?.opticalOffsetY) ||
                             (prevAtt?.x !== nextAtt?.x) ||
                             (prevAtt?.y !== nextAtt?.y);
    if (attChanged) {
      textBlocks[selectedBlockIdx].attachment = nextAtt ? structuredClone(nextAtt) : null;
    }
    if (attLayoutChanged) {
      relayoutLockedLetters();
    }
    const prevDrawPathSig = JSON.stringify(textBlocks[selectedBlockIdx].drawPath || null);
    const nextDrawPathSig = JSON.stringify(activeBlock.drawPath || null);
    if (prevDrawPathSig !== nextDrawPathSig) {
      textBlocks[selectedBlockIdx].drawPath = activeBlock.drawPath ? structuredClone(activeBlock.drawPath) : null;
      relayoutLockedLetters();
    }
    const prevClipShapeSig = JSON.stringify(textBlocks[selectedBlockIdx].clipShape || null);
    const nextClipShapeSig = JSON.stringify(activeBlock.clipShape || null);
    if (prevClipShapeSig !== nextClipShapeSig) {
      textBlocks[selectedBlockIdx].clipShape = activeBlock.clipShape ? structuredClone(activeBlock.clipShape) : null;
      clipShapeFrames[selectedBlockIdx]?.el?.remove();
      clipShapeFrames[selectedBlockIdx] = createClipShapeFrame(selectedBlockIdx, textBlocks[selectedBlockIdx].clipShape);
      relayoutLockedLetters();
    }
    textBlocks[selectedBlockIdx].hidden = Boolean(activeBlock.hidden);
    if (textBlocks[selectedBlockIdx].hidden) hiddenBlocks.add(selectedBlockIdx);
    else hiddenBlocks.delete(selectedBlockIdx);
    updateLocaleSyncMarkers();
  }
  const selectedStyle = {
    color: activeBlock?.style?.color || nextConfig.style?.color || '#4a4a4a',
    opacity: normalizeBlockOpacity(activeBlock?.style?.opacity),
    variationStrength: Number(variationStrength.value),
    colorMode: activeColorMode,
    fontFamily: fontSearch.value.trim() || 'Georgia',
    gradient: collectGradientFromControls()
  };
  for (let i = 0; i < letters.length; i++) {
    if (letters[i].blockIdx === selectedBlockIdx) applyLetterStyle(els[i], letters[i], selectedStyle);
  }
  if (textBlocks[selectedBlockIdx]) textBlocks[selectedBlockIdx].style = structuredClone(selectedStyle);
  updateSelectedBlockVisuals(nextConfig);
  updateLocaleSyncMarkers();
  lastBehaviorVisibilityKey = ''; state.lastBehaviorVisibilityKey = '';
  updateBehaviorVisibility();
  persistPieceConfig(nextConfig);
  return { nextConfig };
}

refreshVisualEditor = function refreshVisualEditor(config = getMutableConfigFromEditor()) {
  const blocks = getEditableBlocks(config);
  selectedBlockIdx = Math.min(selectedBlockIdx, Math.max(0, blocks.length - 1)); state.selectedBlockIdx = selectedBlockIdx;
  blockSelect.innerHTML = '';
  blocks.forEach((block, idx) => {
    const option = document.createElement('option');
    option.value = String(idx);
    option.textContent = `${idx + 1}. ${block.id || 'block'}`;
    blockSelect.appendChild(option);
  });
  blockSelect.value = String(selectedBlockIdx);
  const selectedBlock = blocks[selectedBlockIdx] || {};
  const selectedTransform = normalizeBlockTransform(selectedBlock.transform);
  const blockStyle = {
    color: config.style?.color || '#4a4a4a',
    colorMode: 'solid',
    fontFamily: 'Georgia',
    ...(selectedBlock.style || {})
  };
  const gradient = normalizeGradient(blockStyle.gradient);
  blockText.value = selectedBlock.text || '';
  updatePeelHandlesRowVisibility();
  syncTransformControls(selectedTransform);
  peelFromBeginningInput.checked = getBlockPeelFromConfig(config, selectedBlockIdx);
  const peelMode = selectedBlock.peel?.mode || config.peel?.mode || 'zigzag';
  peelModeInput.value = peelMode;
  starterLettersInput.value = config.peel?.initialUnlockCount ?? 3;
  persistPeelInput.checked = Boolean(selectedBlock.peel?.persistState);
  setPeelSeqMode(selectedBlock.peel?.allWords ? 'single' : selectedBlock.peel?.singleHandle ? 'multi' : 'none');
  if (reflowAnchorsInput) reflowAnchorsInput.checked = Boolean(selectedBlock.peel?.reflowAnchors);
  if (reflowMotionInput) reflowMotionInput.value = selectedBlock.peel?.reflowMotion || 'pathfind';
  if (shrinkGapsInput) shrinkGapsInput.checked = Boolean(selectedBlock.peel?.shrinkGaps);
  if (popGridInput) popGridInput.checked = Boolean(selectedBlock.peel?.popGrid && selectedBlock.peel?.cascade !== false);
  const orbitMotion = getMotionItem(selectedBlock, 'orbit');
  const buoyancyMotion = getMotionItem(selectedBlock, 'buoyancy');
  const lineLockMotion = getMotionItem(selectedBlock, 'line-lock');
  const palindromeMotion = getMotionItem(selectedBlock, 'palindrome-flip');
  if (motionOrbitInput) motionOrbitInput.checked = Boolean(orbitMotion);
  if (motionOrbitCx) motionOrbitCx.value = orbitMotion?.cx ?? orbitMotion?.x ?? 380;
  if (motionOrbitCy) motionOrbitCy.value = orbitMotion?.cy ?? orbitMotion?.y ?? 220;
  if (motionOrbitRadius) motionOrbitRadius.value = orbitMotion?.radius ?? 270;
  if (motionOrbitStrength) motionOrbitStrength.value = orbitMotion?.strength ?? 0.08;
  if (motionOrbitSpin) motionOrbitSpin.value = orbitMotion?.spin ?? 0.9;
  if (motionOrbitBand) motionOrbitBand.value = orbitMotion?.band ?? 0.48;
  if (motionBuoyancyInput) motionBuoyancyInput.checked = Boolean(buoyancyMotion);
  if (motionBuoyancyStrength) motionBuoyancyStrength.value = buoyancyMotion?.strength ?? 0.018;
  if (motionBuoyancyLift) motionBuoyancyLift.value = buoyancyMotion?.lift ?? 7;
  if (motionBuoyancyWave) motionBuoyancyWave.value = buoyancyMotion?.wave ?? 4;
  if (motionBuoyancyDrift) motionBuoyancyDrift.value = buoyancyMotion?.drift ?? 2;
  if (motionBuoyancyFrequency) motionBuoyancyFrequency.value = buoyancyMotion?.frequency ?? 0.16;
  if (motionLineLockInput) motionLineLockInput.checked = Boolean(lineLockMotion);
  if (motionLineLockStrength) motionLineLockStrength.value = lineLockMotion?.strength ?? 0.55;
  if (motionLineLockDamping) motionLineLockDamping.value = lineLockMotion?.damping ?? 0.86;
  if (motionPalindromeInput) motionPalindromeInput.checked = Boolean(palindromeMotion);
  if (motionPalindromeLineGap) motionPalindromeLineGap.value = palindromeMotion?.lineGap ?? 56;
  if (motionPalindromeStrength) motionPalindromeStrength.value = palindromeMotion?.strength ?? 0.18;
  if (motionPalindromeDamping) motionPalindromeDamping.value = palindromeMotion?.damping ?? 0.68;
  if (motionPalindromeManual) motionPalindromeManual.checked = Boolean(selectedBlock.peel?.manualOneByOne);
  if (motionPalindromeLoop) motionPalindromeLoop.checked = Boolean(palindromeMotion?.loop);
  updateLetterMotionFieldVisibility();
  dragHintInput.checked = Boolean(selectedBlock.hint?.enabled);
  dragHintPeelPoint.value = selectedBlock.hint?.peelPointIndex ?? 0;
  dragHintAppearMs.value = selectedBlock.hint?.appearMs ?? 2600;
  dragHintTextMs.value = selectedBlock.hint?.textMs ?? 8200;
  dragHintText.value = selectedBlock.hint?.text || (currentLocale.lang === 'en' ? 'drag here' : 'arrastra aqui');
  updateHintFieldVisibility();
  currentPeelPoints = (selectedBlock.peelPoints || []).map(p => ({...p}));
  renderPeelPoints();
  currentBreakPoints = (selectedBlock.breakPoints || []).map(p => ({...p}));
  renderBreakPoints();
  currentTriggers = (selectedBlock.triggers || []).map(trigger => structuredClone(trigger));
  renderEventTriggers();
  fontSearch.value = blockStyle.fontFamily || 'Georgia';
  setActiveColorMode(blockStyle.colorMode === 'gradient' ? 'linear' : (blockStyle.colorMode || 'solid'));
  blockColor.value = blockStyle.color || config.style?.color || '#4a4a4a';
  variationStrength.value = selectedBlock.style?.variationStrength ?? 0.15;
  gradientAngle.value = gradient.angle;
  gradientRadiusX.value = gradient.centerX;
  gradientRadiusY.value = gradient.centerY;
  currentGradientStops = gradient.stops.map(stop => ({ ...stop })); state.currentGradientStops = currentGradientStops;
  renderGradientStops();
  backgroundColor.value = config.style?.backgroundColor || '#f5f0e8';
  syncOpacityControls(blockStyle.opacity);
  const optimizationDefaults = pieceConfig.optimization || DEFAULT_OPTIMIZATION;
  desktopDynamicLimit.value = config.optimization?.dynamicLetterLimitDesktop ?? optimizationDefaults.dynamicLetterLimitDesktop;
  mobileDynamicLimit.value = config.optimization?.dynamicLetterLimitMobile ?? optimizationDefaults.dynamicLetterLimitMobile;
  initialPeelActiveBlocks.value = config.optimization?.initialPeelActiveBlocks ?? optimizationDefaults.initialPeelActiveBlocks;
  if (historySnapshotMinutes) historySnapshotMinutes.value = String(getHistorySnapshotMinutes());
  fadeRevealInput.checked = Boolean(config.behaviors?.fadeReveal?.enabled);
  fadeRevealVisible.value = config.behaviors?.fadeReveal?.visibleLetters ?? 24;
  fadeRevealSteps.value = config.behaviors?.fadeReveal?.fadeSteps ?? 8;
  stepParagraphsInput.checked = Boolean(config.behaviors?.stepParagraphs?.enabled);
  compactFlowInput.checked = Boolean(config.behaviors?.stepParagraphs?.compactFlow);
  visibleParagraphs.value = config.behaviors?.stepParagraphs?.visibleCount ?? 2;
  globalStepAdvanceDelay.value = msToSecondsInput(config.behaviors?.stepParagraphs?.advanceDelayMs ?? 0);
  layersEnabledInput.checked = Boolean(config.behaviors?.layers?.enabled);
  layersBleedInput.checked = config.behaviors?.layers?.bleedThrough !== false;
  layersHideCompletedInput.checked = config.behaviors?.layers?.hideCompleted !== false;
  layersRevealOpacity.value = config.behaviors?.layers?.revealOpacity ?? 1;
  layerGroupInput.value = selectedBlock.layer?.group ?? '';
  layerDepthInput.value = selectedBlock.layer?.depth ?? '';
  layerRevealOpacityBlock.value = selectedBlock.layer?.revealOpacity ?? '';
  setForceFieldsInEditor(config.forceFields || []);
  const selectedVisibleKey = selectedBlock.id || String(selectedBlockIdx);
  blockVisibleOverride.value = config.behaviors?.stepParagraphs?.perBlockVisibleCount?.[selectedVisibleKey] ?? '';
  const blockDelay = config.behaviors?.stepParagraphs?.perBlockAdvanceDelayMs?.[selectedVisibleKey];
  stepAdvanceDelay.value = blockDelay === undefined ? '' : msToSecondsInput(blockDelay);
  updateEffectFieldVisibility();
  paragraphGapInput.value = config.layout?.blockGap ?? 40;
  shapeToggle.checked = Boolean(selectedBlock.clipShape);
  shapeTypeSelect.value = selectedBlock.clipShape?.type || 'circle';
  shapeCustomPathD.value = selectedBlock.clipShape?.pathD || '';
  shapeOpacity.value = selectedBlock.clipShape?.svgOpacity ?? 0.22;
  shapeScale.value = selectedBlock.clipShape?.scale ?? 1;
  shapeRotation.value = selectedBlock.clipShape?.rotation ?? 0;
  shapeClipOverflow.checked = Boolean(selectedBlock.clipShape?.clipOverflow);
  drawTextEnabled.checked = Boolean(selectedBlock.drawPath?.enabled);
  drawTextSpacing.value = selectedBlock.drawPath?.spacing ?? 2;
  drawTextAngleMix.value = selectedBlock.drawPath?.angleMix ?? 1;
  updateDrawTextFieldVisibility();

  updateAttachFieldVisibility();
  updateShapeFieldVisibility();

  const att = selectedBlock.attachment || {};
  if (att.type) saveLastAttachmentSettings(att);
  attachTypeSelect.value   = att.type  || '';
  attachLabel.value        = att.label || '';
  attachSrc.value             = att.src   || '';
  attachSrcSelect.value       = att.src   || '';
  attachLooseSrc.value        = att.loose?.src || '';
  attachLooseSrcSelect.value  = att.loose?.src || '';
  roughPresetSelect.value     = att.roughPreset || 'solid';
  roughLineQuantity.value     = att.lineQuantity ?? 30;
  roughLineQuantityValue.value= att.lineQuantity ?? 30;
  roughLinePrecision.value    = att.linePrecision ?? 1;
  roughLinePrecisionValue.value= att.linePrecision ?? 1;
  roughInitialPeeled.value    = att.initialPeeled ?? 2;
  roughInitialPeeledValue.value= att.initialPeeled ?? 2;
  roughStrokeWidth.value      = att.lineWidth ?? 1;
  roughStrokeWidthValue.value = att.lineWidth ?? 1;
  attachSvgOpacity.value      = att.svgOpacity ?? 0.15;
  attachStrokeResistance.value= att.strokeResistance ?? 15;
  attachX.value               = att.x       ?? 0;
  attachY.value               = att.y       ?? 0;
  attachScale.value           = att.scale   ?? 1;
  attachScaleValue.value      = att.scale   ?? 1;
  attachOpacity.value         = att.opacity ?? 1;
  attachOpacityValue.value    = att.opacity ?? 1;
  attachWidth.value           = att.width   ?? 300;
  attachHeight.value          = att.height  ?? 180;
  attachGap.value             = att.gap     ?? 16;
  attachOffsetY.value         = att.opticalOffsetY ?? 0;
  updateAttachFieldVisibility();
  updateLocaleSyncMarkers();
  blockHiddenToggle.checked = Boolean(selectedBlock.hidden);
  const tBtn = selectedBlock.timedButton || {};
  timedBtnEnabled.checked = Boolean(selectedBlock.timedButton);
  timedBtnDelay.value   = tBtn.delayMs ?? 7000;
  timedBtnLabel.value   = tBtn.text    ?? '→';
  timedBtnAction.value  = tBtn.action  ?? 'none';
  timedBtnAddText.value = tBtn.addText ?? '';
  timedBtnUrl.value     = tBtn.url     ?? '';
  timedBtnSpawnAt.value = tBtn.spawnAt ?? 'afterNoPeel';
  updateTimedButtonFieldVisibility();
  updateSelectedBlockVisuals(config);
  updateShapeFieldVisibility(); // Ensure shape fields are correctly displayed after refresh
  assignEditorTabs();
  setEditorTab(activeEditorTab);
}

toggleEditor = function toggleEditor(forceOpen = null) {
  if (mobileRuntime) return;
  const shouldOpen = forceOpen ?? !editorPanel.classList.contains('open');
  editorPanel.classList.toggle('open', shouldOpen);
  document.body.classList.toggle('editor-open', shouldOpen);
  localStorage.setItem('tirita.editorOpen', shouldOpen ? '1' : '0');
  simulationPaused = shouldOpen && pauseInput.checked; state.simulationPaused = simulationPaused;
  lastBehaviorVisibilityKey = ''; state.lastBehaviorVisibilityKey = '';
  lastVisibleBlockSignature = '';
  if (shouldOpen) {
    if (!editorInitialized) {
      refreshEditorJson();
      editorInitialized = true;
    }
    refreshVisualEditor();
    relayoutLockedLetters();
    restoreSceneScroll();
    updateUndoRedoButtons();
    autoSaveHistorySnapshot();
    startHistoryAutoSave();
    if (historySection?.open) renderHistoryList();
    // Restore scroll position after a tiny timeout to ensure elements are rendered
    setTimeout(() => {
      restoreEditorScrollState();
      if (focusedId) {
        const el = document.getElementById(focusedId);
        if (el) {
          el.focus();
          if (el.setSelectionRange) el.setSelectionRange(cursorStart, cursorEnd);
        }
      }
    }, 10);
  } else {
    stopHistoryAutoSave();
    setLineartCanvasTool('off');
    setDrawTextTool('off');
    container.style.cursor = '';
  }
}

function downloadConfig(config) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${config.id || 'tirita'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function safeIllustrationName(name = 'asset') {
  const dot = name.lastIndexOf('.');
  const base = (dot > -1 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset';
  const ext = (dot > -1 ? name.slice(dot + 1) : '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base}-${Date.now().toString(36)}${ext ? `.${ext}` : ''}`;
}

function isIllustrationFile(file) {
  return /\.(svg|png|jpe?g|gif)$/i.test(file.name || '');
}

function parseSvgDimension(value) {
  const parsed = parseFloat(String(value || ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getSvgIntrinsicSize(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const vb = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  if (vb?.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) {
    return { width: vb[2], height: vb[3] };
  }
  const width = parseSvgDimension(svg.getAttribute('width'));
  const height = parseSvgDimension(svg.getAttribute('height'));
  return width && height ? { width, height } : null;
}

async function getIllustrationIntrinsicSize(src) {
  if (!src) return null;
  try {
    if (/\.svg(?:$|\?)/i.test(src)) {
      const resp = await fetch(src);
      if (!resp.ok) return null;
      return getSvgIntrinsicSize(await resp.text());
    }
    return await new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? { width: img.naturalWidth, height: img.naturalHeight } : null);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  } catch {
    return null;
  }
}

function fitIllustrationBoxToAspect(width, height) {
  const aspect = width > 0 && height > 0 ? width / height : 300 / 195;
  let nextWidth = 300;
  let nextHeight = Math.round(nextWidth / aspect);
  if (nextHeight > 300) {
    nextHeight = 300;
    nextWidth = Math.round(nextHeight * aspect);
  }
  if (nextHeight < 120) {
    nextHeight = 120;
    nextWidth = Math.round(nextHeight * aspect);
  }
  return {
    width: Math.max(80, Math.min(420, nextWidth)),
    height: Math.max(80, Math.min(360, nextHeight))
  };
}

function illustrationSizeLooksAuto() {
  const w = Number(attachWidth.value || 0);
  const h = Number(attachHeight.value || 0);
  return !w || !h || (Math.abs(w - 300) <= 2 && [180, 195].some(value => Math.abs(h - value) <= 2));
}

async function applyIllustrationIntrinsicSize(src, { force = false } = {}) {
  if (!src || (!force && !illustrationSizeLooksAuto())) return false;
  const size = await getIllustrationIntrinsicSize(src);
  const box = size ? fitIllustrationBoxToAspect(size.width, size.height) : { width: 300, height: 195 };
  setControlValue(attachWidth, box.width);
  setControlValue(attachHeight, box.height);
  return true;
}

const DEFAULT_ILLUSTRATION_FILES = [
  'illustrations/anular-body.svg',
  'illustrations/anular-loose.svg',
  'illustrations/plant-body.svg',
  'illustrations/tirita/t_cara.svg',
  'illustrations/tirita/t_corazones_1.svg',
  'illustrations/tirita/t_corazones.svg',
  'illustrations/tirita/t_corazonesTest.svg',
  'illustrations/tirita/t_cuesta.svg',
  'illustrations/tirita/t_cuticula.svg',
  'illustrations/tirita/t_dedoTest.svg',
  'illustrations/tirita/t_encriptado.svg',
  'illustrations/tirita/t_fuera.svg',
  'illustrations/tirita/t_grifo.svg',
  'illustrations/tirita/t_hamaca.svg',
  'illustrations/tirita/t_humo.svg',
  'illustrations/tirita/t_manos.svg',
  'illustrations/tirita/t_masa.svg',
  'illustrations/tirita/t_mente.svg',
  'illustrations/tirita/t_mente2.svg',
  'illustrations/tirita/t_neuro.svg',
  'illustrations/tirita/t_ojos.svg',
  'illustrations/tirita/t_ondas.svg',
  'illustrations/tirita/t_rodilla.svg',
  'illustrations/tirita/t_tira.svg',
  'illustrations/tirita/t_vista.svg'
];
const CHOOSE_ILLUSTRATIONS_FOLDER_VALUE = '__choose-illustrations-folder__';
let currentIllustrationFiles = [...DEFAULT_ILLUSTRATION_FILES];

function getStoredIllustrationFiles() {
  try {
    const stored = JSON.parse(localStorage.getItem('tirita.illustrationFiles') || '[]');
    return Array.isArray(stored) ? stored.filter(path => /\.(svg|png|jpe?g|gif)$/i.test(path)) : [];
  } catch (_) {
    return [];
  }
}

async function listIllustrationDirectory(handle, prefix = 'illustrations') {
  const files = [];
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === 'directory') {
      files.push(...await listIllustrationDirectory(entry, `${prefix}/${name}`));
    } else if (/\.(svg|png|jpe?g|gif)$/i.test(name)) {
      files.push(`${prefix}/${name}`);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function chooseIllustrationsFolder() {
  if (!('showDirectoryPicker' in window)) {
    await showAlert('Start the local dev server with npm start so Tirita can scan illustrations automatically.');
    return false;
  }
  try {
    const handle = await window.showDirectoryPicker({ id: 'tirita-illustrations', mode: 'read' });
    const files = await listIllustrationDirectory(handle);
    if (!files.length) {
      await showAlert('No SVG, PNG, JPG, or GIF files found in that folder.');
      return false;
    }
    currentIllustrationFiles = files;
    localStorage.setItem('tirita.illustrationFiles', JSON.stringify(files));
    refreshIllustrationSelectOptions(files, { includeFolderPicker: true });
    return true;
  } catch (_) {
    return false;
  }
}

function refreshIllustrationSelectOptions(files, { includeFolderPicker = false } = {}) {
  const fill = (select, allowed) => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Choose file...</option>';
    files.filter(path => allowed.test(path)).forEach(path => {
      const option = document.createElement('option');
      option.value = path;
      option.textContent = path.replace(/^illustrations\//, '');
      select.appendChild(option);
    });
    if (includeFolderPicker) {
      const option = document.createElement('option');
      option.value = CHOOSE_ILLUSTRATIONS_FOLDER_VALUE;
      option.textContent = 'Choose local illustrations folder...';
      select.appendChild(option);
    }
    select.value = [...select.options].some(option => option.value === current) ? current : '';
  };
  fill(attachSrcSelect, /\.(svg|png|jpe?g|gif)$/i);
  fill(attachLooseSrcSelect, /\.svg$/i);
}

async function refreshIllustrationFileOptions() {
  const storedFiles = getStoredIllustrationFiles();
  let files = storedFiles.length ? storedFiles : DEFAULT_ILLUSTRATION_FILES;
  let includeFolderPicker = true;
  try {
    const res = await fetch(`/api/illustrations?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      files = data.files?.length ? data.files : files;
      includeFolderPicker = false;
    }
  } catch (err) {
    console.warn('Tirita: illustrations API unavailable; using local fallback list.', err);
  }
  currentIllustrationFiles = files;
  refreshIllustrationSelectOptions(files, { includeFolderPicker });
}

function refreshIllustrationOptionsOnOpen(select) {
  if (!select) return;
  let refreshQueued = false;
  const queueRefresh = () => {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(async () => {
      refreshQueued = false;
      await refreshIllustrationFileOptions();
    });
  };
  select.addEventListener('focus', queueRefresh);
  select.addEventListener('pointerdown', queueRefresh);
}

async function saveDroppedIllustrationFile(file) {
  const safeName = safeIllustrationName(file.name);
  try {
    const form = new FormData();
    form.append('file', file, safeName);
    const res = await fetch('/api/illustrations', { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      return data.path;
    }
  } catch (_) {}
  if ('showDirectoryPicker' in window) {
    const handle = await window.showDirectoryPicker({ id: 'tirita-illustrations', mode: 'readwrite' });
    const writable = await (await handle.getFileHandle(safeName, { create: true })).createWritable();
    await writable.write(await file.arrayBuffer());
    await writable.close();
    return `illustrations/${safeName}`;
  }
  throw new Error('Start the local dev server or use a browser with folder write access.');
}

async function handleIllustrationDrop(event) {
  const file = [...(event.dataTransfer?.files || [])].find(isIllustrationFile);
  if (!file) return;
  event.preventDefault();
  event.stopPropagation();
  document.body.classList.remove('editor-drop-active');
  const path = await saveDroppedIllustrationFile(file);
  await refreshIllustrationFileOptions();
  if (/\.svg$/i.test(path)) {
    attachTypeSelect.value = 'lineart';
    attachSrc.value = path;
    attachSrcSelect.value = path;
  } else {
    attachTypeSelect.value = 'image';
    attachSrc.value = path;
    attachSrcSelect.value = path;
  }
  await applyIllustrationIntrinsicSize(path, { force: true });
  updateAttachFieldVisibility();
  applyLiveEditorState();
  triggerAutoReload();
}

function openAssetPath(path) {
  if (!path) return;
  window.open(path, '_blank', 'noopener');
}

function pointsFromRoughLine(x1, y1, x2, y2, options = {}) {
  return [[x1, y1], [x2, y2]];
}

function makeRoughPresetStrokes(preset) {
  return [];
}

function initSceneSelector() {
  sceneSelect.innerHTML = '';
  for (const [key, scene] of Object.entries(scenePresets)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = scene.label;
    sceneSelect.appendChild(option);
  }
  sceneSelect.value = localStorage.getItem('tirita.scene') || 'default';
}

function loadScene(key) {
  const scene = scenePresets[key] || scenePresets.default;
  const previousSceneKey = localStorage.getItem('tirita.scene') || 'default';
  if (editorInitialized) {
    try { persistPieceConfig(buildConfigFromVisualControls(), previousSceneKey); } catch {}
  } else if (pieceConfig) {
    persistPieceConfig(pieceConfig, previousSceneKey);
  }
  let config = structuredClone(scene.config);
  const storedConfig = getStoredSceneConfigString(key);
  if (storedConfig) {
    try { config = JSON.parse(storedConfig); } catch {}
  }
  config.version = defaultPieceConfig.version;
  persistEditorPrefs();
  saveSceneScroll();
  clearLocaleSyncStores();
  clearEditorHistory(); clearUndoRedo();
  localStorage.setItem('tirita.scene', key);
  localStorage.setItem('tirita.pieceConfig', JSON.stringify(config));
  localStorage.setItem('tirita.selectedBlockIdx', '0');
  localStorage.removeItem('tirita.focusedElementId');
  localStorage.removeItem('tirita.cursorStart');
  localStorage.removeItem('tirita.cursorEnd');
  if (window.location.search) window.location.replace(`${window.location.pathname}${window.location.hash || ''}`);
  else window.location.reload();
}

function getSelectedLiveLetters() {
  const range = blockRanges[selectedBlockIdx];
  if (!range) return [];
  return letters
    .map((letter, idx) => ({ letter, idx }))
    .slice(range.start, range.end + 1)
    .filter(({ letter }) => !letter.deleted);
}

function mutateSelectedBlockTransform(mutator) {
  const nextConfig = getMutableConfigFromEditor();
  const blocks = getEditableBlocks(nextConfig);
  const block = blocks[selectedBlockIdx];
  if (!block) return;
  block.transform ||= { x: 0, y: 0, scale: 1 };
  mutator(block.transform);
  setEditorConfig(nextConfig);
}

function moveSelectedBlockLive(dx, dy) {
  for (const { letter, idx } of getSelectedLiveLetters()) {
    letter.x += dx;
    letter.y += dy;
    letter.ox += dx;
    letter.oy += dy;
    letter.px += dx;
    letter.py += dy;
    els[idx].style.transform = `translate(${letter.x}px, ${letter.y}px) rotate(${letter.angle || 0}rad)`;
  }
  const origin = shapeOrigins.get(selectedBlockIdx);
  if (origin) {
    origin.screenX += dx;
    origin.screenY += dy;
    positionClipShapeFrames();
  }
  restLengths = computeRestLengths(); state.restLengths = restLengths; gapLinkDecayTargets = computeGapLinkDecayTargets(); state.gapLinkDecayTargets = gapLinkDecayTargets;
  crossBlockConstraints = computeCrossBlockConstraints(); state.crossBlockConstraints = crossBlockConstraints;
  positionBlockGizmos();
}

function scaleSelectedBlockLive(factor) {
  const bounds = getBlockBounds(selectedBlockIdx);
  const cx = bounds.left + bounds.width / 2;
  const cy = bounds.top + bounds.height / 2;
  for (const { letter, idx } of getSelectedLiveLetters()) {
    letter.x = cx + (letter.x - cx) * factor;
    letter.y = cy + (letter.y - cy) * factor;
    letter.ox = cx + (letter.ox - cx) * factor;
    letter.oy = cy + (letter.oy - cy) * factor;
    letter.px = cx + (letter.px - cx) * factor;
    letter.py = cy + (letter.py - cy) * factor;
    letter.w *= factor;
    letter.scale *= factor;
    els[idx].style.fontSize = `${Number.parseFloat(baseFontSize) * letter.scale}px`;
    els[idx].style.transform = `translate(${letter.x}px, ${letter.y}px) rotate(${letter.angle || 0}rad)`;
  }
  const origin = shapeOrigins.get(selectedBlockIdx);
  if (origin) {
    origin.screenX = cx + (origin.screenX - cx) * factor;
    origin.screenY = cy + (origin.screenY - cy) * factor;
    origin.scale *= factor;
    positionClipShapeFrames();
  }
  restLengths = computeRestLengths(); state.restLengths = restLengths; gapLinkDecayTargets = computeGapLinkDecayTargets(); state.gapLinkDecayTargets = gapLinkDecayTargets;
  crossBlockConstraints = computeCrossBlockConstraints(); state.crossBlockConstraints = crossBlockConstraints;
  positionBlockGizmos();
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
  restLengths = computeRestLengths(); state.restLengths = restLengths; gapLinkDecayTargets = computeGapLinkDecayTargets(); state.gapLinkDecayTargets = gapLinkDecayTargets;
  crossBlockConstraints = computeCrossBlockConstraints(); state.crossBlockConstraints = crossBlockConstraints;
  reflowStarted.clear(); startedPeelSegments.clear(); computeAllReflowPositions(); computeAnchorPeelNeighbors();
  for (const l of letters) delete l._peelTargetY;
  positionHint();
  positionAttachments();
  positionClipShapeFrames();
  positionBlockGizmos();
}

function resizeSelectedTextAreaLive(widthPx) {
  const block = textBlocks[selectedBlockIdx];
  if (!block) return;
  block.transform ||= { x: 0, y: 0, scale: 1, width: getMaxWidth(), height: 0 };
  block.transform.width = Math.max(80, Math.min(1200, widthPx / Number(block.transform.scale || 1)));
  blockWidthInput.value = Math.round(block.transform.width);
  relayoutLockedLetters();
}

function startTransformDrag(e, mode) {
  if (isCanvasAuthoringToolActive()) return;
  e.preventDefault();
  const startX = e.clientX;
  const startY = e.clientY;
  let lastX = startX;
  let lastY = startY;
  const startBounds = getBlockBounds(selectedBlockIdx);
  const startDistance = Math.hypot(startX - startBounds.left, startY - startBounds.top) || 1;
  let lastDistance = startDistance;
  const onMove = (moveEvent) => {
    if (mode === 'move') {
      const dx = moveEvent.clientX - lastX;
      const dy = moveEvent.clientY - lastY;
      moveSelectedBlockLive(dx, dy);
      const block = textBlocks[selectedBlockIdx];
      if (block?.transform) {
        block.transform.x = Number(block.transform.x || 0) + dx;
        block.transform.y = Number(block.transform.y || 0) + dy;
        syncTransformControls(block.transform);
      }
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
    } else if (mode === 'scale') {
      const distance = Math.hypot(moveEvent.clientX - startBounds.left, moveEvent.clientY - startBounds.top) || 1;
      const incrementalFactor = Math.max(0.85, Math.min(1.15, distance / lastDistance));
      scaleSelectedBlockLive(incrementalFactor);
      const block = textBlocks[selectedBlockIdx];
      if (block?.transform) {
        block.transform.scale = Math.max(0.2, Math.min(3, Number(block.transform.scale || 1) * incrementalFactor));
        syncTransformControls(block.transform);
      }
      lastDistance = distance;
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
    } else if (mode === 'resize') {
      const nextWidth = Math.max(80, startBounds.width + moveEvent.clientX - startX);
      resizeSelectedTextAreaLive(nextWidth);
    }
  };
  const onUp = (upEvent) => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (mode === 'move') {
      const nextConfig = buildConfigFromVisualControls();
      const block = getEditableBlocks(nextConfig)[selectedBlockIdx];
      if (block) block.transform = normalizeBlockTransform(textBlocks[selectedBlockIdx]?.transform || block.transform);
      const nextStr = JSON.stringify(nextConfig);
      maybePushUndo(nextStr);
      persistPieceConfig(nextStr);
      setEditorConfig(nextConfig);
    } else if (mode === 'scale') {
      const nextConfig = buildConfigFromVisualControls();
      const block = getEditableBlocks(nextConfig)[selectedBlockIdx];
      if (block) block.transform = normalizeBlockTransform(textBlocks[selectedBlockIdx]?.transform || block.transform);
      const nextStr = JSON.stringify(nextConfig);
      maybePushUndo(nextStr);
      persistPieceConfig(nextStr);
      setEditorConfig(nextConfig);
    } else if (mode === 'resize') {
      const nextWidth = Math.max(80, startBounds.width + upEvent.clientX - startX);
      const nextConfig = buildConfigFromVisualControls();
      const blocks = getEditableBlocks(nextConfig);
      const block = blocks[selectedBlockIdx];
      if (block) {
        block.transform ||= { x: 0, y: 0, scale: 1 };
        block.transform.width = Math.round(nextWidth / Number(block.transform.scale || 1));
      }
      const nextStr = JSON.stringify(nextConfig);
      maybePushUndo(nextStr);
      persistPieceConfig(nextStr);
      setEditorConfig(nextConfig);
    }
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function getNumberDragStep(input) {
  const rawStep = input.getAttribute('step');
  if (!rawStep || rawStep === 'any') return 1;
  const step = Number(rawStep);
  return Number.isFinite(step) && step > 0 ? step : 1;
}

function clampNumberInputValue(input, value) {
  const min = Number(input.getAttribute('min'));
  const max = Number(input.getAttribute('max'));
  let next = value;
  if (Number.isFinite(min)) next = Math.max(min, next);
  if (Number.isFinite(max)) next = Math.min(max, next);
  return next;
}

function formatDraggedNumber(value, step) {
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  return decimals ? value.toFixed(Math.min(decimals, 4)) : String(Math.round(value));
}

function initEditorNumberDrag() {
  editorPanel.addEventListener('pointerdown', (e) => {
    const input = e.target.closest('input[type="number"], input[data-number-input="true"]');
    if (!input || !editorPanel.contains(input) || e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startValue = Number(input.value || 0);
    const step = getNumberDragStep(input);
    const sensitivity = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
    let dragging = false;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) < 4) return;
      dragging = true;
      const delta = Math.round(dx / 8) * step * sensitivity;
      const next = clampNumberInputValue(input, startValue + delta);
      input.value = formatDraggedNumber(next, step);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      moveEvent.preventDefault();
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (dragging) input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}

function initEditorNumberInputs() {
  editorPanel.querySelectorAll('input[type="number"]').forEach(input => {
    input.dataset.numberInput = 'true';
    input.dataset.lastNumericValue = input.value || '';
    input.setAttribute('inputmode', input.getAttribute('step')?.includes('.') ? 'decimal' : 'numeric');
    input.type = 'text';
    input.addEventListener('change', () => {
      if (input.value !== '') input.dataset.lastNumericValue = input.value;
    });
  });
}

function isPendingNumericEdit(input) {
  if (!input?.dataset?.numberInput || document.activeElement !== input) return false;
  if (input.value === '') return true;
  const previous = Number(input.dataset.lastNumericValue || 0);
  return previous > 0 && /^0+$/.test(input.value);
}

function syncPairedRange(source, target) {
  if (!source || !target) return;
  target.value = source.value;
  if (target.dataset?.numberInput) target.dataset.lastNumericValue = target.value;
}

function setupRangeNumberPair(range, number) {
  if (!range || !number) return;
  range.addEventListener('input', () => syncPairedRange(range, number));
  range.addEventListener('change', () => syncPairedRange(range, number));
  number.addEventListener('input', () => {
    if (isPendingNumericEdit(number)) return;
    syncPairedRange(number, range);
  });
  number.addEventListener('change', () => syncPairedRange(number, range));
}

function syncEditorRangeControl(control) {
  if (control === roughLineQuantity) syncPairedRange(roughLineQuantity, roughLineQuantityValue);
  if (control === roughLineQuantityValue) syncPairedRange(roughLineQuantityValue, roughLineQuantity);
  if (control === roughLinePrecision) syncPairedRange(roughLinePrecision, roughLinePrecisionValue);
  if (control === roughLinePrecisionValue) syncPairedRange(roughLinePrecisionValue, roughLinePrecision);
  if (control === roughInitialPeeled) syncPairedRange(roughInitialPeeled, roughInitialPeeledValue);
  if (control === roughInitialPeeledValue) syncPairedRange(roughInitialPeeledValue, roughInitialPeeled);
  if (control === roughStrokeWidth) syncPairedRange(roughStrokeWidth, roughStrokeWidthValue);
  if (control === roughStrokeWidthValue) syncPairedRange(roughStrokeWidthValue, roughStrokeWidth);
  if (control === attachScale) syncPairedRange(attachScale, attachScaleValue);
  if (control === attachScaleValue) syncPairedRange(attachScaleValue, attachScale);
  if (control === attachOpacity) syncPairedRange(attachOpacity, attachOpacityValue);
  if (control === attachOpacityValue) syncPairedRange(attachOpacityValue, attachOpacity);
}

initSceneSelector();
{
  const _sk = localStorage.getItem('tirita.scene') || 'default';
  const _sl = scenePresets[_sk]?.label;
  document.title = (!_sl || _sk === 'tirita') ? 'PeelType' : `${_sl} - PeelType`;
}
const localeSelect = document.getElementById('localeSelect');
const mainLocaleSelect = document.getElementById('mainLocaleSelect');
function setLocaleAndReload(newLocale) {
  localStorage.setItem('tirita.locale', newLocale);
  const currentScene = localStorage.getItem('tirita.scene') || 'default';
  if (currentScene === 'tirita') {
    // Rewrite only locale-dependent text in the stored config so all other settings
    // (peel, triggers, timedButton, behaviors, force fields, etc.) survive the switch.
    const stored = getStoredSceneConfigString(currentScene);
    if (stored) {
      try {
        const config = JSON.parse(stored);
        if (config?.id === 'tirita-poema' && Array.isArray(config.blocks)) {
          const newLocaleData = LOCALES[newLocale];
          const baseBlocks = scenePresets.tirita?.config?.blocks || [];
          const baseById = new Map(baseBlocks.map(b => [b.id, b]));
          if (newLocaleData) {
            for (const block of config.blocks) {
              const newText = newLocaleData.strings?.[block.id] ?? baseById.get(block.id)?.text;
              if (newText !== undefined) block.text = newText;
              const wordOverrides = newLocaleData.wordTriggers?.[block.id];
              if (wordOverrides && Array.isArray(block.triggers)) {
                let overrideIdx = 0;
                block.triggers = block.triggers.map(trigger => {
                  if (trigger.on !== 'wordComplete') return trigger;
                  const ov = wordOverrides[overrideIdx++];
                  if (!ov) return trigger;
                  const next = { ...trigger };
                  if ('word'  in ov) next.word  = ov.word;  else delete next.word;
                  if ('words' in ov) next.words = ov.words; else delete next.words;
                  if ('physicsLabel' in ov) {
                    next.actions = (trigger.actions || []).map(a =>
                      a.type === 'physicsObject' ? { ...a, label: ov.physicsLabel } : a
                    );
                  }
                  return next;
                });
              }
            }
          }
          persistPieceConfig(JSON.stringify(config), currentScene);
        }
      } catch {}
    }
  }
  saveSceneScroll();
  window.location.reload();
}
// Build main-locale popup early so populateLocaleSelects can fill it
const _mainLocalePopup = (() => {
  const popup = document.createElement('div');
  popup.id = 'mainLocalePopup';
  popup.hidden = true;
  popup.innerHTML = `<div class="mlp-header"><strong>Main language</strong><button type="button" class="mlp-close" title="Close">✕</button></div><p class="mlp-desc">The main language is the authoritative source for shared editor properties (peel, style, triggers, illustrations). Other languages inherit these values unless overridden per-language.</p><select id="mainLocaleSelectPopup"></select>`;
  document.body.appendChild(popup);
  popup.querySelector('.mlp-close').addEventListener('click', () => { popup.hidden = true; });
  document.addEventListener('pointerdown', (e) => {
    if (!popup.hidden && !popup.contains(e.target) && e.target.id !== 'mainLocaleBtn') popup.hidden = true;
  }, true);
  return popup;
})();

const _localeUIStyle = document.createElement('style');
_localeUIStyle.textContent = `
  #editorPanel .locale-action-btn { padding: 5px 7px; font: 11px Georgia, serif; min-width: 0; opacity: .6; line-height: 1.2; white-space: nowrap; }
  #editorPanel .locale-action-btn:hover { opacity: 1; }
  #mainLocalePopup { position:fixed; z-index:9999; min-width:220px; background:var(--editor-bg,#f8f5f0); border:1px solid var(--editor-border,#c8bfb0); border-radius:6px; padding:10px 12px; box-shadow:0 4px 16px rgba(0,0,0,.2); }
  #mainLocalePopup .mlp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
  #mainLocalePopup .mlp-desc { font-size:11px; opacity:.65; line-height:1.4; margin:0 0 8px; }
  #mainLocalePopup select { width:100%; }
  #mainLocalePopup .mlp-close { background:none; border:none; cursor:pointer; font-size:13px; padding:0 2px; opacity:.5; }
  #mainLocalePopup .mlp-close:hover { opacity:1; }
`;
document.head.appendChild(_localeUIStyle);

function populateLocaleSelects() {
  const opts = Object.entries(LOCALES)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, loc]) => `<option value="${code}">${loc.label || code.toUpperCase()}</option>`)
    .join('');
  if (localeSelect) localeSelect.innerHTML = opts;
  if (mainLocaleSelect) mainLocaleSelect.innerHTML = opts;
  if (languageSelect) languageSelect.innerHTML = opts;
  const popupSel = document.getElementById('mainLocaleSelectPopup');
  if (popupSel) { popupSel.innerHTML = opts; popupSel.value = getMainLocale(); }
}
populateLocaleSelects();

// Popup select fires the same promote-main logic
document.getElementById('mainLocaleSelectPopup')?.addEventListener('change', (e) => {
  const nextConfig = buildConfigFromVisualControls();
  persistAttachmentSyncFromConfig(nextConfig, storedLocale);
  persistPieceConfig(JSON.stringify(nextConfig));
  promoteLocaleToMain(e.target.value);
  preserveSceneScrollForReload();
  window.location.reload();
});

// Suggest a scene-selector label from the poem's first line (BBCode tags stripped, collapsed, capped).
function deriveSceneLabel(config) {
  const first = (config.blocks || []).find(b => (b.text || '').trim());
  const raw = first?.text || config.title || config.id || 'scene';
  const clean = raw.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return clean || config.title || config.id || 'scene';
}

async function saveLocaleToFile() {
  const lang = storedLocale;
  const localeData = LOCALES[lang];
  if (!localeData) { showToast('Unknown locale'); return; }
  const config = buildConfigFromVisualControls();
  const saved = [];
  const isMain = lang === getMainLocale();
  if (!isMain) {
    // Non-main locale: save translated strings to locale JS file
    const strings = {};
    for (const b of (config.blocks || [])) { if (b.id && b.text !== undefined) strings[b.id] = b.text; }
    try {
      const r = await fetch('/api/save-locale', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, label: localeData.label, strings, wordTriggers: localeData.wordTriggers || {} }) });
      if (r.ok) { LOCALES[lang] = { ...localeData, strings }; saved.push(`locales/${lang}.js`); }
      else saved.push(`locales/${lang}.js ✗`);
    } catch { saved.push(`locales/${lang}.js ✗`); }
  } else {
    // Main locale: save full poem config to its own JSON file (new scenes get registered server-side)
    // Brand-new scenes aren't in the manifest yet — ask for the dropdown label, suggesting the first line.
    let label;
    const knownKeys = Object.keys(scenePresets);
    const isRegistered = config.id === 'tirita-poema' ? knownKeys.includes('tirita') : knownKeys.includes(config.id);
    if (!isRegistered) {
      label = await showPrompt('Name for the scene selector (label):', deriveSceneLabel(config));
      if (label == null || label.trim() === '') { showToast('Save cancelled'); return; }
      label = label.trim();
    }
    try {
      const r = await fetch('/api/save-poem', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(label ? { ...config, label } : config) });
      const data = await r.json().catch(() => ({}));
      const fname = (data.path || `js/${config.id || 'tirita'}.json`).split('/').pop();
      if (r.ok) saved.push(data.created ? `${fname} (new)` : fname);
      else saved.push(`${fname} ✗${data.error ? ` — ${data.error}` : ''}`);
    } catch { saved.push(`${config.id || 'poem'}.json ✗ (is the local server running?)`); }
  }
  showToast(saved.length ? `Saved: ${saved.join(', ')}` : 'Nothing to save');
}

async function addNewLanguage() {
  const rawCode = await showPrompt('Language code (e.g. fr, de, pt):');
  if (!rawCode) return;
  const lang = rawCode.trim().toLowerCase();
  if (!/^[a-z]{2,8}$/.test(lang)) { showToast('Invalid code — use 2-8 lowercase letters'); return; }
  if (LOCALES[lang]) { showToast(`"${lang}" already exists — switch to it to start editing`); return; }
  const label = await showPrompt(`Display name for "${lang}":`, lang.toUpperCase());
  if (!label) return;
  const config = buildConfigFromVisualControls();
  const strings = {};
  for (const b of (config.blocks || [])) { if (b.id && b.text !== undefined) strings[b.id] = b.text; }
  try {
    const r = await fetch('/api/save-locale', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, label: label.trim(), strings, wordTriggers: {} }) });
    if (!r.ok) { showToast('Failed — is the server running?'); return; }
    const mod = await import(`./locales/${lang}.js?v=${Date.now()}`);
    const key = Object.keys(mod).find(k => k.startsWith('TIRITA_LOCALE_'));
    if (key) LOCALES[lang] = mod[key];
    populateLocaleSelects();
    showToast(`Created locales/${lang}.js — switch to ${label.trim()} to start translating`);
  } catch (e) { showToast('Error: ' + e.message); }
}

// Hide mainLocaleRow — replaced by popup button injected below
{ const r = document.getElementById('mainLocaleRow'); if (r) r.style.display = 'none'; }

// Inject compact buttons into locale row
{
  const localeRowSelect = document.getElementById('localeSelect');
  if (localeRowSelect) {
    const isMain = storedLocale === getMainLocale();
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button'; saveBtn.id = 'saveLocaleBtn'; saveBtn.className = 'locale-action-btn';
    const currentSceneId = getMutableConfigFromEditor()?.id;
    const currentSceneFile = currentSceneId === 'tirita-poema'
      ? 'peel-after-reading.json'
      : `${currentSceneId || 'tirita'}.json`;
    saveBtn.title = isMain ? `Save poem config to js/${currentSceneFile} (local server)` : `Save translations to locales/${storedLocale}.js`;
    saveBtn.dataset.help = saveBtn.title;
    saveBtn.textContent = '↓';
    saveBtn.addEventListener('click', saveLocaleToFile);
    localeRowSelect.insertAdjacentElement('afterend', saveBtn);

    const addBtn = document.createElement('button');
    addBtn.type = 'button'; addBtn.id = 'addLocaleBtn'; addBtn.className = 'locale-action-btn';
    addBtn.title = 'Add a new language file'; addBtn.dataset.help = addBtn.title;
    addBtn.textContent = '+';
    addBtn.addEventListener('click', addNewLanguage);
    saveBtn.insertAdjacentElement('afterend', addBtn);

    const mainBtn = document.createElement('button');
    mainBtn.type = 'button'; mainBtn.id = 'mainLocaleBtn'; mainBtn.className = 'locale-action-btn';
    mainBtn.title = 'Set main language'; mainBtn.dataset.help = mainBtn.title;
    mainBtn.textContent = 'Main';
    mainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _mainLocalePopup.hidden = !_mainLocalePopup.hidden;
      if (!_mainLocalePopup.hidden) {
        const rect = mainBtn.getBoundingClientRect();
        _mainLocalePopup.style.top = `${rect.bottom + 6}px`;
        _mainLocalePopup.style.left = `${Math.min(rect.left, window.innerWidth - 240)}px`;
        const ps = document.getElementById('mainLocaleSelectPopup');
        if (ps) ps.value = getMainLocale();
      }
    });
    addBtn.insertAdjacentElement('afterend', mainBtn);
  }
}

localeSelect.value = storedLocale;
languageSelect.value = storedLocale;
if (mainLocaleSelect) mainLocaleSelect.value = getMainLocale();
localeSelect.addEventListener('change', () => setLocaleAndReload(localeSelect.value));
languageSelect.addEventListener('change', () => setLocaleAndReload(languageSelect.value));
// mainLocaleSelect change is handled via the popup (mainLocaleSelectPopup) above
if (mobileRuntime) {
  debugPanel.classList.add('collapsed');
} else {
  if (localStorage.getItem('tirita.debugCollapsed') !== '0') debugPanel.classList.add('collapsed');
  debugToggle.addEventListener('click', () => {
    debugPanel.classList.toggle('collapsed');
    localStorage.setItem('tirita.debugCollapsed', debugPanel.classList.contains('collapsed') ? '1' : '0');
  });
}
sceneSelect.addEventListener('change', () => loadScene(sceneSelect.value));

sceneResetBtn.addEventListener('click', async () => {
  if (await showConfirm('Reset this example to its default state?\nYour local changes to this scene will be lost.', 'Reset', true)) {
    persistEditorPrefs();
    preserveSceneScrollForReload();
    removeStoredSceneConfig();
    clearLocaleSyncStores();
    clearAllPeelStates();
    clearEditorHistory(); clearUndoRedo();
    if (window.location.search) window.location.replace(`${window.location.pathname}${window.location.hash || ''}`);
    else window.location.reload();
  }
});

sceneClearOnceBtn?.addEventListener('click', async () => {
  const currentScene = localStorage.getItem('tirita.scene') || sceneSelect.value || 'default';
  if (await showConfirm('Clear saved local state for this scene once?\nThis reloads the bundled example, but does not change other saved scenes.', 'Clean once', true)) {
    persistEditorPrefs();
    preserveSceneScrollForReload();
    removeStoredSceneConfig(currentScene);
    clearLocaleSyncStores();
    clearAllPeelStates();
    clearEditorHistory(); clearUndoRedo();
    const url = new URL(window.location.href);
    url.searchParams.set('scene', currentScene);
    url.searchParams.set('clearSceneStorage', '1');
    window.location.replace(`${url.pathname}${url.search}${url.hash || ''}`);
  }
});

sceneNewBtn.addEventListener('click', async () => {
  const name = await showPrompt('Enter a name for your new scene:', 'my-new-scene');
  if (!name) return;
  const newConfig = structuredClone(defaultPieceConfig);
  newConfig.id = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-');
  newConfig.blocks = [makeNewBlock()];
  
  persistEditorPrefs();
  clearAllPeelStates();
  clearLocaleSyncStores();
  clearEditorHistory(); clearUndoRedo();
  saveSceneScroll();
  localStorage.setItem('tirita.scene', 'custom');
  persistPieceConfig(newConfig, 'custom');
  // We use a refresh to boot the new config properly
  window.location.reload();
});

reloadButton.addEventListener('click', () => {
  persistEditorPrefs();
  saveSceneScroll();
  window.location.reload();
});

setAudioMuted(audioMuted);
muteButton?.addEventListener('click', () => {
  if (audioMuted) armAudio();
  setAudioMuted(!audioMuted);
});

skipButton.addEventListener('click', () => {
  armAudio();
  if (activeBehaviors?.stepParagraphs?.enabled) {
    const firstIncomplete = getFirstIncompleteBlock();
    const anchorBlock = getStepWindowAnchorBlock(firstIncomplete);
    if (anchorBlock < firstIncomplete) {
      completedBlockTimes[anchorBlock] = 1;
      return;
    }
    forceCompleteCurrentBlock();
    completedBlockTimes[firstIncomplete] = 1;
  } else {
    forceCompleteCurrentBlock();
  }
});
editorToggle.addEventListener('click', () => toggleEditor());
editorCollapseToggle?.addEventListener('click', () => {
  savePanelLayout(editorPanel, 'scene');
  setPanelCollapsed(editorPanel, editorCollapseToggle, !editorPanel.classList.contains('collapsed'));
  persistEditorPrefs();
});
utilityCollapseToggle?.addEventListener('click', () => {
  savePanelLayout(editorUtilityPanel, 'tools');
  setPanelCollapsed(editorUtilityPanel, utilityCollapseToggle, !editorUtilityPanel.classList.contains('collapsed'));
  persistEditorPrefs();
});
rawToggle.addEventListener('click', () => {
  editorPanel.classList.toggle('raw-open');
  localStorage.setItem('tirita.rawOpen', editorPanel.classList.contains('raw-open') ? '1' : '0');
});
editorOptionResetPanels?.addEventListener('click', () => resetPanelLayouts());
editorOptionOpenGroups?.addEventListener('click', () => {
  document.querySelectorAll('#editorPanel details.editor-section, #editorUtilityPanel details.editor-section').forEach(section => { section.open = true; });
});
editorOptionCloseGroups?.addEventListener('click', () => {
  document.querySelectorAll('#editorPanel details.editor-section, #editorUtilityPanel details.editor-section').forEach(section => { section.open = false; });
});
editorOptionToggleRaw?.addEventListener('click', () => rawToggle.click());
editorOptionClearPeel?.addEventListener('click', () => {
  clearAllPeelStates();
  showToast('Saved peel positions cleared.');
});
editorOptionClearHistory?.addEventListener('click', () => {
  clearEditorHistory();
  clearUndoRedo();
  renderHistoryList();
  updateUndoRedoButtons();
});
editorOptionResetApp?.addEventListener('click', async () => {
  if (!await showConfirm('Delete all Tirita localStorage and reload?', 'Delete', true)) return;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('tirita.')) localStorage.removeItem(key);
  }
  window.location.reload();
});
addParagraphGizmo.addEventListener('click', addBlockAtEnd);
bulkImportReplace.addEventListener('click', () => importFullText(true));
bulkImportAppend.addEventListener('click', () => importFullText(false));
labGenReplace.addEventListener('click', () => generateLabyrinth(true));
labGenAppend.addEventListener('click', () => generateLabyrinth(false));
moveHandle.addEventListener('pointerdown', (e) => startTransformDrag(e, 'move'));
scaleHandle.addEventListener('pointerdown', (e) => startTransformDrag(e, 'scale'));
resizeHandle.addEventListener('pointerdown', (e) => startTransformDrag(e, 'resize'));
colorModeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    setActiveColorMode(btn.dataset.mode);
    applyLiveEditorState();
  });
});
document.querySelectorAll('[data-bb-wrap]').forEach(button => {
  button.addEventListener('click', () => wrapBlockSelection(`[${button.dataset.bbWrap}]`));
});
bbColorBtn.addEventListener('click', () => wrapBlockSelection(`[color=${bbColorPicker.value}]`));
bbMoreToggle.addEventListener('click', () => {
  const toolbar = bbMoreToggle.closest('.bbcode-toolbar');
  toolbar.classList.toggle('expanded');
  bbMoreToggle.textContent = toolbar.classList.contains('expanded') ? 'Less' : 'More';
});
bbGradientBtn.addEventListener('click', () => wrapBlockSelection(`[gradient=${bbGradientPreset.value}]`));
bbFontBtn.addEventListener('click', () => {
  const font = bbFontValue.value.trim() || fontSearch.value.trim() || 'Georgia';
  wrapBlockSelection(`[font=${font}]`);
});
bbSizeBtn.addEventListener('click', () => wrapBlockSelection(`[size=${Math.max(8, Math.min(160, Number(bbSizeValue.value) || 24))}]`));
bbUrlBtn.addEventListener('click', () => {
  const url = bbUrlValue.value.trim() || 'https://';
  wrapBlockSelection(`[url=${url}]`);
});
attachSrcSelect.addEventListener('change', async () => {
  preserveSceneScrollForReload();
  saveEditorScrollState();
  if (!attachSrcSelect.value) return;
  if (attachSrcSelect.value === CHOOSE_ILLUSTRATIONS_FOLDER_VALUE) {
    chooseIllustrationsFolder();
    return;
  }
  attachSrc.value = attachSrcSelect.value;
  await applyIllustrationIntrinsicSize(attachSrc.value, { force: true });
  applyLiveEditorState();
  triggerAutoReload();
});
attachSrc.addEventListener('change', async () => {
  preserveSceneScrollForReload();
  saveEditorScrollState();
  if (!attachSrc.value || !['image', 'lineart'].includes(attachTypeSelect.value)) return;
  await applyIllustrationIntrinsicSize(attachSrc.value, { force: true });
  applyLiveEditorState();
  triggerAutoReload();
});
attachLooseSrcSelect.addEventListener('change', () => {
  if (!attachLooseSrcSelect.value) return;
  if (attachLooseSrcSelect.value === CHOOSE_ILLUSTRATIONS_FOLDER_VALUE) {
    chooseIllustrationsFolder();
    return;
  }
  attachLooseSrc.value = attachLooseSrcSelect.value;
  applyLiveEditorState();
  triggerAutoReload();
});
refreshIllustrationOptionsOnOpen(attachSrcSelect);
refreshIllustrationOptionsOnOpen(attachLooseSrcSelect);
attachOpen.addEventListener('click', () => openAssetPath(attachSrc.value));
attachLooseOpen.addEventListener('click', () => openAssetPath(attachLooseSrc.value));
lineartToolButtons.forEach(button => {
  button.addEventListener('click', () => setLineartCanvasTool(button.dataset.lineartTool));
});
drawTextToolButtons.forEach(button => {
  button.addEventListener('click', () => setDrawTextTool(button.dataset.drawTextTool));
});
drawTextClearBtn.addEventListener('click', () => {
  mutateSelectedDrawPath((drawPath) => {
    drawPath.anchors = [];
  }, false);
  relayoutLockedLetters();
});
function applyDrawTextExample(kind) {
  let anchors;
  if (kind === 'spiral') {
    const cx = 260;
    const cy = 150;
    anchors = [
      { x: cx - 226, y: cy - 16, in: { x: 0, y: 0 }, out: { x: 126, y: -104 } },
      { x: cx + 178, y: cy - 96, in: { x: -146, y: -82 }, out: { x: 128, y: 96 } },
      { x: cx + 132, y: cy + 112, in: { x: 134, y: -18 }, out: { x: -104, y: 82 } },
      { x: cx - 72, y: cy + 50, in: { x: 92, y: 86 }, out: { x: -48, y: -36 } }
    ];
  } else if (kind === 'margin') {
    const x = 86;
    anchors = [
      { x, y: 310, in: { x: 0, y: 0 }, out: { x: -44, y: -88 } },
      { x: x + 44, y: 210, in: { x: -56, y: 58 }, out: { x: 58, y: -64 } },
      { x: x - 4, y: 108, in: { x: 52, y: 64 }, out: { x: -52, y: -64 } },
      { x: x + 38, y: 10, in: { x: -56, y: 62 }, out: { x: 0, y: 0 } }
    ];
  } else if (kind === 'underline') {
    anchors = [
      { x: 34, y: 126, in: { x: 0, y: 0 }, out: { x: 170, y: 0 } },
      { x: 340, y: 126, in: { x: -160, y: 0 }, out: { x: 120, y: 0 } },
      { x: 620, y: 72, in: { x: -96, y: 82 }, out: { x: 0, y: 0 } }
    ];
  } else if (kind === 'fall') {
    anchors = [
      { x: 42, y: 42, in: { x: 0, y: 0 }, out: { x: 92, y: 18 } },
      { x: 210, y: 88, in: { x: -92, y: -38 }, out: { x: 92, y: 58 } },
      { x: 372, y: 205, in: { x: -78, y: -92 }, out: { x: 96, y: 92 } },
      { x: 604, y: 320, in: { x: -96, y: -52 }, out: { x: 0, y: 0 } }
    ];
  } else if (kind === 'loop') {
    anchors = [
      { x: 36, y: 174, in: { x: 0, y: 0 }, out: { x: 120, y: -138 } },
      { x: 300, y: 64, in: { x: -128, y: -96 }, out: { x: 140, y: 108 } },
      { x: 260, y: 248, in: { x: 126, y: 78 }, out: { x: -110, y: -86 } },
      { x: 132, y: 144, in: { x: -80, y: 88 }, out: { x: 172, y: 44 } },
      { x: 652, y: 184, in: { x: -162, y: -56 }, out: { x: 0, y: 0 } }
    ];
  } else {
    anchors = [
      { x: 25, y: 82, in: { x: 0, y: 0 }, out: { x: 100, y: -70 } },
      { x: 245, y: 76, in: { x: -100, y: 70 }, out: { x: 95, y: 80 } },
      { x: 485, y: 80, in: { x: -95, y: -80 }, out: { x: 90, y: -60 } },
      { x: 665, y: 72, in: { x: -90, y: 60 }, out: { x: 0, y: 0 } }
    ];
  }
  drawTextEnabled.checked = true;
  updateDrawTextFieldVisibility();
  mutateSelectedDrawPath((drawPath) => {
    drawPath.anchors = anchors;
    drawPath.spacing = Number(drawTextSpacing.value) || 2;
    drawPath.angleMix = Number(drawTextAngleMix.value) || 1;
  }, false);
  relayoutLockedLetters();
}
drawTextExampleWave.addEventListener('click', () => applyDrawTextExample('wave'));
drawTextExampleSpiral.addEventListener('click', () => applyDrawTextExample('spiral'));
drawTextExampleMargin.addEventListener('click', () => applyDrawTextExample('margin'));
drawTextExampleUnderline.addEventListener('click', () => applyDrawTextExample('underline'));
drawTextExampleFall.addEventListener('click', () => applyDrawTextExample('fall'));
drawTextExampleLoop.addEventListener('click', () => applyDrawTextExample('loop'));
editorPanel.addEventListener('dragenter', (event) => {
  if ([...(event.dataTransfer?.items || [])].some(item => item.kind === 'file')) document.body.classList.add('editor-drop-active');
});
editorPanel.addEventListener('dragover', (event) => {
  if ([...(event.dataTransfer?.items || [])].some(item => item.kind === 'file')) event.preventDefault();
});
editorPanel.addEventListener('dragleave', (event) => {
  if (!editorPanel.contains(event.relatedTarget)) document.body.classList.remove('editor-drop-active');
});
editorPanel.addEventListener('drop', (event) => {
  handleIllustrationDrop(event).catch(err => showAlert(err.message));
});

gradientStopAdd.addEventListener('click', () => {
  currentGradientStops.push({
    color: '#4a4a4a',
    alpha: 1,
    position: currentGradientStops.length ? 100 : 0
  });
  renderGradientStops();
  applyLiveEditorState();
});
gradientPresetSave.addEventListener('click', async () => {
  const name = await showPrompt('Gradient preset name:', `Gradient ${currentGradientPresets.length + 1}`);
  if (!name) return;
  currentGradientPresets.push({
    name,
    angle: Number(gradientAngle.value) || 90,
    stops: currentGradientStops.map(stop => ({ ...stop }))
  });
  localStorage.setItem('tirita.gradientPresets', JSON.stringify(currentGradientPresets));
  renderGradientPresetOptions();
});
gradientPresetDelete.addEventListener('click', () => {
  const name = bbGradientPreset.value;
  if (!name) return;
  currentGradientPresets = currentGradientPresets.filter(preset => preset.name !== name); state.currentGradientPresets = currentGradientPresets;
  localStorage.setItem('tirita.gradientPresets', JSON.stringify(currentGradientPresets));
  renderGradientPresetOptions();
});

peelPointAddLeft.addEventListener('click', () => addPeelPoint('left'));
peelPointAddRight.addEventListener('click', () => addPeelPoint('right'));
eventTriggerAdd.addEventListener('click', () => {
  currentTriggers.push(normalizeTrigger({ on: 'blockAppear', actions: [getDefaultActionForType('particles')] }));
  renderEventTriggers();
  applyLiveEditorState();
});
forceFieldAddWind?.addEventListener('click', () => addForceFieldToEditor({
  id: `wind-${Date.now().toString(36)}`,
  type: 'wind',
  global: true,
  direction: 'left',
  autoWake: true,
  strength: 0.25,
  lockedStrength: 0,
  gust: 0.35,
  feather: 80
}));
forceFieldAddMagnet?.addEventListener('click', () => addForceFieldToEditor({
  id: `magnet-${Date.now().toString(36)}`,
  type: 'magnetic',
  mode: 'attract',
  cx: 390,
  cy: 330,
  radius: 240,
  strength: 0.75,
  lockedStrength: 0.55,
  feather: 130
}));
forceFieldAddCursor?.addEventListener('click', () => addForceFieldToEditor({
  id: `cursor-repel-${Date.now().toString(36)}`,
  type: 'cursor',
  mode: 'repel',
  active: 'hover',
  radius: 190,
  strength: 1,
  lockedStrength: 0.6,
  feather: 170
}));
editorTabs.querySelectorAll('button').forEach(button => {
  button.addEventListener('click', () => setEditorTab(button.dataset.tab));
});
peelSeqSelector?.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    setPeelSeqMode(btn.dataset.peelMode);
    preserveSceneScrollForReload();
    saveEditorScrollState();
    applyLiveEditorState();
  });
});
[
  peelFromBeginningInput,
  starterLettersInput,
  peelModeInput,
  persistPeelInput,
  popGridInput,
  reflowAnchorsInput,
  reflowMotionInput,
  shrinkGapsInput,
  motionOrbitInput,
  motionOrbitCx,
  motionOrbitCy,
  motionOrbitRadius,
  motionOrbitStrength,
  motionOrbitSpin,
  motionOrbitBand,
  motionBuoyancyInput,
  motionBuoyancyStrength,
  motionBuoyancyLift,
  motionBuoyancyWave,
  motionBuoyancyDrift,
  motionBuoyancyFrequency,
  motionLineLockInput,
  motionLineLockStrength,
  motionLineLockDamping,
  motionPalindromeInput,
  motionPalindromeLineGap,
  motionPalindromeStrength,
  motionPalindromeDamping,
  motionPalindromeManual,
  motionPalindromeLoop,
  dragHintInput,
  dragHintPeelPoint,
  dragHintAppearMs,
  dragHintTextMs,
  dragHintText,
  blockHiddenToggle,
  timedBtnEnabled,
  fadeRevealInput,
  stepParagraphsInput,
  layersEnabledInput,
  layersBleedInput,
  layersHideCompletedInput,
  layersRevealOpacity,
  layerGroupInput,
  layerDepthInput,
  layerRevealOpacityBlock,
  compactFlowInput,
  globalStepAdvanceDelay,
  stepAdvanceDelay,
  fadeRevealVisible,
  fadeRevealSteps,
  visibleParagraphs,
  blockVisibleOverride,
  paragraphGapInput,
  blockXInput,
  blockYInput,
  blockScaleInput,
  blockOpacityRange,
  blockOpacityInput,
  blockWidthInput,
  blockHeightInput,
  desktopDynamicLimit,
  shapeTypeSelect,
  shapeCustomPathD,
  shapeToggle,
  shapeOpacity,
  shapeScale,
  shapeRotation,
  shapeClipOverflow,
  drawTextEnabled,
  drawTextSpacing,
  drawTextAngleMix,
  mobileDynamicLimit,
  initialPeelActiveBlocks,
  historySnapshotMinutes,
  variationStrength,
  fontSearch,
  blockColor,
  backgroundColor,
  attachTypeSelect,
  attachLabel,
  attachSrc,
  attachSrcSelect,
  attachLooseSrc,
  attachLooseSrcSelect,
  attachSvgOpacity,
  attachStrokeResistance,
  roughLineQuantity,
  roughLineQuantityValue,
  roughLinePrecision,
  roughLinePrecisionValue,
  roughInitialPeeled,
  roughInitialPeeledValue,
  roughStrokeWidth,
  roughStrokeWidthValue,
  attachScale,
  attachScaleValue,
  attachOpacity,
  attachOpacityValue,
  attachWidth,
  attachHeight,
  attachGap,
  attachOffsetY,
  attachX,
  attachY,
  timedBtnDelay,
  timedBtnLabel,
  timedBtnAction,
  timedBtnAddText,
  timedBtnUrl,
  timedBtnSpawnAt,
  gradientAngle,
  gradientRadiusX,
  gradientRadiusY,
  roughPresetSelect
].forEach(control => {
  if (!control) return;
  const handler = (event) => {
    if (event?.type === 'input' && isPendingNumericEdit(control)) return;
    if (event?.type === 'input') {
      preserveSceneScrollForReload();
      saveEditorScrollState();
    }
    syncEditorRangeControl(control);
    if (control === blockOpacityRange) blockOpacityInput.value = blockOpacityRange.value;
    if (control === blockOpacityInput) blockOpacityRange.value = String(normalizeBlockOpacity(blockOpacityInput.value));
    if (control === historySnapshotMinutes) {
      historySnapshotMinutes.value = String(getHistorySnapshotMinutes());
      localStorage.setItem('tirita.historySnapshotMinutes', historySnapshotMinutes.value);
      if (historyAutoSaveTimer) startHistoryAutoSave();
      return;
    }
    updateEffectFieldVisibility();
    updateHintFieldVisibility();
    updateTimedButtonFieldVisibility();
    updateAttachFieldVisibility();
    updateDrawTextFieldVisibility();
    updateLetterMotionFieldVisibility();
    applyLiveEditorState();
  };
  control.addEventListener('input', handler);
  control.addEventListener('change', (event) => {
    preserveSceneScrollForReload();
    saveEditorScrollState();
    if (control.dataset?.numberInput && control.value !== '') control.dataset.lastNumericValue = control.value;
    handler(event);
  });
});

// Controls that require a full physics re-indexing
[
  peelModeInput, peelFromBeginningInput, starterLettersInput, 
  popGridInput, motionOrbitInput, motionOrbitCx, motionOrbitCy, motionOrbitRadius, motionOrbitStrength, motionOrbitSpin, motionOrbitBand,
  motionBuoyancyInput, motionBuoyancyStrength, motionBuoyancyLift, motionBuoyancyWave, motionBuoyancyDrift, motionBuoyancyFrequency,
  motionLineLockInput, motionLineLockStrength, motionLineLockDamping,
  motionPalindromeInput, motionPalindromeLineGap, motionPalindromeStrength, motionPalindromeDamping, motionPalindromeManual, motionPalindromeLoop,
  dragHintPeelPoint, shapeToggle, shapeTypeSelect, shapeScale, shapeRotation, shapeClipOverflow, fontSearch,
  drawTextEnabled, drawTextSpacing, drawTextAngleMix,
  attachTypeSelect, attachSrc, attachLooseSrc, attachScale, attachScaleValue, attachOpacity, attachOpacityValue, attachWidth, attachHeight, attachGap, attachOffsetY, roughPresetSelect, roughLineQuantity, roughLineQuantityValue, roughLinePrecision, roughLinePrecisionValue, roughInitialPeeled, roughInitialPeeledValue, roughStrokeWidth, roughStrokeWidthValue
].forEach(c => {
  if (c) c.addEventListener('change', triggerAutoReload);
});

blockText.addEventListener('input', () => {
  updatePeelHandlesRowVisibility();
  const nextConfig = buildConfigFromVisualControls();
  editorJson.value = JSON.stringify(nextConfig, null, 2);
  persistPieceConfig(nextConfig);
  triggerAutoReload();
});
blockText.addEventListener('blur', () => {
  maybePushUndo(localStorage.getItem('tirita.pieceConfig'));
});
blockSelect.addEventListener('change', () => {
  selectedBlockIdx = Number(blockSelect.value); state.selectedBlockIdx = selectedBlockIdx;
  refreshVisualEditor();
});
copyBlockIdBtn.addEventListener('click', () => {
  const config = getMutableConfigFromEditor();
  const blocks = getEditableBlocks(config);
  const block = blocks[selectedBlockIdx];
  const id = block?.id || '';
  navigator.clipboard.writeText(id).then(() => {
    copyBlockIdBtn.classList.add('copied');
    copyBlockIdBtn.textContent = '✓';
    setTimeout(() => {
      copyBlockIdBtn.classList.remove('copied');
      copyBlockIdBtn.textContent = '⎘';
    }, 1200);
  });
});
blockAdd.addEventListener('click', () => {
  addBlockAfterSelected();
});
blockRemove.addEventListener('click', () => {
  const nextConfig = getMutableConfigFromEditor();
  const blocks = getEditableBlocks(nextConfig);
  if (blocks.length <= 1) return;
  blocks.splice(selectedBlockIdx, 1);
  selectedBlockIdx = Math.max(0, selectedBlockIdx - 1); state.selectedBlockIdx = selectedBlockIdx;
  saveConfigAndReload(nextConfig);
});
pauseInput.addEventListener('change', () => {
  simulationPaused = editorPanel.classList.contains('open') && pauseInput.checked; state.simulationPaused = simulationPaused;
  persistEditorPrefs();
});
autoReloadHeader.addEventListener('change', () => {
  persistEditorPrefs();
});
editorApply.addEventListener('click', () => {
  try {
    const nextConfig = buildConfigFromVisualControls(JSON.parse(editorJson.value));
    saveConfigAndReload(nextConfig);
  } catch (err) {
    editorJson.setCustomValidity(`Invalid JSON: ${err.message}`);
    editorJson.reportValidity();
    editorJson.setCustomValidity('');
  }
});
editorReset.addEventListener('click', () => {
  const currentAutoReload = autoReloadHeader.checked ? '1' : '0';
  const currentFreezeEditor = pauseInput.checked ? '1' : '0';

  saveEditorScrollState();
  preserveSceneScrollForReload();
  removeStoredSceneConfig();
  clearLocaleSyncStores();
  clearAllPeelStates();
  clearEditorHistory(); clearUndoRedo();

  localStorage.setItem('tirita.autoReload', currentAutoReload);
  localStorage.setItem('tirita.freezeEditor', currentFreezeEditor);
  window.location.reload();
});
editorDownload.addEventListener('click', () => {
  try {
    downloadConfig(JSON.parse(editorJson.value));
  } catch (err) {
    editorJson.setCustomValidity(`Invalid JSON: ${err.message}`);
    editorJson.reportValidity();
    editorJson.setCustomValidity('');
  }
});

editorUndo.addEventListener('click', undoConfig);
editorRedo.addEventListener('click', redoConfig);
historySection?.addEventListener('toggle', () => {
  if (historySection.open) renderHistoryList();
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'e' && e.key !== 'E') return;
  if (editorPanel.contains(document.activeElement)) return;
  toggleEditor();
});
window.addEventListener('keydown', (e) => {
  if (!document.body.classList.contains('editor-open')) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
  if (!e.ctrlKey && !e.metaKey) return;
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoConfig(); }
  else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redoConfig(); }
});
if (localStorage.getItem('tirita.rawOpen') === '1') editorPanel.classList.add('raw-open');
if (!mobileRuntime && localStorage.getItem('tirita.editorOpen') === '1') toggleEditor(true);

initEditorNumberInputs();
setupRangeNumberPair(roughLineQuantity, roughLineQuantityValue);
setupRangeNumberPair(roughLinePrecision, roughLinePrecisionValue);
setupRangeNumberPair(roughInitialPeeled, roughInitialPeeledValue);
setupRangeNumberPair(roughStrokeWidth, roughStrokeWidthValue);
setupRangeNumberPair(attachScale, attachScaleValue);
setupRangeNumberPair(attachOpacity, attachOpacityValue);
bindLocaleSyncContextMenus();
initEditorNumberDrag();
document.getElementById('editorTools')?.addEventListener('scroll', saveEditorScrollState, { passive: true });
document.getElementById('utilityTools')?.addEventListener('scroll', saveEditorScrollState, { passive: true });
renderGradientPresetOptions();
refreshIllustrationFileOptions();
initPalette();


headerApply.addEventListener('click', () => {
  saveConfigAndReload(buildConfigFromVisualControls());
});
