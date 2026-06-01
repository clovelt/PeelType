export function normalizeDirectionVector(field) {
  const direction = String(field.direction || field.dir || '').toLowerCase();
  const named = {
    right: [1, 0],
    left: [-1, 0],
    down: [0, 1],
    up: [0, -1],
    'down-right': [1, 1],
    'down-left': [-1, 1],
    'up-right': [1, -1],
    'up-left': [-1, -1]
  }[direction];
  const dx = named?.[0] ?? Number(field.dx ?? 0);
  const dy = named?.[1] ?? Number(field.dy ?? 0);
  const angle = Number(field.angle);
  const vx = Number.isFinite(angle) ? Math.cos(angle * Math.PI / 180) : dx;
  const vy = Number.isFinite(angle) ? Math.sin(angle * Math.PI / 180) : dy;
  const len = Math.hypot(vx, vy) || 1;
  return { x: vx / len, y: vy / len };
}

export function normalizeForceFields(rawFields, simStepScale) {
  if (!Array.isArray(rawFields)) return [];
  return rawFields
    .filter(field => field && field.enabled !== false)
    .map(field => {
      const x = Number(field.x ?? 0);
      const y = Number(field.y ?? 0);
      const width = Number(field.width ?? 0);
      const height = Number(field.height ?? 0);
      const rawType = field.type || 'wind';
      const radius = Number(field.radius ?? field.r ?? (rawType === 'cursor' || rawType === 'cursorRepel' ? 180 : 0));
      return {
        id: field.id || '',
        type: rawType,
        mode: field.mode || field.polarity || 'attract',
        active: field.active || 'drag',
        global: Boolean(field.global),
        autoWake: field.autoWake !== false,
        x,
        y,
        width,
        height,
        radius,
        cx: Number(field.cx ?? field.centerX ?? (x + width / 2)),
        cy: Number(field.cy ?? field.centerY ?? (y + height / 2)),
        feather: Math.max(0, Number(field.feather ?? 48)),
        strength: Number(field.strength ?? 0.08) * simStepScale,
        lockedStrength: Math.max(0, Number(field.lockedStrength ?? 0)),
        gust: Math.max(0, Number(field.gust ?? 0)),
        direction: normalizeDirectionVector(field),
        blockIds: Array.isArray(field.blocks) && field.blocks.length ? new Set(field.blocks.map(String)) : null
      };
    })
    .filter(field => Number.isFinite(field.strength) && field.strength !== 0);
}

export function getForceFieldWeight(field, x, y) {
  if (field.global || (field.type === 'wind' && field.width <= 0 && field.height <= 0)) return 1;
  if (field.radius > 0) {
    const dist = Math.hypot(x - field.cx, y - field.cy);
    if (dist > field.radius) return 0;
    if (!field.feather) return 1;
    return Math.min(1, Math.max(0, (field.radius - dist) / field.feather));
  }
  const right = field.x + field.width;
  const bottom = field.y + field.height;
  if (x < field.x || x > right || y < field.y || y > bottom) return 0;
  if (!field.feather) return 1;
  const edgeDistance = Math.min(x - field.x, right - x, y - field.y, bottom - y);
  return Math.min(1, Math.max(0, edgeDistance / field.feather));
}

export function getForceFieldAcceleration(idx, letter, ctx) {
  const { FORCE_FIELDS, textBlocks, getRenderedY, LINE_HEIGHT, cursorForcePointers } = ctx;
  if (!FORCE_FIELDS.length) return null;
  const blockId = textBlocks[letter.blockIdx]?.id || String(letter.blockIdx);
  const x = letter.x + letter.w / 2;
  const y = getRenderedY(idx) + LINE_HEIGHT / 2;
  let ax = 0;
  let ay = 0;
  for (const field of FORCE_FIELDS) {
    if (field.blockIds && !field.blockIds.has(blockId)) continue;
    if (field.type === 'cursor' || field.type === 'cursorRepel') {
      if (!cursorForcePointers.size) continue;
      for (const pointer of cursorForcePointers.values()) {
        if (field.active === 'drag' && !pointer.dragging) continue;
        const sign = field.mode === 'attract' || field.mode === 'pull' ? -1 : 1;
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > field.radius) continue;
        const weight = field.feather
          ? Math.min(1, Math.max(0, (field.radius - dist) / field.feather))
          : Math.max(0, 1 - dist / field.radius);
        ax += (dx / dist) * field.strength * weight * sign;
        ay += (dy / dist) * field.strength * weight * sign;
      }
      continue;
    }
    const weight = getForceFieldWeight(field, x, y);
    if (weight <= 0) continue;
    if (field.type === 'magnetic') {
      const sign = field.mode === 'repel' || field.mode === 'push' ? -1 : 1;
      const dx = field.cx - x;
      const dy = field.cy - y;
      const len = Math.hypot(dx, dy) || 1;
      ax += (dx / len) * field.strength * weight * sign;
      ay += (dy / len) * field.strength * weight * sign;
    } else {
      const gust = getWindGustMultiplier(field, x, y);
      ax += field.direction.x * field.strength * weight * gust;
      ay += field.direction.y * field.strength * weight * gust;
    }
  }
  return ax || ay ? { x: ax, y: ay } : null;
}

export function forceFieldAffectsBlock(field, blockIdx, textBlocks) {
  if (!field) return false;
  if (!field.blockIds) return true;
  const blockId = textBlocks[blockIdx]?.id || String(blockIdx);
  return field.blockIds.has(blockId);
}

export function getWindGustMultiplier(field, x, y) {
  if (!field?.gust) return 1;
  const t = performance.now() * 0.001;
  const gust = Math.sin(t * 1.7 + x * 0.012 + field.id.length) * 0.55
    + Math.sin(t * 3.1 + y * 0.018) * 0.32
    + Math.sin(t * 0.63 + (x + y) * 0.004) * 0.18;
  return Math.max(0, 1 + gust * field.gust);
}

export function wakeWindForceStarters(ctx) {
  const { FORCE_FIELDS, segmentRanges, activeBlockFlags, textBlocks, getSegmentStarterStart, letters, bakeLetterRenderY } = ctx;
  for (const field of FORCE_FIELDS) {
    if (field.type !== 'wind' || !field.autoWake) continue;
    for (let blockIdx = 0; blockIdx < segmentRanges.length; blockIdx++) {
      if (!activeBlockFlags[blockIdx] || !forceFieldAffectsBlock(field, blockIdx, textBlocks)) continue;
      const segments = segmentRanges[blockIdx] || [];
      for (const segment of segments) {
        for (let i = getSegmentStarterStart(segment); i <= segment.end; i++) {
          const letter = letters[i];
          if (!letter || letter.deleted || letter.locked || !letter.starterIdle) continue;
          bakeLetterRenderY(i);
          letter.starterIdle = false;
        }
      }
    }
  }
}

export function getForceFieldVisualPush(idx, letter, ctx) {
  const { FORCE_FIELDS, textBlocks, getRenderedY, LINE_HEIGHT, cursorForcePointers } = ctx;
  if (!FORCE_FIELDS.length) return null;
  const blockId = textBlocks[letter.blockIdx]?.id || String(letter.blockIdx);
  const x = letter.x + letter.w / 2;
  const y = getRenderedY(idx) + LINE_HEIGHT / 2;
  let ax = 0;
  let ay = 0;
  for (const field of FORCE_FIELDS) {
    if (!field.lockedStrength) continue;
    if (field.blockIds && !field.blockIds.has(blockId)) continue;
    if (field.type === 'cursor' || field.type === 'cursorRepel') {
      if (!cursorForcePointers.size) continue;
      for (const pointer of cursorForcePointers.values()) {
        if (field.active === 'drag' && !pointer.dragging) continue;
        const sign = field.mode === 'attract' || field.mode === 'pull' ? -1 : 1;
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > field.radius) continue;
        const weight = field.feather
          ? Math.min(1, Math.max(0, (field.radius - dist) / field.feather))
          : Math.max(0, 1 - dist / field.radius);
        ax += (dx / dist) * field.strength * field.lockedStrength * weight * sign;
        ay += (dy / dist) * field.strength * field.lockedStrength * weight * sign;
      }
      continue;
    }
    const weight = getForceFieldWeight(field, x, y);
    if (weight <= 0) continue;
    if (field.type === 'magnetic') {
      const sign = field.mode === 'repel' || field.mode === 'push' ? -1 : 1;
      const dx = field.cx - x;
      const dy = field.cy - y;
      const len = Math.hypot(dx, dy) || 1;
      ax += (dx / len) * field.strength * field.lockedStrength * weight * sign;
      ay += (dy / len) * field.strength * field.lockedStrength * weight * sign;
    } else {
      const gust = getWindGustMultiplier(field, x, y);
      ax += field.direction.x * field.strength * field.lockedStrength * weight * gust;
      ay += field.direction.y * field.strength * field.lockedStrength * weight * gust;
    }
  }
  return ax || ay ? { x: ax, y: ay } : null;
}
