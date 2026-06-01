const state = globalThis.__tiritaState || (globalThis.__tiritaState = {});
import { playNamedSound, runAmbientAction } from './audio.js';
import { createParticleEmitter, spawnParticles, createPhysicsProp } from './effects.js';
import { normalizeForceFields } from './force-fields.js';
import { normalizeWord } from './bbcode.js';

export function setForceFieldEnabledById(fieldId, enabled) {
  const id = String(fieldId || '').trim();
  if (!id) return false;
  let changed = false;
  const updateField = (field) => {
    if (!field || String(field.id || '') !== id) return field;
    changed = true;
    const nextEnabled = enabled === 'toggle' ? field.enabled === false : Boolean(enabled);
    return { ...field, enabled: nextEnabled };
  };
  state.pieceConfig.forceFields = Array.isArray(state.pieceConfig.forceFields)
    ? state.pieceConfig.forceFields.map(updateField)
    : [];
  if (state.currentForceFields.length) state.currentForceFields = state.currentForceFields.map(updateField);
  state.FORCE_FIELDS = normalizeForceFields(state.pieceConfig.forceFields, state.SIM_STEP_SCALE);
  return changed;
}

export function runTriggerAction(action, anchor) {
  if (action.type === 'particles') {
    if (action.preset === 'violentGeyser') createParticleEmitter(action.preset, anchor, Number(action.count || 120), Number(action.duration || 1300));
    else spawnParticles(action.preset || 'spark', anchor, Number(action.count || 12), action.color);
  }
  if (action.type === 'physicsObject') createPhysicsProp(anchor, action);
  if (action.type === 'sound') playNamedSound(action.name);
  if (action.type === 'ambient') runAmbientAction(action);
  if (action.type === 'bgColor') state.runBgColorAction(action);
  if (action.type === 'textColor') {
    document.documentElement.style.setProperty('--letter-color', action.color);
    state.pieceConfig.style.color = action.color;
  }
  if (action.type === 'setForceField') {
    const mode = action.mode === 'toggle' ? 'toggle' : action.enabled !== false;
    setForceFieldEnabledById(action.fieldId || action.id || action.name, mode);
  }
  if (action.type === 'revealBlock') {
    const targetIdx = state.textBlocks.findIndex(b => b.id === action.blockId);
    if (targetIdx >= 0) { state.hiddenBlocks.delete(targetIdx); state.lastBehaviorVisibilityKey = ''; }
  }
  if (action.type === 'hideBlock') {
    const targetIdx = state.textBlocks.findIndex(b => b.id === action.blockId);
    if (targetIdx >= 0) { state.hiddenBlocks.add(targetIdx); state.lastBehaviorVisibilityKey = ''; }
  }
  if (action.type === 'setFlag' && action.name) {
    state.namedFlags.add(action.name);
  }
  if (action.type === 'skipBlock') {
    const targetIdx = state.textBlocks.findIndex(b => b.id === action.blockId);
    if (targetIdx >= 0 && !state.completedBlocks[targetIdx]) {
      state.completedBlocks[targetIdx] = true;
      state.completedBlockTimes[targetIdx] = performance.now();
    }
  }
}

export function resolveBlockConditionIndex(value) {
  if (value === undefined || value === null || value === '') return -1;
  if (Number.isInteger(value)) return value;
  const raw = String(value).trim();
  if (!raw) return -1;
  const byId = state.textBlocks.findIndex(block => block.id === raw);
  if (byId >= 0) return byId;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return Math.max(0, Math.floor(numeric) - 1);
  const blockNumber = raw.match(/(?:block|bloque)?\s*0*(\d+)/i)?.[1];
  if (blockNumber) return Math.max(0, Number(blockNumber) - 1);
  return -1;
}

export function triggerConditionPasses(condition = {}) {
  const completedBlock = condition.completedBlock ?? condition.blockCompleted ?? condition.blockId ?? condition.block ?? condition.blockIndex;
  if (completedBlock !== undefined && completedBlock !== null && completedBlock !== '') {
    const blockIdx = resolveBlockConditionIndex(completedBlock);
    const expected = condition.completed !== false;
    if (!(blockIdx >= 0 && Boolean(state.completedBlocks[blockIdx]) === expected)) return false;
  }
  if (condition.flag !== undefined) {
    if (!state.namedFlags.has(condition.flag)) return false;
  }
  if (condition.flagNot !== undefined) {
    if (state.namedFlags.has(condition.flagNot)) return false;
  }
  return true;
}

export function triggerConditionsPass(trigger = {}) {
  const conditions = Array.isArray(trigger.conditions) ? trigger.conditions : (trigger.condition ? [trigger.condition] : []);
  return conditions.every(triggerConditionPasses);
}

export function runTriggers(eventName, blockIdx, context = {}) {
  const block = state.textBlocks[blockIdx];
  if (!block?.triggers?.length) return false;
  let blocked = false;
  for (let ti = 0; ti < block.triggers.length; ti++) {
    const trigger = block.triggers[ti];
    if (trigger.on !== eventName) continue;
    if (eventName === 'wordComplete') {
      const words = (trigger.words || [trigger.word]).filter(Boolean).map(normalizeWord);
      if (!words.includes(context.word)) continue;
    }
    if (eventName === 'beforeLetterUnlock') {
      const contextLetter = state.letters[context.idx];
      const blockLength = state.textBlocks[blockIdx]?.graphemes?.length || 0;
      const isLast = context.idx === state.blockRanges[blockIdx]?.end;
      const isReadingLast = contextLetter?.readingIdx === blockLength - 1;
      if (trigger.target === 'last' && !isLast) continue;
      if (trigger.target === 'readingLast' && !isReadingLast) continue;
      if (state.letters[context.idx]?.tempLockUntil > performance.now()) { blocked = true; continue; }
    }
    if (!triggerConditionsPass(trigger)) continue;
    const fireKey = `${eventName}:${blockIdx}:${ti}:${context.word || context.idx || context.segmentIdx || 0}`;
    const once = trigger.once ?? eventName !== 'letterUnlock';
    if (once && state.firedTriggerKeys.has(fireKey)) continue;
    state.firedTriggerKeys.add(fireKey);
    const anchor = context.anchor || (Number.isFinite(context.idx) ? state.getLetterCenter(context.idx) : state.getBlockVisibleCenter(blockIdx));
    for (const action of trigger.actions || []) runTriggerAction(action, anchor);
    if (eventName === 'beforeLetterUnlock' && trigger.holdMs) {
      state.letters[context.idx].tempLockUntil = performance.now() + Number(trigger.holdMs);
      blocked = true;
    }
  }
  return blocked;
}

export function checkWordTriggers(idx) {
  const letter = state.letters[idx];
  const block = state.textBlocks[letter.blockIdx];
  const wordRange = block.wordRanges.find(range => letter.readingIdx >= range.start && letter.readingIdx <= range.end);
  if (!wordRange) return;
  let complete = true;
  const range = state.blockRanges[letter.blockIdx];
  for (let i = range.start; i <= range.end; i++) {
    const l = state.letters[i];
    if (l.readingIdx >= wordRange.start && l.readingIdx <= wordRange.end && !l.deleted && l.locked) {
      complete = false;
      break;
    }
  }
  if (complete) {
    runTriggers('wordComplete', letter.blockIdx, { idx, word: wordRange.word, anchor: state.getLetterCenter(idx) });
  }
}
