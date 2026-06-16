// Procedural maze generator — perfect mazes whose WALLS are drawn as text.
// Supports rectangular, circular (polar), hexagonal (sigma) and triangular
// (delta) grids and several generation algorithms. The grid/cell model and the
// algorithms follow the standard "Mazes for Programmers" approach also used by
// codebox/mazes (MIT). Walls are emitted as polylines in pixel space and laid
// out on Bézier draw-paths so text runs along every wall, like a maze on paper.
// Optionally the maze's solution path is rendered as a distinct thread — the
// thread of Ariadne winding through the corridors.
import { anchorsFromDrawnPoints } from './draw-path.js';

const SQRT3 = Math.sqrt(3);

function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Cell model ────────────────────────────────────────────────────────────────
function makeCell(id) { return { id, links: new Set(), neighbors: {} }; }
function link(a, b) { if (a && b) { a.links.add(b.id); b.links.add(a.id); } }
function linked(a, b) { return !!(a && b && a.links.has(b.id)); }
function neighborCells(cell) {
  const out = [];
  for (const key in cell.neighbors) { const v = cell.neighbors[key]; if (v) out.push(v); }
  if (cell.outward) out.push(...cell.outward);
  return out;
}

// ── Grids ───────────────────────────────────────────────────────────────────
function squareGrid(rows, cols) {
  const cells = [];
  const at = (r, c) => (r < 0 || c < 0 || r >= rows || c >= cols) ? null : cells[r * cols + c];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(Object.assign(makeCell(r * cols + c), { r, c }));
  for (const cell of cells) {
    const { r, c } = cell;
    cell.neighbors.north = at(r - 1, c);
    cell.neighbors.south = at(r + 1, c);
    cell.neighbors.west = at(r, c - 1);
    cell.neighbors.east = at(r, c + 1);
  }
  return { type: 'square', rows, cols, cells, at };
}

function polarGrid(rings) {
  const rows = [[Object.assign(makeCell('0:0'), { ring: 0, idx: 0 })]];
  let prevCount = 1;
  for (let r = 1; r < rings; r++) {
    const estCellWidth = (2 * Math.PI * r) / prevCount;
    const ratio = Math.max(1, Math.round(estCellWidth));
    const count = prevCount * ratio;
    rows[r] = [];
    for (let i = 0; i < count; i++) rows[r].push(Object.assign(makeCell(`${r}:${i}`), { ring: r, idx: i }));
    prevCount = count;
  }
  for (let r = 0; r < rings; r++) {
    const row = rows[r];
    const count = row.length;
    for (let i = 0; i < count; i++) {
      const cell = row[i];
      if (count > 1) {
        cell.neighbors.cw = row[(i + 1) % count];
        cell.neighbors.ccw = row[(i - 1 + count) % count];
      }
      if (r > 0) {
        const ratio = count / rows[r - 1].length;
        const parent = rows[r - 1][Math.floor(i / ratio)];
        cell.neighbors.inward = parent;
        (parent.outward || (parent.outward = [])).push(cell);
      }
    }
  }
  return { type: 'polar', rings, rows, cells: rows.flat() };
}

function hexGrid(rows, cols) {
  const cells = [];
  const at = (r, c) => (r < 0 || c < 0 || r >= rows || c >= cols) ? null : cells[r * cols + c];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(Object.assign(makeCell(r * cols + c), { r, c }));
  for (const cell of cells) {
    const { r, c } = cell;
    const northDiag = (c % 2 === 0) ? r - 1 : r;
    const southDiag = (c % 2 === 0) ? r : r + 1;
    cell.neighbors.northwest = at(northDiag, c - 1);
    cell.neighbors.north = at(r - 1, c);
    cell.neighbors.northeast = at(northDiag, c + 1);
    cell.neighbors.southwest = at(southDiag, c - 1);
    cell.neighbors.south = at(r + 1, c);
    cell.neighbors.southeast = at(southDiag, c + 1);
  }
  return { type: 'hex', rows, cols, cells, at };
}

function triGrid(rows, cols) {
  const cells = [];
  const at = (r, c) => (r < 0 || c < 0 || r >= rows || c >= cols) ? null : cells[r * cols + c];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(Object.assign(makeCell(r * cols + c), { r, c }));
  for (const cell of cells) {
    const { r, c } = cell;
    cell.upright = ((r + c) % 2 === 0);
    cell.neighbors.west = at(r, c - 1);
    cell.neighbors.east = at(r, c + 1);
    if (cell.upright) cell.neighbors.south = at(r + 1, c);
    else cell.neighbors.north = at(r - 1, c);
  }
  return { type: 'tri', rows, cols, cells, at };
}

// ── Generation algorithms ─────────────────────────────────────────────────────
function recursiveBacktracker(grid, rng) {
  const start = grid.cells[Math.floor(rng() * grid.cells.length)];
  const stack = [start];
  const visited = new Set([start.id]);
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const unvisited = neighborCells(cur).filter(n => !visited.has(n.id));
    if (!unvisited.length) { stack.pop(); continue; }
    const next = unvisited[Math.floor(rng() * unvisited.length)];
    link(cur, next);
    visited.add(next.id);
    stack.push(next);
  }
}

function primMaze(grid, rng) {
  const start = grid.cells[Math.floor(rng() * grid.cells.length)];
  const inMaze = new Set([start.id]);
  const frontier = [];
  const addEdges = c => { for (const n of neighborCells(c)) if (!inMaze.has(n.id)) frontier.push([c, n]); };
  addEdges(start);
  while (frontier.length) {
    const [a, b] = frontier.splice(Math.floor(rng() * frontier.length), 1)[0];
    if (inMaze.has(b.id)) continue;
    link(a, b);
    inMaze.add(b.id);
    addEdges(b);
  }
}

function binaryTree(grid, rng) {
  for (const cell of grid.cells) {
    const opts = [];
    if (cell.neighbors.north) opts.push(cell.neighbors.north);
    if (cell.neighbors.east) opts.push(cell.neighbors.east);
    if (opts.length) link(cell, opts[Math.floor(rng() * opts.length)]);
  }
}

function sidewinder(grid, rng) {
  for (let r = 0; r < grid.rows; r++) {
    let run = [];
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.at(r, c);
      run.push(cell);
      const atEast = c === grid.cols - 1;
      const atNorth = r === 0;
      if (atEast || (!atNorth && rng() < 0.5)) {
        const member = run[Math.floor(rng() * run.length)];
        if (member.neighbors.north) link(member, member.neighbors.north);
        run = [];
      } else {
        link(cell, cell.neighbors.east);
      }
    }
  }
}

function aldousBroder(grid, rng) {
  let cell = grid.cells[Math.floor(rng() * grid.cells.length)];
  let unvisited = grid.cells.length - 1;
  while (unvisited > 0) {
    const ns = neighborCells(cell);
    const next = ns[Math.floor(rng() * ns.length)];
    if (next.links.size === 0) { link(cell, next); unvisited--; }
    cell = next;
  }
}

function wilson(grid, rng) {
  const byId = new Map(grid.cells.map(c => [c.id, c]));
  const unvisited = new Set(byId.keys());
  unvisited.delete(grid.cells[Math.floor(rng() * grid.cells.length)].id);
  while (unvisited.size > 0) {
    const ids = [...unvisited];
    let cell = byId.get(ids[Math.floor(rng() * ids.length)]);
    let path = [cell];
    while (unvisited.has(cell.id)) {
      const ns = neighborCells(cell);
      cell = ns[Math.floor(rng() * ns.length)];
      const pos = path.findIndex(c => c.id === cell.id);
      if (pos >= 0) path = path.slice(0, pos + 1);
      else path.push(cell);
    }
    for (let i = 0; i < path.length - 1; i++) { link(path[i], path[i + 1]); unvisited.delete(path[i].id); }
  }
}

const ALL_SHAPES = ['rectangular', 'circular', 'hexagonal', 'triangular'];
const ALGORITHMS = {
  backtracker: { fn: recursiveBacktracker, shapes: ALL_SHAPES },
  prim: { fn: primMaze, shapes: ALL_SHAPES },
  aldous: { fn: aldousBroder, shapes: ALL_SHAPES },
  wilson: { fn: wilson, shapes: ALL_SHAPES },
  binary: { fn: binaryTree, shapes: ['rectangular'] },
  sidewinder: { fn: sidewinder, shapes: ['rectangular'] }
};

// ── Wall extraction (all in raw grid coords; centered later) ──────────────────
function squareWalls(grid, cs) {
  const { rows, cols, at } = grid;
  const runs = [];
  for (let y = 0; y <= rows; y++) {
    let run = null;
    for (let c = 0; c < cols; c++) {
      const isWall = !linked(at(y - 1, c), at(y, c));
      if (isWall) { if (!run) run = { x1: c }; run.x2 = c + 1; }
      else if (run) { runs.push([{ x: run.x1 * cs, y: y * cs }, { x: run.x2 * cs, y: y * cs }]); run = null; }
    }
    if (run) runs.push([{ x: run.x1 * cs, y: y * cs }, { x: run.x2 * cs, y: y * cs }]);
  }
  for (let x = 0; x <= cols; x++) {
    let run = null;
    for (let r = 0; r < rows; r++) {
      const isWall = !linked(at(r, x - 1), at(r, x));
      if (isWall) { if (!run) run = { y1: r }; run.y2 = r + 1; }
      else if (run) { runs.push([{ x: x * cs, y: run.y1 * cs }, { x: x * cs, y: run.y2 * cs }]); run = null; }
    }
    if (run) runs.push([{ x: x * cs, y: run.y1 * cs }, { x: x * cs, y: run.y2 * cs }]);
  }
  return runs;
}

function polarPoint(radius, angle) { return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }; }
function arcPoints(radius, a0, a1) {
  const segs = Math.max(2, Math.ceil(Math.abs(a1 - a0) * radius / 10));
  const pts = [];
  for (let s = 0; s <= segs; s++) pts.push(polarPoint(radius, a0 + (a1 - a0) * s / segs));
  return pts;
}
function polarWalls(grid, ringH) {
  const runs = [];
  for (let r = 0; r < grid.rings; r++) {
    const row = grid.rows[r];
    const count = row.length;
    const innerR = r * ringH;
    const outerR = (r + 1) * ringH;
    for (let i = 0; i < count; i++) {
      const cell = row[i];
      const a0 = (i / count) * 2 * Math.PI;
      const a1 = ((i + 1) / count) * 2 * Math.PI;
      if (r > 0 && !linked(cell, cell.neighbors.inward)) runs.push(arcPoints(innerR, a0, a1));
      if (count > 1 && !linked(cell, cell.neighbors.cw)) runs.push([polarPoint(innerR, a1), polarPoint(outerR, a1)]);
    }
  }
  runs.push(arcPoints(grid.rings * ringH, 0, 2 * Math.PI));
  return runs;
}

function hexGeom(cell, cs) {
  const a = cs / 2;
  const b = cs * SQRT3 / 2;
  const height = b * 2;
  const cx = cs + cell.c * 1.5 * cs;
  let cy = b + cell.r * height;
  if (cell.c % 2 === 1) cy += b;
  return {
    cx, cy,
    W: { x: cx - cs, y: cy }, NW: { x: cx - a, y: cy - b }, NE: { x: cx + a, y: cy - b },
    E: { x: cx + cs, y: cy }, SE: { x: cx + a, y: cy + b }, SW: { x: cx - a, y: cy + b }
  };
}
function hexWalls(grid, cs) {
  const runs = [];
  for (const cell of grid.cells) {
    const g = hexGeom(cell, cs);
    const nb = cell.neighbors;
    if (!linked(cell, nb.northwest)) runs.push([g.W, g.NW]);
    if (!linked(cell, nb.north)) runs.push([g.NW, g.NE]);
    if (!linked(cell, nb.northeast)) runs.push([g.NE, g.E]);
    if (!nb.southeast) runs.push([g.E, g.SE]);
    if (!nb.south) runs.push([g.SE, g.SW]);
    if (!nb.southwest) runs.push([g.SW, g.W]);
  }
  return runs;
}

function triGeom(cell, cs) {
  const halfW = cs / 2;
  const height = cs * SQRT3 / 2;
  const halfH = height / 2;
  const cx = halfW + cell.c * halfW;
  const cy = halfH + cell.r * height;
  const apexY = cell.upright ? cy - halfH : cy + halfH;
  const baseY = cell.upright ? cy + halfH : cy - halfH;
  return { cx, cy, west: { x: cx - halfW, y: baseY }, mid: { x: cx, y: apexY }, east: { x: cx + halfW, y: baseY } };
}
function triWalls(grid, cs) {
  const runs = [];
  for (const cell of grid.cells) {
    const g = triGeom(cell, cs);
    const nb = cell.neighbors;
    if (!linked(cell, nb.west)) runs.push([g.west, g.mid]);
    if (!nb.east) runs.push([g.east, g.mid]);
    if (cell.upright) { if (!linked(cell, nb.south)) runs.push([g.west, g.east]); }
    else if (!nb.north) runs.push([g.west, g.east]);
  }
  return runs;
}

// ── Solving (for the optional Ariadne thread) ────────────────────────────────
function bfsPath(start, goal) {
  const prev = new Map();
  const seen = new Set([start.id]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === goal) break;
    for (const n of neighborCells(cur)) if (linked(cur, n) && !seen.has(n.id)) { seen.add(n.id); prev.set(n.id, cur); queue.push(n); }
  }
  const path = [];
  let cur = goal;
  while (cur) { path.unshift(cur); cur = prev.get(cur.id); }
  return path[0] === start ? path : [];
}

// Join wall segments that share an endpoint AND continue in nearly the same
// direction, so collinear runs (and smooth arcs) merge into one stroke while
// corners stay sharp and separate — text reads straight along each wall.
function chainSegments(runs) {
  const key = p => `${Math.round(p.x)},${Math.round(p.y)}`;
  const segs = runs.filter(r => r.length >= 2).map(pts => ({ pts, used: false }));
  const endpoints = new Map();
  const add = (k, i) => { if (!endpoints.has(k)) endpoints.set(k, []); endpoints.get(k).push(i); };
  segs.forEach((s, i) => { add(key(s.pts[0]), i); add(key(s.pts[s.pts.length - 1]), i); });
  const COS = Math.cos(28 * Math.PI / 180);
  const dir = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, m = Math.hypot(dx, dy) || 1; return { x: dx / m, y: dy / m }; };
  // Unused candidate at endpoint k whose direction leaving k continues `into`.
  const findCollinear = (k, into) => {
    for (const j of (endpoints.get(k) || [])) {
      if (segs[j].used) continue;
      const sp = segs[j].pts;
      const out = key(sp[0]) === k ? dir(sp[0], sp[1]) : dir(sp[sp.length - 1], sp[sp.length - 2]);
      if (into.x * out.x + into.y * out.y >= COS) return j;
    }
    return null;
  };
  const chains = [];
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].used) continue;
    segs[i].used = true;
    let chain = segs[i].pts.slice();
    for (;;) {
      const tail = chain[chain.length - 1];
      const cand = findCollinear(key(tail), dir(chain[chain.length - 2], tail));
      if (cand == null) break;
      const sp = segs[cand].pts; segs[cand].used = true;
      chain = key(sp[0]) === key(tail) ? chain.concat(sp.slice(1)) : chain.concat(sp.slice(0, -1).reverse());
    }
    for (;;) {
      const head = chain[0];
      const cand = findCollinear(key(head), dir(chain[1], head));
      if (cand == null) break;
      const sp = segs[cand].pts; segs[cand].used = true;
      chain = key(sp[sp.length - 1]) === key(head) ? sp.slice(0, -1).concat(chain) : sp.slice(1).reverse().concat(chain);
    }
    chains.push(chain);
  }
  return chains;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function polylineLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return total;
}
function sliceRepeat(src, start, count) {
  const unit = (src.trim() || 'lorem ipsum') + ' ';
  let s = '';
  for (let i = 0; i < count; i++) s += unit[(start + i) % unit.length];
  return s.trim();
}

/**
 * Build maze blocks whose walls are drawn as text.
 *
 * @param {Object} opts
 * @param {string} [opts.shape='rectangular']  rectangular | circular | hexagonal | triangular
 * @param {string} [opts.algorithm='backtracker'] backtracker | prim | aldous | wilson | binary | sidewinder
 * @param {number} [opts.cols=8]   Columns (rectangular/hex/triangular).
 * @param {number} [opts.rows=8]   Rows (rectangular/hex/triangular).
 * @param {number} [opts.rings=5]  Rings (circular).
 * @param {number} [opts.cell=40]  Cell size / ring height in px.
 * @param {number} [opts.width=600] Canvas width for centering.
 * @param {string} [opts.text]      Text repeated along the walls.
 * @param {string} [opts.solutionText] Optional guiding thread along the solution.
 * @param {number} [opts.fontPx=20]
 * @param {number} [opts.lineHeight=30]
 * @param {number} [opts.blockGap=0]
 * @param {number} [opts.spacing=1]
 * @param {number} [opts.seed=1]
 * @param {string} [opts.idPrefix]
 * @param {string} [opts.color]
 * @param {string} [opts.solutionColor]
 * @param {string} [opts.fontFamily]
 * @param {number} [opts.starterCount=2]
 * @returns {Array<Object>} block configs ready to push into config.blocks.
 */
export function buildMazeBlocks(opts = {}) {
  const shape = ALL_SHAPES.includes(opts.shape) ? opts.shape : 'rectangular';
  let algorithm = opts.algorithm && ALGORITHMS[opts.algorithm] ? opts.algorithm : 'backtracker';
  if (!ALGORITHMS[algorithm].shapes.includes(shape)) algorithm = 'backtracker';
  const cell = Math.max(28, Math.round(Number(opts.cell) || 40));
  const width = Math.max(240, Math.round(Number(opts.width) || 600));
  const fontPx = Math.max(8, Number(opts.fontPx) || 20);
  const lineHeight = Math.max(8, Number(opts.lineHeight) || 30);
  const blockGap = Math.max(0, Number(opts.blockGap) || 0);
  const spacing = Math.max(0, Number(opts.spacing ?? 1));
  const seed = Math.round(Number(opts.seed) || 1);
  const idPrefix = opts.idPrefix || `maze-${Date.now().toString(36)}`;
  const color = opts.color || '#cdbb9a';
  const solutionColor = opts.solutionColor || '#e9572b';
  const fontFamily = opts.fontFamily || 'Georgia';
  const starterCount = Math.max(0, Math.round(Number(opts.starterCount ?? 2)));
  const text = String(opts.text || 'lorem ipsum dolor sit amet consectetuer adipiscing elit').trim();
  const solutionText = String(opts.solutionText || '').replace(/\s+/g, ' ').trim();
  const rng = mulberry32(seed);
  const charAdvance = fontPx * 0.42 + spacing;
  const cols = Math.max(2, Math.min(40, Math.round(Number(opts.cols) || 8)));
  const rows = Math.max(2, Math.min(40, Math.round(Number(opts.rows) || 8)));

  let grid, wallRuns, solutionCells;
  if (shape === 'circular') {
    const rings = Math.max(2, Math.min(12, Math.round(Number(opts.rings) || 5)));
    grid = polarGrid(rings);
    ALGORITHMS[algorithm].fn(grid, rng);
    wallRuns = polarWalls(grid, cell);
    if (solutionText) solutionCells = bfsPath(grid.cells[0], grid.rows[rings - 1][0]);
  } else if (shape === 'hexagonal') {
    grid = hexGrid(rows, cols);
    ALGORITHMS[algorithm].fn(grid, rng);
    wallRuns = hexWalls(grid, cell);
    if (solutionText) solutionCells = bfsPath(grid.at(0, 0), grid.at(rows - 1, cols - 1));
  } else if (shape === 'triangular') {
    grid = triGrid(rows, cols);
    ALGORITHMS[algorithm].fn(grid, rng);
    wallRuns = triWalls(grid, cell);
    if (solutionText) solutionCells = bfsPath(grid.at(0, 0), grid.at(rows - 1, cols - 1));
  } else {
    grid = squareGrid(rows, cols);
    ALGORITHMS[algorithm].fn(grid, rng);
    wallRuns = squareWalls(grid, cell);
    if (solutionText) solutionCells = bfsPath(grid.at(0, 0), grid.at(rows - 1, cols - 1));
  }

  wallRuns = chainSegments(wallRuns);

  // Solution path → polyline of cell centers.
  let solutionPts = null;
  if (solutionCells && solutionCells.length >= 2) {
    solutionPts = solutionCells.map(c => {
      if (shape === 'circular') {
        const count = grid.rows[c.ring].length;
        return polarPoint((c.ring + 0.5) * cell, ((c.idx + 0.5) / count) * 2 * Math.PI);
      }
      if (shape === 'hexagonal') { const g = hexGeom(c, cell); return { x: g.cx, y: g.cy }; }
      if (shape === 'triangular') { const g = triGeom(c, cell); return { x: g.cx, y: g.cy }; }
      return { x: (c.c + 0.5) * cell, y: (c.r + 0.5) * cell };
    });
  }

  // Center the maze horizontally and lift it to y = 0.
  const allPts = wallRuns.flat().concat(solutionPts || []);
  if (!allPts.length) return [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of allPts) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
  const ox = Math.max(0, (width - (maxX - minX)) / 2);
  const dx = ox - minX, dy = -minY;
  const tr = p => ({ x: p.x + dx, y: p.y + dy });
  wallRuns = wallRuns.map(run => run.map(tr));
  if (solutionPts) solutionPts = solutionPts.map(tr);
  const mazeHeight = (maxY - minY) + lineHeight;

  const wallsData = [];
  let textPos = 0;
  for (const pts of wallRuns) {
    if (pts.length < 2) continue;
    const len = polylineLength(pts);
    if (len < 6) continue;
    const capacity = Math.max(1, Math.floor(len / charAdvance));
    wallsData.push({ points: pts, text: sliceRepeat(text, textPos, capacity), color, solution: false });
    textPos += capacity;
  }
  // The solution thread (Ariadne) goes first so it owns the active pull handle and
  // reserves the full maze height in the layout flow; the walls follow as structure.
  const runsData = (solutionPts && solutionPts.length >= 2)
    ? [{ points: solutionPts, text: solutionText, color: solutionColor, solution: true }, ...wallsData]
    : wallsData;
  if (!runsData.length) return [];

  let consumed = 0;
  return runsData.map((rd, k) => {
    const anchors = anchorsFromDrawnPoints(rd.points);
    const transformY = -Math.round(consumed);
    consumed += (k === 0 ? mazeHeight : lineHeight) + blockGap;
    return {
      id: `${idPrefix}-${k + 1}${rd.solution ? '-thread' : ''}`,
      text: rd.text || ' ',
      drawPath: { enabled: true, anchors, spacing, angleMix: 1, startOffset: 0 },
      transform: { x: 0, y: transformY, scale: 1, width, height: k === 0 ? Math.round(mazeHeight) : 0 },
      peel: { fromBeginning: true, mode: 'linear', persistState: false },
      peelPoints: [{ line: 0, direction: 'right', starterCount: rd.solution ? starterCount : 0 }],
      style: { color: rd.color, colorMode: 'solid', fontFamily }
    };
  });
}

export const MAZE_ALGORITHMS = ALGORITHMS;
export const MAZE_SHAPES = ALL_SHAPES;
