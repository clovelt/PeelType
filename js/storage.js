const ATTACHMENT_SYNC_KEY = 'tirita.attachmentSync.v1';
const ATTACHMENT_LAST_SETTINGS_KEY = 'tirita.attachmentLastSettings.v1';
const MAIN_LOCALE_KEY = 'tirita.mainLocale';
const DEFAULT_MAIN_LOCALE = 'en';
const BLOCK_SYNC_FIELDS = [
  'transform', 'style', 'peel', 'peelPoints', 'hint', 'clipShape',
  'drawPath', 'timedButton', 'triggers', 'hidden'
];

export function normalizeIllustrationPath(src) {
  return typeof src === 'string'
    ? src.replace(/^illustrations\/(t_[^/]+)$/i, 'illustrations/tirita/$1')
    : src;
}

export function normalizeAttachmentPaths(attachment) {
  if (!attachment) return attachment;
  const next = structuredClone(attachment);
  next.src = normalizeIllustrationPath(next.src);
  if (next.loose) next.loose.src = normalizeIllustrationPath(next.loose.src);
  return next;
}

function normalizeConfigIllustrationPaths(config) {
  for (const block of config?.blocks || []) {
    if (block.attachment) block.attachment = normalizeAttachmentPaths(block.attachment);
  }
  return config;
}

export async function loadPoemsFromManifest(defaultPieceConfig, version) {
  let manifest;
  try {
    const res = await fetch('./js/poems.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.ok}`);
    manifest = await res.json();
    if (!Array.isArray(manifest)) throw new Error('Invalid manifest');
  } catch (err) {
    console.warn('Tirita: poems.json unavailable.', err);
    return {};
  }

  const entries = await Promise.all(
    manifest.map(async ({ key, label, src }) => {
      try {
        const res = await fetch(src, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const config = await res.json();
        if (!Array.isArray(config.blocks)) throw new Error('Missing blocks');
        config.version = version ?? defaultPieceConfig.version;
        return [key, { label, config: normalizeConfigIllustrationPaths(config) }];
      } catch (err) {
        console.warn(`Tirita: failed to load poem "${key}" from ${src}.`, err);
        return null;
      }
    })
  );

  return Object.fromEntries(entries.filter(Boolean));
}

export async function loadBundledTiritaConfig(defaultPieceConfig) {
  try {
    const response = await fetch('./js/peel-after-reading.json?v=1', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    if (config?.id !== 'tirita-poema' || !Array.isArray(config.blocks)) {
      throw new Error('Invalid tirita default config');
    }
    config.version = defaultPieceConfig.version;
    return normalizeConfigIllustrationPaths(config);
  } catch (error) {
    console.warn('Tirita: bundled poem JSON unavailable, using generated fallback.', error);
    return null;
  }
}

export function resolveSceneKey(rawValue, scenePresets) {
  if (!rawValue) return null;
  const value = String(rawValue).trim();
  if (!value) return null;
  if (scenePresets[value]) return value;
  const normalized = value.toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, '');
  const directKey = Object.keys(scenePresets).find(key => key.toLocaleLowerCase('es') === normalized);
  if (directKey) return directKey;
  const labelKey = Object.entries(scenePresets).find(([, scene]) => (
    scene.label.toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, '') === normalized
  ))?.[0];
  if (labelKey) return labelKey;
  const sceneNumber = Number(value);
  if (Number.isInteger(sceneNumber)) {
    const keys = Object.keys(scenePresets);
    return keys[sceneNumber - 1] || keys[sceneNumber] || null;
  }
  return null;
}

export function getSceneKeyFromQuery(scenePresets) {
  const params = new URLSearchParams(window.location.search);
  if (params.has('tirita') && scenePresets.tirita) return 'tirita';
  const namedValue = params.get('scene') || params.get('preset') || params.get('s');
  const namedKey = resolveSceneKey(namedValue, scenePresets);
  if (namedKey) return namedKey;
  const raw = window.location.search.replace(/^\?/, '').trim();
  if (!raw || raw.includes('=')) return null;
  return resolveSceneKey(decodeURIComponent(raw), scenePresets);
}

export function consumeClearSceneStorageQuery(sceneKey = localStorage.getItem('tirita.scene') || 'default') {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('clearSceneStorage') && !params.has('clearScene')) return false;
  removeStoredSceneConfig(sceneKey);
  clearLocaleSyncStores();
  params.delete('clearSceneStorage');
  params.delete('clearScene');
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
  window.history.replaceState(null, '', nextUrl);
  return true;
}

export function applySceneQueryOverride(scenePresets) {
  const sceneKey = getSceneKeyFromQuery(scenePresets);
  if (sceneKey) consumeClearSceneStorageQuery(sceneKey);
  if (!sceneKey) return null;
  if (new URLSearchParams(window.location.search).has('reset')) clearLocaleSyncStores();
  const config = structuredClone(scenePresets[sceneKey].config);
  config.version = scenePresets[sceneKey].config.version;
  localStorage.setItem('tirita.scene', sceneKey);
  persistPieceConfig(config, sceneKey);
  return sceneKey;
}

export function getSceneConfigStorageKey(sceneKey = localStorage.getItem('tirita.scene') || 'default') {
  return `tirita.sceneConfig.${sceneKey || 'default'}`;
}

export function getStoredSceneConfigString(sceneKey = localStorage.getItem('tirita.scene') || 'default') {
  try { return localStorage.getItem(getSceneConfigStorageKey(sceneKey)); }
  catch { return null; }
}

export function persistPieceConfig(config, sceneKey = localStorage.getItem('tirita.scene') || 'default') {
  const configStr = typeof config === 'string' ? config : JSON.stringify(config);
  localStorage.setItem('tirita.pieceConfig', configStr);
  if (sceneKey) localStorage.setItem(getSceneConfigStorageKey(sceneKey), configStr);
  return configStr;
}

export function removeStoredSceneConfig(sceneKey = localStorage.getItem('tirita.scene') || 'default') {
  localStorage.removeItem(getSceneConfigStorageKey(sceneKey));
  localStorage.removeItem('tirita.pieceConfig');
}

export function getStoredSceneConfig(scenePresets, defaultPieceConfig) {
  const sceneKey = localStorage.getItem('tirita.scene');
  return structuredClone(scenePresets[sceneKey]?.config || defaultPieceConfig);
}

export function cloneAttachmentForSync(attachment) {
  return attachment ? normalizeAttachmentPaths(attachment) : null;
}

export function attachmentSignature(attachment) {
  return JSON.stringify(attachment || null);
}

export function loadAttachmentSyncStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ATTACHMENT_SYNC_KEY) || 'null');
    if (parsed && typeof parsed === 'object') {
      parsed.blocks ||= {};
      return parsed;
    }
  } catch {}
  return { version: 1, blocks: {} };
}

export function saveAttachmentSyncStore(store) {
  localStorage.setItem(ATTACHMENT_SYNC_KEY, JSON.stringify(store));
}

export function getAttachmentSyncBlockKey(block, idx) {
  return block?.id || `idx-${idx}`;
}

export function clearLocaleSyncStores() {
  localStorage.removeItem(ATTACHMENT_SYNC_KEY);
  localStorage.removeItem(ATTACHMENT_LAST_SETTINGS_KEY);
}

export function getMainLocale() {
  return localStorage.getItem(MAIN_LOCALE_KEY) || DEFAULT_MAIN_LOCALE;
}

export function setMainLocale(locale = DEFAULT_MAIN_LOCALE) {
  const nextLocale = locale || DEFAULT_MAIN_LOCALE;
  localStorage.setItem(MAIN_LOCALE_KEY, nextLocale);
  return nextLocale;
}

export function promoteLocaleToMain(locale = DEFAULT_MAIN_LOCALE) {
  const nextLocale = setMainLocale(locale);
  const store = loadAttachmentSyncStore();
  let changed = false;
  for (const record of Object.values(store.blocks || {})) {
    if (record.locales?.[nextLocale]?.diverged) {
      record.shared = cloneAttachmentForSync(record.locales[nextLocale].attachment);
      delete record.locales[nextLocale];
      changed = true;
    }
    record.ownerLocale = nextLocale;
    for (const fieldRecord of Object.values(record.fields || {})) {
      if (fieldRecord.locales?.[nextLocale]?.diverged) {
        fieldRecord.shared = structuredClone(fieldRecord.locales[nextLocale].value ?? null);
        delete fieldRecord.locales[nextLocale];
        changed = true;
      }
      fieldRecord.ownerLocale = nextLocale;
    }
  }
  if (changed) saveAttachmentSyncStore(store);
  return nextLocale;
}

export function loadLastAttachmentSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ATTACHMENT_LAST_SETTINGS_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLastAttachmentSettings(attachment) {
  if (!attachment?.type) return;
  const reusable = {
    type: attachment.type,
    width: attachment.width,
    height: attachment.height,
    scale: attachment.scale,
    opacity: attachment.opacity,
    gap: attachment.gap,
    opticalOffsetY: attachment.opticalOffsetY,
    x: attachment.x,
    y: attachment.y,
    svgOpacity: attachment.svgOpacity,
    strokeResistance: attachment.strokeResistance,
    roughPreset: attachment.roughPreset,
    lineQuantity: attachment.lineQuantity,
    linePrecision: attachment.linePrecision,
    initialPeeled: attachment.initialPeeled,
    lineWidth: attachment.lineWidth
  };
  try { localStorage.setItem(ATTACHMENT_LAST_SETTINGS_KEY, JSON.stringify(reusable)); } catch {}
}

export function seedAttachmentSyncFromConfig(config, locale = localStorage.getItem('tirita.locale') || 'es') {
  if (config?.id !== 'tirita-poema') return;
  const store = loadAttachmentSyncStore();
  const mainLocale = getMainLocale();
  let changed = false;
  for (const [idx, block] of (config.blocks || []).entries()) {
    const key = getAttachmentSyncBlockKey(block, idx);
    store.blocks[key] ||= { ownerLocale: mainLocale, shared: null, locales: {}, fields: {} };
    const record = store.blocks[key];
    record.fields ||= {};
    record.ownerLocale ||= mainLocale;
    for (const field of BLOCK_SYNC_FIELDS) {
      if (block?.[field] !== undefined && !record.fields[field]) {
        record.fields[field] = { ownerLocale: mainLocale, shared: structuredClone(block[field]), locales: {} };
        changed = true;
      }
    }
    if (block?.attachment && !record.shared) {
      record.ownerLocale = record.ownerLocale || mainLocale;
      record.shared = cloneAttachmentForSync(block.attachment);
      record.locales ||= {};
      changed = true;
    }
  }
  if (changed) saveAttachmentSyncStore(store);
}

export function applyAttachmentSyncToConfig(config, locale = localStorage.getItem('tirita.locale') || 'es') {
  if (config?.id !== 'tirita-poema') return config;
  const store = loadAttachmentSyncStore();
  for (const [idx, block] of (config.blocks || []).entries()) {
    const record = store.blocks[getAttachmentSyncBlockKey(block, idx)];
    if (!record) continue;
    const override = record.locales?.[locale];
    const attachment = override?.diverged ? override.attachment : record.shared;
    if (attachment) block.attachment = cloneAttachmentForSync(attachment);
    else delete block.attachment;
    for (const field of BLOCK_SYNC_FIELDS) {
      const fieldRecord = record.fields?.[field];
      if (!fieldRecord) continue;
      const fieldOverride = fieldRecord.locales?.[locale];
      const value = fieldOverride?.diverged ? fieldOverride.value : fieldRecord.shared;
      if (value !== null && value !== undefined) block[field] = structuredClone(value);
      else delete block[field];
    }
  }
  return config;
}

export function recordSyncedBlockFieldEdit(block, idx, field, previousValue, nextValue, locale = localStorage.getItem('tirita.locale') || 'es', pieceConfig = null) {
  if (!block || attachmentSignature(previousValue) === attachmentSignature(nextValue)) return;
  if (pieceConfig?.id !== 'tirita-poema') return;
  const store = loadAttachmentSyncStore();
  const key = getAttachmentSyncBlockKey(block, idx);
  const mainLocale = getMainLocale();
  const record = store.blocks[key] || { ownerLocale: mainLocale, shared: null, locales: {}, fields: {} };
  record.fields ||= {};
  const fieldRecord = record.fields[field] || { ownerLocale: mainLocale, shared: structuredClone(previousValue ?? null), locales: {} };
  fieldRecord.locales ||= {};
  if (locale === mainLocale) {
    fieldRecord.ownerLocale = mainLocale;
    fieldRecord.shared = structuredClone(nextValue ?? null);
    delete fieldRecord.locales[locale];
  } else {
    fieldRecord.locales[locale] = { diverged: true, value: structuredClone(nextValue ?? null) };
  }
  record.fields[field] = fieldRecord;
  store.blocks[key] = record;
  saveAttachmentSyncStore(store);
}

export function recordAttachmentEditForLocale(block, previousAttachment, nextAttachment, locale = localStorage.getItem('tirita.locale') || 'es', pieceConfig = null, selectedBlockIdx = 0) {
  if (!block || attachmentSignature(previousAttachment) === attachmentSignature(nextAttachment)) return;
  if (pieceConfig?.id !== 'tirita-poema') return;
  const store = loadAttachmentSyncStore();
  const key = getAttachmentSyncBlockKey(block, selectedBlockIdx);
  const mainLocale = getMainLocale();
  const record = store.blocks[key] || { ownerLocale: mainLocale, shared: cloneAttachmentForSync(previousAttachment), locales: {} };
  record.locales ||= {};
  if (locale === mainLocale) {
    record.ownerLocale = mainLocale;
    record.shared = cloneAttachmentForSync(nextAttachment);
    delete record.locales[locale];
  } else {
    record.locales[locale] = {
      diverged: true,
      attachment: cloneAttachmentForSync(nextAttachment)
    };
  }
  store.blocks[key] = record;
  saveAttachmentSyncStore(store);
}

export function persistAttachmentSyncFromConfig(config, locale = localStorage.getItem('tirita.locale') || 'es') {
  if (config?.id !== 'tirita-poema') return;
  const store = loadAttachmentSyncStore();
  const mainLocale = getMainLocale();
  let changed = false;
  for (const [idx, block] of (config.blocks || []).entries()) {
    const key = getAttachmentSyncBlockKey(block, idx);
    const record = store.blocks[key] || { ownerLocale: mainLocale, shared: null, locales: {} };
    record.fields ||= {};
    record.locales ||= {};
    const currentVisible = record.locales[locale]?.diverged ? record.locales[locale].attachment : record.shared;
    const nextAttachment = cloneAttachmentForSync(block.attachment);
    if (attachmentSignature(currentVisible) !== attachmentSignature(nextAttachment)) {
      if (locale === mainLocale) {
        record.ownerLocale = mainLocale;
        record.shared = nextAttachment;
        delete record.locales[locale];
      } else {
        record.locales[locale] = {
          diverged: true,
          attachment: nextAttachment
        };
      }
      store.blocks[key] = record;
      changed = true;
    }
    for (const field of BLOCK_SYNC_FIELDS) {
      const value = block?.[field] !== undefined ? structuredClone(block[field]) : null;
      const fieldRecord = record.fields[field] || { ownerLocale: mainLocale, shared: null, locales: {} };
      fieldRecord.locales ||= {};
      const currentVisible = fieldRecord.locales[locale]?.diverged ? fieldRecord.locales[locale].value : fieldRecord.shared;
      if (attachmentSignature(currentVisible) !== attachmentSignature(value)) {
        if (locale === mainLocale) {
          fieldRecord.ownerLocale = mainLocale;
          fieldRecord.shared = value;
          delete fieldRecord.locales[locale];
        } else {
          fieldRecord.locales[locale] = { diverged: true, value };
        }
        record.fields[field] = fieldRecord;
        store.blocks[key] = record;
        changed = true;
      }
    }
  }
  if (changed) saveAttachmentSyncStore(store);
}

export function migrateStoredConfig(parsed, baseConfig, defaultOptimization = {}) {
  const next = structuredClone(parsed);
  const optimization = next.optimization || {};
  const baseOptimization = baseConfig.optimization || defaultOptimization;
  if (next.id === 'tirita-poema') {
    if ([30, 190].includes(Number(optimization.dynamicLetterLimitDesktop))) optimization.dynamicLetterLimitDesktop = baseOptimization.dynamicLetterLimitDesktop;
    if ([30, 90, 170].includes(Number(optimization.dynamicLetterLimitMobile))) optimization.dynamicLetterLimitMobile = baseOptimization.dynamicLetterLimitMobile;
    if ([30, 90, 170].includes(Number(optimization.dynamicLetterLimitNarrow))) optimization.dynamicLetterLimitNarrow = baseOptimization.dynamicLetterLimitNarrow;
    next.mobileBlocks = [];
    const baseBlocksById = new Map((baseConfig.blocks || []).map(block => [block.id, block]));
    for (const block of next.blocks || []) {
      // Stop overwriting user-edited text with default locale text on every migration
    }
  }
  if (next.id === 'tirita-cross-block-constraints') {
    next.crossBlockConstraints = structuredClone(baseConfig.crossBlockConstraints || []);
  }
  next.optimization = optimization;
  return normalizeConfigIllustrationPaths(next);
}

export function loadPieceConfig(scenePresets, defaultPieceConfig, defaultOptimization = {}, locale = localStorage.getItem('tirita.locale') || 'es') {
  const querySceneKey = getSceneKeyFromQuery(scenePresets);
  const sceneKey = querySceneKey || localStorage.getItem('tirita.scene') || 'default';
  if (querySceneKey) localStorage.setItem('tirita.scene', querySceneKey);
  consumeClearSceneStorageQuery(sceneKey);
  const stored = getStoredSceneConfigString(sceneKey) || (querySceneKey ? null : localStorage.getItem('tirita.pieceConfig'));
  let baseConfig = structuredClone(scenePresets[sceneKey]?.config || defaultPieceConfig);
  if (!stored) return applyAttachmentSyncToConfig(baseConfig, locale);
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.id === 'tirita-poema') {
      baseConfig = structuredClone(scenePresets.tirita.config);
      localStorage.setItem('tirita.scene', 'tirita');
    }
    if (parsed.version !== defaultPieceConfig.version) {
      removeStoredSceneConfig(sceneKey);
      clearLocaleSyncStores();
      return applyAttachmentSyncToConfig(baseConfig, locale);
    }
    const migrated = migrateStoredConfig(parsed, baseConfig, defaultOptimization);
    const isTirita = migrated.id === 'tirita-poema';
    const merged = {
      ...baseConfig,
      ...migrated,
      blocks: migrated.blocks || baseConfig.blocks,
      mobileBlocks: migrated.mobileBlocks || baseConfig.mobileBlocks || [],
      style: { ...baseConfig.style, ...migrated.style },
      layout: { ...baseConfig.layout, ...migrated.layout },
      peel: { ...baseConfig.peel, ...migrated.peel, mode: migrated.peel?.mode || (migrated.peel?.zigzag === false ? 'linear' : 'zigzag') },
      physics: { ...baseConfig.physics, ...migrated.physics },
      optimization: { ...baseConfig.optimization, ...migrated.optimization },
      behaviors: {
        fadeReveal: { ...baseConfig.behaviors.fadeReveal, ...migrated.behaviors?.fadeReveal },
        stepParagraphs: {
          ...baseConfig.behaviors.stepParagraphs,
          ...migrated.behaviors?.stepParagraphs,
          perBlockAdvanceDelayMs: { ...(migrated.behaviors?.stepParagraphs?.perBlockAdvanceDelayMs || {}) },
          perBlockVisibleCount: { ...(migrated.behaviors?.stepParagraphs?.perBlockVisibleCount || {}) }
        }
      }
    };
    if (isTirita) seedAttachmentSyncFromConfig(merged, locale);
    return applyAttachmentSyncToConfig(merged, locale);
  } catch {
    return applyAttachmentSyncToConfig(baseConfig, locale);
  }
}
