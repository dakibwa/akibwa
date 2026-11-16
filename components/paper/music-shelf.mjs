import { fold } from "./music-ranking.mjs";

/*
 * The music shelf's sizes and orders (Dan, 16 November 2026), kept apart from
 * the room so the build checks can run them on the real albums.
 */

// A song's name as set on its square: without a reissue note or its guests.
export const songTitle = (title) =>
  title
    .replace(/\s+-\s+(\d{4}\s+)?(digital\s+)?remaster(ed)?.*$/i, "")
    .replace(/\s*[([]feat\.[^)\]]*[)\]]/i, "")
    .trim();

// The one gap between squares, across and down.
export const GAP = 4;

export const listened = (minutes) => {
  if (minutes >= 600) return `${Math.round(minutes / 60).toLocaleString("en-GB")} h`;
  if (minutes >= 60) return `${(minutes / 60).toFixed(1).replace(/\.0$/, "")} h`;
  return `${Math.max(1, minutes)} min`;
};

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

// A square's side grows with the square root of its hours, so its area
// follows them. The third most listened reaches the cap, so the two ambient
// records (or the two most played songs) share it rather than set the scale.
export const sideFor = (minutes, reference, { floor, cap }) => Math.round(Math.max(floor, Math.min(cap, cap * Math.sqrt(minutes / reference))));


/*
 * The shelf in rows (Dan, 16 November 2026: “the spacing is weird”). Every
 * square in a row shares one size, so the gaps are the same across and down,
 * and each full row fills the width exactly. A row's size comes from the
 * hours of the albums in it: as many are taken as make the row's size
 * closest to their own average size, between the floor and the cap. The
 * last row keeps its size and stands at the left.
 */
export function rowsFor(entries, width, reference) {
  const limits = bounds(width);
  const fit = (count) => (width - (count - 1) * GAP) / count;
  const most = Math.max(1, Math.floor((width + GAP) / (limits.floor + GAP)));
  const least = Math.min(most, Math.max(1, Math.ceil((width + GAP) / (limits.cap + GAP))));
  const rows = [];
  let at = 0;
  while (at < entries.length) {
    let best = least;
    let bestMiss = Infinity;
    let sum = 0;
    for (let count = 1; count <= most; count += 1) {
      const entry = entries[at + count - 1];
      sum += entry ? sideFor(entry.item.minutes, reference, limits) : limits.floor;
      if (count < least) continue;
      const miss = Math.abs(fit(count) - sum / count);
      if (miss < bestMiss) {
        best = count;
        bestMiss = miss;
      }
    }
    rows.push({ side: Math.floor(fit(best) * 100) / 100, entries: entries.slice(at, at + best) });
    at += best;
  }
  return rows;
}

export const ORDERS = [
  ["hours", "hours"],
  ["year", "year"],
  ["kind", "kind"],
  ["name", "a–z"]
];

// The year a list of [year, minutes] pairs peaks in, with its minutes.
export function peakOf(pairs) {
  let best = null;
  for (const [year, minutes] of pairs ?? []) if (minutes > 0 && (!best || minutes > best[1])) best = [year, minutes];
  return best;
}

const nameOf = (kind, item) => (kind === "songs" ? songTitle(item.title) : item.title);
const letterOf = (text) => {
  const first = fold(text).trim().replace(/^the\s+/, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
};

/*
 * The shelf in an order: groups, each with the heading that order needs (none
 * for hours), the most listened first inside each, except a to z. Entries
 * arrive most listened first, as `{ item, ... }`.
 */
export function arrange(order, kind, entries, { years, kinds } = {}) {
  const word = kind === "songs" ? ["song", "songs"] : ["album", "albums"];
  const count = (n) => `${n.toLocaleString("en-GB")} ${n === 1 ? word[0] : word[1]}`;
  const total = entries.reduce((sum, entry) => sum + entry.item.minutes, 0) || 1;
  const grouped = (keyOf) => {
    const map = new Map();
    for (const entry of entries) {
      const key = keyOf(entry);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    }
    return map;
  };
  if (order === "name") {
    const sorted = [...entries].sort((a, b) => fold(nameOf(kind, a.item)).localeCompare(fold(nameOf(kind, b.item)), "en"));
    const map = new Map();
    for (const entry of sorted) {
      const letter = letterOf(nameOf(kind, entry.item));
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter).push(entry);
    }
    return [...map]
      .sort(([a], [b]) => (a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)))
      .map(([letter, list]) => ({ key: letter, label: letter, figures: count(list.length), entries: list }));
  }
  if (order === "year" && years) {
    const peaks = new Map(entries.map((entry) => [entry, peakOf(kind === "albums" ? years.albums?.[entry.item.id] : years.songs?.[entry.item.rank - 1])]));
    const map = grouped((entry) => peaks.get(entry)?.[0] ?? "undated");
    return [...map]
      .sort(([a], [b]) => (a === "undated" ? 1 : b === "undated" ? -1 : b - a))
      .map(([year, list]) => ({
        key: String(year),
        label: String(year),
        figures: `${count(list.length)} · ${listened(list.reduce((sum, entry) => sum + (peaks.get(entry)?.[1] ?? 0), 0))} that year`,
        entries: list
      }));
  }
  if (order === "kind" && kinds) {
    const kindOf = (entry) => kinds.kinds?.[kinds.artists?.[entry.item.artist]] ?? "other";
    const map = grouped(kindOf);
    return [...map]
      .map(([name, list]) => ({ name, list, minutes: list.reduce((sum, entry) => sum + entry.item.minutes, 0) }))
      .sort((a, b) => b.minutes - a.minutes)
      .map(({ name, list, minutes }) => ({ key: name, label: name, figures: `${Math.round((minutes / total) * 100)}% · ${listened(minutes)}`, entries: list }));
  }
  return [{ key: "all", label: null, figures: null, entries }];
}
