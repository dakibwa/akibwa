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

/*
 * A record's tracks share out a sheet by how much each was listened to
 * (Dan, 16 November 2026: "the same logic of spacing across page of how
 * much I've listened to it"): a squarified treemap of the space, each track's
 * area following the square root of its hours, with a floor of a fifth of
 * the most listened's weight so every name has room. The box grows taller with
 * more tracks. Rectangles come back inset by half the gap on every side.
 */
export function trackMap(tracks, width) {
  if (!tracks.length || width <= 0) return { height: 0, cells: [] };
  const height = Math.round(width * Math.min(1.1, 0.42 + 0.045 * tracks.length));
  const most = Math.sqrt(Math.max(1, ...tracks.map((track) => track.minutes)));
  const weighted = tracks
    .map((track) => ({ track, weight: Math.max(most * 0.2, Math.sqrt(Math.max(0, track.minutes))) }))
    .sort((a, b) => b.weight - a.weight);
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  const scale = (width * height) / total;
  const items = weighted.map((item) => ({ ...item, area: item.weight * scale }));
  const cells = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  const sum = (row) => row.reduce((total, item) => total + item.area, 0);
  const worst = (row, side) => {
    const s = sum(row);
    const most = Math.max(...row.map((item) => item.area));
    const least = Math.min(...row.map((item) => item.area));
    return Math.max((side * side * most) / (s * s), (s * s) / (side * side * least));
  };
  const lay = (row) => {
    const s = sum(row);
    if (w >= h) {
      const across = s / h;
      let down = y;
      for (const item of row) {
        const tall = item.area / across;
        cells.push({ ...item, x, y: down, w: across, h: tall });
        down += tall;
      }
      x += across;
      w -= across;
    } else {
      const tall = s / w;
      let along = x;
      for (const item of row) {
        const across = item.area / tall;
        cells.push({ ...item, x: along, y, w: across, h: tall });
        along += across;
      }
      y += tall;
      h -= tall;
    }
  };
  let row = [];
  for (const item of items) {
    const side = Math.min(w, h);
    if (!row.length || worst([...row, item], side) <= worst(row, side)) row.push(item);
    else {
      lay(row);
      row = [item];
    }
  }
  if (row.length) lay(row);
  const half = GAP / 2;
  return {
    height,
    cells: cells.map((cell) => ({ track: cell.track, x: cell.x + half, y: cell.y + half, w: Math.max(0, cell.w - GAP), h: Math.max(0, cell.h - GAP) }))
  };
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

/*
 * One shelf of records (Dan, 16 November 2026: "by combining albums and
 * songs that should effectively merge both", since a record can matter for
 * one song, such as King Krule's Hey World!). Every top album is a record
 * as large as its own hours; every top song from another record joins that
 * record's sleeve, as large as those songs together, named by its most
 * listened song; a song with no sleeve stands alone, typeset. Each record
 * keeps the songs that brought it, which fill its track list when the
 * album's own is not published. The most listened come first.
 */
export function mergeShelf(albums, songs) {
  const ids = new Set(albums.map((album) => album.id));
  const ofAlbum = new Map();
  const bySleeve = new Map();
  const alone = [];
  for (const song of songs) {
    if (song.art && ids.has(song.art)) {
      if (!ofAlbum.has(song.art)) ofAlbum.set(song.art, []);
      ofAlbum.get(song.art).push(song);
    } else if (song.art) {
      if (!bySleeve.has(song.art)) bySleeve.set(song.art, []);
      bySleeve.get(song.art).push(song);
    } else {
      alone.push(song);
    }
  }
  const tracksOf = (list) => list.map((song) => ({ title: song.title, plays: song.plays, minutes: song.minutes }));
  const sum = (list, field) => list.reduce((total, song) => total + song[field], 0);
  const records = albums.map((album) => {
    const own = ofAlbum.get(album.id) ?? [];
    return { ...album, key: `album-${album.id}`, kind: "album", art: album.id, songs: own, fallback: own.length ? tracksOf(own) : null };
  });
  for (const [art, list] of bySleeve) {
    const sorted = [...list].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank);
    records.push({
      key: `sleeve-${art}`,
      kind: "sleeve",
      id: art,
      art,
      title: songTitle(sorted[0].title),
      artist: sorted[0].artist,
      year: null,
      plays: sum(sorted, "plays"),
      minutes: sum(sorted, "minutes"),
      songs: sorted,
      tracks: tracksOf(sorted)
    });
  }
  for (const song of alone) {
    records.push({
      key: `song-${song.rank}`,
      kind: "song",
      id: null,
      art: null,
      title: songTitle(song.title),
      artist: song.artist,
      year: null,
      plays: song.plays,
      minutes: song.minutes,
      songs: [song],
      tracks: tracksOf([song])
    });
  }
  return records.sort((a, b) => b.minutes - a.minutes || a.key.localeCompare(b.key));
}

// A record's listening by calendar year: an album's own, or its songs'.
export function yearPairs(record, years) {
  if (!years) return null;
  if (record.kind === "album" && years.albums?.[record.id]) return years.albums[record.id];
  const by = new Map();
  for (const song of record.songs ?? []) {
    for (const [year, minutes] of years.songs?.[song.rank - 1] ?? []) by.set(year, (by.get(year) ?? 0) + minutes);
  }
  return [...by];
}

const letterOf = (text) => {
  const first = fold(text).trim().replace(/^the\s+/, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
};

/*
 * The shelf in an order: groups, each with the heading that order needs (none
 * for hours), the most listened first inside each, except a to z. Entries
 * arrive most listened first, as `{ item, ... }`.
 */
export function arrange(order, entries, { years, kinds } = {}) {
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
    const sorted = [...entries].sort((a, b) => fold(a.item.title).localeCompare(fold(b.item.title), "en"));
    const map = new Map();
    for (const entry of sorted) {
      const letter = letterOf(entry.item.title);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter).push(entry);
    }
    return [...map]
      .sort(([a], [b]) => (a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)))
      .map(([letter, list]) => ({ key: letter, label: letter, figures: String(list.length), entries: list }));
  }
  if (order === "year" && years) {
    const peaks = new Map(entries.map((entry) => [entry, peakOf(yearPairs(entry.item, years))]));
    const map = grouped((entry) => peaks.get(entry)?.[0] ?? "undated");
    return [...map]
      .sort(([a], [b]) => (a === "undated" ? 1 : b === "undated" ? -1 : b - a))
      .map(([year, list]) => ({
        key: String(year),
        label: String(year),
        figures: `${listened(list.reduce((sum, entry) => sum + (peaks.get(entry)?.[1] ?? 0), 0))} that year`,
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
