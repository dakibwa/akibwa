#!/usr/bin/env node
/**
 * Resolve Cover Art Archive fronts for trek day titles via MusicBrainz.
 *
 * A GPS title may only wear a sleeve when it equals a release-group title
 * after normalisation. Recordings, near-misses, and stretched names
 * ("The Predatory Wasp of the Palisades…", "Taking Tiger Mountain (By Strategy)")
 * are not used — that would be guessing a cover for a walking-day pun or a song.
 *
 * Common titles (Arrival, Recovery, Lilac) belong to too many albums; those
 * stay sleeveless. Unique albums, and a clearly canonical album of that exact
 * name (most releases, by a wide margin), are kept. Audiobooks, broadcasts,
 * compilations, live records, and singles are not album sleeves.
 *
 *   node scripts/resolve-trek-covers.mjs
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const daysPath = path.join(root, "data/trek-days.json");
const outJson = path.join(root, "data/trek-covers.json");
const outDir = path.join(root, "public/trek/covers");
const UA = "AkibwaTrek/1.0 (https://akibwa.com/trek/; ***REMOVED***)";
const SIZE = 128;

const BANNED_SECONDARY = new Set([
  "audiobook",
  "spokenword",
  "interview",
  "audio drama",
  "live",
  "compilation",
  "remix",
  "soundtrack",
  "demo",
  "mixtape"
]);

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^['"\s]+|['"\s]+$/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const wordCount = (s) => norm(s).split(" ").filter(Boolean).length;
const artistOf = (h) => (h["artist-credit"] || []).map((a) => a.name).join("");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function secondary(h) {
  return (h["secondary-types"] || []).map((t) => String(t).toLowerCase());
}

function isBannedSecondary(h) {
  return secondary(h).some((t) => BANNED_SECONDARY.has(t));
}

function isSleeveType(h) {
  const t = String(h["primary-type"] || "").toLowerCase();
  if (t !== "album" && t !== "ep") return false;
  if (isBannedSecondary(h)) return false;
  return true;
}

async function mb(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (res.status === 503 || res.status === 429) {
    await sleep(1600);
    return mb(url);
  }
  if (!res.ok) throw new Error(`MusicBrainz ${res.status} ${url}`);
  return res.json();
}

async function searchReleaseGroups(title) {
  const q = `releasegroup:"${title.replace(/"/g, "")}"`;
  const url =
    "https://musicbrainz.org/ws/2/release-group/?query=" +
    encodeURIComponent(q) +
    "&fmt=json&limit=25";
  return mb(url);
}

function isUsableRecord(h) {
  const t = String(h["primary-type"] || "").toLowerCase();
  if (t === "broadcast") return false;
  if (isBannedSecondary(h)) return false;
  return true;
}

function pickReleaseGroup(title, data) {
  const want = norm(title);
  const hits = (data["release-groups"] || []).filter(
    (h) => norm(h.title) === want && Number(h.score) >= 80
  );
  const total = Number(data.count) || hits.length;
  const usable = hits.filter(isUsableRecord);
  const albums = usable.filter(isSleeveType);

  // The only MusicBrainz release-group with this exact title — even a single
  // or EP — is not a guess (Mazarin Another One Goes By, Kid Carpet Dogmeat).
  if (total === 1 && usable.length === 1) {
    return { hit: usable[0] };
  }

  if (!albums.length) {
    return { hit: null, reason: hits.length ? "no-album-or-ep" : "no-exact-release-group" };
  }

  albums.sort((a, b) => {
    const ta = String(a["primary-type"] || "").toLowerCase() === "album" ? 0 : 1;
    const tb = String(b["primary-type"] || "").toLowerCase() === "album" ? 0 : 1;
    if (ta !== tb) return ta - tb;
    return (Number(b.count) || 0) - (Number(a.count) || 0);
  });

  const byArtist = new Map();
  for (const h of albums) {
    const k = norm(artistOf(h)) || artistOf(h);
    if (!byArtist.has(k)) byArtist.set(k, h);
  }
  const artists = [...byArtist.values()];
  const top = artists[0];
  const second = artists[1];
  const c1 = Number(top.count) || 0;
  const c2 = second ? Number(second.count) || 0 : 0;

  if (artists.length === 1) {
    const otherExactArtists = new Set(
      hits.map(artistOf).filter((a) => a && norm(a) !== norm(artistOf(top)))
    );
    if (wordCount(title) <= 2 && (c1 < 4 || otherExactArtists.size > 0)) {
      return { hit: null, reason: "common-short-title", album: top.title, artist: artistOf(top), mbid: top.id };
    }
    // The Two Towers: one obscure album among a pile of audiobooks / scores.
    if (total > 8 && c1 < 4) {
      return { hit: null, reason: "common-title", album: top.title, artist: artistOf(top), mbid: top.id };
    }
    return { hit: top };
  }

  if (c1 >= 8 && c1 >= 3 * Math.max(1, c2)) {
    return { hit: top };
  }

  return {
    hit: null,
    reason: total > 12 ? "common-title" : "ambiguous-title",
    candidates: artists.slice(0, 4).map((h) => ({
      artist: artistOf(h),
      album: h.title,
      releases: Number(h.count) || 0,
      mbid: h.id
    }))
  };
}

async function fetchCoverUrl(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 400) return null;
  return buf;
}

async function fetchCover(mbid) {
  const fromGroup = await fetchCoverUrl(`https://coverartarchive.org/release-group/${mbid}/front-250`);
  if (fromGroup) return fromGroup;
  await sleep(1100);
  const rg = await mb(`https://musicbrainz.org/ws/2/release-group/${mbid}?inc=releases&fmt=json`);
  const releases = [...(rg.releases || [])].sort((a, b) => {
    const rank = (s) => (String(s?.status).toLowerCase() === "official" ? 0 : 1);
    return rank(a) - rank(b);
  });
  for (const r of releases.slice(0, 6)) {
    await sleep(400);
    const img = await fetchCoverUrl(`https://coverartarchive.org/release/${r.id}/front-250`);
    if (img) return img;
  }
  return null;
}

const days = JSON.parse(await readFile(daysPath, "utf8")).days;
const unique = [];
const seen = new Set();
for (const d of days) {
  if (!d.walked || !d.title) continue;
  const key = norm(d.title);
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(d.title);
}

await mkdir(outDir, { recursive: true });
let byTitle = {};
try {
  const prev = JSON.parse(await readFile(outJson, "utf8"));
  byTitle = prev.titles || {};
} catch {
  byTitle = {};
}

for (const title of unique) {
  const existing = byTitle[title];
  if (existing?.matched && existing.src) {
    const file = path.join(root, "public", existing.src.replace(/^\//, ""));
    try {
      await readFile(file);
      console.log(`= ${title}  keep ${existing.artist} — ${existing.album}`);
      continue;
    } catch {
      // file missing, resolve again
    }
  }
  process.stdout.write(`? ${title}  `);
  await sleep(1100);
  let data = null;
  try {
    data = await searchReleaseGroups(title);
  } catch (err) {
    console.log("ERR", err.message);
    byTitle[title] = { matched: false, reason: "musicbrainz-error" };
    continue;
  }
  const picked = pickReleaseGroup(title, data);
  if (!picked.hit) {
    console.log(picked.reason);
    byTitle[title] = { matched: false, ...picked, hit: undefined };
    continue;
  }
  const hit = picked.hit;
  await sleep(400);
  let img = null;
  try {
    img = await fetchCover(hit.id);
  } catch (err) {
    console.log("CAA", err.message);
    byTitle[title] = {
      matched: false,
      reason: "no-cover",
      artist: artistOf(hit),
      album: hit.title,
      mbid: hit.id
    };
    continue;
  }
  if (!img) {
    console.log("no front cover");
    byTitle[title] = {
      matched: false,
      reason: "no-cover",
      artist: artistOf(hit),
      album: hit.title,
      mbid: hit.id
    };
    continue;
  }
  const slug = norm(title).replace(/\s+/g, "-").slice(0, 60) || "cover";
  const file = `${slug}.webp`;
  await sharp(img).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 76 }).toFile(path.join(outDir, file));
  const artist = artistOf(hit);
  byTitle[title] = {
    matched: true,
    src: `/trek/covers/${file}`,
    artist,
    album: hit.title,
    mbid: hit.id,
    primaryType: hit["primary-type"] || null
  };
  console.log(`→ ${artist} — ${hit.title}`);
}

const daysOut = {};
for (const d of days) {
  if (!d.walked || !d.title) continue;
  const rec = byTitle[d.title];
  if (rec?.matched) daysOut[d.n] = rec;
}

await writeFile(
  outJson,
  JSON.stringify(
    {
      source: "musicbrainz-release-group + cover-art-archive",
      rule: "GPS title must equal a release-group album/EP title. No recordings, no stretched names, no common-title guesses.",
      resolvedAt: new Date().toISOString(),
      titles: byTitle,
      days: daysOut
    },
    null,
    2
  ) + "\n"
);

const files = (await readdir(outDir)).filter((f) => f.endsWith(".webp"));
const matched = unique.filter((t) => byTitle[t]?.matched).length;
console.log(
  `matched ${matched} of ${unique.length} unique titles; ${Object.keys(daysOut).length} walked days with art; ${files.length} files`
);
