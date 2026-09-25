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
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
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

const songs = ranking.playlistSelection.tracks.map((track) => ({
  rank: track.playlistRank,
  title: track.track,
  artist: track.artist,
  plays: track.listens,
  youtube: track.youtubeWatches,
  art: sleeveFor(track.artist, track.albums),
  minutes: minutes(track.spotifyTotalPlayedMs)
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
    tracks: listed
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
