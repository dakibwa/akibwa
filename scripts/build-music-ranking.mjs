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
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { browseAlbums } from "../components/album-catalogue.mjs";

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
    .replace(/\s*[([].*?(remaster|deluxe|edition|version|anniversary|expanded).*?[)\]]/g, "")
    .replace(/\s+-\s+.*?(remaster|deluxe|edition|version).*$/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Sleeves by artist and album, preferring the most-played edition.
const sleeves = new Map();
for (const album of catalogue.albums) {
  if (!album.artwork) continue;
  const key = `${fold(album.artist)}|${fold(album.album)}`;
  if (!sleeves.has(key) || (album.plays ?? 0) > (sleeves.get(key).plays ?? 0)) sleeves.set(key, album);
}
const sleeveFor = (artist, albums) => {
  const ordered = Object.entries(albums ?? {}).sort((a, b) => b[1] - a[1]);
  for (const [album] of ordered) {
    const found = sleeves.get(`${fold(artist)}|${fold(album)}`);
    if (found) return found.id;
  }
  return null;
};

// Spotify playback time, in whole minutes. YouTube records no durations.
const minutes = (ms) => Math.round((ms ?? 0) / 60000);

// The Spotify catalogue URIs a song was played under, for its years below.
const urisOf = (track) => (track.catalogueUris?.length ? track.catalogueUris : [track.uri]).filter(Boolean);

const songs = ranking.playlistSelection.tracks.map((track) => ({
  rank: track.playlistRank,
  title: track.track,
  artist: track.artist,
  plays: track.listens,
  youtube: track.youtubeWatches,
  art: sleeveFor(track.artist, track.albums),
  minutes: minutes(track.spotifyTotalPlayedMs),
  uris: urisOf(track)
}));

// The top 150 albums by the catalogue's reconciled plays (Dan asked for half
// as many again as 100 on 25 September 2026), each with the
// tracks Dan played from it: their Spotify plays on that album and a share of
// their playback time in proportion to those plays. The excluded ambient
// albums still belong here; only the song ranking leaves them out.
const everyTrack = [...ranking.allSourceTracks, ...ranking.excludedTracks];
// Joint albums ("Panda Bear & Sonic Boom") match tracks credited to either.
const credits = (name) => new Set(fold(name).split(/\s+(?:and|with|x)\s+|\s*,\s*/).filter(Boolean));
const sameArtist = (track, album) => {
  if (fold(track) === fold(album)) return true;
  const ours = credits(album);
  return [...credits(track)].some((part) => ours.has(part));
};
const albums = browseAlbums(catalogue.albums).slice(0, 150).map((album) => {
  const various = fold(album.artist) === "various artists";
  const tracks = [];
  const uris = new Set();
  for (const track of everyTrack) {
    if (!various && !sameArtist(track.artist, album.artist)) continue;
    // A track belongs to the album most of its plays came from; a handful of
    // plays tagged to another album (For the First Time's songs under Ants
    // From Up There) are stray metadata, not that album's tracks.
    const byAlbum = new Map();
    for (const [name, plays] of Object.entries(track.albums ?? {})) byAlbum.set(fold(name), (byAlbum.get(fold(name)) ?? 0) + plays);
    const home = [...byAlbum.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const share = (byAlbum.get(fold(album.album)) ?? 0) / Math.max(1, track.spotifyListens);
    if (home !== fold(album.album) && share < 0.4) continue;
    for (const [name, plays] of Object.entries(track.albums ?? {})) {
      if (fold(name) !== fold(album.album) || !plays) continue;
      const share = track.spotifyListens ? plays / track.spotifyListens : 0;
      tracks.push({ title: track.track, plays, minutes: minutes(track.spotifyTotalPlayedMs * share) });
      for (const uri of urisOf(track)) uris.add(uri);
    }
  }
  // One row per title: live and remastered variants were joined upstream.
  const merged = new Map();
  for (const track of tracks) {
    const key = fold(track.title);
    const entry = merged.get(key) ?? { title: track.title, plays: 0, minutes: 0 };
    entry.plays += track.plays;
    entry.minutes += track.minutes;
    merged.set(key, entry);
  }
  const listed = [...merged.values()].sort((a, b) => b.plays - a.plays || b.minutes - a.minutes);
  return {
    id: album.id,
    title: album.album,
    artist: album.artist,
    year: album.year ?? null,
    plays: album.plays,
    minutes: listed.reduce((sum, track) => sum + track.minutes, 0),
    tracks: listed,
    uris
  };
});

// Compact rows keep the lazily loaded file small. Songs are
// [title, artist, plays, youtube, art, minutes]; albums are
// [id, title, artist, year, plays, minutes, [[track, plays, minutes], …]].
const names = [...new Set([...albums.map((album) => album.artist), ...songs.map((song) => song.artist)])];
const index = new Map(names.map((name, position) => [name, position]));
const packet = {
  schemaVersion: 2,
  asOf: ranking.generatedAt.slice(0, 10),
  counts: "Spotify plays of at least 30 seconds plus identified YouTube song watches. Two ambient albums are left out of the songs.",
  hours: "Spotify playback time; YouTube records no durations.",
  names,
  songs: songs.map((song) => [song.title, index.get(song.artist), song.plays, song.youtube, song.art, song.minutes]),
  albums: albums.map((album) => [album.id, album.title, index.get(album.artist), album.year, album.plays, album.minutes, album.tracks.map((track) => [track.title, track.plays, track.minutes])])
};

writeFileSync(new URL("../public/music-ranking.json", import.meta.url), JSON.stringify(packet) + "\n");
const covered = songs.filter((song) => song.art).length;
const empty = albums.filter((album) => !album.tracks.length);
console.log(`music-ranking: ${songs.length} songs (${covered} with sleeves), ${albums.length} albums, as of ${packet.asOf}`);
console.log(`albums without matched tracks: ${empty.length ? empty.map((album) => `${album.artist} — ${album.title}`).join("; ") : "none"}`);
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
albums.forEach((album, position) => album.uris.forEach((uri) => albumsByUri.set(uri, [...(albumsByUri.get(uri) ?? []), position])));
const tally = () => new Map();
const songYears = songs.map(tally);
const albumYears = albums.map(() => ({ named: tally(), any: tally() }));
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
    if (fold(event.collection ?? "") === fold(albums[position].title)) add(tallies.named, year, event.msPlayed);
  }
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
const yearsOfAlbums = albums.map((album, position) => {
  const { named, any } = albumYears[position];
  return split(named.size ? named : any, album.minutes);
});
// The years with at least a dozen of the albums played for an hour or more.
const played = new Map();
for (const years of yearsOfAlbums) for (const [year, spent] of years) if (spent >= 60) played.set(year, (played.get(year) ?? 0) + 1);
const offered = [...played.entries()].filter(([, count]) => count >= 12).map(([year]) => year).sort((a, b) => a - b);
const yearsPacket = {
  schemaVersion: 1,
  asOf: packet.asOf,
  hours: "Spotify playback time in each calendar year, scaled to the all-time minutes in music-ranking.json.",
  years: offered,
  albums: Object.fromEntries(albums.map((album, position) => [album.id, yearsOfAlbums[position]])),
  songs: yearsOfSongs
};
writeFileSync(new URL("../public/music-years.json", import.meta.url), JSON.stringify(yearsPacket) + "\n");
const unplaced = albums.filter((album, position) => album.minutes && !yearsOfAlbums[position].length);
console.log(`music-years: ${offered.join(", ")}; albums per year ${offered.map((year) => `${year} ${played.get(year)}`).join(", ")}${unplaced.length ? `; no years for ${unplaced.map((album) => album.title).join("; ")}` : ""}`);
