#!/usr/bin/env node
// Download only reviewed public catalogue covers. The committed overlay owns
// artwork identity; searches never alter public metadata or listening counts.
// Existing printed/Last.fm rungs are copied losslessly when the same release
// already has a verified sleeve. This script never removes another ladder.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { PRESS_VERSION, press } from "./press-curve.mjs";
import { applyListeningArtwork } from "../lib/listening-artwork.mjs";

const root = new URL("../", import.meta.url);
const manifestPath = new URL("data/listening-artwork.json", root);
const packetPath = new URL("public/listening-catalogue.json", root);
const out = new URL("public/album-art/", root);
const cache = new URL(".album-art-cache/", root);
const checkOnly = process.argv.includes("--check");
const hash = (value) => createHash("sha256").update(value).digest("hex").slice(0, 16);
const json = async (url) => JSON.parse(await readFile(url, "utf8"));
const manifest = await json(manifestPath);
const packet = await json(packetPath);
const albums = applyListeningArtwork(packet.albums, manifest);
const suffixes = ["wall.avif", "wall.webp", "card.avif"];
const problems = [];
let generated = 0;

async function current(entry) {
  if (entry.derived?.pressVersion !== PRESS_VERSION) return false;
  if (entry.derived.sourceKey !== (entry.reuseId || entry.source.artworkUrl)) return false;
  for (const suffix of suffixes) {
    try {
      const bytes = await readFile(new URL(`${entry.id}-${suffix}`, out));
      if (hash(bytes) !== entry.derived.files?.[suffix]) return false;
      if (entry.reuseId && hash(await readFile(new URL(`${entry.reuseId}-${suffix}`, out))) !== hash(bytes))
        return false;
    } catch { return false; }
  }
  return true;
}

if (!checkOnly) {
  await mkdir(out, { recursive: true });
  await mkdir(cache, { recursive: true });
}
for (const entry of manifest.entries) {
  if (!/^history-[a-f0-9]{16}$/.test(entry.id)) throw Error(`Unowned artwork ID: ${entry.id}`);
  if (await current(entry)) continue;
  if (checkOnly) { problems.push(`${entry.id} needs its artwork generated`); continue; }
  let files, sourceHash;
  if (entry.reuseId) {
    if (!/^(?:\d{3}|lf-[a-f0-9]{16})$/.test(entry.reuseId)) throw Error(`Invalid source sleeve: ${entry.reuseId}`);
    files = Object.fromEntries(await Promise.all(suffixes.map(async (suffix) =>
      [suffix, await readFile(new URL(`${entry.reuseId}-${suffix}`, out))])));
  } else {
    const imageUrl = new URL(entry.source.artworkUrl);
    if (imageUrl.protocol !== "https:" || !imageUrl.hostname.endsWith(".mzstatic.com"))
      throw Error(`Unapproved artwork source: ${entry.id}`);
    const cached = new URL(`catalogue-${hash(imageUrl.href)}.bin`, cache);
    let bytes;
    try { bytes = await readFile(cached); }
    catch {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Error(`Artwork download ${entry.id}: HTTP ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      await writeFile(cached, bytes);
    }
    sourceHash = hash(bytes);
    const metadata = await sharp(bytes).metadata();
    if (metadata.width < 264 || metadata.height < 264)
      throw Error(`Artwork source is too small: ${entry.id}`);
    files = {};
    for (const [rung, target] of [["wall", 264], ["card", 760]]) {
      const size = Math.min(target, metadata.width, metadata.height);
      const image = await press(sharp, sharp(bytes).resize(size, size, { fit: "cover", position: "centre" }));
      files[`${rung}.avif`] = await image.clone().avif({ quality: 52, effort: 6 }).toBuffer();
      if (rung === "wall") files[`${rung}.webp`] = await image.clone().webp({ quality: 74 }).toBuffer();
    }
  }
  for (const [suffix, bytes] of Object.entries(files))
    await writeFile(new URL(`${entry.id}-${suffix}`, out), bytes);
  entry.derived = {
    pressVersion: PRESS_VERSION,
    sourceKey: entry.reuseId || entry.source.artworkUrl,
    ...(sourceHash ? { sourceHash } : {}),
    files: Object.fromEntries(Object.entries(files).map(([suffix, bytes]) => [suffix, hash(bytes)])),
  };
  generated++;
  if (generated % 10 === 0) console.log(`  ${generated} covers generated`);
}

if (checkOnly) {
  for (const entry of manifest.entries)
    if (!packet.albums.find((row) => row.id === entry.id).artwork)
      problems.push(`${entry.id} has not been applied to the public catalogue`);
  if (problems.length) throw Error(problems.join("\n"));
} else {
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  // Preserve the packet's asOf date: finding a cover is not a history refresh.
  await writeFile(packetPath, JSON.stringify({ ...packet, albums }) + "\n");
}
console.log(`Listening artwork: ${manifest.entries.length} verified covers, ${generated} generated; all other catalogue fields preserved.`);
