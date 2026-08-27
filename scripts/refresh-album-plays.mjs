/*
 * Resolve every sleeve on the album wall against Last.fm, once, properly.
 *
 * This is the expensive half of the join and it runs here rather than in the
 * Worker. Matching a printed sleeve to a scrobbled release is genuinely fiddly —
 * "Mm..Food" against "MM..FOOD", "Tyler, The Creator" against "Tyler the
 * Creator", a soundtrack whose Last.fm title carries "(Original Motion Picture
 * Soundtrack)" that nobody prints on the cover — so it runs in three widening
 * passes and then bakes **Last.fm's own spelling** into the manifest.
 *
 * After that the Worker only ever needs an exact key lookup, which is why it can
 * refresh hourly on one API call per 500 albums instead of 249 lookups.
 *
 * The three passes, widening only when the previous one misses:
 *   1. exact normalised artist::album against the overall top-albums library,
 *      whose rows are summed per key first — Last.fm files "Graceland" and
 *      "Graceland (25th Anniversary Deluxe Edition)" separately
 *   2. same album title where one artist name contains the other
 *   3. album.getinfo with autocorrect — the only pass that can tell
 *      "never played" (a real album, userplaycount 0) from "we spelled it wrong"
 *
 *   LASTFM_API_KEY=... node scripts/refresh-album-plays.mjs
 *   LASTFM_API_KEY=... node scripts/refresh-album-plays.mjs --dry-run
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { clean, normaliseKey } from "../lib/album-key.mjs";

const root = new URL("../", import.meta.url).pathname;
const wallPath = path.join(root, "data", "album-wall.json");
const manifestPath = path.join(root, "public", "album-wall-manifest.json");

const apiKey = process.env.LASTFM_API_KEY;
const username = process.env.LASTFM_USERNAME ?? "akibwa";
const dryRun = process.argv.includes("--dry-run");

if (!apiKey) throw new Error("LASTFM_API_KEY is required to refresh album play counts.");


async function lastfm(method, params = {}) {
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const payload = await (await fetch(url)).json();
      // 6 is "not found", which is a real answer here rather than a failure.
      if (payload.error && payload.error !== 6) throw new Error(`${payload.error} ${payload.message}`);
      return payload;
    } catch (error) {
      if (attempt === 2) return { error: -1, message: String(error) };
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  return { error: -1 };
}

async function fetchLibrary() {
  const rows = [];
  for (let page = 1; page <= 12; page += 1) {
    const payload = await lastfm("user.gettopalbums", { user: username, period: "overall", limit: 500, page });
    const albums = payload.topalbums?.album ?? [];
    for (const album of albums) {
      rows.push({
        artist: album.artist?.name ?? "",
        album: album.name,
        plays: Number(album.playcount) || 0,
        url: album.url
      });
    }
    const totalPages = Number(payload.topalbums?.["@attr"]?.totalPages ?? 1);
    if (page >= totalPages) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return rows;
}

const wall = JSON.parse(await readFile(wallPath, "utf8"));
const profile = await lastfm("user.getinfo", { user: username });
const library = await fetchLibrary();

process.stderr.write(`library: ${library.length} albums, ${profile.user?.playcount ?? "?"} scrobbles\n`);

/*
 * Editions of one record are separate rows in Last.fm and have to be added
 * together, not overwritten. The surviving row's title and URL come from
 * whichever edition Dan played most, since that is the one he actually listens
 * to; the play count is the sum of all of them.
 */
const byKey = new Map();
const byAlbum = new Map();
for (const row of library) {
  const key = normaliseKey(row.artist, row.album);
  const existing = byKey.get(key);
  if (existing) {
    existing.plays += row.plays;
    if (row.plays > existing.topEditionPlays) {
      existing.topEditionPlays = row.plays;
      existing.artist = row.artist;
      existing.album = row.album;
      existing.url = row.url;
    }
  } else {
    byKey.set(key, { ...row, topEditionPlays: row.plays });
  }
  const albumKey = clean(row.album);
  if (!byAlbum.has(albumKey)) byAlbum.set(albumKey, []);
  byAlbum.get(albumKey).push(row);
}

const pending = [];
for (const sleeve of wall.sleeves) {
  if (!sleeve.artist || !sleeve.album) {
    sleeve.plays = null;
    sleeve.matchMethod = "unidentified";
    delete sleeve.lastfmKey;
    continue;
  }

  const exact = byKey.get(normaliseKey(sleeve.artist, sleeve.album));
  if (exact) {
    Object.assign(sleeve, {
      plays: exact.plays,
      lastfmArtist: exact.artist,
      lastfmAlbum: exact.album,
      lastfmUrl: exact.url,
      matchMethod: "library"
    });
    continue;
  }

  const cleanArtist = clean(sleeve.artist);
  const loose = (byAlbum.get(clean(sleeve.album)) ?? []).find((row) => {
    const other = clean(row.artist);
    return other === cleanArtist || other.includes(cleanArtist) || cleanArtist.includes(other);
  });
  if (loose) {
    Object.assign(sleeve, {
      plays: loose.plays,
      lastfmArtist: loose.artist,
      lastfmAlbum: loose.album,
      lastfmUrl: loose.url,
      matchMethod: "library-loose"
    });
    continue;
  }

  pending.push(sleeve);
}

process.stderr.write(`matched ${wall.sleeves.length - pending.length} from the library; asking about ${pending.length}\n`);

for (const sleeve of pending) {
  const payload = await lastfm("album.getinfo", {
    artist: sleeve.artist,
    album: sleeve.album,
    username,
    autocorrect: 1
  });
  if (payload?.album) {
    const plays = Number(payload.album.userplaycount ?? 0);
    Object.assign(sleeve, {
      plays,
      lastfmArtist: payload.album.artist,
      lastfmAlbum: payload.album.name,
      lastfmUrl: payload.album.url,
      matchMethod: plays > 0 ? "getinfo" : "getinfo-zero"
    });
  } else {
    Object.assign(sleeve, { plays: 0, matchMethod: "not-on-lastfm" });
    delete sleeve.lastfmArtist;
    delete sleeve.lastfmAlbum;
    delete sleeve.lastfmUrl;
  }
  await new Promise((resolve) => setTimeout(resolve, 170));
}

// The key the Worker joins on. Prefer Last.fm's spelling where we have it: it is
// what future scrobbles will be filed under, so a record at zero plays today
// still matches the moment Dan plays it.
for (const sleeve of wall.sleeves) {
  sleeve.lastfmKey =
    sleeve.artist && sleeve.album
      ? normaliseKey(sleeve.lastfmArtist || sleeve.artist, sleeve.lastfmAlbum || sleeve.album)
      : null;
}

/*
 * A handful of records were saved into the folder twice under different
 * filenames — "black country.jpg" and "Black Country New Road - For the First
 * Time.png" are the same sleeve. On a wall sorted by plays the copies land
 * side by side, which reads as a rendering bug rather than a collection.
 *
 * The survivor is the highest-resolution master, since that is the one worth
 * keeping if the artwork is ever re-rendered. Duplicates are marked rather than
 * dropped, so the folder stays the source of truth and re-running this never
 * has to guess which file was removed last time.
 */
const seen = new Map();
let duplicates = 0;
for (const sleeve of wall.sleeves) {
  delete sleeve.duplicateOf;
  if (!sleeve.lastfmKey) continue;
  const previous = seen.get(sleeve.lastfmKey);
  if (!previous) {
    seen.set(sleeve.lastfmKey, sleeve);
    continue;
  }
  const manifest = JSON.parse(await readFile(path.join(root, "data", "album-art-manifest.json"), "utf8"));
  const pixels = (id) => {
    const entry = manifest.entries.find((e) => e.id === id);
    return entry ? entry.sourceWidth * entry.sourceHeight : 0;
  };
  const loser = pixels(sleeve.id) > pixels(previous.id) ? previous : sleeve;
  const winner = loser === previous ? sleeve : previous;
  loser.duplicateOf = winner.id;
  seen.set(sleeve.lastfmKey, winner);
  duplicates += 1;
}
if (duplicates) process.stderr.write(`${duplicates} duplicate sleeve(s) marked\n`);

wall.refreshedAt = new Date().toISOString();
wall.username = profile.user?.name ?? username;
wall.totalScrobbles = Number(profile.user?.playcount) || 0;
wall.scrobblingSince = profile.user?.registered?.unixtime
  ? new Date(Number(profile.user.registered.unixtime) * 1000).toISOString().slice(0, 10)
  : null;

const counts = {};
for (const sleeve of wall.sleeves) counts[sleeve.matchMethod] = (counts[sleeve.matchMethod] ?? 0) + 1;
const played = wall.sleeves.filter((s) => (s.plays ?? 0) > 0).length;

console.log(`sleeves: ${wall.sleeves.length}`);
console.log(`played at least once: ${played}`);
console.log(`match methods: ${JSON.stringify(counts)}`);
console.log("top 12 by plays:");
for (const s of [...wall.sleeves].sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0)).slice(0, 12)) {
  console.log(`  ${String(s.plays).padStart(5)}  ${s.artist} — ${s.album}`);
}

if (dryRun) {
  console.log("\ndry run: nothing written");
} else {
  await writeFile(wallPath, `${JSON.stringify(wall, null, 2)}\n`);
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      note: "Join key for workers/albums-refresh. Generated by scripts/refresh-album-plays.mjs.",
      generatedAt: wall.refreshedAt,
      sleeves: wall.sleeves.filter((s) => !s.duplicateOf).map((s) => ({ id: s.id, key: s.lastfmKey }))
    })}\n`
  );
  console.log(`\nwrote ${path.relative(root, wallPath)} and ${path.relative(root, manifestPath)}`);
}
