function createGraphemeSegmenter() {
  if (globalThis.Intl?.Segmenter) return new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return {
    segment(value = '') {
      return Array.from(String(value), (segment, index) => ({ segment, index }));
    }
  };
}

function createWordSegmenter() {
  if (globalThis.Intl?.Segmenter) return new Intl.Segmenter(undefined, { granularity: 'word' });
  return {
    *segment(value = '') {
      const text = String(value);
      const re = /[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu;
      for (const match of text.matchAll(re)) {
        const segment = match[0];
        yield {
          segment,
          index: match.index,
          isWordLike: /[\p{L}\p{N}]/u.test(segment)
        };
      }
    }
  };
}

const segmenter = createGraphemeSegmenter();
const wordSegmenter = createWordSegmenter();

export function parseInlineMotionValue(value, defaults) {
  const raw = String(value ?? '').trim().toLowerCase();
  const named = { subtle: 0.55, soft: 0.75, medium: 1, strong: 1.65, wild: 2.4 };
  const multiplier = raw
    ? Math.max(0, Math.min(4, Number.isFinite(Number(raw)) ? Number(raw) : (named[raw] ?? 1)))
    : 1;
  return {
    ampX: Number(defaults.ampX || 0) * multiplier,
    ampY: Number(defaults.ampY || 0) * multiplier,
    rot: Number(defaults.rot || 0) * multiplier,
    speed: Number(defaults.speed || 1),
    phase: Number(defaults.phase || 0)
  };
}

export function cloneInlineStyle(style = {}) {
  return {
    bold: Boolean(style.bold),
    italic: Boolean(style.italic),
    underline: Boolean(style.underline),
    strike: Boolean(style.strike),
    color: style.color || null,
    gradient: style.gradient || null,
    fontFamily: style.fontFamily || null,
    size: style.size || null,
    url: style.url || null,
    noPeel: Boolean(style.noPeel),
    censor: Boolean(style.censor),
    explicitPeel: Boolean(style.explicitPeel),
    shake: style.shake ? { ...style.shake } : null,
    float: style.float ? { ...style.float } : null
  };
}

export function parseBBCode(rawText = '') {
  const output = [];
  const stack = [cloneInlineStyle()];
  let i = 0;
  while (i < rawText.length) {
    const rest = rawText.slice(i);
    const tagMatch = rest.match(/^\[(\/)?([a-z]+)(?:=([^\]]+))?\]/i);
    if (tagMatch) {
      const closing = Boolean(tagMatch[1]);
      const tag = tagMatch[2].toLowerCase();
      const value = tagMatch[3];
      const supported = ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'color', 'gradient', 'font', 'size', 'url', 'nopeel', 'censor', 'peel', 'shake', 'shaky', 'float', 'wave'].includes(tag);
      if (supported) {
        if (closing) {
          if (stack.length > 1) stack.pop();
        } else {
          const next = cloneInlineStyle(stack[stack.length - 1]);
          if (tag === 'b' || tag === 'strong') next.bold = true;
          if (tag === 'i' || tag === 'em') next.italic = true;
          if (tag === 'u') next.underline = true;
          if (tag === 's' || tag === 'strike') next.strike = true;
          if (tag === 'color' && value) next.color = value.trim();
          if (tag === 'gradient' && value) next.gradient = value.trim();
          if (tag === 'font' && value) next.fontFamily = value.trim();
          if (tag === 'size' && value) next.size = Math.max(8, Math.min(160, Number(value) || 0)) || null;
          if (tag === 'url' && value) next.url = value.trim();
          if (tag === 'nopeel') next.noPeel = true;
          if (tag === 'censor') next.censor = true;
          if (tag === 'peel') next.explicitPeel = true;
          if (tag === 'shake' || tag === 'shaky') {
            next.shake = parseInlineMotionValue(value, { ampX: 0.55, ampY: 0.5, rot: 0.011, speed: 1 });
            next.float ||= parseInlineMotionValue('subtle', { ampY: 1.15, speed: 1 });
          }
          if (tag === 'float' || tag === 'wave') {
            next.float = parseInlineMotionValue(value, { ampY: 1.45, speed: 1 });
          }
          stack.push(next);
        }
        i += tagMatch[0].length;
        continue;
      }
    }
    const grapheme = [...segmenter.segment(rawText.slice(i))][0]?.segment || rawText[i];
    output.push({ ch: grapheme, inlineStyle: cloneInlineStyle(stack[stack.length - 1]) });
    i += grapheme.length;
  }
  return {
    plainText: output.map(item => item.ch).join(''),
    graphemes: output.map(item => item.ch),
    inlineStyles: output.map(item => item.inlineStyle)
  };
}

export function normalizeWord(value = '') {
  return value.toLocaleLowerCase('es').normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '');
}

export function buildWordRanges(plainText, graphemes) {
  const ranges = [];
  let graphemeCursor = 0;
  let textCursor = 0;
  for (const segment of wordSegmenter.segment(plainText)) {
    while (textCursor < segment.index && graphemeCursor < graphemes.length) {
      textCursor += graphemes[graphemeCursor].length;
      graphemeCursor++;
    }
    const start = graphemeCursor;
    let segmentLength = 0;
    while (segmentLength < segment.segment.length && graphemeCursor < graphemes.length) {
      segmentLength += graphemes[graphemeCursor].length;
      graphemeCursor++;
    }
    const end = graphemeCursor - 1;
    const normalized = normalizeWord(segment.segment);
    if (segment.isWordLike && normalized && end >= start) {
      ranges.push({ word: normalized, start, end, firedKeys: new Set() });
    }
    textCursor = segment.index + segment.segment.length;
  }
  return ranges;
}
