/*
 * The Music room's map: sleeves laid edge to edge with no holes, each given
 * the area its hours earn, the most listened first from the top left. It is a
 * squarified treemap (Bruls, Huizing and van Wijk, 2000): sleeves fill a strip
 * along the shorter side of the space that is left for as long as adding one
 * keeps the strip's worst aspect ratio from getting worse, so each is as near
 * square as the areas allow and its cover loses little to the crop.
 */

// The gutter between sleeves, in CSS pixels. The map's outer edges are flush.
export const GAP = 4;

/*
 * Two ambient records ran for days on end: at their true hours Music for
 * Psychedelic Therapy and Discreet Music would take a third of the map. Dan
 * asked on 25 September 2026 to draw them near Graceland's size instead, Music
 * for Psychedelic Therapy a touch larger and Discreet Music a little smaller.
 * Their corners still show their real hours.
 */
const NEAR_GRACELAND = [
  { title: "music for psychedelic therapy", artist: "jon hopkins", scale: 1.1 },
  { title: "discreet music", artist: "brian eno", scale: 0.9 }
];

const plain = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// The minutes each album is drawn at: its own, except the two above.
export function albumWeights(albums) {
  const graceland = albums.find((album) => plain(album.title) === "graceland" && plain(album.artist) === "paul simon");
  return albums.map((album) => {
    const rule = NEAR_GRACELAND.find((entry) => entry.title === plain(album.title) && entry.artist === plain(album.artist));
    return rule && graceland ? Math.round(graceland.minutes * rule.scale) : Math.max(1, album.minutes);
  });
}

// Largest first; ties keep their rank order.
export function drawnOrder(items, weights) {
  return items
    .map((item, index) => ({ item, weight: weights[index], index }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
}

/*
 * Rectangles for `values` (largest first) filling a width × height box, as
 * {x0, y0, x1, y1} in the box's units, in the order given. The last sleeve of
 * each strip ends exactly on the strip's edge and the last strip on the box's,
 * so neighbours share their edges exactly.
 */
export function squarify(values, width, height) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const areas = values.map((value) => (value * width * height) / total);
  const rects = new Array(values.length);
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let i = 0;
  while (i < areas.length) {
    const side = Math.min(w, h);
    let j = i;
    let sum = 0;
    let smallest = Infinity;
    let largest = 0;
    let worst = Infinity;
    while (j < areas.length) {
      const next = sum + areas[j];
      const low = Math.min(smallest, areas[j]);
      const high = Math.max(largest, areas[j]);
      const ratio = Math.max((side * side * high) / (next * next), (next * next) / (side * side * low));
      if (j > i && ratio > worst) break;
      sum = next;
      smallest = low;
      largest = high;
      worst = ratio;
      j += 1;
    }
    const last = j === areas.length;
    const across = w >= h; // a column down the left, or a row along the top
    const thick = last ? (across ? w : h) : sum / side;
    let along = 0;
    for (let k = i; k < j; k += 1) {
      const start = along;
      along = k === j - 1 ? side : along + areas[k] / thick;
      rects[k] = across
        ? { x0: x, y0: y + start, x1: x + thick, y1: y + along }
        : { x0: x + start, y0: y, x1: x + along, y1: y + thick };
    }
    if (across) {
      x += thick;
      w -= thick;
    } else {
      y += thick;
      h -= thick;
    }
    i = j;
  }
  return rects;
}

// Whole-pixel tiles with the gutter between neighbours and none at the edges.
function tiles(rects, width, height, top = 0) {
  const half = GAP / 2;
  return rects.map(({ x0, y0, x1, y1 }) => {
    const left = Math.round(x0);
    const right = Math.round(x1);
    const upper = Math.round(y0);
    const lower = Math.round(y1);
    const l = left + (left > 0 ? half : 0);
    const r = right - (right < Math.round(width) ? half : 0);
    const t = upper + (upper > 0 ? half : 0);
    const b = lower - (lower < Math.round(height) ? half : 0);
    return { x: l, y: top + t, w: Math.max(1, r - l), h: Math.max(1, b - t) };
  });
}

// How far a rectangle is from square: 0 for a square, ln 2 for 2 : 1.
const skew = ({ x0, y0, x1, y1 }) => Math.abs(Math.log((x1 - x0) / (y1 - y0)));
const sum = (values) => values.reduce((total, value) => total + value, 0);

/*
 * One map for `values` (largest first) across `width`. Its height is chosen
 * from a range around the one that gives the smallest sleeve `least` pixels of
 * side: the squarest layout wins, by area and by count, as long as no sleeve's
 * short side falls much under `least`.
 */
export function layoutMap(values, width, least) {
  if (!values.length || width <= 0) return { height: 0, tiles: [] };
  const total = sum(values);
  const floor = Math.max(width * 0.4, (least * least * total) / (Math.min(...values) * width));
  let best = null;
  for (let step = 0; step <= 30; step += 1) {
    const height = Math.round(floor * (0.85 + step * 0.025));
    const rects = squarify(values, width, height);
    const short = Math.min(...rects.map(({ x0, y0, x1, y1 }) => Math.min(x1 - x0, y1 - y0)));
    const weighted = rects.reduce((score, rect, index) => score + skew(rect) * values[index], 0) / total;
    const plain = rects.reduce((score, rect) => score + skew(rect), 0) / rects.length;
    const score = 0.6 * weighted + 0.4 * plain + (short < least * 0.8 ? 10 : 0);
    if (!best || score < best.score - 1e-6) best = { height, rects, score };
  }
  return { height: best.height, tiles: tiles(best.rects, width, best.height) };
}

/*
 * Songs come a hundred at a time, and a new hundred must not move the ones
 * already drawn: each is its own band under the last, the full width. The
 * first band sets the scale. A later band keeps it unless its smallest sleeve
 * would fall under `least`, and then grows just enough — so the thousandth
 * song is still a sleeve, not a speck, and sizes run on smoothly from one
 * band into the next.
 */
export function layoutBands(values, width, least, per) {
  if (!values.length || width <= 0) return { height: 0, tiles: [] };
  const first = values.slice(0, per);
  const opening = layoutMap(first, width, least);
  const perMinute = (width * opening.height) / sum(first);
  const placed = [...opening.tiles];
  let top = opening.height;
  for (let start = per; start < values.length; start += per) {
    const band = values.slice(start, start + per);
    const scale = Math.max(perMinute, (least * least) / Math.min(...band));
    const height = Math.max(least, Math.round((scale * sum(band)) / width));
    // Each band starts a gutter below the last one's bottom row.
    placed.push(...tiles(squarify(band, width, height), width, height, top + GAP));
    top += GAP + height;
  }
  return { height: top, tiles: placed };
}
