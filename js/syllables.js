const segmenter = globalThis.Intl?.Segmenter
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : {
      segment(value = '') {
        return Array.from(String(value), (segment, index) => ({ segment, index }));
      }
    };

export function isWordGrapheme(ch = '') {
  return /[\p{L}\p{N}]/u.test(ch);
}

export function getWordIndexGroups(indices, graphemes) {
  const groups = [];
  let current = [];
  for (const idx of indices) {
    if (isWordGrapheme(graphemes[idx] || '')) {
      current.push(idx);
    } else {
      if (current.length) groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

export function fallbackSplitSyllables(word) {
  const parts = String(word || '').match(/[^aeiouáéíóúü]*[aeiouáéíóúü]+(?:[nrs](?=[^aeiouáéíóúü]|$))?/gi);
  return parts?.length ? parts : [word];
}

// hyphenator is spanishHyphenator from main.js (or null for no hyphenation)
export function splitWordSyllables(word, hyphenator = null) {
  const fallback = fallbackSplitSyllables(word);
  try {
    const parts = hyphenator?.hyphenate?.(word);
    if (Array.isArray(parts) && parts.length > 1) return parts;
  } catch {}
  return fallback;
}

export function getSyllableIndexGroups(indices, graphemes, hyphenator = null) {
  const syllables = [];
  for (const wordIndices of getWordIndexGroups(indices, graphemes)) {
    const word = wordIndices.map(idx => graphemes[idx] || '').join('');
    const parts = splitWordSyllables(word, hyphenator);
    let cursor = 0;
    for (const part of parts) {
      const length = Math.max(1, [...segmenter.segment(part)].length);
      const group = wordIndices.slice(cursor, cursor + length);
      if (group.length) syllables.push(group);
      cursor += length;
    }
    if (cursor < wordIndices.length) syllables.push(wordIndices.slice(cursor));
  }
  return syllables;
}

export function flattenGroups(groups) {
  return groups.flatMap(group => group);
}

export function buildNthFromGroups(groups) {
  const order = [];
  const maxLength = groups.reduce((max, group) => Math.max(max, group.length), 0);
  for (let column = 0; column < maxLength; column++) {
    for (const group of groups) {
      if (Number.isInteger(group[column])) order.push(group[column]);
    }
  }
  return order;
}

export function getSyllableGroupKeyMap(indices, graphemes, prefix = 'syllable', hyphenator = null) {
  const map = new Map();
  let groupId = 0;
  for (const group of getSyllableIndexGroups(indices, graphemes, hyphenator)) {
    const key = `${prefix}:${groupId++}`;
    for (const idx of group) map.set(idx, key);
  }
  return map;
}
