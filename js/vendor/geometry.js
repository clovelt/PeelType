function tokenizePath(d = '') {
  return String(d).match(/[a-zA-Z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/g) || [];
}

function isCommand(token) {
  return /^[a-zA-Z]$/.test(token);
}

function cubicAt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt ** 3 * p0 + 3 * mt ** 2 * t * p1 + 3 * mt * t ** 2 * p2 + t ** 3 * p3;
}

function quadraticAt(p0, p1, p2, t) {
  const mt = 1 - t;
  return mt ** 2 * p0 + 2 * mt * t * p1 + t ** 2 * p2;
}

function vectorAngle(ux, uy, vx, vy) {
  const sign = (ux * vy - uy * vx) < 0 ? -1 : 1;
  const dot = ux * vx + uy * vy;
  const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  return sign * Math.acos(Math.max(-1, Math.min(1, dot / (len || 1))));
}

function arcPoints(x1, y1, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x2, y2, steps) {
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (!rx || !ry) return [[x2, y2]];
  const phi = (Number(xAxisRotation) || 0) * Math.PI / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  let x1p = cosPhi * dx + sinPhi * dy;
  let y1p = -sinPhi * dx + cosPhi * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
  }
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const x1p2 = x1p * x1p;
  const y1p2 = y1p * y1p;
  const sign = Number(largeArcFlag) === Number(sweepFlag) ? -1 : 1;
  const denom = rx2 * y1p2 + ry2 * x1p2;
  const coef = sign * Math.sqrt(Math.max(0, (rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2) / (denom || 1)));
  const cxp = coef * (rx * y1p / ry);
  const cyp = coef * (-ry * x1p / rx);
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaTheta = vectorAngle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  );
  if (!sweepFlag && deltaTheta > 0) deltaTheta -= Math.PI * 2;
  if (sweepFlag && deltaTheta < 0) deltaTheta += Math.PI * 2;
  const count = Math.max(6, Math.ceil(Math.abs(deltaTheta) / (Math.PI * 2) * steps * 2));
  const points = [];
  for (let s = 1; s <= count; s++) {
    const theta = theta1 + deltaTheta * (s / count);
    const xp = rx * Math.cos(theta);
    const yp = ry * Math.sin(theta);
    points.push([
      cosPhi * xp - sinPhi * yp + cx,
      sinPhi * xp + cosPhi * yp + cy
    ]);
  }
  return points;
}

function pushPoint(segment, x, y) {
  if (!segment.length || segment[segment.length - 1][0] !== x || segment[segment.length - 1][1] !== y) {
    segment.push([x, y]);
  }
}

export function pointsOnPath(d = '', options = {}) {
  const tokens = tokenizePath(d);
  const stepCount = Math.max(4, Number(options.curveSteps || 18));
  const segments = [];
  let segment = [];
  let i = 0;
  let cmd = '';
  let x = 0, y = 0, startX = 0, startY = 0;
  let lastCubicControl = null;
  let lastQuadraticControl = null;

  function readNumber() {
    return Number(tokens[i++]);
  }

  function hasNumbers(count) {
    if (i + count > tokens.length) return false;
    for (let j = 0; j < count; j++) if (isCommand(tokens[i + j])) return false;
    return true;
  }

  function finishSegment() {
    if (segment.length > 1) segments.push(segment);
    segment = [];
  }

  while (i < tokens.length) {
    if (isCommand(tokens[i])) cmd = tokens[i++];
    if (!cmd) break;
    const lower = cmd.toLowerCase();
    const relative = cmd === lower;

    if (lower === 'm') {
      if (!hasNumbers(2)) break;
      finishSegment();
      x = (relative ? x : 0) + readNumber();
      y = (relative ? y : 0) + readNumber();
      startX = x; startY = y;
      pushPoint(segment, x, y);
      cmd = relative ? 'l' : 'L';
      lastCubicControl = null;
      lastQuadraticControl = null;
      continue;
    }

    if (lower === 'z') {
      pushPoint(segment, startX, startY);
      finishSegment();
      x = startX; y = startY;
      cmd = '';
      lastCubicControl = null;
      lastQuadraticControl = null;
      continue;
    }

    if (lower === 'l') {
      while (hasNumbers(2)) {
        const nx = (relative ? x : 0) + readNumber();
        const ny = (relative ? y : 0) + readNumber();
        pushPoint(segment, nx, ny);
        x = nx; y = ny;
      }
      lastCubicControl = null;
      lastQuadraticControl = null;
      continue;
    }

    if (lower === 'h') {
      while (hasNumbers(1)) {
        x = (relative ? x : 0) + readNumber();
        pushPoint(segment, x, y);
      }
      lastCubicControl = null;
      lastQuadraticControl = null;
      continue;
    }

    if (lower === 'v') {
      while (hasNumbers(1)) {
        y = (relative ? y : 0) + readNumber();
        pushPoint(segment, x, y);
      }
      lastCubicControl = null;
      lastQuadraticControl = null;
      continue;
    }

    if (lower === 'c') {
      while (hasNumbers(6)) {
        const x1 = (relative ? x : 0) + readNumber();
        const y1 = (relative ? y : 0) + readNumber();
        const x2 = (relative ? x : 0) + readNumber();
        const y2 = (relative ? y : 0) + readNumber();
        const x3 = (relative ? x : 0) + readNumber();
        const y3 = (relative ? y : 0) + readNumber();
        const ox = x, oy = y;
        for (let s = 1; s <= stepCount; s++) {
          const t = s / stepCount;
          pushPoint(segment, cubicAt(ox, x1, x2, x3, t), cubicAt(oy, y1, y2, y3, t));
        }
        x = x3; y = y3;
        lastCubicControl = [x2, y2];
        lastQuadraticControl = null;
      }
      continue;
    }

    if (lower === 's') {
      while (hasNumbers(4)) {
        const x1 = lastCubicControl ? (2 * x - lastCubicControl[0]) : x;
        const y1 = lastCubicControl ? (2 * y - lastCubicControl[1]) : y;
        const x2 = (relative ? x : 0) + readNumber();
        const y2 = (relative ? y : 0) + readNumber();
        const x3 = (relative ? x : 0) + readNumber();
        const y3 = (relative ? y : 0) + readNumber();
        const ox = x, oy = y;
        for (let s = 1; s <= stepCount; s++) {
          const t = s / stepCount;
          pushPoint(segment, cubicAt(ox, x1, x2, x3, t), cubicAt(oy, y1, y2, y3, t));
        }
        x = x3; y = y3;
        lastCubicControl = [x2, y2];
        lastQuadraticControl = null;
      }
      continue;
    }

    if (lower === 'q') {
      while (hasNumbers(4)) {
        const x1 = (relative ? x : 0) + readNumber();
        const y1 = (relative ? y : 0) + readNumber();
        const x2 = (relative ? x : 0) + readNumber();
        const y2 = (relative ? y : 0) + readNumber();
        const ox = x, oy = y;
        for (let s = 1; s <= stepCount; s++) {
          const t = s / stepCount;
          pushPoint(segment, quadraticAt(ox, x1, x2, t), quadraticAt(oy, y1, y2, t));
        }
        x = x2; y = y2;
        lastQuadraticControl = [x1, y1];
        lastCubicControl = null;
      }
      continue;
    }

    if (lower === 't') {
      while (hasNumbers(2)) {
        const x1 = lastQuadraticControl ? (2 * x - lastQuadraticControl[0]) : x;
        const y1 = lastQuadraticControl ? (2 * y - lastQuadraticControl[1]) : y;
        const x2 = (relative ? x : 0) + readNumber();
        const y2 = (relative ? y : 0) + readNumber();
        const ox = x, oy = y;
        for (let s = 1; s <= stepCount; s++) {
          const t = s / stepCount;
          pushPoint(segment, quadraticAt(ox, x1, x2, t), quadraticAt(oy, y1, y2, t));
        }
        x = x2; y = y2;
        lastQuadraticControl = [x1, y1];
        lastCubicControl = null;
      }
      continue;
    }

    if (lower === 'a') {
      while (hasNumbers(7)) {
        const rx = readNumber();
        const ry = readNumber();
        const xAxisRotation = readNumber();
        const largeArcFlag = readNumber();
        const sweepFlag = readNumber();
        const nx = (relative ? x : 0) + readNumber();
        const ny = (relative ? y : 0) + readNumber();
        for (const point of arcPoints(x, y, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, nx, ny, stepCount)) {
          pushPoint(segment, point[0], point[1]);
        }
        x = nx; y = ny;
        lastCubicControl = null;
        lastQuadraticControl = null;
      }
      continue;
    }

    break;
  }

  finishSegment();
  return segments;
}

export function hachureLines(polygons = [], gap = 8, angle = 0) {
  const lines = [];
  const spacing = Math.max(2, Number(gap) || 8);
  for (const polygon of polygons) {
    if (!polygon || polygon.length < 3) continue;
    const ys = polygon.map(p => p[1]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    for (let y = Math.ceil(minY / spacing) * spacing; y <= maxY; y += spacing) {
      const intersections = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        if (a[1] === b[1]) continue;
        const ymin = Math.min(a[1], b[1]);
        const ymax = Math.max(a[1], b[1]);
        if (y < ymin || y >= ymax) continue;
        const t = (y - a[1]) / (b[1] - a[1]);
        intersections.push(a[0] + (b[0] - a[0]) * t);
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) {
        let x1 = intersections[i], x2 = intersections[i + 1];
        if (angle) {
          const skew = Math.tan(angle * Math.PI / 180) * 0.001;
          x1 += y * skew; x2 += y * skew;
        }
        if (Math.abs(x2 - x1) > 0.5) lines.push([[x1, y], [x2, y]]);
      }
    }
  }
  return lines;
}
