// How the shelf's rows are sized. This file runs twice: the shelf imports it,
// and the page carries its text inline (app/page.jsx) to lay the covers out
// as soon as the HTML arrives, before the shelf's own code has loaded. Keep
// it free of imports, and in plain syntax, so both always agree.

// The one gap between squares, across and down.
export const GAP = 4;

/*
 * How large a square may be at this width: a floor that keeps it big enough
 * to see (about 60 px on a laptop, 44 px on a phone) and a cap that stops it
 * dominating (about 200 px on a laptop; on a phone, four to a row). Dan, 16
 * November 2026: tighter, “so you can fit more”, and more than three on a
 * phone's top row.
 */
export function bounds(width) {
  if (width < 600) return { floor: 44, cap: Math.floor((width - 3 * GAP) / 4) };
  return { floor: Math.max(56, Math.round(width * 0.045)), cap: Math.round(width * 0.15) };
}

/*
 * The shelf in rows (Dan, 16 November 2026: “the spacing is weird”). Every
 * square in a row shares one size, so the gaps are the same across and down,
 * and each full row fills the width exactly. A row's size comes from the
 * hours of the albums in it: as many are taken as make the row's size
 * closest to their own average size, between the floor and the cap. The
 * last row keeps its size and stands at the left.
 *
 * `shares` holds, for each record in order, the square root of its hours
 * over the reference record's: 1 reaches the cap. Returns `[count, side]`
 * for each row.
 */
export function packRows(shares, width, limits) {
  limits = limits || bounds(width);
  var fit = function (count) { return (width - (count - 1) * GAP) / count; };
  var sideOf = function (share) { return Math.round(Math.max(limits.floor, Math.min(limits.cap, limits.cap * share))); };
  var most = Math.max(1, Math.floor((width + GAP) / (limits.floor + GAP)));
  var least = Math.min(most, Math.max(1, Math.ceil((width + GAP) / (limits.cap + GAP))));
  var rows = [];
  var at = 0;
  while (at < shares.length) {
    var best = least;
    var bestMiss = Infinity;
    var sum = 0;
    for (var count = 1; count <= most; count += 1) {
      sum += at + count - 1 < shares.length ? sideOf(shares[at + count - 1]) : limits.floor;
      if (count < least) continue;
      var miss = Math.abs(fit(count) - sum / count);
      if (miss < bestMiss) {
        best = count;
        bestMiss = miss;
      }
    }
    var taken = Math.min(best, shares.length - at);
    rows.push([taken, Math.floor(fit(best) * 100) / 100]);
    at += taken;
  }
  return rows;
}
