import { GAP, bounds, packRows } from "./shelf-rows.mjs";

export { GAP, bounds };

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

// Display labels only. Matching, search and listening totals use the source names.
export function songLabel(title) {
  const short = songTitle(title)
    .replace(/\s*[([](?:with\s+(?!anyone else but me\b)|(?:feat(?:uring)?|ft)\.?\s+|variations?\s+on\s+)[^()[\]]+[)\]]/gi, "")
    .replace(/\s*[([](?:\d{4}\s+)?(?:digital\s+)?remaster(?:ed)?\b[^()[\]]*[)\]]/gi, "")
    .replace(/\s*[/;]\s*(?:\d{4}\s+)?(?:digital\s+)?remaster(?:ed)?\b.*$/i, "")
    .replace(/\s+(?:[-–—]\s+)?(?:feat\.|ft\.|featuring)\s+.+$/i, "")
    .trim();
  return short || title;
}

export const listened = (minutes, units = "short") => {
  let value = Math.max(1, minutes);
  if (minutes >= 600) value = Math.round(minutes / 60);
  else if (minutes >= 60) value = Number((minutes / 60).toFixed(1));
  const amount = value.toLocaleString("en-GB");
  if (units === "short") return `${amount} ${minutes >= 60 ? "h" : "min"}`;
  const unit = minutes >= 60 ? "hour" : "minute";
  return `${amount} ${unit}${value === 1 ? "" : "s"}`;
};

// A square's side grows with the square root of its hours, so its area
// follows them. The third most listened reaches the cap, so the two ambient
// records (or the two most played songs) share it rather than set the scale.
export const sideFor = (minutes, reference, { floor, cap }) => Math.round(Math.max(floor, Math.min(cap, cap * Math.sqrt(minutes / reference))));


// The shelf in rows: packRows (shelf-rows.mjs) sizes them, from each record's
// share of the reference record's hours. A sheet's tracks pass their own
// floor and cap.
export function rowsFor(entries, width, reference, limits = bounds(width)) {
  const rows = [];
  let at = 0;
  for (const [count, side] of packRows(entries.map(entry => Math.sqrt(entry.item.minutes / reference)), width, limits)) {
    rows.push({ side, entries: entries.slice(at, at + count) });
    at += count;
  }
  return rows;
}

// The orders, as the bar names them: a word each (Dan, 25 November 2026:
// "can we use single words intead of Release Date Time lisstened etc", after
// "Time Listened, Genre, Released Date? Listen Date?" earlier that day). Hours
// is time listened, Released is by release date and Listened by the years a
// record was played, which is `year` in code. Genre is `kind`; its file is
// still music-kinds.json.
export const ORDERS = [
  ["hours", "Hours"],
  ["kind", "Genre"],
  ["released", "Released"],
  ["year", "Listened"]
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

/*
 * The shelf in an order: groups, each with the heading that order needs (none
 * for hours), the most listened first inside each. Entries arrive most
 * listened first, as `{ item, ... }`. `cuts` names the sub-genre a genre has
 * been cut to, by genre.
 */
export function arrange(order, entries, { years, kinds, reverse = false, cuts = null } = {}) {
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
  if (order === "released") {
    // By the decade a record came out, newest first or, pressed again,
    // oldest, the most listened first inside each. A record whose year is
    // not known waits at the end.
    const map = grouped((entry) => {
      const year = Number(entry.item.year) || entry.year || 0;
      return year ? Math.floor(year / 10) * 10 : 0;
    });
    return [...map]
      .sort(([a], [b]) => (!a ? 1 : !b ? -1 : reverse ? a - b : b - a))
      .map(([decade, list]) => {
        const minutes = list.reduce((sum, entry) => sum + entry.item.minutes, 0);
        return {
          key: decade ? String(decade) : "undated",
          label: decade ? `${decade}s` : "Undated",
          figures: `${list.length} ${list.length === 1 ? "record" : "records"} · ${listened(minutes, "long")}`,
          // Where the other groups' names do not fit beside it, a heading
          // says its hours alone.
          brief: listened(minutes),
          entries: list
        };
      });
  }
  if (order === "year" && years) {
    // By when it was played: every record played for an hour or more in a
    // year, as large as its hours that year, newest year first or, pressed
    // again, oldest (Dan, 18 November 2026: "does this mean I ultimately only
    // listened to this many albums this year?"). A record appears in each
    // year it was played.
    const map = new Map();
    for (const entry of entries) {
      for (const [year, minutes] of yearPairs(entry.item, years) ?? []) {
        if (minutes < 60) continue;
        if (!map.has(year)) map.set(year, []);
        map.get(year).push({ item: { ...entry.item, key: `${year}:${entry.item.key}`, record: entry.item.key, minutes, inYear: year, allMinutes: entry.item.minutes } });
      }
    }
    return [...map]
      .sort(([a], [b]) => (reverse ? a - b : b - a))
      .map(([year, list]) => {
        list.sort((a, b) => b.item.minutes - a.item.minutes || a.item.key.localeCompare(b.item.key));
        const minutes = list.reduce((sum, entry) => sum + entry.item.minutes, 0);
        return {
          key: String(year),
          label: String(year),
          figures: `${list.length} ${list.length === 1 ? "record" : "records"} · ${listened(minutes, "long")}`,
          brief: listened(minutes),
          entries: list,
          // Each year's largest record reaches the cap.
          reference: list[Math.min(2, list.length - 1)].item.minutes
        };
      });
  }
  if (order === "kind" && kinds) {
    // A record is filed where its artist is, unless it has a place of its
    // own (Dan, 25 November 2026: "split them based on your genre"): Arcade
    // Fire's albums are indie, their score for Her is not.
    const own = (entry) => kinds.records?.[entry.item.id] ?? null;
    const kindOf = (entry) => kinds.kinds?.[own(entry)?.[0] ?? kinds.artists?.[entry.item.artist]] ?? "other";
    // A genre's sub-genres (Dan, 25 November 2026: "can we break these
    // further into sub genres too"), one for each artist as its genre is.
    const partOf = (entry) => {
      const place = own(entry) ?? [kinds.artists?.[entry.item.artist], kinds.subs?.[entry.item.artist]];
      return kinds.subkinds?.[place[0]]?.[place[1]] ?? null;
    };
    const figure = (list, minutes) => `${list.length} ${list.length === 1 ? "record" : "records"} · ${listened(minutes, "long")}`;
    const sum = (list) => list.reduce((total, entry) => total + entry.item.minutes, 0);
    // A genre is one group under one heading, and its sub-genres are the
    // words on that heading (Dan, 26 November 2026, of sub-genres named on
    // the heading and again over their own records beneath it: "can that not
    // all just be the same interface"). It stands whole, most listened
    // first, until one of them is chosen (`cuts`, by genre); then it holds
    // that sub-genre's records and says how many there are.
    return [...grouped(kindOf)]
      .map(([name, list]) => ({ name, list, minutes: sum(list) }))
      .sort((a, b) => b.minutes - a.minutes)
      .map(({ name, list, minutes }) => {
        const parts = new Map();
        for (const entry of list) {
          const part = partOf(entry);
          if (!part) continue;
          if (!parts.has(part)) parts.set(part, []);
          parts.get(part).push(entry);
        }
        // Its sub-genres, most listened first.
        const named = [...parts].map(([label, entries]) => ({ label, entries, minutes: sum(entries) })).sort((a, b) => b.minutes - a.minutes);
        const cut = named.find((part) => part.label === cuts?.[name]) ?? null;
        return {
          key: name,
          label: name,
          figures: cut ? figure(cut.entries, cut.minutes) : `${Math.round((minutes / total) * 100)}% of listening · ${listened(minutes, "long")}`,
          brief: listened(cut ? cut.minutes : minutes),
          entries: cut ? cut.entries : list,
          parts: named.map((part) => part.label),
          cut: cut?.label ?? null
        };
      });
  }
  return [{ key: "all", label: null, figures: null, entries }];
}
