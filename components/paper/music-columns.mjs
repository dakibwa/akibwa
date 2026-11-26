/*
 * How a record's songs are set in columns across its sheet (Dan, 26 November
 * 2026: "can it not dynamically fill the bar so it utilises space the best"),
 * kept apart from the room so it can be run on its own. A song is given as
 * the width its line would like: its name, the gap and its time.
 *
 * The songs always run the sheet's full width; the question is how many
 * columns, and how wide each one is.
 * - The columns are the same width unless a name needs more. Then that
 *   name's column takes what it needs and the others share the rest evenly
 *   ("are you telling me we can't squash that into another column? it feels
 *   like we can", "without sacrificing anything?", of a record held to four
 *   columns by one long name, with room to spare in the other three). The
 *   widest column is at most LINE_SPREAD times the narrowest, so the sheet
 *   still reads as even columns.
 * - A name that still does not fit fades and rolls, as long names do
 *   everywhere ("we have it going across like this if it doesn't fit"), the
 *   longest first. So a long name does not keep a record to one column. One
 *   column for Weezer beside two for Spiritualized, because Weezer's names
 *   are longer, was turned down ("the two is preferable no?").
 * - Each way of setting them costs its rows and its faded names, a row for
 *   a name; the cheapest is taken, and of two as cheap the wider columns.
 *   So three columns with every name whole beat five with one faded, and
 *   two columns beat one long one.
 * - Columns that come to LINE_MEASURE or more each may fade up to a third of
 *   the names. Narrower ones, as two on a phone are, must hold every name:
 *   a phone has two columns only for a record whose names fit them.
 * - A record on one row has every name in full.
 * A name too long for the whole sheet fades wherever it stands, so it has no
 * say. A column is never narrower than LINE_COLUMN, and where the columns
 * are wide a name counts as whole only with LINE_SLACK to spare.
 */
export const LINE_COLUMN = 132;
export const LINE_MEASURE = 200;
export const LINE_SLACK = 8;
export const LINE_SPREAD = 1.5;

// How many songs each column holds: shared evenly, the longer columns first.
export function shareSongs(count, columns) {
  const sizes = [];
  for (let start = 0; start < count;) {
    const size = Math.ceil((count - start) / (columns - sizes.length));
    sizes.push(size);
    start += size;
  }
  return sizes;
}

// Every column as wide as it needs, and the room left over shared evenly
// among the rest.
function spread(needs, room) {
  const widths = needs.slice();
  let open = needs.map((_, index) => index);
  let left = room;
  while (open.length) {
    const each = left / open.length;
    const held = open.filter((index) => needs[index] > each);
    if (!held.length) {
      for (const index of open) widths[index] = each;
      break;
    }
    for (const index of held) left -= needs[index];
    open = open.filter((index) => needs[index] <= each);
  }
  return widths;
}

/*
 * Set these columns of songs in a sheet with this much room and this gap
 * between columns. Says how many names fade and, where the columns are not
 * to be even, the least width each needs (`needs`; the sheet shares the rest
 * of its room among them itself) and how wide each then stands (`widths`).
 */
export function setColumns(columns, room, gap) {
  const free = room - (columns.length - 1) * gap;
  const even = free / columns.length;
  const slack = even >= LINE_MEASURE ? LINE_SLACK : 0;
  const lines = columns.map((column) => column.filter((line) => line + LINE_SLACK <= room).map((line) => line + slack));
  const all = lines.flat();
  // Let every name stand; failing that all but the longest, and so on down
  // to even columns, which always fit.
  for (const limit of [...new Set(all.filter((line) => line > even))].sort((a, b) => b - a)) {
    const needs = lines.map((column) => Math.max(0, ...column.filter((line) => line <= limit)));
    if (needs.reduce((sum, need) => sum + need, 0) > free) continue;
    const widths = spread(needs, free);
    const narrowest = Math.min(...widths);
    if (narrowest < LINE_COLUMN || Math.max(...widths) > narrowest * LINE_SPREAD) continue;
    return { needs, widths, faded: all.filter((line) => line > limit).length };
  }
  return { needs: null, widths: null, faded: all.filter((line) => line > even).length };
}

// A record's songs in so many columns, as the sheet shares them.
export function inColumns(lines, columns) {
  let start = 0;
  return shareSongs(lines.length, columns).map((size) => lines.slice(start, start += size));
}

// How many columns a record's songs stand in.
export function countColumns(lines, room, gap) {
  const count = lines.length;
  const most = Math.min(count, Math.floor((room + gap) / (LINE_COLUMN + gap)));
  let best = 1;
  let lowest = Infinity;
  for (let columns = 1; columns <= most; columns++) {
    const wide = (room - (columns - 1) * gap) / columns >= LINE_MEASURE;
    const { faded } = setColumns(inColumns(lines, columns), room, gap);
    if (columns > 1 && (faded > (wide ? Math.floor(count / 3) : 0) || (columns === count && faded))) continue;
    const cost = Math.ceil(count / columns) + faded;
    if (cost < lowest) {
      lowest = cost;
      best = columns;
    }
  }
  return best;
}
