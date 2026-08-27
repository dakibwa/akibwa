/*
 * Cover art for the albums Dan has played but never printed as a card.
 *
 * The wall is two populations. The 249 printed sleeves come from print masters
 * in Creative Assets and get the full ladder in build-album-art.mjs. Everything
 * else comes from Last.fm's own CDN, which caps at 300x300 — so those get one
 * rung and their opened sleeve is capped to match rather than upscaled into mush.
 *
 * The art is downloaded and re-encoded rather than hotlinked. Hotlinking would
 * put 1,500 requests to a third-party CDN on every page load, and Last.fm's
 * image URLs are content-hashed: they rot when a release's art is replaced, and
 * a rotted hotlink is a hole in the wall rather than a stale cover.
 *
 * Albums with only one play are excluded by default. Roughly 1,460 of the 3,096
 * are single plays — radio tails and autoplay — and including them would put
 * half the wall below the line where "listened to" means anything.
 *
 *   LASTFM_API_KEY=... node scripts/fetch-lastfm-art.mjs
 *   LASTFM_API_KEY=... node scripts/fetch-lastfm-art.mjs --min-plays 3
 */
import { mkdir, readFile, writeFile, readdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { normaliseKey, stripEdition } from "../lib/album-key.mjs";

const root = new URL("../", import.meta.url).pathname;
const outDir = path.join(root, "public", "album-art");
const cacheDir = path.join(root, ".album-art-cache");
const dataPath = path.join(root, "data", "album-wall.json");

const apiKey = process.env.LASTFM_API_KEY;
const username = process.env.LASTFM_USERNAME ?? "akibwa";
const minPlaysArg = process.argv.indexOf("--min-plays");
const MIN_PLAYS = minPlaysArg > -1 ? Number(process.argv[minPlaysArg + 1]) : 2;

if (!apiKey) throw new Error("LASTFM_API_KEY is required.");

// Last.fm serves this hash as its "no cover" star. It is not artwork, and a
// wall of them would look like a loading failure.
const PLACEHOLDER = "2a96cbd8b46e442fc41c2b86b821562f";

const WALL_WIDTH = 198;
const AVIF = { quality: 52, effort: 6 };
const WEBP = { quality: 74 };

const sha = (value) => createHash("sha256").update(value).digest("hex").slice(0, 16);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchLibrary() {
  const rows = [];
  for (let page = 1; page <= 12; page += 1) {
    const url = new URL("https://ws.audioscrobbler.com/2.0/");
    url.searchParams.set("method", "user.gettopalbums");
    url.searchParams.set("user", username);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("period", "overall");
    url.searchParams.set("limit", "500");
    url.searchParams.set("page", String(page));

    const payload = await (await fetch(url)).json();
    if (payload.error) throw new Error(`Last.fm: ${payload.message}`);
    for (const album of payload.topalbums?.album ?? []) {
      const images = album.image ?? [];
      const pick = (size) => images.find((i) => i.size === size)?.["#text"] || "";
      rows.push({
        artist: album.artist?.name ?? "",
        album: album.name,
        plays: Number(album.playcount) || 0,
        url: album.url,
        image: pick("extralarge") || pick("large") || pick("medium") || ""
      });
    }
    const totalPages = Number(payload.topalbums?.["@attr"]?.totalPages ?? 1);
    if (page >= totalPages) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return rows;
}

const wall = JSON.parse(await readFile(dataPath, "utf8"));
const library = await fetchLibrary();

process.stderr.write(`library: ${library.length} albums\n`);

// Anything already on the wall as a printed card keeps its card art. The key
// here is the same one refresh-album-plays.mjs bakes in, so a card and its
// Last.fm entry collapse to one tile rather than appearing twice.
const printedKeys = new Set(wall.sleeves.filter((s) => s.lastfmKey).map((s) => s.lastfmKey));


/*
 * Collapse editions before filtering, not after. "Graceland" and "Graceland
 * (25th Anniversary Deluxe Edition)" are one record with 123 plays between them;
 * kept apart they appear twice on the wall, thirty places lower than they
 * belong. The kept title and artwork are the most-played edition's.
 */
const merged = new Map();
for (const row of library) {
  const key = normaliseKey(row.artist, row.album);
  const existing = merged.get(key);
  if (!existing) {
    merged.set(key, { ...row, key, editions: 1, topEditionPlays: row.plays });
    continue;
  }
  existing.plays += row.plays;
  existing.editions += 1;
  if (row.plays > existing.topEditionPlays) {
    existing.topEditionPlays = row.plays;
    existing.artist = row.artist;
    existing.album = row.album;
    existing.url = row.url;
    existing.image = row.image || existing.image;
  }
}

const candidates = [...merged.values()].filter(
  (row) =>
    row.plays >= MIN_PLAYS && row.image && !row.image.includes(PLACEHOLDER) && !printedKeys.has(row.key)
);

process.stderr.write(
  `${candidates.length} played albums with artwork, at least ${MIN_PLAYS} plays, not already printed\n`
);

await mkdir(outDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });

const played = [];
let downloaded = 0;
let reused = 0;
let failed = 0;
let bytes = 0;

for (const [index, row] of candidates.entries()) {
  const id = `lf-${sha(row.key)}`;
  // The cache is keyed by image URL, not by album key. Keys change whenever the
  // normalisation is tightened; the bytes behind a URL do not, and re-downloading
  // 1,400 covers to absorb a regex change is pure waste.
  const cachePath = path.join(cacheDir, `${sha(row.image)}.bin`);

  let source;
  if (await exists(cachePath)) {
    source = await readFile(cachePath);
    reused += 1;
  } else {
    try {
      const response = await fetch(row.image);
      if (!response.ok) throw new Error(String(response.status));
      source = Buffer.from(await response.arrayBuffer());
      await writeFile(cachePath, source);
      downloaded += 1;
      await new Promise((resolve) => setTimeout(resolve, 40));
    } catch {
      failed += 1;
      continue;
    }
  }

  try {
    const meta = await sharp(source).metadata();
    const width = Math.min(WALL_WIDTH, Math.min(meta.width, meta.height));
    const base = sharp(source).resize(width, width, { fit: "cover", position: "centre" });
    const avif = await base.clone().avif(AVIF).toBuffer();
    const webp = await base.clone().webp(WEBP).toBuffer();
    await writeFile(path.join(outDir, `${id}-wall.avif`), avif);
    await writeFile(path.join(outDir, `${id}-wall.webp`), webp);

    // The card rung is whatever the source actually has, which for Last.fm is
    // 300px. Encoded once so an opened sleeve is not a scaled-up wall tile.
    const cardWidth = Math.min(meta.width, meta.height);
    const card = sharp(source).resize(cardWidth, cardWidth, { fit: "cover", position: "centre" });
    // AVIF only for the card rung — see AlbumArtImage in components/site-image.jsx.
    const cardAvif = await card.clone().avif(AVIF).toBuffer();
    await writeFile(path.join(outDir, `${id}-card.avif`), cardAvif);

    bytes += avif.length + webp.length + cardAvif.length;

    played.push({
      id,
      artist: row.artist,
      // The displayed title drops the edition label too, not just the join key.
      // Last.fm's own title for the most-played edition is often
      // "Amygdala (Bonus Track Version)", which is not what is printed on the
      // sleeve and is not what the wall should say.
      album: stripEdition(row.album).trim(),
      plays: row.plays,
      lastfmUrl: row.url,
      lastfmKey: row.key,
      artWidth: cardWidth,
      source: "lastfm"
    });
  } catch {
    failed += 1;
  }

  if ((index + 1) % 100 === 0) process.stderr.write(`  ${index + 1}/${candidates.length}\n`);
}

wall.played = played;
wall.playedMinPlays = MIN_PLAYS;
await writeFile(dataPath, `${JSON.stringify(wall, null, 2)}\n`);

console.log(
  `lastfm art: ${played.length} albums (${downloaded} downloaded, ${reused} cached, ${failed} failed), ${(bytes / 1048576).toFixed(1)}MB`
);
