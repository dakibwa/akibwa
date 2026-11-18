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
export function trackMap(tracks, width, room = Infinity) {
  if (!tracks.length || width <= 0) return { height: 0, cells: [] };
  // The sheet fits the screen (Dan, 18 November 2026: "always have it fit on
  // the screen too so it's no scroll"): the mosaic takes the room there is,
  // and when its quietest songs would be too small to read they share one box.
  const height = Math.max(120, Math.floor(Math.min(width * Math.min(1.1, 0.42 + 0.045 * tracks.length), room)));
  const minArea = Math.min(88, width) * 66;
  const sorted = [...tracks].sort((a, b) => b.minutes - a.minutes);
  const weigh = (list) => {
    const most = Math.sqrt(Math.max(1, ...list.map((track) => track.minutes)));
    return list.map((track) => ({ track, weight: Math.max(most * 0.2, Math.sqrt(Math.max(0, track.minutes))) })).sort((a, b) => b.weight - a.weight);
  };
  const legible = (items) => {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    return (width * height * items[items.length - 1].weight) / total >= minArea;
  };
  let weighted = weigh(sorted);
  for (let keep = sorted.length - 1; keep >= 1 && !legible(weighted); keep--) {
    const rest = sorted.slice(keep);
    weighted = weigh([
      ...sorted.slice(0, keep),
      {
        title: `${rest.length} more`,
        plays: rest.reduce((sum, track) => sum + track.plays, 0),
        minutes: rest.reduce((sum, track) => sum + track.minutes, 0),
        rest: rest.map((track) => track.title)
      }
    ]);
  }
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
 * One shelf of records (Dan, 16 November 2026: "by combining albums and
 * songs that should effectively merge both", since a record can matter for
 * one song, such as King Krule's Hey World!). Every top album is a record
 * as large as its own hours; every top song from another record joins that
 * record's sleeve, which carries the record's own name and every track he
 * played from it (`sleeves`, 16 November 2026), or failing those, is named by
 * its most listened song and as large as its songs together; a song with no
 * sleeve stands alone, typeset. Each record keeps the songs that brought it,
 * which fill its track list until the record's own has loaded. The most
 * listened come first.
 */
export function mergeShelf(albums, songs, sleeves = []) {
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
  const recordOf = new Map(sleeves.map((record) => [record.id, record]));
  for (const [art, list] of bySleeve) {
    const sorted = [...list].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank);
    const own = recordOf.get(art);
    if (own) {
      records.push({ ...own, key: `sleeve-${art}`, kind: "sleeve", art, songs: sorted, fallback: tracksOf(sorted) });
      continue;
    }
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
