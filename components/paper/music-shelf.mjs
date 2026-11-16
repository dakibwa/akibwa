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

export const listened = (minutes) => {
  if (minutes >= 600) return `${Math.round(minutes / 60).toLocaleString("en-GB")} h`;
  if (minutes >= 60) return `${(minutes / 60).toFixed(1).replace(/\.0$/, "")} h`;
  return `${Math.max(1, minutes)} min`;
};

/*
 * How large a square may be at this width: a floor that keeps it big enough
 * to see (about 80 px on a laptop, 56 px on a phone) and a cap that stops it
 * dominating (about 240 px on a laptop; on a phone, two to a row).
 */
export function bounds(width) {
  if (width < 600) return { floor: 56, cap: Math.floor((width - 8) / 2) };
  return { floor: Math.max(64, Math.round(width * 0.061)), cap: Math.round(width * 0.183) };
}

// A square's side grows with the square root of its hours, so its area
// follows them. The third most listened reaches the cap, so the two ambient
// records (or the two most played songs) share it rather than set the scale.
export const sideFor = (minutes, reference, { floor, cap }) => Math.round(Math.max(floor, Math.min(cap, cap * Math.sqrt(minutes / reference))));

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
