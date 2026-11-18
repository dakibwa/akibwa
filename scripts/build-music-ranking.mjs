/*
 * The homepage's Music room: Dan's top 1,000 songs and top 150 albums.
 *
 * Reads the combined Spotify + YouTube song ranking that the private digital
 * history already prepared (private/spotify/all-time-top-1000.json) and the
 * public album catalogue, and writes public/music-ranking.json with aggregates
 * only: song, artist, plays, the YouTube share and minutes played; each album's
 * plays and minutes, with the tracks Dan played from it. Dan asked for hours
 * listened on 24 September 2026. Dates, track URIs, account splits and source
 * paths never leave the private history.
 *
 *   node scripts/build-music-ranking.mjs --history-root PRIVATE_HISTORY_DIRECTORY
 *
 * The ranking's own method applies: Spotify plays of at least 30 seconds plus
 * identified YouTube song watches, with Dan's two excluded ambient albums
 * (Music For Psychedelic Therapy, bar Sit Around the Fire, and Discreet Music)
 * left out of the songs. Covers come from the committed album sleeves where
 * artist and album match.
 */
import { createReadStream, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { browseAlbums } from "../components/album-catalogue.mjs";
import { songTitle } from "../components/paper/music-shelf.mjs";

const at = process.argv.indexOf("--history-root");
const root = at > -1 ? process.argv[at + 1] : null;
if (!root || root.startsWith("--")) {
  throw Error("Usage: node scripts/build-music-ranking.mjs --history-root PRIVATE_HISTORY_DIRECTORY");
}

const ranking = JSON.parse(readFileSync(resolve(root, "private/spotify/all-time-top-1000.json"), "utf8"));
const catalogue = JSON.parse(readFileSync(new URL("../public/listening-catalogue.json", import.meta.url), "utf8"));

const fold = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*[([].*?(remaster|deluxe|edition|version|anniversary|expanded|soundtrack).*?[)\]]/g, "")
    .replace(/\s+-\s+.*?(remaster|deluxe|edition|version).*$/g, "")
    .replace(/\s*[:–—]\s+[^:–—]*(remaster|deluxe|edition|version|anniversary|expanded|bonus)[^:–—]*$/g, "")
    .replace(/\s+-\s+(single|ep)$/g, "")
    .replace(/&/g, "and")
    // Letters of every script, so two Japanese or Russian titles never fold
    // to the same empty name.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// Joint albums ("Panda Bear & Sonic Boom") match tracks credited to either.
const credits = (name) => new Set(fold(name).split(/\s+(?:and|with|x)\s+|\s*,\s*/).filter(Boolean));
const sameArtist = (track, album) => {
  if (fold(track) === fold(album)) return true;
  const ours = credits(album);
  return [...credits(track)].some((part) => ours.has(part));
};
// One credit inside another, word for word ("Philip Glass Ensemble" on Philip
// Glass's recording).
const within = (a, b) => ` ${fold(a)} `.includes(` ${fold(b)} `) || ` ${fold(b)} `.includes(` ${fold(a)} `);

// Spotify playback time, in whole minutes. YouTube records no durations.
const minutes = (ms) => Math.round((ms ?? 0) / 60000);

// The Spotify catalogue URIs a song was played under, for its years below.
const urisOf = (track) => (track.catalogueUris?.length ? track.catalogueUris : [track.uri]).filter(Boolean);

/*
 * The shelf's records (Dan, 18 November 2026). Every release once, its
 * editions folded together ("Desire, I Want to Turn Into You: Everasking
 * Edition" is that album), named by the edition with a cover and the plainest
 * title. Every song Dan played counts on one record only: the release most
 * of its plays came from, unless that is a single or EP and the song is on a
 * fuller album by its artist that he played too, which takes it (MGMT's
 * Bubblegum Dog belongs on Loss of Life). data/music-folds.json adds the
 * singles Apple lists on an album he played, though he never played the song
 * from there. A record over 90% one song is that song's single, with the
 * single's own cover where one is published (Denzel Curry's Melt My Eyez See
 * Your Future is really Walkin). The shelf is his top 1,000 records by hours,
 * albums and singles together (Dan, 18 November 2026: "can we do the top
 * 1000 so it's simple?").
 */
const SHELF_SIZE = 1000;
const verifiedIds = new Set(JSON.parse(readFileSync(new URL("../data/music-sources.json", import.meta.url), "utf8")).entries.map((entry) => entry.id));
const manifest = JSON.parse(readFileSync(new URL("../data/listening-artwork.json", import.meta.url), "utf8"));
const folds = JSON.parse(readFileSync(new URL("../data/music-folds.json", import.meta.url), "utf8"));
const releases = new Map();
const better = (a, b) =>
  (!!a.artwork !== !!b.artwork ? !!a.artwork : verifiedIds.has(a.id) !== verifiedIds.has(b.id) ? verifiedIds.has(a.id) : a.album.length !== b.album.length ? a.album.length < b.album.length : (a.plays ?? 0) > (b.plays ?? 0));
for (const album of catalogue.albums) {
  const key = `${fold(album.artist)}|${fold(album.album)}`;
  const seen = releases.get(key);
  if (!seen) {
    releases.set(key, { key, best: album, ids: new Set([album.id]), plays: album.plays ?? 0 });
    continue;
  }
  seen.ids.add(album.id);
  seen.plays += album.plays ?? 0;
  if (better(album, seen.best)) seen.best = album;
}
const releaseOfId = new Map();
for (const release of releases.values()) for (const id of release.ids) releaseOfId.set(id, release);
const byTitle = new Map();
for (const release of releases.values()) {
  const title = release.key.split("|")[1];
  if (!byTitle.has(title)) byTitle.set(title, []);
  byTitle.get(title).push(release);
}
const various = (release) => fold(release.best.artist) === "various artists";
const everyTrack = [...ranking.allSourceTracks, ...ranking.excludedTracks];

/*
 * Last.fm since the Spotify export ends (Dan, 18 November 2026: "Yes, count
 * them"): each scrobble after the export's last day counts as a play, at that
 * song's usual Spotify length, or three and a half minutes for a song he has
 * not played on Spotify, on the album Last.fm names for it. A scrobble the
 * private history already matched to a YouTube watch is not counted twice.
 */
const SPOTIFY_END = ranking.sourceCoverage.spotify.coverage.latestLocalDate;
const USUAL_MS = 210000;
const lastfmDir = resolve(root, "private/lastfm");
const jsonLines = (path) => (existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);
const counted = new Set(jsonLines(resolve(lastfmDir, "media-reconciliation.jsonl")).filter((row) => row.reconciliation?.match?.direct).map((row) => row.id));
// The album Last.fm named for each scrobble, from the raw captures.
const albumAt = new Map();
const captures = resolve(lastfmDir, "api-captures");
for (const day of existsSync(captures) ? readdirSync(captures) : []) {
  const folder = resolve(captures, day);
  let pages = [];
  try { pages = readdirSync(folder).filter((name) => name.endsWith(".json")); } catch { continue; }
  for (const page of pages) {
    const tracks = JSON.parse(readFileSync(resolve(folder, page), "utf8"))?.recenttracks?.track ?? [];
    for (const track of Array.isArray(tracks) ? tracks : [tracks]) {
      const when = Number(track?.date?.uts);
      const album = track?.album?.["#text"];
      if (when && album) albumAt.set(`${fold(track.artist?.["#text"] ?? track.artist?.name ?? "")}|${fold(track.name ?? "")}|${when}`, album);
    }
  }
}
const trackOf = new Map();
for (const track of everyTrack) trackOf.set(`${fold(track.artist)}|${fold(songTitle(track.track))}`, track);
const lastfmPlays = [];
for (const scrobble of jsonLines(resolve(lastfmDir, "scrobbles.jsonl"))) {
  if (scrobble.mediaType !== "track_scrobble" || !(String(scrobble.localDate).slice(0, 10) > SPOTIFY_END) || counted.has(scrobble.id)) continue;
  const artist = scrobble.creator ?? "";
  const title = scrobble.name ?? "";
  if (!artist || !title) continue;
  const album = albumAt.get(`${fold(artist)}|${fold(title)}|${Math.floor(Date.parse(scrobble.occurredAt) / 1000)}`) ?? null;
  let track = trackOf.get(`${fold(artist)}|${fold(songTitle(title))}`);
  if (!track) {
    // A song new since the export: it counts on the album Last.fm names.
    if (!album) continue;
    track = { artist, track: title, songKey: ["lastfm", fold(artist), fold(title)], listens: 0, spotifyListens: 0, spotifyTotalPlayedMs: 0, albums: {}, catalogueUris: [], fromLastfm: true };
    everyTrack.push(track);
    trackOf.set(`${fold(artist)}|${fold(songTitle(title))}`, track);
  }
  const usual = track.spotifyListens && !track.fromLastfm ? track.spotifyTotalPlayedMs / track.spotifyListens : USUAL_MS;
  track.listens += 1;
  track.spotifyTotalPlayedMs += usual;
  if (album) track.albums = { ...track.albums, [album]: (track.albums?.[album] ?? 0) + 1 };
  lastfmPlays.push({ track, year: Number(String(scrobble.localDate).slice(0, 4)), ms: usual });
}
// The releases a song was played on, with its plays on each.
const candidatesOf = new Map();
for (const track of everyTrack) {
  const found = new Map();
  for (const [name, count] of Object.entries(track.albums ?? {})) {
    for (const release of byTitle.get(fold(name)) ?? []) {
      if (!various(release) && !sameArtist(track.artist, release.best.artist) && !within(track.artist, release.best.artist)) continue;
      found.set(release.key, { release, plays: (found.get(release.key)?.plays ?? 0) + count });
    }
  }
  candidatesOf.set(track, [...found.values()].sort((a, b) => b.plays - a.plays));
}
const songsOn = new Map();
for (const list of candidatesOf.values()) for (const { release } of list) songsOn.set(release.key, (songsOn.get(release.key) ?? 0) + 1);
const singleLike = (release) => (songsOn.get(release.key) ?? 0) <= 3 || /\b(single|ep)\b/i.test(release.best.album);
// Singles Apple lists on one of the artist's albums he played.
const foldInto = new Map();
for (const entry of folds.folds) {
  const single = releaseOfId.get(entry.singleId);
  const album = releaseOfId.get(entry.albumId);
  if (!single || !album || single === album) continue;
  if (!foldInto.has(single.key)) foldInto.set(single.key, new Map());
  for (const song of entry.songs) foldInto.get(single.key).set(fold(songTitle(song)), album);
}
const recordOf = new Map();
const homes = new Map();
for (const track of everyTrack) {
  const list = candidatesOf.get(track);
  if (!list.length) continue;
  let home = list[0].release;
  if (singleLike(home)) {
    const fuller = list.filter(({ release }) => release !== home && !various(release) && !singleLike(release) && (songsOn.get(release.key) ?? 0) > (songsOn.get(home.key) ?? 0));
    if (fuller.length) home = fuller[0].release;
  }
  home = foldInto.get(home.key)?.get(fold(songTitle(track.track))) ?? home;
  recordOf.set(track, home);
  if (!homes.has(home.key)) homes.set(home.key, { release: home, tracks: [] });
  homes.get(home.key).tracks.push(track);
}
const rankOf = new Map(browseAlbums(catalogue.albums).map((album, position) => [album.id, position]));
// The published single covers (data/listening-artwork.json, kind "single").
const singleCovers = new Map(manifest.entries.filter((entry) => entry.kind === "single").map((entry) => [`${fold(entry.artist)}|${fold(songTitle(entry.song))}`, entry]));
const toRecord = ({ release, tracks }) => {
  // One row per song title: live and remastered variants were joined upstream.
  const merged = new Map();
  for (const track of tracks) {
    const key = fold(songTitle(track.track));
    const entry = merged.get(key) ?? { title: track.track, artist: track.artist, plays: 0, ms: 0, uris: [], tracks: [] };
    entry.plays += track.listens;
    entry.ms += track.spotifyTotalPlayedMs;
    entry.uris.push(...urisOf(track));
    entry.tracks.push(track);
    merged.set(key, entry);
  }
  const listed = [...merged.values()].sort((a, b) => b.ms - a.ms || b.plays - a.plays);
  const total = listed.reduce((sum, track) => sum + track.ms, 0);
  const album = release.best;
  const artist = fold(album.artist) === "various artists" ? listed[0].artist : album.artist;
  const record = {
    id: album.id,
    art: album.artwork ? album.id : null,
    title: album.album,
    artist,
    year: album.year ?? null,
    plays: Math.max(release.plays, listed.reduce((sum, track) => sum + track.plays, 0)),
    ms: total,
    single: false,
    release,
    songs: listed
  };
  // Over 90% one song: that song's single, unless it is one of the top
  // albums, such as Discreet Music, whose title piece is most of it.
  const top = [...release.ids].some((id) => verifiedIds.has(id) || (rankOf.get(id) ?? Infinity) < 150);
  // A long piece is an album in itself (Thursday Afternoon, dlp 1), unless
  // it was released as a single with its own cover (Hey World!).
  const cover = singleCovers.get(`${fold(listed[0].artist)}|${fold(songTitle(listed[0].title))}`);
  const long = listed[0].ms / Math.max(1, listed[0].plays) > 10 * 60000;
  if (!top && (!long || cover) && (listed.length === 1 || listed[0].ms / Math.max(1, total) > 0.9)) {
    const top = listed[0];
    Object.assign(record, {
      single: true,
      title: songTitle(top.title),
      artist: top.artist,
      plays: top.plays,
      ms: top.ms,
      songs: [top],
      ...(cover ? { id: cover.id, art: cover.id, year: cover.source.releaseYear ? String(cover.source.releaseYear) : record.year } : {})
    });
  }
  // A record with no cover of its own borrows one from another release its
  // songs were played on (Dan, 18 November 2026: "they exist somewhere").
  if (!record.art) {
    const lent = record.songs.flatMap((song) => song.tracks.flatMap((track) => candidatesOf.get(track) ?? [])).find(({ release: other }) => other.best.artwork);
    if (lent) record.art = lent.release.best.id;
  }
  record.minutes = minutes(record.ms);
  record.tracks = record.songs.map((song) => ({ title: song.title, plays: song.plays, minutes: minutes(song.ms) }));
  record.uris = new Set(record.songs.flatMap((song) => song.uris));
  return record;
};
// Records Dan asked to keep off the shelf (data/music-hidden.json).
const hidden = new Set(JSON.parse(readFileSync(new URL("../data/music-hidden.json", import.meta.url), "utf8")).records.map((record) => `${fold(record.artist)}|${fold(record.title)}`));
const isHidden = (record) => hidden.has(`${fold(record.artist)}|${fold(record.title)}`) || hidden.has(record.release.key);
const shelf = [...homes.values()].map(toRecord).filter((record) => !isHidden(record)).sort((a, b) => b.ms - a.ms).slice(0, SHELF_SIZE);
// The top 150 albums by the catalogue's reconciled plays (Dan asked for half
// as many again as 100 on 25 September 2026) keep their checked covers and
// links; the rest of the shelf's albums follow, then its singles.
const firstRank = (record) => Math.min(...[...record.release.ids].map((id) => rankOf.get(id) ?? Infinity));
const shelfAlbums = shelf.filter((record) => !record.single).sort((a, b) => firstRank(a) - firstRank(b) || b.minutes - a.minutes);
const albums = shelfAlbums.slice(0, 150);
const others = shelfAlbums.slice(150).sort((a, b) => b.minutes - a.minutes);
const singles = shelf.filter((record) => record.single).sort((a, b) => b.minutes - a.minutes);
const records = [...albums, ...others, ...singles];
if (records.some((record) => record.art === null && verifiedIds.has(record.id))) throw Error("a checked album lost its cover");

// The top 1,000 songs, each on its record (art is that record's id), or on
// none when its record is under three hours.
const placed = new Map();
const songKey = (track) => JSON.stringify(track.songKey);
for (const record of records) for (const song of record.songs) for (const track of song.tracks) placed.set(songKey(track), record);
const songs = ranking.playlistSelection.tracks.map((track) => ({
  rank: track.playlistRank,
  title: track.track,
  artist: track.artist,
  plays: track.listens,
  youtube: track.youtubeWatches,
  art: placed.get(songKey(track))?.id ?? null,
  minutes: minutes(track.spotifyTotalPlayedMs),
  uris: urisOf(track)
}));

// Compact rows keep the lazily loaded file small. Songs are
// [title, artist, plays, youtube, record, minutes]; albums are
// [id, title, artist, year, plays, minutes, [[track, plays, minutes], …]];
// sleeves (the other albums) and singles add the cover's id, or null.
const names = [...new Set([...records.map((record) => record.artist), ...songs.map((song) => song.artist)])];
const index = new Map(names.map((name, position) => [name, position]));
const row = (record) => [record.id, record.title, index.get(record.artist), record.year, record.plays, record.minutes, record.tracks.map((track) => [track.title, track.plays, track.minutes])];
const packet = {
  schemaVersion: 2,
  asOf: ranking.generatedAt.slice(0, 10),
  counts: "Spotify plays of at least 30 seconds plus identified YouTube song watches. Two ambient albums are left out of the songs.",
  hours: "Spotify playback time, and since the Spotify export ends, Last.fm plays at each song's usual Spotify length (three and a half minutes for a song new since then); YouTube records no durations. The shelf is the top 1,000 records by these hours.",
  names,
  songs: songs.map((song) => [song.title, index.get(song.artist), song.plays, song.youtube, song.art, song.minutes]),
  albums: albums.map(row),
  sleeves: others.map((record) => [...row(record), record.art]),
  singles: singles.map((record) => [...row(record), record.art])
};

writeFileSync(new URL("../public/music-ranking.json", import.meta.url), JSON.stringify(packet) + "\n");
const covered = records.filter((record) => record.art).length;
console.log(`music-ranking: the top ${records.length} records (${albums.length} top albums, ${others.length} more albums, ${singles.length} singles), down to ${Math.min(...records.map((record) => record.minutes))} minutes, ${covered} with covers; ${songs.filter((song) => song.art).length} of the top ${songs.length} songs on them; as of ${packet.asOf}`);
console.log(`without covers: ${records.filter((record) => !record.art).map((record) => `${record.artist} — ${record.title}`).slice(0, 12).join("; ")}${records.filter((record) => !record.art).length > 12 ? " …" : ""}`);
console.log(`top albums: ${albums.slice(0, 6).map((album) => `${album.title} ${album.plays} plays, ${Math.round(album.minutes / 60)} h, ${album.tracks.length} tracks`).join("; ")}`);

/*
 * Each album's and song's hours by calendar year, for the Music room's year
 * slider (Dan approved publishing yearly totals on 26 September 2026): their
 * Spotify playback in each year of the delivered streaming history, scaled so
 * the years add up to the minutes published above. An album counts the plays
 * of its tracks under its own name. Only whole years and minutes leave the
 * history; a year is offered once enough of the albums were played in it.
 */
const MUSIC = new Set(["track", "video_track"]);
const songsByUri = new Map();
songs.forEach((song, position) => song.uris.forEach((uri) => songsByUri.set(uri, position)));
const albumsByUri = new Map();
records.forEach((album, position) => album.uris.forEach((uri) => albumsByUri.set(uri, [...(albumsByUri.get(uri) ?? []), position])));
const tally = () => new Map();
const songYears = songs.map(tally);
const albumYears = records.map(() => ({ any: tally() }));
const add = (map, year, ms) => map.set(year, (map.get(year) ?? 0) + ms);
const lines = createInterface({ input: createReadStream(resolve(root, "private/spotify/extended-streaming-history.jsonl")), crlfDelay: Infinity });
for await (const line of lines) {
  if (!line) continue;
  const event = JSON.parse(line);
  if (!MUSIC.has(event.mediaType) || !event.msPlayed) continue;
  const year = Number(String(event.localDate).slice(0, 4));
  const song = songsByUri.get(event.uri);
  if (song !== undefined) add(songYears[song], year, event.msPlayed);
  for (const position of albumsByUri.get(event.uri) ?? []) {
    const tallies = albumYears[position];
    add(tallies.any, year, event.msPlayed);
  }
}

// Last.fm plays since the export add to their record's years.
const recordOfTrack = new Map();
records.forEach((record, position) => record.songs.forEach((song) => song.tracks.forEach((track) => recordOfTrack.set(track, position))));
for (const { track, year, ms } of lastfmPlays) {
  const position = recordOfTrack.get(track);
  if (position !== undefined) add(albumYears[position].any, year, ms);
}

// Whole minutes per year that add up to `total` (largest remainders).
function split(byYear, total) {
  const all = [...byYear.values()].reduce((sum, ms) => sum + ms, 0);
  if (!all || !total) return [];
  const shares = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, ms]) => ({ year, exact: (total * ms) / all }));
  shares.forEach((share) => (share.minutes = Math.floor(share.exact)));
  let left = total - shares.reduce((sum, share) => sum + share.minutes, 0);
  [...shares].sort((a, b) => (b.exact - b.minutes) - (a.exact - a.minutes)).forEach((share) => {
    if (left > 0) {
      share.minutes += 1;
      left -= 1;
    }
  });
  return shares.filter((share) => share.minutes > 0).map((share) => [share.year, share.minutes]);
}

const yearsOfSongs = songs.map((song, position) => split(songYears[position], song.minutes));
const yearsOfAlbums = records.map((album, position) => {
  const { any } = albumYears[position];
  return split(any, album.minutes);
});
// The years with at least a dozen of the top albums played for an hour or more.
const played = new Map();
for (const years of yearsOfAlbums.slice(0, albums.length)) for (const [year, spent] of years) if (spent >= 60) played.set(year, (played.get(year) ?? 0) + 1);
const offered = [...played.entries()].filter(([, count]) => count >= 12).map(([year]) => year).sort((a, b) => a - b);
const yearsPacket = {
  schemaVersion: 1,
  asOf: packet.asOf,
  hours: "Spotify playback time in each calendar year, scaled to the all-time minutes in music-ranking.json.",
  years: offered,
  albums: Object.fromEntries(records.map((album, position) => [album.id, yearsOfAlbums[position]])),
  songs: yearsOfSongs
};
writeFileSync(new URL("../public/music-years.json", import.meta.url), JSON.stringify(yearsPacket) + "\n");
const unplaced = records.filter((album, position) => album.minutes && !yearsOfAlbums[position].length);
console.log(`music-years: ${offered.join(", ")}; albums per year ${offered.map((year) => `${year} ${played.get(year)}`).join(", ")}${unplaced.length ? `; no years for ${unplaced.map((album) => album.title).join("; ")}` : ""}`);
