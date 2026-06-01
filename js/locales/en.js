export const TIRITA_LOCALE_EN = {
  lang: 'en',
  label: 'English',
  // No strings: main-locale text lives in peel-after-reading.json.
  // setLocaleAndReload restores it from scenePresets when switching to this locale.
  // strings here only as fetch-fails fallback (buildBlocks path).
  strings: {
    'tit-titulo-hint': 'drag here'
  },
  // Only blocks where the triggered word differs by language
  wordTriggers: {
    'tit-b09': [{ word: 'lead' }],
    'tit-b19': [{ words: ['idea', 'memory'] }],
    'tit-b26': [
      { word: 'lung', physicsLabel: 'lung' },
      { word: 'eye',  physicsLabel: 'eye' }
    ]
  }
};
