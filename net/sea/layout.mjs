/*
 * The sea: every sleeve once, on one grid. The name is spelt by the most
 * played albums at full size; everything else is smaller and dimmer around
 * it, so the name stands out of the sea the way a picture stands out of a
 * photo-mosaic. Pure layout, shared by the page and by stills.
 */

export const LETTERS = {
  A: [".##.", "#..#", "#..#", "####", "#..#", "#..#", "#..#"],
  K: ["#..#", "#.#.", "##..", "##..", "#.#.", "#..#", "#..#"],
  I: ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
  B: ["###.", "#..#", "#..#", "###.", "#..#", "#..#", "###."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"]
};

const hash = (i, k = 0) => {
  let h = Math.imul(i + 1, 0x27d4eb2d) ^ Math.imul(k + 7, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

// The word as lit cells, on one line or two.
function word(lines) {
  const rows = [];
  lines.forEach((line, n) => {
    const height = 7;
    const built = Array.from({ length: height }, () => "");
    [...line].forEach((ch, k) => {
      const g = LETTERS[ch];
      for (let r = 0; r < height; r += 1) built[r] += (k ? "." : "") + g[r];
    });
    if (n) rows.push("");
    rows.push(...built);
  });
  const width = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => {
    const pad = Math.floor((width - r.length) / 2);
    return ".".repeat(pad) + r + ".".repeat(width - r.length - pad);
  });
}

// tiles: most played first. Returns the grid and, for each tile, its cell.
export function layoutSea(count, width, height, named) {
  const wide = width / height > 1.05;
  const mark = word(wide ? ["AKIBWA"] : ["AKI", "BWA"]);
  const cols = mark[0].length + 2;
  const rows = Math.max(mark.length + 4, Math.ceil(count / cols));
  const pitch = Math.min(width / cols, (height * 0.94) / rows);
  const x0 = (width - cols * pitch) / 2;
  const y0 = (height - rows * pitch) / 2;
  const top = Math.floor((rows - mark.length) / 2);
  const lit = [];
  const sea = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const on = mark[r - top]?.[c - 1] === "#";
      (on ? lit : sea).push({ c, r });
    }
  }
  // A fixed shuffle, so the same sleeve sits in the same place each visit.
  const shuffle = (list, salt) => list.map((cell, n) => [hash(n, salt), cell]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
  const litOrder = shuffle(lit, 3);
  // Spare cells stay empty at the edges, never beside the name.
  const middle = (cell) => Math.hypot((cell.c + 0.5 - cols / 2) / cols, (cell.r + 0.5 - rows / 2) / rows);
  const seaOrder = shuffle(sea.slice().sort((p, q) => middle(p) - middle(q)).slice(0, Math.max(0, count - Math.min(named, lit.length))), 5);
  const cells = [];
  for (let n = 0; n < count; n += 1) {
    const inName = n < Math.min(named, litOrder.length);
    const cell = inName ? litOrder[n] : seaOrder[n - Math.min(named, litOrder.length)];
    if (!cell) break;
    cells.push({ c: cell.c, r: cell.r, x: x0 + (cell.c + 0.5) * pitch, y: y0 + (cell.r + 0.5) * pitch, name: inName });
  }
  return { cols, rows, pitch, x0, y0, cells, lit: lit.length };
}
