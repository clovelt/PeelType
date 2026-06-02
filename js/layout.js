const state = globalThis.__tiritaState || (globalThis.__tiritaState = {});
import { normalizeGradient } from './color.js';
import { loadGoogleFont, quoteFontFamily } from './font.js';
import { pointsOnPath, hachureLines } from './vendor/geometry.js';
import { sampleDrawPath, pointOnDrawSamples } from './draw-path.js';

function getBlockConfig(blockIdx) { return state.pieceConfig?.blocks?.[blockIdx] || state.activeBlocks?.[blockIdx] || {}; }

export function getBlockStyle(blockIdx) {
  const blockStyle = getBlockConfig(blockIdx).style || {};
  return {
    color: state.pieceConfig.style.color,
    colorMode: 'solid',
    fontFamily: state.FONT.replace(state.baseFontSize, '').trim() || 'Georgia',
    ...blockStyle,
    gradient: normalizeGradient(blockStyle.gradient)
  };
}

export function getBlockFont(blockIdx) {
  const style = getBlockStyle(blockIdx);
  loadGoogleFont(style.fontFamily);
  return `${state.baseFontSize} ${quoteFontFamily(style.fontFamily)}`;
}

export function getBlockRawLineHeight(block) {
  const scale = Math.max(0.1, Number(block?.transform?.scale || 1));
  const configuredRatio = Math.max(1.05, state.LINE_HEIGHT / state.baseFontPx);
  const compactRatio = Math.min(configuredRatio, 1.16);
  const t = Math.max(0, Math.min(1, (scale - 1) / 1.6));
  return state.baseFontPx * (configuredRatio + (compactRatio - configuredRatio) * t);
}

export function getBlockVisualLineHeight(block) {
  return getBlockRawLineHeight(block) * Math.max(0.1, Number(block?.transform?.scale || 1));
}

export function getLetterLineHeight(letter) {
  return Math.max(1, Number(letter?.lineHeight) || state.LINE_HEIGHT * Math.max(0.1, Number(letter?.scale || 1)));
}

export function getBlockPeelFromBeginning(blockIdx) {
  return getBlockConfig(blockIdx).peel?.fromBeginning ?? state.pieceConfig.peel.fromBeginning;
}

export function getConfigBlocks(config) {
  return config.blocks;
}

export function getBlockPeelFromConfig(config, blockIdx) {
  const blocks = getConfigBlocks(config) || [];
  return blocks[blockIdx]?.peel?.fromBeginning ?? config.peel?.fromBeginning ?? true;
}

export async function waitForTextFonts() {
  try {
    if (!document.fonts?.load || !state.activeBlocks.length) return;
    const fontFamilies = [...new Set(state.activeBlocks.map((_, blockIdx) => getBlockStyle(blockIdx).fontFamily))];
    const loads = fontFamilies.map(fontFamily => document.fonts.load(`${state.baseFontSize} ${quoteFontFamily(fontFamily)}`));
    await Promise.race([
      Promise.all(loads),
      new Promise(resolve => setTimeout(resolve, 1200))
    ]);
  } catch (e) {
    console.warn("Font loading timed out or failed, continuing...", e);
  }
}

export function getMaxWidth() {
  return state.container.getBoundingClientRect().width - state.MARGIN * 2;
}

// ── SVG path builders — each returns a path `d` string in [0,W]×[0,H] space
const SHAPE_PATHS = {
  circle: (W, H) => {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2;
    return `M ${cx},${cy - r} A ${r},${r} 0 1,0 ${cx},${cy + r} A ${r},${r} 0 1,0 ${cx},${cy - r} Z`;
  },
  tshirt: (W, H) => {
    const s = (x, y) => `${x * W / 100},${y * H / 110}`;
    return `M ${s(35, 2)} Q ${s(50, 14)} ${s(65, 2)} L ${s(100, 20)} L ${s(100, 40)} L ${s(88, 40)} L ${s(88, 108)} L ${s(12, 108)} L ${s(12, 40)} L ${s(0, 40)} L ${s(0, 20)} Z`;
  },
  star5: (W, H) => {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2, r = R * 0.42;
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI / 5) - Math.PI / 2, rad = i % 2 === 0 ? R : r;
      d += (i === 0 ? 'M' : 'L') + ` ${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
    }
    return d + ' Z';
  },
  star6: (W, H) => {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2, r = R * 0.5;
    let d = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI / 6) - Math.PI / 2, rad = i % 2 === 0 ? R : r;
      d += (i === 0 ? 'M' : 'L') + ` ${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
    }
    return d + ' Z';
  },
  diamond: (W, H) => `M ${W / 2},0 L ${W},${H / 2} L ${W / 2},${H} L 0,${H / 2} Z`,
  triangle: (W, H) => `M ${W / 2},0 L ${W},${H} L 0,${H} Z`,
  pentagon: (W, H) => {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
    let d = '';
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
      d += (i === 0 ? 'M' : 'L') + ` ${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`;
    }
    return d + ' Z';
  },
  hexagon: (W, H) => {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
    let d = '';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      d += (i === 0 ? 'M' : 'L') + ` ${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`;
    }
    return d + ' Z';
  },
  arrow: (W, H) => {
    const mid = H / 2, sT = H * 0.32, sB = H * 0.68, nk = W * 0.58;
    return `M 0,${sT} L ${nk},${sT} L ${nk},0 L ${W},${mid} L ${nk},${H} L ${nk},${sB} L 0,${sB} Z`;
  },
  heart: (W, H) => {
    const cx = W / 2;
    return `M ${cx},${H * 0.88} C ${cx - W * 0.02},${H * 0.72} ${cx - W * 0.5},${H * 0.56} ${cx - W * 0.5},${H * 0.30} C ${cx - W * 0.5},${H * 0.08} ${cx - W * 0.24},${H * 0.04} ${cx},${H * 0.22} C ${cx + W * 0.24},${H * 0.04} ${cx + W * 0.5},${H * 0.08} ${cx + W * 0.5},${H * 0.30} C ${cx + W * 0.5},${H * 0.56} ${cx + W * 0.02},${H * 0.72} ${cx},${H * 0.88} Z`;
  },
  bubble: (W, H) => {
    const r = H * 0.12, bh = H * 0.80;
    return `M ${r},0 L ${W - r},0 Q ${W},0 ${W},${r} L ${W},${bh - r} Q ${W},${bh} ${W - r},${bh} L ${W * 0.35},${bh} L ${W * 0.22},${H} L ${W * 0.30},${bh} L ${r},${bh} Q 0,${bh} 0,${bh - r} L 0,${r} Q 0,0 ${r},0 Z`;
  },
  cross: (W, H) => {
    const t = W * 0.3, b = W * 0.7, l = H * 0.3, r = H * 0.7;
    return `M ${t},0 L ${b},0 L ${b},${l} L ${W},${l} L ${W},${r} L ${b},${r} L ${b},${H} L ${t},${H} L ${t},${r} L 0,${r} L 0,${l} L ${t},${l} Z`;
  },
  leaf: (W, H) => `M ${W / 2},0 C ${W},0 ${W},${H} ${W / 2},${H} C 0,${H} 0,0 ${W / 2},0 Z`,
  drop: (W, H) => `M ${W / 2},0 C ${W * 0.9},${H * 0.4} ${W},${H * 0.65} ${W / 2},${H} C 0,${H * 0.65} ${W * 0.1},${H * 0.4} ${W / 2},0 Z`,
};

export function getShapePathD(clipShape, W, H) {
  if (clipShape.pathD) return clipShape.pathD;
  return SHAPE_PATHS[clipShape.type]?.(W, H);
}

export function transformShapePoint(point, clipShape = {}, W = 0, H = 0) {
  const shapeScaleValue = Number(clipShape.scale ?? 1) || 1;
  const rotation = (Number(clipShape.rotation ?? 0) || 0) * Math.PI / 180;
  if (shapeScaleValue === 1 && rotation === 0) return point;
  const cx = W / 2;
  const cy = H / 2;
  const dx = (point[0] - cx) * shapeScaleValue;
  const dy = (point[1] - cy) * shapeScaleValue;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

export function buildPathSpans(pathD, clipShape, W, H) {
  try {
    const segments = pointsOnPath(pathD);
    const polygon = segments.flat().map(point => transformShapePoint(point, clipShape, W, H));
    if (polygon.length < 3) return [];
    const rawLines = hachureLines([polygon], Math.round(state.LINE_HEIGHT), 0);
    return rawLines
      .map(([[x1, y1], [x2]]) => ({
        y: y1,
        xl: Math.min(x1, x2),
        xr: Math.max(x1, x2),
        lineW: Math.abs(x2 - x1)
      }))
      .filter(s => s.lineW > 4)
      .sort((a, b) => a.y - b.y);
  } catch (e) {
    console.error('buildPathSpans error:', e);
    return [];
  }
}

export function layoutBlockInPath(block, blockIdx, pathD, W, H, startY) {
  const scale = Math.max(0.1, Number(block.transform.scale || 1));
  const lineHeight = getBlockRawLineHeight(block);
  const visualLineHeight = getBlockVisualLineHeight(block);
  const tx = block.transform.x || 0, ty = block.transform.y || 0;
  state.shapeOrigins.set(blockIdx, { screenX: state.MARGIN * scale + tx, screenY: startY + ty, W, H, pathD, scale, shape: block.clipShape });

  const spans = buildPathSpans(pathD, block.clipShape, W, H);
  if (!spans.length) return layoutBlockAtWidth(block, W, startY);

  const rawPositions = [], lineIndices = [[]];
  const graphemePositions = new Array(block.graphemes.length).fill(null);
  let spanIdx = 0, currentX = 0, overflowY = (spans[spans.length - 1]?.y || H) + lineHeight;
  let inOverflow = false;

  for (let gi = 0; gi < block.graphemes.length; gi++) {
    const g = block.graphemes[gi], w = block.widths[gi];

    if (!inOverflow) {
      if (g === ' ' && currentX > 0) {
        let wordW = 0;
        for (let j = gi + 1; j < block.graphemes.length && block.graphemes[j] !== ' '; j++) wordW += block.widths[j];
        if (currentX + w + wordW > spans[spanIdx].lineW) {
          spanIdx++;
          currentX = 0;
          lineIndices.push([]);
          if (spanIdx >= spans.length) {
            if (block.clipShape?.clipOverflow) break;
            inOverflow = true;
          } else {
            continue;
          }
        }
      }
      if (g !== ' ' && currentX > 0 && currentX + w > spans[spanIdx].lineW) {
        spanIdx++;
        currentX = 0;
        lineIndices.push([]);
        if (spanIdx >= spans.length) {
          if (block.clipShape?.clipOverflow) break;
          inOverflow = true;
        }
      }
    } else {
      if (g === ' ' && currentX > 0) {
        let wordW = 0;
        for (let j = gi + 1; j < block.graphemes.length && block.graphemes[j] !== ' '; j++) wordW += block.widths[j];
        if (currentX + w + wordW > W) {
          currentX = 0;
          overflowY += lineHeight;
          lineIndices.push([]);
        }
      }
      if (g !== ' ' && currentX > 0 && currentX + w > W) {
        currentX = 0;
        overflowY += lineHeight;
        lineIndices.push([]);
      }
    }

    let pos;
    if (!inOverflow) {
      const s = spans[spanIdx];
      pos = { x: (s.xl + currentX + state.MARGIN) * scale + tx, y: startY + s.y * scale + ty, w: w * scale, lineHeight: visualLineHeight };
    } else {
      pos = { x: (currentX + state.MARGIN) * scale + tx, y: startY + overflowY * scale + ty, w: w * scale, lineHeight: visualLineHeight };
    }

    rawPositions.push(pos);
    graphemePositions[gi] = pos;
    lineIndices[lineIndices.length - 1].push(gi);
    currentX += w;
  }

  const finalLineY = inOverflow ? overflowY : (spans[Math.min(spanIdx, spans.length - 1)]?.y || 0);
  const textH = Math.max((finalLineY + lineHeight) * scale, H * scale, Number(block.transform.height || 0));

  return {
    positions: graphemePositions, lineIndices, textHeight: textH,
    attachment: getAttachmentLayout(block, rawPositions, textH),
    height: textH + getAttachmentHeight(block)
  };
}

export function getBlockLayout(block, blockIdx, maxWidth, startY) {
  if (block.clipShape) {
    const scale = Math.max(0.1, Number(block.transform.scale || 1));
    const W = Math.max(80, Math.min(maxWidth, (block.transform.width || maxWidth) / scale));
    const H = block.transform.height || W;
    const pathD = getShapePathD(block.clipShape, W, H);
    if (pathD) return layoutBlockInPath(block, blockIdx, pathD, W, H, startY);
  }
  return layoutBlockAtWidth(block, maxWidth, startY, blockIdx);
}

export function layoutPositions(maxWidth) {
  state.drawPathOrigins.clear();
  const measuredLayouts = state.textBlocks.map((block, blockIdx) => getBlockLayout(block, blockIdx, maxWidth, 0));
  const heights = measuredLayouts.map(layout => layout.height);
  const totalHeight = heights.reduce((sum, height) => sum + height, 0) + state.BLOCK_GAP * (state.textBlocks.length - 1);
  const containerRect = state.container.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const centeredOffset = (viewportHeight - containerRect.top - totalHeight) * 0.3;
  const offsetY = Math.max(state.TOP_MARGIN, centeredOffset);

  let y = offsetY;
  // When the Layers behavior is on, blocks sharing a layer.group stack on top of
  // one another (matrioska) instead of flowing down the page.
  const layersOn = Boolean(state.pieceConfig.behaviors?.layers?.enabled);
  const groupStartY = new Map();
  const layouts = state.textBlocks.map((block, blockIdx) => {
    const groupKey = layersOn && block.layer?.group ? String(block.layer.group) : null;
    let startY = y;
    let advance = true;
    if (groupKey) {
      if (groupStartY.has(groupKey)) { startY = groupStartY.get(groupKey); advance = false; }
      else groupStartY.set(groupKey, y);
    }
    const layout = getBlockLayout(block, blockIdx, maxWidth, startY);
    if (advance) y += heights[blockIdx] + state.BLOCK_GAP;
    else y = Math.max(y, startY + heights[blockIdx] + state.BLOCK_GAP);
    return layout;
  });
  const isCompact = state.pieceConfig.behaviors?.stepParagraphs?.enabled && state.pieceConfig.behaviors?.stepParagraphs?.compactFlow;
  const compactRuntime = isCompact && !document.body.classList.contains('editor-open');
  state.container.style.minHeight = compactRuntime ? '100vh' : `${Math.max(window.innerHeight, y + state.BOTTOM_MARGIN)}px`;
  return layouts;
}

export function layoutBlockAtWidth(block, maxWidth, startY, blockIdx = null) {
  if (block.drawPath?.enabled && block.drawPath.anchors?.length >= 2) {
    return layoutBlockOnDrawPath(block, maxWidth, startY, blockIdx);
  }
  const scale = Math.max(0.1, Number(block.transform.scale || 1));
  const lineHeight = getBlockRawLineHeight(block);
  const visualLineHeight = getBlockVisualLineHeight(block);
  const offsetX = Number(block.transform.x || 0);
  const containerWidth = maxWidth + state.MARGIN * 2;
  const fitWidth = (containerWidth - state.MARGIN - offsetX) / scale - state.MARGIN;
  const blockWidth = Math.max(80, Math.min(maxWidth, fitWidth, block.transform.width || maxWidth));
  const rawPositions = [];
  const lineIndices = [[]];
  let currentX = 0;
  let currentY = 0;

  for (let gi = 0; gi < block.graphemes.length; gi++) {
    const g = block.graphemes[gi];
    const w = block.widths[gi];

    if (g === '\n') {
      rawPositions.push({ x: (state.MARGIN) * block.transform.scale + block.transform.x, y: startY + (currentY * block.transform.scale) + block.transform.y, w: 0, lineHeight: visualLineHeight });
      lineIndices[lineIndices.length - 1].push(gi);
      currentX = 0;
      currentY += lineHeight;
      lineIndices.push([]);
      continue;
    }
    if (g === ' ' && currentX > 0) {
      let wordW = 0;
      for (let j = gi + 1; j < block.graphemes.length && block.graphemes[j] !== ' ' && block.graphemes[j] !== '\n'; j++) {
        wordW += block.widths[j];
      }
      if (currentX + w + wordW > blockWidth) {
        currentX = 0;
        currentY += lineHeight;
        lineIndices.push([]);
      }
    }
    if (g !== ' ' && currentX > 0 && currentX + w > blockWidth) {
      currentX = 0;
      currentY += lineHeight;
      lineIndices.push([]);
    }

    rawPositions.push({
      x: (currentX + state.MARGIN) * block.transform.scale + block.transform.x,
      y: startY + (currentY * block.transform.scale) + block.transform.y,
      w: w * block.transform.scale,
      lineHeight: visualLineHeight
    });
    lineIndices[lineIndices.length - 1].push(gi);
    currentX += w;
  }

  return {
    positions: rawPositions,
    lineIndices,
    textHeight: Math.max((currentY + lineHeight) * block.transform.scale, Number(block.transform.height || 0)),
    attachment: getAttachmentLayout(block, rawPositions, (currentY + lineHeight) * block.transform.scale),
    height: Math.max((currentY + lineHeight) * block.transform.scale, Number(block.transform.height || 0)) + getAttachmentHeight(block)
  };
}

export function layoutBlockOnDrawPath(block, maxWidth, startY, blockIdx = null) {
  const drawPath = block.drawPath || {};
  const scale = Math.max(0.1, Number(block.transform.scale || 1));
  const originX = Number(block.transform.x || 0);
  const originY = startY + Number(block.transform.y || 0);
  const spacing = Number(drawPath.spacing ?? 2) || 0;
  const angleMix = Math.max(0, Math.min(1, Number(drawPath.angleMix ?? 1)));
  const sourceAnchors = drawPath.anchors || [];
  const transformedAnchors = sourceAnchors.map(anchor => ({
    x: originX + (Number(anchor.x) || 0) * scale,
    y: originY + (Number(anchor.y) || 0) * scale,
    in: anchor.in ? { x: (Number(anchor.in.x) || 0) * scale, y: (Number(anchor.in.y) || 0) * scale } : { x: 0, y: 0 },
    out: anchor.out ? { x: (Number(anchor.out.x) || 0) * scale, y: (Number(anchor.out.y) || 0) * scale } : { x: 0, y: 0 }
  }));
  if (blockIdx !== null) state.drawPathOrigins.set(blockIdx, { screenX: originX, screenY: originY, scale });
  const { samples, total } = sampleDrawPath(transformedAnchors, 28);
  if (samples.length < 2 || total <= 0) return layoutBlockAtWidth({ ...block, drawPath: null }, maxWidth, startY, blockIdx);

  const positions = [];
  let distance = Math.max(0, Number(drawPath.startOffset || 0));
  for (let gi = 0; gi < block.graphemes.length; gi++) {
    const w = block.widths[gi] * scale;
    const mid = pointOnDrawSamples(samples, Math.min(total, distance + w / 2));
    positions.push({
      x: mid.x - w / 2,
      y: mid.y - state.LINE_HEIGHT * scale / 2,
      w,
      angle: mid.angle * angleMix
    });
    distance += Math.max(2, w + spacing);
  }
  const xs = samples.map(p => p.x);
  const ys = samples.map(p => p.y);
  const minX = Math.min(...xs, ...positions.map(p => p.x));
  const maxX = Math.max(...xs, ...positions.map(p => p.x + p.w));
  const minY = Math.min(...ys, ...positions.map(p => p.y));
  const maxY = Math.max(...ys, ...positions.map(p => p.y + state.LINE_HEIGHT * scale));
  return {
    positions,
    lineIndices: [positions.map((_, idx) => idx)],
    textHeight: Math.max(maxY - startY, Number(block.transform.height || 0)),
    attachment: getAttachmentLayout(block, positions, Math.max(0, maxY - minY)),
    height: Math.max(maxY - startY + state.LINE_HEIGHT * scale, state.LINE_HEIGHT * scale, Number(block.transform.height || 0)) + getAttachmentHeight(block)
  };
}

export function getAttachmentHeight(block) {
  const attachment = block.attachment;
  if (!attachment) return 0;
  const scale = Math.max(0.1, Math.min(5, Number(attachment.scale ?? 1) || 1));
  return Math.max(0, (Number(attachment.height || 180) * scale) + Number(attachment.gap || 16) + Number(attachment.opticalOffsetY || 0));
}

export function getAttachmentLayout(block, rawPositions, textHeight) {
  const attachment = block.attachment;
  if (!attachment) return null;
  const left = rawPositions.length ? Math.min(...rawPositions.map(p => p.x)) : state.MARGIN + block.transform.x;
  const right = rawPositions.length ? Math.max(...rawPositions.map(p => p.x + p.w)) : left + block.transform.width;
  const scale = Math.max(0.1, Math.min(5, Number(attachment.scale ?? 1) || 1));
  const width = Math.max(80, Number(attachment.width || Math.min(420, right - left))) * scale;
  const height = Math.max(40, Number(attachment.height || 180)) * scale;
  const x = left + Math.max(0, (right - left - width) / 2) + Number(attachment.x || 0);
  const y = (rawPositions[0]?.y ?? 0) + textHeight + Number(attachment.gap || 16) + Number(attachment.opticalOffsetY || 0) + Number(attachment.y || 0);
  return { x, y, width, height, label: attachment.label || 'Illustration placeholder' };
}

export function getBlockPeelPoints(blockIdx) {
  const bc = getBlockConfig(blockIdx);
  if (bc.peelPoints?.length) return bc.peelPoints;
  const fromStart = getBlockPeelFromBeginning(blockIdx);
  return [{ line: 0, direction: fromStart ? 'right' : 'left', starterCount: null }];
}
