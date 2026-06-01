export function normalizeGradient(rawGradient) {
  if (typeof rawGradient === 'string') {
    return {
      type: 'linear',
      angle: 90,
      centerX: 50,
      centerY: 50,
      stops: [
        { color: '#1f6f52', alpha: 1, position: 0 },
        { color: '#9f7a32', alpha: 1, position: 100 }
      ],
      legacy: rawGradient
    };
  }
  return {
    type: rawGradient?.type || 'linear',
    angle: Number(rawGradient?.angle ?? 90),
    centerX: Number(rawGradient?.centerX ?? 50),
    centerY: Number(rawGradient?.centerY ?? 50),
    stops: (rawGradient?.stops?.length ? rawGradient.stops : [
      { color: '#1f6f52', alpha: 1, position: 0 },
      { color: '#9f7a32', alpha: 1, position: 100 }
    ]).map(stop => ({
      color: stop.color || '#1f6f52',
      alpha: Number(stop.alpha ?? 1),
      position: Number(stop.position ?? 0)
    }))
  };
}

export function hexToRgba(hex, alpha = 1) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function gradientStopsToCss(stops) {
  return stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(stop => `${hexToRgba(stop.color, stop.alpha)} ${stop.position}%`)
    .join(', ');
}

export function gradientToCss(style) {
  const gradient = normalizeGradient(style.gradient);
  if (style.colorMode === 'radial') {
    return `radial-gradient(circle at ${gradient.centerX}% ${gradient.centerY}%, ${gradientStopsToCss(gradient.stops)})`;
  }
  if (gradient.legacy && style.colorMode === 'linear') return gradient.legacy;
  return `linear-gradient(${gradient.angle}deg, ${gradientStopsToCss(gradient.stops)})`;
}

// presets must be passed by caller (e.g. currentGradientPresets from main.js)
export function getGradientPresetByName(name, presets) {
  if (!name) return null;
  const preset = presets.find(item => item.name === name);
  return preset ? normalizeGradient({ type: 'linear', angle: preset.angle ?? 90, stops: preset.stops }) : null;
}

export function interpolateChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

export function hexToRgb(hex) {
  const color = String(hex || '#000000');
  const stripped = color.startsWith('#') ? color.slice(1) : '000000';
  const normalized = stripped.length === 3
    ? stripped.split('').map(ch => ch + ch).join('')
    : stripped.padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

export function sampleGradientColor(style, t) {
  const stops = normalizeGradient(style.gradient).stops.slice().sort((a, b) => a.position - b.position);
  const pct = Math.max(0, Math.min(100, t * 100));
  let left = stops[0];
  let right = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i].position && pct <= stops[i + 1].position) {
      left = stops[i];
      right = stops[i + 1];
      break;
    }
  }
  const span = Math.max(0.001, right.position - left.position);
  const localT = Math.max(0, Math.min(1, (pct - left.position) / span));
  const a = hexToRgb(left.color);
  const b = hexToRgb(right.color);
  const alpha = left.alpha + (right.alpha - left.alpha) * localT;
  return `rgba(${interpolateChannel(a.r, b.r, localT)}, ${interpolateChannel(a.g, b.g, localT)}, ${interpolateChannel(a.b, b.b, localT)}, ${alpha})`;
}

// getBlockBounds must be passed by caller; letter.lineHeight replaces the LINE_HEIGHT global
export function sampleLinearGradientColorForLetter(letter, getBlockBounds) {
  const gradient = normalizeGradient(letter.style.gradient);
  const bounds = getBlockBounds(letter.blockIdx);
  if (!bounds.width || !bounds.height) return sampleGradientColor(letter.style, letter.sequenceRatio ?? 0);
  const angle = (Number(gradient.angle) || 0) * Math.PI / 180;
  const vx = Math.sin(angle);
  const vy = -Math.cos(angle);
  const corners = [
    [bounds.left, bounds.top],
    [bounds.right, bounds.top],
    [bounds.right, bounds.bottom],
    [bounds.left, bounds.bottom]
  ].map(([x, y]) => x * vx + y * vy);
  const min = Math.min(...corners);
  const max = Math.max(...corners);
  const cx = letter.x + letter.w / 2;
  const cy = letter.y + (letter.lineHeight || 0) / 2;
  const t = (cx * vx + cy * vy - min) / Math.max(0.001, max - min);
  return sampleGradientColor(letter.style, t);
}

export function sampleRadialGradientColorForLetter(letter, getBlockBounds) {
  const gradient = normalizeGradient(letter.style.gradient);
  const bounds = getBlockBounds(letter.blockIdx);
  if (!bounds.width || !bounds.height) return sampleGradientColor(letter.style, letter.sequenceRatio ?? 0);
  const cx = bounds.left + bounds.width * Math.max(0, Math.min(100, gradient.centerX)) / 100;
  const cy = bounds.top + bounds.height * Math.max(0, Math.min(100, gradient.centerY)) / 100;
  const lx = letter.x + letter.w / 2;
  const ly = letter.y + (letter.lineHeight || 0) / 2;
  const cornerDistances = [
    Math.hypot(bounds.left - cx, bounds.top - cy),
    Math.hypot(bounds.right - cx, bounds.top - cy),
    Math.hypot(bounds.right - cx, bounds.bottom - cy),
    Math.hypot(bounds.left - cx, bounds.bottom - cy)
  ];
  const t = Math.hypot(lx - cx, ly - cy) / Math.max(0.001, ...cornerDistances);
  return sampleGradientColor(letter.style, t);
}

export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function sampleRandomGradientColor(style) {
  const stops = normalizeGradient(style.gradient).stops || [];
  if (!stops.length) return style.color || '#4a4a4a';
  const stop = stops[Math.floor(Math.random() * stops.length)];
  return hexToRgba(stop.color, stop.alpha);
}

export function applyHslVariation(hex, strength) {
  const hsl = hexToHsl(hex);
  const h = (hsl.h + (Math.random() - 0.5) * strength * 60 + 360) % 360;
  const s = Math.max(0, Math.min(100, hsl.s + (Math.random() - 0.5) * strength * 40));
  const l = Math.max(0, Math.min(100, hsl.l + (Math.random() - 0.5) * strength * 30));
  return `hsl(${h}, ${s}%, ${l}%)`;
}
