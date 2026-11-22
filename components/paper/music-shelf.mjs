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

export const listened = (minutes, units = "short") => {
  let value = Math.max(1, minutes);
  if (minutes >= 600) value = Math.round(minutes / 60);
  else if (minutes >= 60) value = Number((minutes / 60).toFixed(1));
  const amount = value.toLocaleString("en-GB");
  if (units === "short") return `${amount} ${minutes >= 60 ? "h" : "min"}`;
  const unit = minutes >= 60 ? "hour" : "minute";
  return `${amount} ${unit}${value === 1 ? "" : "s"}`;
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
 * last row keeps its size and stands at the left. A sheet's tracks pass
 * their own floor and cap.
 */
export function rowsFor(entries, width, reference, limits = bounds(width)) {
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
  // Named genre (Dan, 18 November 2026); its file is still music-kinds.json.
  ["kind", "genre"],
  ["name", "a–z"]
];

// The year a list of [year, minutes] pairs peaks in, with its minutes.
export function peakOf(pairs) {
  let best = null;
  for (const [year, minutes] of pairs ?? []) if (minutes > 0 && (!best || minutes > best[1])) best = [year, minutes];
  return best;
}

/*
 * The shelf's records (Dan, 16 and 18 November 2026): every album he played
 * for three hours or more, and the singles, records that are over 90% one
 * song, each with every song he played from it counted there and nowhere
 * else (scripts/build-music-ranking.mjs decides which record each song is
 * on). Each record keeps the top songs on it, which fill its track list
 * until its own has loaded. The most listened come first.
 */
export function mergeShelf(albums, songs, sleeves = [], singles = []) {
  const byId = new Map();
  const records = [];
  const add = (record, kind) => {
    const item = { ...record, key: `${kind}-${record.id}`, kind, art: record.art === undefined ? record.id : record.art, songs: [], fallback: null };
    byId.set(record.id, item);
    records.push(item);
  };
  albums.forEach((record) => add(record, "album"));
  sleeves.forEach((record) => add(record, "sleeve"));
  singles.forEach((record) => add(record, "single"));
  for (const song of songs) {
    const record = song.art ? byId.get(song.art) : null;
    if (record) record.songs.push(song);
  }
  for (const record of records) {
    if (record.songs.length) record.fallback = record.songs.map((song) => ({ title: song.title, plays: song.plays, minutes: song.minutes }));
  }
  return records.sort((a, b) => b.minutes - a.minutes || a.key.localeCompare(b.key));
}

// A record's listening by calendar year: an album's own, or its songs'.
export function yearPairs(record, years) {
  if (!years) return null;
  if (record.kind !== "song" && years.albums?.[record.id]) return years.albums[record.id];
  const by = new Map();
  for (const song of record.songs ?? []) {
    for (const [year, minutes] of years.songs?.[song.rank - 1] ?? []) by.set(year, (by.get(year) ?? 0) + minutes);
  }
  return [...by];
}

const sortTitle = (title) => fold(title).trim().replace(/^the\s+/, "");

const letterOf = (text) => {
  const first = sortTitle(text).charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
};

/*
 * The shelf in an order: groups, each with the heading that order needs (none
 * for hours), the most listened first inside each, except a to z. Entries
 * arrive most listened first, as `{ item, ... }`.
 */
export function arrange(order, entries, { years, kinds, reverse = false } = {}) {
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
    // A to z, or z to a when the order is pressed again (Dan, 18 November 2026).
    const way = reverse ? -1 : 1;
    const sorted = [...entries].sort((a, b) => way * sortTitle(a.item.title).localeCompare(sortTitle(b.item.title), "en"));
    const map = new Map();
    for (const entry of sorted) {
      const letter = letterOf(entry.item.title);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter).push(entry);
    }
    return [...map]
      .sort(([a], [b]) => (a === "#" ? -1 : b === "#" ? 1 : way * a.localeCompare(b)))
      .map(([letter, list]) => ({ key: letter, label: letter, figures: String(list.length), entries: list }));
  }
  if (order === "year" && years) {
    // Every record played for an hour or more in a year, as large as its
    // hours that year, newest year first or, pressed again, oldest (Dan, 18
    // November 2026: "does this mean I ultimately only listened to this many
    // albums this year?"). A record appears in each year it was played.
    const map = new Map();
    for (const entry of entries) {
      for (const [year, minutes] of yearPairs(entry.item, years) ?? []) {
        if (minutes < 60) continue;
        if (!map.has(year)) map.set(year, []);
        map.get(year).push({ ...entry, item: { ...entry.item, key: `${year}:${entry.item.key}`, record: entry.item.key, minutes, inYear: year, allMinutes: entry.item.minutes } });
      }
    }
    return [...map]
      .sort(([a], [b]) => (reverse ? a - b : b - a))
      .map(([year, list]) => {
        list.sort((a, b) => b.item.minutes - a.item.minutes || a.item.key.localeCompare(b.item.key));
        return {
          key: String(year),
          label: String(year),
          figures: `${list.length} records · ${listened(list.reduce((sum, entry) => sum + entry.item.minutes, 0))}`,
          entries: list,
          // Each year's largest record reaches the cap.
          reference: list[Math.min(2, list.length - 1)].item.minutes
        };
      });
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
