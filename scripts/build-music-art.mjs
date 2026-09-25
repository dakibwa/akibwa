/*
 * The Music room's large sleeves.
 *
 * The album wall's one rung is 264px: right for the wall and the track list,
 * but the Music room draws its most listened albums and songs at up to about
 * 400 CSS pixels, which that rung only covers at 1x. Dan asked for high-res
 * art (25 September 2026), so this adds one larger rung, `<id>-large`, up to
 * 800px and never upscaled, for the sleeves the room can draw that big: the
 * top 100 albums and the covers of the hundred songs with the most hours.
 *
 * Sources, best first:
 *   - printed sleeves (`NNN`): the print masters in Creative Assets that
 *     build-album-art.mjs reads;
 *   - catalogue sleeves (`history-*`): their reviewed Apple Music artwork, at
 *     800px;
 *   - Last.fm sleeves (`lf-*`): Last.fm's CDN stops at 300px, so the same
 *     release's front cover from the Cover Art Archive (found through
 *     MusicBrainz) or Apple Music — kept only if it looks like the committed
 *     wall sleeve, so another edition's cover never slips in.
 * A sleeve with no source at least 480px square (360px for one checked by eye)
 * keeps its wall rung only.
 *
 * It writes public/album-art/<id>-large.{avif,webp} through the same press as
 * the wall, data/music-art.json (sources and hashes) and
 * components/paper/music-art.mjs (each id with the rung and its width, for
 * the room's srcset). Downloads are cached in .album-art-cache/, which is not
 * committed.
 *
 *   node scripts/build-music-art.mjs            fetch what is missing
 *   node scripts/build-music-art.mjs --check    verify the committed rungs
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { homedir } from "node:os";
import sharp from "sharp";
import { PRESS_VERSION, press } from "./press-curve.mjs";
import { unpackRanking } from "../components/paper/music-ranking.mjs";

const root = new URL("../", import.meta.url).pathname;
const outDir = path.join(root, "public", "album-art");
const cacheDir = path.join(root, ".album-art-cache");
const manifestPath = path.join(root, "data", "music-art.json");
const modulePath = path.join(root, "components", "paper", "music-art.mjs");
const checkOnly = process.argv.includes("--check");

const WIDTH = 800;
const LEAST = 480;
const AVIF = { quality: 52, effort: 6 };
const WEBP = { quality: 74 };
// Mean difference per channel (0–255) between a candidate and the wall
// sleeve, both 16px square; the same cover lands well under this.
const SAME_COVER = 24;
const AGENT = "akibwa-music-art/1.0 (https://akibwa.com)";

// Larger covers checked by eye against the wall sleeve where the fingerprint
// is thrown by a paler scan of the same artwork (25 September 2026).
const REVIEWED = {
  "lf-4cb306fbca55133f": "https://coverartarchive.org/release-group/f833a9fc-3c55-309f-a7f5-30fb9124040d/front-1200"
};

const MASTERS = [
  path.join(homedir(), "Library", "Mobile Documents", "com~apple~CloudDocs", "Documents", "Creative Assets", "Library", "Album Art"),
  path.join(homedir(), "Documents", "Creative Assets", "Library", "Album Art")
];

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex").slice(0, 16);
const json = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const exists = (file) => access(file).then(() => true, () => false);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fold = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*[([].*?(remaster|deluxe|edition|version|anniversary|expanded).*?[)\]]/g, "")
    .replace(/\s+-\s+(single|ep)$/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// The sleeves the room can draw large.
async function wanted() {
  const music = unpackRanking(await json("public/music-ranking.json"));
  const songs = [...music.songs].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank).slice(0, 100);
  return [...new Set([...music.albums.map((album) => album.id), ...songs.map((song) => song.art).filter(Boolean)])];
}

async function fetchBytes(url, headers = {}) {
  const cached = path.join(cacheDir, `music-${sha(url)}.bin`);
  if (await exists(cached)) return readFile(cached);
  const response = await fetch(url, { headers: { "User-Agent": AGENT, ...headers }, redirect: "follow" });
  if (!response.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(cached, bytes);
  return bytes;
}

async function fetchJson(url) {
  const bytes = await fetchBytes(url, { Accept: "application/json" });
  try {
    return bytes ? JSON.parse(bytes.toString("utf8")) : null;
  } catch {
    return null;
  }
}

// A 16px square fingerprint, pressed like the wall so tones compare.
async function print(bytes, pressed) {
  const small = sharp(bytes).resize(16, 16, { fit: "cover", position: "centre" }).removeAlpha().toColourspace("srgb");
  const pipeline = pressed ? small : await press(sharp, small);
  return pipeline.raw().toBuffer();
}

async function likeness(bytes, wall) {
  const [a, b] = await Promise.all([print(bytes, false), print(wall, true)]);
  let total = 0;
  for (let i = 0; i < a.length; i += 1) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

async function square(bytes) {
  try {
    const meta = await sharp(bytes).metadata();
    return Math.min(meta.width ?? 0, meta.height ?? 0);
  } catch {
    return 0;
  }
}

async function candidatesFor(artist, album) {
  const found = [];
  // MusicBrainz asks for a request a second at most.
  const query = `releasegroup:"${album.replace(/"/g, "")}" AND artist:"${artist.replace(/"/g, "")}"`;
  const groups = await fetchJson(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=5`);
  await pause(1100);
  for (const group of groups?.["release-groups"] ?? []) {
    if (group.score < 90 || fold(group.title) !== fold(album)) continue;
    found.push({ source: "cover art archive", ref: `https://musicbrainz.org/release-group/${group.id}`, url: `https://coverartarchive.org/release-group/${group.id}/front-1200` });
  }
  for (const term of [`${artist} ${album}`, album]) {
    const attribute = term === album ? "&attribute=albumTerm" : "";
    const results = await fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&country=GB&limit=50${attribute}`);
    await pause(3200);
    for (const result of results?.results ?? []) {
      if (fold(result.collectionName) !== fold(album) || fold(result.artistName) !== fold(artist)) continue;
      found.push({ source: "apple music", ref: result.collectionViewUrl?.split("?")[0], url: result.artworkUrl100.replace(/\/[^/]+$/, `/${WIDTH}x${WIDTH}bb.jpg`) });
    }
    if (found.length) break;
  }
  return found;
}

async function sourceFor(id, sleeves) {
  if (/^\d{3}$/.test(id)) {
    const entry = sleeves.printed.get(id);
    for (const dir of MASTERS) {
      const file = entry && path.join(dir, entry.file);
      if (file && (await exists(file))) return { source: "print master", ref: entry.file, bytes: await readFile(file) };
    }
    return { skip: "print master not on this machine" };
  }
  if (id.startsWith("history-")) {
    const entry = sleeves.catalogue.get(id);
    if (!entry) return { skip: "no catalogue artwork entry" };
    if (entry.reuseId) return sourceFor(entry.reuseId, sleeves);
    const url = entry.source.artworkUrl.replace(/\/[^/]+$/, `/${WIDTH}x${WIDTH}bb.jpg`);
    const bytes = await fetchBytes(url);
    return bytes ? { source: "apple music", ref: entry.source.url, bytes } : { skip: "catalogue artwork unavailable" };
  }
  if (id.startsWith("lf-")) {
    const entry = sleeves.lastfm.get(id);
    if (!entry) return { skip: "no Last.fm sleeve entry" };
    if (REVIEWED[id]) {
      const bytes = await fetchBytes(REVIEWED[id]);
      if (bytes) return { source: "cover art archive", ref: REVIEWED[id].replace(/coverartarchive\.org\/release-group\/([^/]+).*/, "musicbrainz.org/release-group/$1"), bytes, match: "by eye" };
    }
    const wall = await readFile(path.join(outDir, `${id}-wall.webp`));
    let best = null;
    for (const candidate of await candidatesFor(entry.artist, entry.album)) {
      const bytes = await fetchBytes(candidate.url);
      if (!bytes || (await square(bytes)) < LEAST) continue;
      const score = await likeness(bytes, wall);
      if (!best || score < best.score) best = { ...candidate, bytes, score };
      if (score < SAME_COVER / 2) break;
    }
    if (!best) return { skip: "no larger source found" };
    if (best.score >= SAME_COVER) return { skip: `closest larger cover differs (${best.score.toFixed(1)})` };
    return { source: best.source, ref: best.ref, bytes: best.bytes, match: Number(best.score.toFixed(1)) };
  }
  return { skip: "unknown sleeve" };
}

async function writeModule(entries) {
  const widths = Object.fromEntries([...entries].sort((a, b) => (a.id < b.id ? -1 : 1)).map((entry) => [entry.id, entry.width]));
  const lines = [
    "// Generated by scripts/build-music-art.mjs: the sleeves with a `-large`",
    "// rung in public/album-art/ and its width, which the Music room adds to srcset.",
    `export const LARGE_ART = ${JSON.stringify(widths, null, 2)};`,
    ""
  ];
  await writeFile(modulePath, lines.join("\n"));
}

async function main() {
  const ids = await wanted();
  const previous = (await exists(manifestPath)) ? JSON.parse(await readFile(manifestPath, "utf8")) : { entries: [], skipped: [] };
  const byId = new Map(previous.entries.map((entry) => [entry.id, entry]));

  if (checkOnly) {
    const problems = [];
    if (previous.pressVersion !== PRESS_VERSION) problems.push(`pressed with ${previous.pressVersion ?? "nothing"}, not ${PRESS_VERSION}`);
    const known = new Set([...byId.keys(), ...(previous.skipped ?? []).map((entry) => entry.id)]);
    for (const id of ids) if (!known.has(id)) problems.push(`${id} has no large rung and no recorded reason`);
    for (const entry of previous.entries) {
      for (const format of ["avif", "webp"]) {
        const file = path.join(outDir, `${entry.id}-large.${format}`);
        if (!(await exists(file))) problems.push(`${entry.id}-large.${format} is missing`);
        else if (sha(await readFile(file)) !== entry.files[format]) problems.push(`${entry.id}-large.${format} does not match data/music-art.json`);
      }
    }
    const listed = await readFile(modulePath, "utf8").catch(() => "");
    for (const entry of previous.entries) if (!listed.includes(`"${entry.id}"`)) problems.push(`${entry.id} is missing from components/paper/music-art.mjs`);
    if (problems.length) {
      console.error(`music-art check failed:\n  - ${problems.slice(0, 40).join("\n  - ")}`);
      process.exit(1);
    }
    console.log(`music-art: ${previous.entries.length} large sleeves current, ${previous.skipped?.length ?? 0} on the wall rung only`);
    return;
  }

  await mkdir(cacheDir, { recursive: true });
  const sleeves = {
    printed: new Map((await json("data/album-art-manifest.json")).entries.map((entry) => [entry.id, entry])),
    catalogue: new Map((await json("data/listening-artwork.json")).entries.map((entry) => [entry.id, entry])),
    lastfm: new Map((await json("data/album-wall.json")).played.map((entry) => [entry.id, entry]))
  };

  const entries = [];
  const skipped = [];
  let bytesWritten = 0;
  for (const [index, id] of ids.entries()) {
    const prior = byId.get(id);
    const current =
      prior &&
      previous.pressVersion === PRESS_VERSION &&
      (await Promise.all(["avif", "webp"].map(async (format) => {
        const file = path.join(outDir, `${id}-large.${format}`);
        return (await exists(file)) && sha(await readFile(file)) === prior.files[format];
      }))).every(Boolean);
    if (current) {
      entries.push(prior);
      continue;
    }
    const found = await sourceFor(id, sleeves);
    if (found.skip) {
      skipped.push({ id, reason: found.skip });
      process.stderr.write(`  ${id}: ${found.skip}\n`);
      continue;
    }
    const side = await square(found.bytes);
    // A cover checked by eye may be smaller: anything past the wall helps.
    if (side < (found.match === "by eye" ? 360 : LEAST)) {
      skipped.push({ id, reason: `source is ${side}px` });
      continue;
    }
    const width = Math.min(WIDTH, side);
    const base = await press(sharp, sharp(found.bytes).resize(width, width, { fit: "cover", position: "centre" }).removeAlpha());
    const avif = await base.clone().avif(AVIF).toBuffer();
    const webp = await base.clone().webp(WEBP).toBuffer();
    await writeFile(path.join(outDir, `${id}-large.avif`), avif);
    await writeFile(path.join(outDir, `${id}-large.webp`), webp);
    bytesWritten += avif.length + webp.length;
    entries.push({
      id,
      source: found.source,
      ref: found.ref ?? null,
      ...(found.match === undefined ? {} : { match: found.match }),
      sourceHash: sha(found.bytes),
      width,
      files: { avif: sha(avif), webp: sha(webp) }
    });
    if ((index + 1) % 10 === 0) process.stderr.write(`  ${index + 1}/${ids.length}\n`);
  }

  await writeFile(
    manifestPath,
    `${JSON.stringify({ note: "Generated by scripts/build-music-art.mjs.", pressVersion: PRESS_VERSION, width: WIDTH, entries, skipped }, null, 2)}\n`
  );
  await writeModule(entries);
  console.log(`music-art: ${entries.length} large sleeves (${(bytesWritten / 1048576).toFixed(1)}MB new), ${skipped.length} on the wall rung only`);
}

await main();
