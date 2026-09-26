/*
 * What the Music room's search knows beyond titles: each artist's genres and
 * the artists they belong to or work as (Paul Simon → Simon & Garfunkel,
 * Panda Bear → Animal Collective), and the year each sleeve was released, so
 * a search can ask for a genre or an era (Dan, 25 September 2026).
 *
 * From MusicBrainz, whose core data is CC0: an artist search and a lookup
 * with genres and artist relationships for every artist in
 * public/music-ranking.json, and a release-group search for every sleeve the
 * catalogue gives no year. Requests are spaced to MusicBrainz's one a second
 * and cached in .album-art-cache/, which is not committed.
 *
 *   node scripts/build-music-meta.mjs
 *
 * Writes public/music-meta.json: { artists: { name: { genres, related } },
 * years: { sleeve id: year } }.
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = new URL("../", import.meta.url).pathname;
const cacheDir = path.join(root, ".album-art-cache");
const AGENT = "akibwa-music-search/1.0 (https://akibwa.com)";
const SPACING = 1250;

// Release years checked by hand where MusicBrainz finds no match for the
// catalogue's title (26 September 2026). Her's score came out in 2021.
const REVIEWED_YEARS = {
  "lf-8e9c2fc439ba2bd6": 2015, // Surf
  "lf-f145710c4a0a4cee": 2011, // Submarine
  "lf-b1e6e583a5575429": 1993, // Red House Painters I
  "history-7abaf827ee921950": 1978, // Music for Airports
  "history-cbcfb31c92d03017": 1983, // Apollo
  "history-e1cbfbc8406426ee": 2021 // Her (Original Score)
};

const sha = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);
const exists = (file) => access(file).then(() => true, () => false);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fold = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*[([].*?(remaster|deluxe|edition|version|anniversary|expanded).*?[)\]]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

let last = 0;
async function ask(url) {
  const cached = path.join(cacheDir, `mb-${sha(url)}.json`);
  if (await exists(cached)) return JSON.parse(await readFile(cached, "utf8"));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const wait = last + SPACING - Date.now();
    if (wait > 0) await pause(wait);
    last = Date.now();
    const response = await fetch(url, { headers: { "User-Agent": AGENT, Accept: "application/json" } });
    if (response.status === 503 || response.status === 429) {
      await pause(3000 * (attempt + 1));
      continue;
    }
    if (!response.ok) return null;
    const body = await response.json();
    await writeFile(cached, JSON.stringify(body));
    return body;
  }
  return null;
}

const RELATED = new Set(["member of band", "is person", "collaboration", "founder", "subgroup"]);

async function artistFacts(name) {
  const found = await ask(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${name.replace(/"/g, "")}"`)}&fmt=json&limit=5`);
  const candidates = found?.artists ?? [];
  const pick = candidates.find((artist) => fold(artist.name) === fold(name) && artist.score >= 90) ?? candidates.find((artist) => artist.score >= 98);
  if (!pick) return null;
  const facts = await ask(`https://musicbrainz.org/ws/2/artist/${pick.id}?inc=genres+artist-rels&fmt=json`);
  if (!facts) return null;
  const genres = (facts.genres ?? [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((genre) => genre.name);
  const related = [
    ...new Set(
      (facts.relations ?? [])
        .filter((relation) => relation["target-type"] === "artist" && RELATED.has(relation.type) && relation.artist?.name)
        .map((relation) => relation.artist.name)
    )
  ].slice(0, 8);
  return { genres, related };
}

async function releaseYear(artist, album) {
  const query = `releasegroup:"${album.replace(/"/g, "")}" AND artist:"${artist.replace(/"/g, "")}"`;
  const found = await ask(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=5`);
  const groups = (found?.["release-groups"] ?? []).filter((group) => group.score >= 85 && fold(group.title) === fold(album));
  const years = groups.map((group) => Number.parseInt(group["first-release-date"] ?? "", 10)).filter((year) => year > 1900);
  return years.length ? Math.min(...years) : null;
}

async function main() {
  await mkdir(cacheDir, { recursive: true });
  const ranking = JSON.parse(await readFile(path.join(root, "public/music-ranking.json"), "utf8"));
  const catalogue = JSON.parse(await readFile(path.join(root, "public/listening-catalogue.json"), "utf8"));
  const sleeves = new Map(catalogue.albums.map((album) => [album.id, album]));
  const previous = (await exists(path.join(root, "public/music-meta.json")))
    ? JSON.parse(await readFile(path.join(root, "public/music-meta.json"), "utf8"))
    : { artists: {}, years: {} };

  const artists = {};
  for (const [index, name] of ranking.names.entries()) {
    artists[name] = previous.artists[name] ?? (await artistFacts(name)) ?? { genres: [], related: [] };
    if ((index + 1) % 25 === 0) process.stderr.write(`  artists ${index + 1}/${ranking.names.length}\n`);
  }

  const ids = [...new Set([...ranking.albums.map((album) => album[0]), ...ranking.songs.map((song) => song[4]).filter(Boolean)])];
  const years = {};
  for (const [index, id] of ids.entries()) {
    const sleeve = sleeves.get(id);
    const known = Number.parseInt(sleeve?.year ?? "", 10);
    if (known > 1900) years[id] = known;
    else if (REVIEWED_YEARS[id]) years[id] = REVIEWED_YEARS[id];
    else if (previous.years[id]) years[id] = previous.years[id];
    else if (sleeve) {
      const year = await releaseYear(sleeve.artist, sleeve.album);
      if (year) years[id] = year;
    }
    if ((index + 1) % 50 === 0) process.stderr.write(`  sleeves ${index + 1}/${ids.length}\n`);
  }

  const packet = {
    schemaVersion: 1,
    note: "Artist genres and relationships and sleeve release years from MusicBrainz (CC0), built by scripts/build-music-meta.mjs.",
    artists,
    years
  };
  await writeFile(path.join(root, "public/music-meta.json"), `${JSON.stringify(packet)}\n`);
  const known = Object.values(artists).filter((artist) => artist.genres.length || artist.related.length).length;
  console.log(`music-meta: ${known}/${ranking.names.length} artists with genres or relations, ${Object.keys(years).length}/${ids.length} sleeves with a year`);
}

await main();
