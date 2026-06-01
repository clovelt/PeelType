export function cubicAt(p0, c1, c2, p1, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p1.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p1.y
  };
}

export function cubicDerivativeAt(p0, c1, c2, p1, t) {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (c1.x - p0.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (p1.x - c2.x),
    y: 3 * mt * mt * (c1.y - p0.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (p1.y - c2.y)
  };
}

export function getAnchorOut(anchor) {
  return anchor.out ? { x: anchor.x + anchor.out.x, y: anchor.y + anchor.out.y } : { x: anchor.x, y: anchor.y };
}

export function getAnchorIn(anchor) {
  return anchor.in ? { x: anchor.x + anchor.in.x, y: anchor.y + anchor.in.y } : { x: anchor.x, y: anchor.y };
}

export function sampleDrawPath(anchors, stepsPerSegment = 24) {
  const samples = [];
  let total = 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const p0 = { x: Number(a.x) || 0, y: Number(a.y) || 0 };
    const p1 = { x: Number(b.x) || 0, y: Number(b.y) || 0 };
    const c1 = getAnchorOut(a);
    const c2 = getAnchorIn(b);
    for (let s = 0; s <= stepsPerSegment; s++) {
      if (i > 0 && s === 0) continue;
      const t = s / stepsPerSegment;
      const p = cubicAt(p0, c1, c2, p1, t);
      const d = cubicDerivativeAt(p0, c1, c2, p1, t);
      if (samples.length) total += Math.hypot(p.x - samples[samples.length - 1].x, p.y - samples[samples.length - 1].y);
      samples.push({ ...p, angle: Math.atan2(d.y, d.x), dist: total });
    }
  }
  return { samples, total };
}

export function pointOnDrawSamples(samples, distance) {
  if (!samples.length) return { x: 0, y: 0, angle: 0 };
  if (distance <= 0) return samples[0];
  const last = samples[samples.length - 1];
  if (distance >= last.dist) return last;
  let hi = samples.findIndex(sample => sample.dist >= distance);
  if (hi <= 0) return samples[0];
  const lo = hi - 1;
  const a = samples[lo];
  const b = samples[hi];
  const t = (distance - a.dist) / Math.max(0.001, b.dist - a.dist);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: a.angle + (b.angle - a.angle) * t
  };
}

export function anchorsFromDrawnPoints(points) {
  const simplified = [];
  for (const point of points) {
    const prev = simplified[simplified.length - 1];
    if (!prev || Math.hypot(point.x - prev.x, point.y - prev.y) >= 18) simplified.push(point);
  }
  if (simplified.length < 2 && points.length >= 2) simplified.push(points[points.length - 1]);
  return simplified.map((point, idx, arr) => {
    const prev = arr[Math.max(0, idx - 1)];
    const next = arr[Math.min(arr.length - 1, idx + 1)];
    const handleScale = 0.18;
    return {
      x: Math.round(point.x),
      y: Math.round(point.y),
      in: idx === 0 ? { x: 0, y: 0 } : { x: Math.round((prev.x - next.x) * handleScale), y: Math.round((prev.y - next.y) * handleScale) },
      out: idx === arr.length - 1 ? { x: 0, y: 0 } : { x: Math.round((next.x - prev.x) * handleScale), y: Math.round((next.y - prev.y) * handleScale) }
    };
  });
}
