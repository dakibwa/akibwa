/*
 * Public song and artist rankings for the homepage's Music room.
 *
 * Reads the combined Spotify + YouTube song ranking that the private digital
 * history already prepared (private/spotify/all-time-top-1000.json) and writes
 * public/music-ranking.json with aggregates only: rank, song, artist, plays and
 * the per-source split. Dates, listening time, track URIs, account splits and
 * source paths never leave the private history.
 *
 *   node scripts/build-music-ranking.mjs --history-root PRIVATE_HISTORY_DIRECTORY
 *
 * The ranking's own method applies: Spotify plays of at least 30 seconds plus
 * identified YouTube song watches, with Dan's two excluded ambient albums
 * (Music For Psychedelic Therapy, bar Sit Around the Fire, and Discreet Music)
 * left out. Artists total every ranked song identity, not only the top 1,000.
 * Covers come from the committed album sleeves where artist and album match.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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

// Artist names differ only by case across sources ("Tyler, The Creator").
const artistKey = (name) => fold(name);
const excluded = new Set(ranking.excludedTracks.map((track) => JSON.stringify(track.songKey)));
const artistTotals = new Map();
for (const track of ranking.allSourceTracks) {
  if (excluded.has(JSON.stringify(track.songKey))) continue;
  const key = artistKey(track.artist);
  const entry = artistTotals.get(key) ?? { names: new Map(), plays: 0, spotify: 0, youtube: 0, songs: 0 };
  entry.names.set(track.artist, (entry.names.get(track.artist) ?? 0) + track.listens);
  entry.plays += track.listens;
  entry.spotify += track.spotifyListens;
  entry.youtube += track.youtubeWatches;
  entry.songs += 1;
  artistTotals.set(key, entry);
}

const songs = ranking.playlistSelection.tracks.map((track) => ({
  rank: track.playlistRank,
  title: track.track,
  artist: track.artist,
  plays: track.listens,
  youtube: track.youtubeWatches,
  art: sleeveFor(track.artist, track.albums)
}));

const topSongsBy = new Map();
for (const song of songs) {
  const key = artistKey(song.artist);
  if (!topSongsBy.has(key)) topSongsBy.set(key, []);
  topSongsBy.get(key).push(song.rank);
}

const artists = [...artistTotals.entries()]
  .map(([key, entry]) => ({
    key,
    name: [...entry.names.entries()].sort((a, b) => b[1] - a[1])[0][0],
    plays: entry.plays,
    youtube: entry.youtube,
    songs: entry.songs
  }))
  .sort((a, b) => b.plays - a.plays || a.name.localeCompare(b.name))
  .slice(0, 100)
  .map((artist, index) => ({
    rank: index + 1,
    name: artist.name,
    plays: artist.plays,
    youtube: artist.youtube,
    // Ranks of this artist's songs within the top 1,000.
    top: topSongsBy.get(artist.key) ?? [],
    art: songs.find((song) => artistKey(song.artist) === artist.key && song.art)?.art ?? null
  }));

// Compact rows keep the lazily loaded file small: songs are
// [title, artist index, plays, youtube, art]; artists are named once.
const names = [...new Set([...artists.map((artist) => artist.name), ...songs.map((song) => song.artist)])];
const index = new Map(names.map((name, position) => [name, position]));
const packet = {
  schemaVersion: 1,
  asOf: ranking.generatedAt.slice(0, 10),
  counts: "Spotify plays of at least 30 seconds plus identified YouTube song watches. Two ambient albums are excluded.",
  names,
  songs: songs.map((song) => [song.title, index.get(song.artist), song.plays, song.youtube, song.art]),
  artists: artists.map((artist) => [index.get(artist.name), artist.plays, artist.youtube, artist.top, artist.art])
};

writeFileSync(new URL("../public/music-ranking.json", import.meta.url), JSON.stringify(packet) + "\n");
const covered = songs.filter((song) => song.art).length;
console.log(`music-ranking: ${songs.length} songs (${covered} with sleeves), ${artists.length} artists, as of ${packet.asOf}`);
console.log(`top artists: ${artists.slice(0, 8).map((artist) => `${artist.name} ${artist.plays}`).join(", ")}`);
