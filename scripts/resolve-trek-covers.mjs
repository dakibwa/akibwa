#!/usr/bin/env node
// Fetch the real record fronts for the trek's matched days.
//
// Input:  data/trek-matches.json — curated, verified matches only.
// Output: public/trek/covers/<slug>.webp        480px, spotlight size
//         public/trek/covers/<slug>-thumb.webp  160px, thread size
//         data/trek-covers.json                 resolution manifest for build-trek.mjs
//
// Source order per record: explicit coverUrls, Cover Art Archive by
// release-group mbid, then the printed wall card. A sleeve is only ever a
// real front — no generated art.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matchesPath = path.join(root, "data/trek-matches.json");
const outDir = path.join(root, "public/trek/covers");
const manifestPath = path.join(root, "data/trek-covers.json");

const SIZE = 480;
const THUMB = 160;
const UA = "akibwa.com trek cover resolver";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function fetchBuf(url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function fromCAA(mbid) {
  let buf = await fetchBuf(`https://coverartarchive.org/release-group/${mbid}/front-500`);
  if (buf) return buf;
  // Some groups only carry art on a release: look one up.
  try {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/release?release-group=${mbid}&fmt=json&limit=25`,
      { headers: { "user-agent": UA } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const r of data.releases || []) {
      buf = await fetchBuf(`https://coverartarchive.org/release/${r.id}/front-500`);
      if (buf) return buf;
    }
  } catch {}
  return null;
}

function fromWall(wallId) {
  const p = path.join(root, "public/album-art", `${wallId}-wall.webp`);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

const matches = JSON.parse(fs.readFileSync(matchesPath, "utf8")).matches;
fs.mkdirSync(outDir, { recursive: true });

const manifest = {
  source: "curated lyrics/song/album matches; Cover Art Archive fronts, printed wall cards as fallback",
  rule: "A sleeve is only the real front of a verified record. Titles without a verified match stay blank jackets.",
  resolvedAt: new Date().toISOString(),
  titles: {},
};

let ok = 0;
let miss = 0;
const bySlug = new Map();

for (const [gpsTitle, rec] of Object.entries(matches)) {
  const slug = slugify(rec.album || rec.song || gpsTitle);
  manifest.titles[gpsTitle] = {
    slug,
    kind: rec.kind,
    song: rec.song || null,
    album: rec.album,
    artist: rec.artist,
    note: rec.note || null,
  };
  if (bySlug.has(slug)) continue; // shared sleeve (e.g. the split album title)
  bySlug.set(slug, true);

  let buf = null;
  let src = null;
  for (const url of rec.coverUrls || []) {
    buf = await fetchBuf(url);
    if (buf) {
      src = "coverUrl";
      break;
    }
  }
  if (!buf && rec.mbid) {
    buf = await fromCAA(rec.mbid);
    if (buf) src = "caa";
  }
  if (!buf && rec.wallId) {
    buf = fromWall(rec.wallId);
    if (buf) src = `wall ${rec.wallId}`;
  }
  if (!buf) {
    console.warn(`! no front for ${gpsTitle} (${rec.artist} — ${rec.album})`);
    miss += 1;
    continue;
  }
  await sharp(buf).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 82 }).toFile(path.join(outDir, `${slug}.webp`));
  await sharp(buf).resize(THUMB, THUMB, { fit: "cover" }).webp({ quality: 80 }).toFile(path.join(outDir, `${slug}-thumb.webp`));
  console.log(`= ${gpsTitle}  [${src}]  ${rec.artist} — ${rec.album}`);
  ok += 1;
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
console.log(`\n${ok} sleeves written, ${miss} missing, manifest → data/trek-covers.json`);
