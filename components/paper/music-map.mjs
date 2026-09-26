/*
 * The Music room's map: square sleeves laid edge to edge with no holes, each
 * as large as its hours earn, the most listened first from the top left (Dan,
 * 25 September 2026: the covers keep their shape).
 *
 * Squares of any sizes cannot tile a rectangle exactly, so the sleeves are
 * whole cells of a grid as wide as the map, a side following the square root
 * of the hours, and the grid is filled cell by cell with a tally that makes it
 * come out exact (fillGrid). The grid's column count and scale are searched
 * for the fill closest to the hours.
 */

// The gutter between sleeves, in CSS pixels. The map's outer edges are flush.
export const GAP = 4;

/*
 * Two ambient records ran for days on end: at their true hours Music for
 * Psychedelic Therapy and Discreet Music would take a third of the map. Dan
 * asked on 25 September 2026 to draw them near Graceland's size instead, Music
 * for Psychedelic Therapy a touch larger and Discreet Music a little smaller.
 * Graceland is the most listened album besides them, so in a single year or a
 * search they are drawn near whichever album that is, and never above their
 * own hours. Their corners still show their real hours.
 */
const NEAR_GRACELAND = [
  { title: "music for psychedelic therapy", artist: "jon hopkins", scale: 1.1, step: 1 },
  { title: "discreet music", artist: "brian eno", scale: 0.9, step: -1 }
];

const plain = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const ruleFor = (album) => NEAR_GRACELAND.find((entry) => entry.title === plain(album.title) && entry.artist === plain(album.artist));

// The most listened album besides the two: Graceland, all time.
const referenceOf = (albums) =>
  albums.reduce((best, album, index) => (!ruleFor(album) && (best < 0 || album.minutes > albums[best].minutes) ? index : best), -1);

// Drawn near the reference rather than at their own hours.
const held = (album, reference) => {
  const rule = ruleFor(album);
  return rule && reference && album.minutes > reference.minutes * rule.scale ? rule : null;
};

// The minutes each album is drawn at: its own, except the two above.
export function albumWeights(albums) {
  const reference = albums[referenceOf(albums)];
  return albums.map((album) => {
    const rule = held(album, reference);
    return rule ? Math.round(reference.minutes * rule.scale) : Math.max(1, album.minutes);
  });
}

// Whole-cell sides that keep the two a cell either side of the reference.
export function albumSides(albums) {
  const reference = referenceOf(albums);
  const steps = albums.map((album) => held(album, albums[reference])?.step ?? 0);
  return (sides) => {
    if (reference < 0) return sides;
    return sides.map((side, index) => (steps[index] ? Math.max(1, sides[reference] + steps[index]) : side));
  };
}

// Largest first; ties keep their rank order.
export function drawnOrder(items, weights) {
  return items
    .map((item, index) => ({ item, weight: weights[index], index }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
}

/*
 * Squares for `sides` (cells) filling a grid `columns` × `height` exactly, or
 * null. Every empty cell, in reading order, takes the first sleeve (largest
 * first) that fits there at its own size, or else the smallest left, shrunk to
 * fit. A tally keeps it exact: a sleeve never takes so much that the rest would
 * lack a cell each, nor so little that the rest could not cover what is left.
 */
export function fillGrid(sides, columns, height) {
  const rows = Array.from({ length: height }, () => new Uint8Array(columns));
  // The largest square that fits with its corner here, up to `cap`.
  const room = (r, c, cap) => {
    let run = 0;
    while (c + run < columns && run < cap && !rows[r][c + run]) run += 1;
    let best = run ? 1 : 0;
    for (let t = 2; t <= run && r + t <= height; t += 1) {
      let ok = true;
      for (let x = c; x < c + t && ok; x += 1) if (rows[r + t - 1][x]) ok = false;
      for (let y = r; y < r + t - 1 && ok; y += 1) if (rows[y][c + t - 1]) ok = false;
      if (!ok) break;
      best = t;
    }
    return best;
  };
  const queue = sides.map((side, index) => ({ side, index })).sort((a, b) => b.side - a.side || a.index - b.index);
  // The queue runs largest first, so the first that fits is found by halving.
  const firstFitting = (m) => {
    let low = 0;
    let high = queue.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (queue[mid].side <= m) high = mid;
      else low = mid + 1;
    }
    return low < queue.length ? low : -1;
  };
  let open = columns * height;
  let reach = queue.reduce((sum, entry) => sum + entry.side * entry.side, 0);
  const cells = new Array(sides.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (rows[y][x]) continue;
      if (!queue.length) return null;
      const m = room(y, x, queue[0].side + 2);
      let at = firstFitting(m);
      if (at === -1) at = queue.length - 1;
      const entry = queue[at];
      const after = queue.length - 1;
      const reachAfter = reach - entry.side * entry.side;
      let size = Math.min(entry.side, m);
      while (size > 1 && open - size * size < after) size -= 1;
      while (size < m && open - size * size > reachAfter && open - (size + 1) * (size + 1) >= after) size += 1;
      for (let r = y; r < y + size; r += 1) rows[r].fill(1, x, x + size);
      open -= size * size;
      reach = reachAfter;
      queue.splice(at, 1);
      cells[entry.index] = { x, y, s: size };
    }
  }
  return queue.length ? null : { cells, height };
}

// A few side by side, the same size, when there are too few to pack.
export function rowOfSquares(count, width, most = 360) {
  const side = Math.floor(Math.min(most, (width - GAP * (count - 1)) / count));
  return { height: side, tiles: Array.from({ length: count }, (_, index) => ({ x: index * (side + GAP), y: 0, w: side, h: side })) };
}

// Whole-pixel tiles with the gutter between neighbours and none at the edges.
function toTiles(cells, width, columns, top = 0) {
  const unit = width / columns;
  const half = GAP / 2;
  const edge = (value) => Math.round(value * unit);
  const height = Math.max(...cells.map((cell) => cell.y + cell.s));
  return cells.map(({ x, y, s }) => {
    const left = edge(x) + (x > 0 ? half : 0);
    const right = edge(x + s) - (x + s < columns ? half : 0);
    const upper = edge(y) + (y > 0 ? half : 0);
    const lower = edge(y + s) - (y + s < height ? half : 0);
    // Squares stay square: the side is the width, rounded the same way down.
    const side = Math.max(1, Math.min(right - left, lower - upper));
    return { x: left, y: top + upper, w: side, h: side };
  });
}

/*
 * The best packing of `values` (largest first) into a grid at most `target`
 * columns wide, in cells: { columns, height, cells }. `cell` is the smallest a
 * sleeve can be, in pixels (it sets `target` in layoutSquares); `aspect` is the
 * height/width to aim for; `reference` is the sleeve whose side sets the
 * scale, searched from the top of `range` (fractions of the width) down in
 * `tries` steps, over the aim and `spread` smaller column counts; `adjust` has
 * a last say over the sides (the two albums near Graceland). The grid is made
 * a little smaller than the sleeves' own area, so a few give way rather than
 * leave a gap. It depends on the width only through `target`, so a map is
 * packed again only when its column count changes.
 */
export function packSquares(values, target, { aspect, reference = 0, range = [0.12, 0.22], tries = 10, spread = 3, adjust = (sides) => sides }) {
  if (!values.length || target <= 0) return null;
  const counts = Array.from({ length: spread + 1 }, (_, away) => target - away);
  const found = [];
  for (let step = 0; step < tries && found.length < 8; step += 1) {
    const fraction = range[1] - ((range[1] - range[0]) * step) / Math.max(1, tries - 1);
    for (const columns of counts) {
      if (columns < 4) continue;
      const scale = (columns * fraction) / Math.sqrt(values[reference]);
      const wanted = adjust(values.map((value) => Math.max(1, Math.min(columns, Math.round(scale * Math.sqrt(value))))));
      const area = wanted.reduce((sum, side) => sum + side * side, 0);
      for (const give of [0.98, 0.96, 0.94, 0.92, 0.9, 0.86, 0.82]) {
        const packed = fillGrid(wanted, columns, Math.max(1, Math.round((area * give) / columns)));
        if (!packed) continue;
        const error = packed.cells.reduce((sum, { s }, index) => sum + Math.abs(Math.log(s / wanted[index])), 0) / values.length;
        const shape = Math.abs(Math.log(packed.height / columns / aspect));
        found.push({ score: error * 4 + shape - fraction, columns, packed });
        break;
      }
    }
  }
  if (!found.length) return null;
  const best = found.reduce((a, b) => (b.score < a.score ? b : a));
  return { columns: best.columns, height: best.packed.height, cells: best.packed.cells };
}

// Never more columns than fit whole cells, so no cell is smaller than `cell`.
export const targetColumns = (width, cell) => Math.max(4, Math.floor(width / cell));

// The packing in whole pixels at `width`.
export function layoutSquares(values, width, plan) {
  if (!values.length || width <= 0) return { height: 0, tiles: [] };
  const grid = packSquares(values, targetColumns(width, plan.cell), plan);
  return grid ? tilesFor(grid, width) : { height: 0, tiles: [] };
}

// A packing in whole pixels at `width`.
export function tilesFor(grid, width) {
  const unit = width / grid.columns;
  return { height: Math.round(grid.height * unit), tiles: toTiles(grid.cells, width, grid.columns) };
}
