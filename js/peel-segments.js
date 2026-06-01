const state = globalThis.__tiritaState || (globalThis.__tiritaState = {});
import { getSyllableIndexGroups, getWordIndexGroups, flattenGroups, buildNthFromGroups, getSyllableGroupKeyMap } from './syllables.js';
import { getLetterLineHeight, getMaxWidth, layoutBlockAtWidth, getBlockPeelPoints } from './layout.js';
import { quoteFontFamily } from './font.js';

function getBlockConfig(blockIdx) { return state.pieceConfig?.blocks?.[blockIdx] || state.activeBlocks?.[blockIdx] || {}; }

export function buildSpiralOrder(segLines, direction) {
  const rows = segLines.map(line => direction === 'left' ? line.slice().reverse() : line.slice());
  const consumed = rows.map(row => row.map(() => false));
  const order = [];
  let remaining = rows.reduce((sum, row) => sum + row.length, 0);
  let top = 0;
  let bottom = rows.length - 1;
  while (remaining > 0 && top <= bottom) {
    for (let col = 0; col < rows[top].length; col++) {
      if (!consumed[top][col]) { order.push(rows[top][col]); consumed[top][col] = true; remaining--; }
    }
    for (let row = top + 1; row <= bottom; row++) {
      const col = rows[row].length - 1;
      if (col >= 0 && !consumed[row][col]) { order.push(rows[row][col]); consumed[row][col] = true; remaining--; }
    }
    if (bottom > top) {
      for (let col = rows[bottom].length - 1; col >= 0; col--) {
        if (!consumed[bottom][col]) { order.push(rows[bottom][col]); consumed[bottom][col] = true; remaining--; }
      }
    }
    for (let row = bottom - 1; row > top; row--) {
      const col = 0;
      if (rows[row].length && !consumed[row][col]) { order.push(rows[row][col]); consumed[row][col] = true; remaining--; }
    }
    for (let row = top + 1; row < bottom; row++) {
      if (rows[row].length > 2) {
        rows[row] = rows[row].slice(1, -1);
        consumed[row] = consumed[row].slice(1, -1);
      } else {
        rows[row] = [];
        consumed[row] = [];
      }
    }
    top++;
    bottom--;
  }
  return order;
}

export function buildSegmentOrder(segLines, direction, mode, graphemes, blockPositions) {
  let peelOrder = [];
  const unstructured = [
    'spiral', 'spiral-center', 'random', 'drunken', 'outward', 'inward', 'random-neighbors', 'center', 'random-walk',
    'alternating-ends', 'vowels-first', 'punctuation-last', 'odd-even', 'first-letters', 'syllables-in-order',
    'first-syllables', 'last-syllables'
  ].includes(mode);

  if (mode === 'spiral') {
    peelOrder = buildSpiralOrder(segLines, direction);
  } else if (mode === 'spiral-center') {
    peelOrder = buildSpiralOrder(segLines, direction).reverse();
  } else if (mode === 'random') {
    peelOrder = segLines.flat();
    for (let i = peelOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [peelOrder[i], peelOrder[j]] = [peelOrder[j], peelOrder[i]];
    }
  } else if (mode === 'random-neighbors') {
    peelOrder = segLines.flat();
    for (let i = 0; i < peelOrder.length; i++) {
      const swapDist = 6;
      const j = Math.max(0, Math.min(peelOrder.length - 1, i + Math.floor(Math.random() * (swapDist * 2 + 1)) - swapDist));
      [peelOrder[i], peelOrder[j]] = [peelOrder[j], peelOrder[i]];
    }
  } else if (mode === 'alternating-ends') {
    const flat = segLines.flat();
    let left = 0;
    let right = flat.length - 1;
    while (left <= right) {
      if (direction === 'left') {
        peelOrder.push(flat[right--]);
        if (left <= right) peelOrder.push(flat[left++]);
      } else {
        peelOrder.push(flat[left++]);
        if (left <= right) peelOrder.push(flat[right--]);
      }
    }
  } else if (mode === 'vowels-first') {
    const flat = segLines.flat();
    const isVowel = idx => /[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/.test(graphemes[idx] || '');
    peelOrder = [
      ...flat.filter(isVowel),
      ...flat.filter(idx => !isVowel(idx))
    ];
  } else if (mode === 'punctuation-last') {
    const flat = segLines.flat();
    const isPunctuation = idx => /[.,;:!?¿¡()[\]{}"'«»—-]/.test(graphemes[idx] || '');
    peelOrder = [
      ...flat.filter(idx => !isPunctuation(idx)),
      ...flat.filter(isPunctuation)
    ];
  } else if (mode === 'odd-even') {
    const flat = segLines.flat();
    peelOrder = [
      ...flat.filter((_, idx) => idx % 2 === 0),
      ...flat.filter((_, idx) => idx % 2 === 1)
    ];
  } else if (mode === 'first-letters') {
    peelOrder = buildNthFromGroups(getWordIndexGroups(segLines.flat(), graphemes));
  } else if (mode === 'syllables-in-order') {
    peelOrder = flattenGroups(getSyllableIndexGroups(segLines.flat(), graphemes, state.spanishHyphenator));
  } else if (mode === 'first-syllables') {
    const syllablesByWord = getWordIndexGroups(segLines.flat(), graphemes).map(word => getSyllableIndexGroups(word, graphemes, state.spanishHyphenator));
    const first = syllablesByWord.map(groups => groups[0]).filter(Boolean);
    const rest = syllablesByWord.flatMap(groups => groups.slice(1));
    peelOrder = flattenGroups([...first, ...rest]);
  } else if (mode === 'last-syllables') {
    const syllablesByWord = getWordIndexGroups(segLines.flat(), graphemes).map(word => getSyllableIndexGroups(word, graphemes, state.spanishHyphenator));
    const last = syllablesByWord.map(groups => groups[groups.length - 1]).filter(Boolean);
    const rest = syllablesByWord.flatMap(groups => groups.slice(0, -1));
    peelOrder = flattenGroups([...last, ...rest]);
  } else if (mode === 'drunken') {
    const base = [];
    if (direction === 'right') {
      for (let li = 0; li < segLines.length; li++) base.push(...(li % 2 !== 0 ? segLines[li].slice().reverse() : segLines[li]));
    } else {
      for (let li = segLines.length - 1; li >= 0; li--) {
        const ri = segLines.length - 1 - li;
        base.push(...(ri % 2 !== 0 ? segLines[li] : segLines[li].slice().reverse()));
      }
    }
    peelOrder = base;
    for (let i = 0; i < peelOrder.length; i++) {
      const swapDist = 4;
      const j = Math.max(0, Math.min(peelOrder.length - 1, i + Math.floor(Math.random() * (swapDist * 2 + 1)) - swapDist));
      [peelOrder[i], peelOrder[j]] = [peelOrder[j], peelOrder[i]];
    }
  } else if ((mode === 'outward' || mode === 'inward') && blockPositions) {
    const flat = segLines.flat();
    const midX = flat.reduce((sum, idx) => sum + (blockPositions[idx]?.x || 0), 0) / (flat.length || 1);
    peelOrder = flat.sort((a, b) => {
      const distA = Math.abs((blockPositions[a]?.x || 0) - midX), distB = Math.abs((blockPositions[b]?.x || 0) - midX);
      return mode === 'outward' ? distA - distB : distB - distA;
    });
  } else if (mode === 'center') {
    peelOrder = segLines.flat();
    const mid = (peelOrder.length - 1) / 2;
    peelOrder.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
  } else if (mode === 'random-walk') {
    const flat = segLines.flat();
    if (flat.length && blockPositions) {
      const remaining = new Set(flat);
      let curr = direction === 'right' ? flat[0] : flat[flat.length - 1];
      peelOrder.push(curr);
      remaining.delete(curr);
      while (remaining.size > 0) {
        let bestDist = Infinity, bestIdx = -1;
        const pA = blockPositions[curr];
        if (!pA) { const next = [...remaining][0]; curr = next; peelOrder.push(curr); remaining.delete(curr); continue; }
        for (const candidate of remaining) {
          const pB = blockPositions[candidate];
          if (!pB) continue;
          const d = Math.hypot(pB.x - pA.x, (pB.y - pA.y) * 0.4);
          if (d < bestDist) { bestDist = d; bestIdx = candidate; }
        }
        if (bestIdx === -1) { const next = [...remaining][0]; curr = next; peelOrder.push(curr); remaining.delete(curr); continue; }
        curr = bestIdx;
        peelOrder.push(curr);
        remaining.delete(curr);
      }
    }
  } else if (direction === 'right') {
    for (let li = 0; li < segLines.length; li++) {
      peelOrder.push(...(mode === 'zigzag' && li % 2 !== 0 ? segLines[li].slice().reverse() : segLines[li]));
    }
  } else {
    for (let li = segLines.length - 1; li >= 0; li--) {
      peelOrder.push(...(mode === 'zigzag' && (segLines.length - 1 - li) % 2 !== 0 ? segLines[li] : segLines[li].slice().reverse()));
    }
  }

  if (unstructured) {
    peelOrder = peelOrder.filter(idx => graphemes[idx] && /\S/.test(graphemes[idx]));
  }

  return peelOrder.slice().reverse();
}

export function buildSelectivePeelSegments(blockIdx, blockLayout) {
  const block = state.textBlocks[blockIdx];
  const n = block.graphemes.length;
  const segs = [];
  const anchorOrder = [];
  for (let i = n - 1; i >= 0; i--) {
    if (!block.inlineStyles[i]?.explicitPeel) anchorOrder.push(i);
  }
  if (anchorOrder.length) {
    segs.push({ stringOrder: anchorOrder, resolvedStarterCount: 0, groupKeys: new Map() });
  }
  const pts = block.peelPoints || [];
  const groups = [];
  let inPeel = false, groupStart = 0;
  for (let i = 0; i <= n; i++) {
    const isPeel = i < n && Boolean(block.inlineStyles[i]?.explicitPeel);
    if (isPeel && !inPeel) { groupStart = i; inPeel = true; }
    else if (!isPeel && inPeel) {
      const group = [];
      for (let j = groupStart; j < i; j++) group.push(j);
      groups.push(group);
      inPeel = false;
    }
  }
  if (block.peel?.allWords) {
    if (groups.length) {
      const pt = pts[0] || {};
      const direction = pt.direction || 'right';
      const lastGroup = groups[groups.length - 1];
      const sc = Math.max(1, Math.min(Number(pt.starterCount ?? 2), lastGroup.length));
      const stringOrder = buildSegmentOrder(groups, direction, 'linear', block.graphemes, blockLayout.positions);
      const ridToGroup = new Map();
      groups.forEach((g, gi) => g.forEach(ri => ridToGroup.set(ri, gi)));
      if (stringOrder.length) segs.push({ stringOrder, resolvedStarterCount: sc, groupKeys: new Map(), readingIdxToGroupIdx: ridToGroup });
    }
  } else {
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      const pt = pts[gi] || {};
      const direction = pt.direction || 'right';
      const sc = Math.max(1, Math.min(Number(pt.starterCount ?? 2), group.length));
      const stringOrder = buildSegmentOrder([group], direction, 'zigzag', block.graphemes, blockLayout.positions);
      if (stringOrder.length) segs.push({ stringOrder, resolvedStarterCount: sc, groupKeys: new Map() });
    }
  }
  return segs;
}

export function buildBlockSegments(blockIdx, blockLayout) {
  const block = state.textBlocks[blockIdx];
  if (block.inlineStyles.some(s => s?.explicitPeel)) {
    return buildSelectivePeelSegments(blockIdx, blockLayout);
  }
  // popGrid: one big segment, no starters — main.js unlocks everything directly
  if (block.peel?.popGrid) {
    const stringOrder = buildSegmentOrder(blockLayout.lineIndices, 'right', 'linear', block.graphemes, blockLayout.positions);
    return stringOrder.length ? [{ stringOrder, resolvedStarterCount: 0, groupKeys: new Map() }] : [];
  }
  const lines = blockLayout.lineIndices;
  const peelMode = block.peel?.mode || state.pieceConfig.peel.mode || 'zigzag';
  const globalStarterCount = block.peel?.initialUnlockCount ?? state.pieceConfig.peel.initialUnlockCount ?? state.INITIAL_UNLOCK_COUNT;
  const points = getBlockPeelPoints(blockIdx)
    .slice()
    .sort((a, b) => (a.line ?? 0) - (b.line ?? 0));

  return points.map((pt, pi) => {
    const useGraphemeRange = Number.isFinite(pt.fromGrapheme) || Number.isFinite(pt.toGrapheme) || Number.isFinite(pt.fromRatio) || Number.isFinite(pt.toRatio);
    const fromLine = useGraphemeRange ? 0 : Math.max(0, Number(pt.fromLine ?? pt.line ?? 0));
    const toLine = useGraphemeRange
      ? lines.length - 1
      : Math.min(lines.length - 1, Number(pt.toLine ?? (pi + 1 < points.length ? (points[pi+1].fromLine ?? points[pi+1].line ?? lines.length) - 1 : lines.length - 1)));
    let segLines = lines.slice(fromLine, toLine + 1).map(line => line.slice());
    if (useGraphemeRange) {
      const flat = segLines.flat();
      const ratioStart = Number.isFinite(pt.fromRatio) ? Math.ceil(flat.length * Number(pt.fromRatio)) : null;
      const ratioEnd = Number.isFinite(pt.toRatio) ? Math.ceil(flat.length * Number(pt.toRatio)) - 1 : null;
      const start = Math.max(0, Math.min(flat.length - 1, Number(pt.fromGrapheme ?? ratioStart ?? 0)));
      const end = Math.max(start, Math.min(flat.length - 1, Number(pt.toGrapheme ?? ratioEnd ?? flat.length - 1)));
      const sub = flat.slice(start, end + 1);
      segLines = [sub];
    }
    const mode = pt.mode || peelMode;
    const resolvedStarterCount = Math.max(0, Number(pt.starterCount ?? globalStarterCount));
    const groupUnits = Boolean(pt.groupUnits ?? block.peel?.groupUnits ?? state.pieceConfig.peel?.groupUnits);
    const groupKeys = groupUnits && ['syllables-in-order', 'first-syllables', 'last-syllables'].includes(mode)
      ? getSyllableGroupKeyMap(segLines.flat(), block.graphemes, `${blockIdx}:${pi}:${mode}`, state.spanishHyphenator)
      : new Map();
    return {
      stringOrder: buildSegmentOrder(segLines, pt.direction || 'right', mode, block.graphemes, blockLayout.positions),
      resolvedStarterCount,
      groupKeys
    };
  }).filter(segment => segment.stringOrder.length);
}

export function computeRestLengths() {
  const segEndSet = new Set();
  for (const segs of state.segmentRanges) {
    for (let si = 0; si < segs.length - 1; si++) segEndSet.add(segs[si].end);
  }
  const rests = [];
  for (let i = 0; i < state.letters.length - 1; i++) {
    const a = state.letters[i], b = state.letters[i + 1];
    if (a.blockIdx !== b.blockIdx || segEndSet.has(i)) { rests.push(null); continue; }
    const blockConfig = getBlockConfig(a.blockIdx);
    const motion = blockConfig.letterMotion || state.pieceConfig.letterMotion;
    const motions = Array.isArray(motion) ? motion : (motion ? [motion] : []);
    if (motions.some(item => item?.type === 'palindrome-flip' && item.enabled !== false)) { rests.push(null); continue; }
    if (blockConfig.physics?.noConstraints || blockConfig.peel?.popGrid) { rests.push(null); continue; }
    const aLineHeight = getLetterLineHeight(a);
    const bLineHeight = getLetterLineHeight(b);
    const sameRow = Math.abs(b.oy - a.oy) < Math.max(aLineHeight, bLineHeight) / 2;
    const dx = sameRow ? (b.ox + b.w / 2) - (a.ox + a.w / 2) : 0;
    const dy = (b.oy + bLineHeight / 2) - (a.oy + aLineHeight / 2);
    let dist = Math.hypot(dx, dy);

    const peelMode = blockConfig.peel?.mode || state.pieceConfig.peel.mode || 'zigzag';
    const unstructured = [
      'spiral', 'spiral-center', 'random', 'drunken', 'outward', 'inward', 'random-neighbors', 'center', 'random-walk',
      'alternating-ends', 'vowels-first', 'punctuation-last', 'odd-even', 'first-letters', 'syllables-in-order',
      'first-syllables', 'last-syllables'
    ].includes(peelMode);
    if (unstructured && dist > Math.max(aLineHeight * 1.1, (a.w + b.w) * 2.2)) {
      dist = (a.w + b.w) * 0.62;
    } else if (!unstructured) {
      dist *= state.CONSTRAINT_DIST;
    }
    rests.push(dist);
  }
  return rests;
}

export function computeGapLinkDecayTargets() {
  const targets = new Array(state.restLengths.length).fill(null);
  for (let blockIdx = 0; blockIdx < state.textBlocks.length; blockIdx++) {
    if (!state.textBlocks[blockIdx].peel?.shrinkGaps) continue;
    for (const seg of (state.segmentRanges[blockIdx] || [])) {
      if (!seg.starterCount) continue;
      for (let i = seg.start; i < seg.end; i++) {
        const a = state.letters[i], b = state.letters[i + 1];
        if (!a || !b) continue;
        targets[i] = Math.max(4, (a.w + b.w) * 0.6);
      }
    }
  }
  return targets;
}

export function computeAllReflowPositions() {
  state.reflowPositions.clear();
  for (let blockIdx = 0; blockIdx < state.textBlocks.length; blockIdx++) {
    const block = state.textBlocks[blockIdx];
    if (!block.peel?.reflow && !block.peel?.reflowAnchors) continue;
    if (block.peel?.reflowAnchors && !block.peel?.allWords) {
      continue;
    }
    if (!block.inlineStyles.some(s => s?.explicitPeel)) continue;
    const anchorIndices = [];
    for (let i = 0; i < block.graphemes.length; i++) {
      if (!block.inlineStyles[i]?.explicitPeel) anchorIndices.push(i);
    }
    if (!anchorIndices.length) continue;
    const strippedBlock = {
      ...block,
      graphemes: anchorIndices.map(i => block.graphemes[i]),
      widths: anchorIndices.map(i => block.widths[i]),
      inlineStyles: anchorIndices.map(i => block.inlineStyles[i]),
      peel: {},
      transform: { ...block.transform }
    };
    const origStartY = (state.positions[blockIdx].positions[0]?.y ?? 0) - block.transform.y;
    let layout;
    try { layout = layoutBlockAtWidth(strippedBlock, getMaxWidth(), origStartY, null); } catch(e) { continue; }
    const posMap = new Map();
    anchorIndices.forEach((origIdx, si) => {
      const p = layout.positions[si];
      if (p) posMap.set(origIdx, { x: p.x, y: p.y });
    });
    state.reflowPositions.set(blockIdx, posMap);
    if (block.peel?.allWords && block.peel?.reflowAnchors) state.reflowStarted.add(blockIdx);
  }
}

export function computeAnchorPeelNeighbors() {
  state.anchorPeelNeighbors.clear();
  for (let blockIdx = 0; blockIdx < state.textBlocks.length; blockIdx++) {
    if (!state.textBlocks[blockIdx].peel?.reflowAnchors) continue;
    const block = state.textBlocks[blockIdx];
    const range = state.blockRanges[blockIdx];
    const segs = state.segmentRanges[blockIdx] || [];
    const ridToLetterIdx = new Map();
    for (let li = range.start; li <= range.end; li++) ridToLetterIdx.set(state.letters[li].readingIdx, li);
    const anchorSeg = segs[0];
    if (!anchorSeg) continue;
    const neighbors = new Map();
    for (let li = anchorSeg.start; li <= anchorSeg.end; li++) {
      const ri = state.letters[li].readingIdx;
      let leftPeel = -1, rightPeel = -1;
      for (let si = ri - 1; si >= 0; si--) {
        if (block.inlineStyles[si]?.explicitPeel && ridToLetterIdx.has(si)) { leftPeel = ridToLetterIdx.get(si); break; }
      }
      for (let si = ri + 1; si < block.graphemes.length; si++) {
        if (block.inlineStyles[si]?.explicitPeel && ridToLetterIdx.has(si)) { rightPeel = ridToLetterIdx.get(si); break; }
      }
      neighbors.set(li, { left: leftPeel, right: rightPeel });
    }
    state.anchorPeelNeighbors.set(blockIdx, neighbors);
  }
}

export function resolveBlockIndex(ref) {
  if (Number.isInteger(ref)) return ref >= 0 && ref < state.textBlocks.length ? ref : -1;
  if (typeof ref === 'string') return state.textBlocks.findIndex(block => block.id === ref);
  return -1;
}

export function resolveCrossSegment(spec = {}) {
  const blockIdx = resolveBlockIndex(spec.block ?? spec.blockId ?? spec.blockIdx);
  if (blockIdx < 0) return null;
  const segmentIdx = Math.max(0, Number(spec.segment ?? spec.segmentIdx ?? 0) || 0);
  const segment = state.segmentRanges[blockIdx]?.[segmentIdx];
  return segment ? { blockIdx, segmentIdx, segment } : null;
}

export function resolveCrossEndpoint(spec = {}, offset = 0) {
  const resolved = resolveCrossSegment(spec);
  if (!resolved) return -1;
  const { segment } = resolved;
  const fromEnd = (spec.endpoint || spec.side || 'end') !== 'start';
  const idx = fromEnd ? segment.end - offset : segment.start + offset;
  return idx >= segment.start && idx <= segment.end ? idx : -1;
}

export function getCrossStarterIndices(spec = {}, count = 1, reverse = false) {
  const resolved = resolveCrossSegment(spec);
  if (!resolved) return [];
  const { segment } = resolved;
  const start = Math.max(segment.start, segment.end - Math.max(1, count) + 1);
  const indices = [];
  for (let i = start; i <= segment.end; i++) indices.push(i);
  return reverse ? indices.reverse() : indices;
}

export function getCrossBlockArcBridge(cfg) {
  const count = Math.max(2, Number(cfg.initialArc?.count ?? cfg.count ?? 8) || 8);
  const aIndices = getCrossStarterIndices(cfg.from || {}, count, false);
  const bIndices = getCrossStarterIndices(cfg.to || {}, count, true);
  return [...aIndices, ...bIndices];
}

export function holdCrossArcSegments(cfg, bridge, ms) {
  const until = performance.now() + Math.max(0, Number(ms) || 0);
  const bridgeSet = new Set(bridge);
  for (const spec of [cfg.from || {}, cfg.to || {}]) {
    const resolved = resolveCrossSegment(spec);
    if (!resolved) continue;
    for (let i = resolved.segment.start; i <= resolved.segment.end; i++) {
      if (!state.letters[i] || bridgeSet.has(i)) continue;
      state.letters[i].tempLockUntil = Math.max(state.letters[i].tempLockUntil || 0, until);
    }
  }
}

export function placeCrossBlockArcBridge(cfg, aIndices, bIndices) {
  const aAnchor = state.letters[aIndices[0]];
  const aTip = state.letters[aIndices[aIndices.length - 1]];
  const bTip = state.letters[bIndices[0]];
  const bAnchor = state.letters[bIndices[bIndices.length - 1]];
  const anchorSpan = Math.hypot(bAnchor.ox - aAnchor.ox, bAnchor.oy - aAnchor.oy);
  const sag = Math.max(16, Number(cfg.initialArc.sag ?? anchorSpan * 0.18) || 16);
  const jointBias = Math.max(0.1, Math.min(0.9, Number(cfg.initialArc.jointBias ?? 0.5) || 0.5));
  const jointX = aTip.ox * 0.35 + bTip.ox * 0.35 + (aAnchor.ox + (bAnchor.ox - aAnchor.ox) * jointBias) * 0.3;
  const jointY = Math.max(aAnchor.oy, bAnchor.oy, aTip.oy, bTip.oy) + sag;

  const placeArm = (indices, start, end, curveSign = 1) => {
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const letter = state.letters[idx];
      const t = indices.length <= 1 ? 0 : i / (indices.length - 1);
      const ease = t * t * (3 - 2 * t);
      const bow = Math.sin(Math.PI * t) * Number(cfg.initialArc.bow ?? 18) * curveSign;
      letter.x = start.x + (end.x - start.x) * ease + bow;
      letter.y = start.y + (end.y - start.y) * ease + Math.sin(Math.PI * t) * Number(cfg.initialArc.armSag ?? 10);
      letter.px = letter.x;
      letter.py = letter.y;
      letter.yBaked = false;
    }
  };

  placeArm(aIndices, { x: aAnchor.ox, y: aAnchor.oy }, { x: jointX, y: jointY }, 1);
  placeArm(bIndices, { x: jointX, y: jointY }, { x: bAnchor.ox, y: bAnchor.oy }, -1);
}

export function solveBridgeConstraint(aIdx, bIdx, rest, stiffness, bridgeSet) {
  const a = state.letters[aIdx], b = state.letters[bIdx];
  if (!a || !b || a.deleted || b.deleted) return;
  const ax = a.x + a.w / 2, ay = a.y + state.LINE_HEIGHT / 2;
  const bx = b.x + b.w / 2, by = b.y + state.LINE_HEIGHT / 2;
  const dx = bx - ax, dy = by - ay;
  const dist = Math.hypot(dx, dy) || 0.001;
  const diff = (dist - rest) / dist * stiffness;
  const aFixed = a.locked || !bridgeSet.has(aIdx);
  const bFixed = b.locked || !bridgeSet.has(bIdx);
  if (aFixed && !bFixed) {
    b.x -= dx * diff; b.y -= dy * diff;
  } else if (!aFixed && bFixed) {
    a.x += dx * diff; a.y += dy * diff;
  } else if (!aFixed && !bFixed) {
    a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
    b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
  }
}

export function preSettleCrossBlockBridge(cfg, bridge) {
  const steps = Math.max(0, Number(cfg.initialArc?.prewarmSteps ?? 0) || 0);
  if (!steps || bridge.length < 2) return;
  const bridgeSet = new Set(bridge);
  const minIdx = Math.max(0, Math.min(...bridge) - 1);
  const maxIdx = Math.min(state.letters.length - 2, Math.max(...bridge));
  const crossA = resolveCrossEndpoint(cfg.from || {}, 0);
  const crossB = resolveCrossEndpoint(cfg.to || {}, 0);
  const cross = state.crossBlockConstraints.find(item => item.aIdx === crossA && item.bIdx === crossB);
  const crossRest = cross?.rest ?? 24;
  const crossStiffness = Math.max(0.05, Math.min(1, Number(cfg.stiffness ?? 0.7) || 0.7));

  for (let step = 0; step < steps; step++) {
    for (const idx of bridge) {
      const letter = state.letters[idx];
      if (!letter || letter.locked || letter.deleted) continue;
      const vx = (letter.x - letter.px) * 0.64;
      const vy = (letter.y - letter.py) * 0.64;
      letter.px = letter.x;
      letter.py = letter.y;
      letter.x += vx;
      letter.y += vy + state.TICK_GRAVITY * 1.8;
    }
    for (let iter = 0; iter < Math.max(6, Math.min(14, state.EFFECTIVE_ITERATIONS)); iter++) {
      for (let i = minIdx; i <= maxIdx; i++) {
        if (state.restLengths[i] === null) continue;
        if (!bridgeSet.has(i) && !bridgeSet.has(i + 1)) continue;
        solveBridgeConstraint(i, i + 1, state.restLengths[i], 1, bridgeSet);
      }
      if (crossA >= 0 && crossB >= 0) solveBridgeConstraint(crossA, crossB, crossRest, crossStiffness, bridgeSet);
    }
  }

  for (const idx of bridge) {
    const letter = state.letters[idx];
    if (!letter) continue;
    letter.px = letter.x;
    letter.py = letter.y;
  }
}

export function applyCrossBlockIdleArcs(initialOnly = false) {
  const configs = Array.isArray(state.pieceConfig.crossBlockConstraints) ? state.pieceConfig.crossBlockConstraints : [];
  for (let cfgIdx = 0; cfgIdx < configs.length; cfgIdx++) {
    const cfg = configs[cfgIdx];
    if (!cfg.initialArc || state.releasedCrossBlockArcs.has(cfgIdx)) continue;
    if (initialOnly && state.initializedCrossBlockArcs.has(cfgIdx)) continue;
    const count = Math.max(2, Number(cfg.initialArc.count ?? cfg.count ?? 8) || 8);
    const aIndices = getCrossStarterIndices(cfg.from || {}, count, false);
    const bIndices = getCrossStarterIndices(cfg.to || {}, count, true);
    const bridge = [...aIndices, ...bIndices];
    if (bridge.length < 3) continue;
    if (bridge.some(idx => !state.letters[idx] || state.letters[idx].locked || state.letters[idx].deleted)) continue;
    if (bridge.some(idx => state.letters[idx].starterIdle === false)) {
      state.releasedCrossBlockArcs.add(cfgIdx);
      continue;
    }
    placeCrossBlockArcBridge(cfg, aIndices, bIndices);
    state.initializedCrossBlockArcs.add(cfgIdx);
    if (cfg.initialArc.releaseOnSpawn) {
      const bridgeLockMs = Math.max(0, Number(cfg.initialArc.bridgeLockMs ?? 0) || 0);
      const settleMs = Math.max(0, Number(cfg.initialArc.settleMs ?? 0) || 0);
      for (const idx of bridge) {
        state.letters[idx].starterIdle = false;
        if (bridgeLockMs > 0) {
          state.letters[idx].tempLockUntil = Math.max(state.letters[idx].tempLockUntil || 0, performance.now() + bridgeLockMs);
        }
      }
      if (settleMs > 0) holdCrossArcSegments(cfg, bridge, settleMs);
      preSettleCrossBlockBridge(cfg, bridge);
      state.releasedCrossBlockArcs.add(cfgIdx);
    }
  }
}

export function computeCrossBlockConstraints() {
  const configs = Array.isArray(state.pieceConfig.crossBlockConstraints) ? state.pieceConfig.crossBlockConstraints : [];
  const constraints = [];
  for (const cfg of configs) {
    const count = Math.max(1, Number(cfg.count ?? 1) || 1);
    const stiffness = Math.max(0.05, Math.min(1, Number(cfg.stiffness ?? 0.7) || 0.7));
    const unlockThreshold = Math.max(0, Number(cfg.unlockThreshold ?? state.UNLOCK_THRESHOLD + 6) || 0);
    for (let offset = 0; offset < count; offset++) {
      const aIdx = resolveCrossEndpoint(cfg.from || {}, offset);
      const bIdx = resolveCrossEndpoint(cfg.to || {}, offset);
      if (aIdx < 0 || bIdx < 0 || aIdx === bIdx) continue;
      const a = state.letters[aIdx], b = state.letters[bIdx];
      if (!a || !b || a.deleted || b.deleted) continue;
      const dx = (b.ox + b.w / 2) - (a.ox + a.w / 2);
      const dy = (b.oy + state.LINE_HEIGHT / 2) - (a.oy + state.LINE_HEIGHT / 2);
      const arcCount = Math.max(2, Number(cfg.initialArc?.count ?? cfg.count ?? 1) || 2);
      const arcRest = cfg.initialArc ? Math.hypot(dx, dy) / Math.max(1, arcCount * 2 - 1) * 1.18 : null;
      const rest = Math.max(4, Number(cfg.restLength ?? arcRest ?? Math.hypot(dx, dy)) || 4);
      constraints.push({ aIdx, bIdx, rest, stiffness, unlockThreshold });
    }
  }
  return constraints;
}

export function buildCensorRevealEls() {
  const censorRevealEls = new Array(state.letters.length).fill(null);
  const censorRevealedFlags = new Array(state.letters.length).fill(false);
  for (let i = 0; i < state.letters.length; i++) {
    const l = state.letters[i];
    if (!l.inlineStyle?.censor) continue;
    const s = document.createElement('span');
    s.className = 'censor-reveal';
    s.textContent = l.ch;
    s.style.fontFamily = quoteFontFamily(l.style.fontFamily);
    s.style.fontSize = `${Number.parseFloat(state.baseFontSize) * l.scale}px`;
    s.style.transform = `translate(${l.x}px, ${l.y}px)`;
    s.style.color = l.inlineStyle?.color || l.style?.color || state.pieceConfig.style.color || '#4a4a4a';
    if (l.inlineStyle.bold) s.style.fontWeight = '700';
    if (l.inlineStyle.italic) s.style.fontStyle = 'italic';
    censorRevealEls[i] = s;
  }
  return { censorRevealEls, censorRevealedFlags };
}
