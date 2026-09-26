/*
 * Where each of the Music room's albums can be heard, and a check that its
 * sleeve really is that album's cover.
 *
 * For each album in public/music-ranking.json this finds the release group on
 * MusicBrainz (CC0) and the Spotify and Apple Music albums its releases and
 * its Wikidata item link to, each confirmed by title (Spotify's public oEmbed,
 * Apple's lookup), with Apple's search as a second way in. The track sheet
 * links to both (public/music-links.json); an album with neither links to a
 * search on each instead, built in the page (Dan, 26 September 2026). No
 * service here needs a key; Odesli closed its public API in 2026.
 *
 * The cover check compares each committed sleeve with the same album's cover
 * on Deezer, Apple Music and the Cover Art Archive, as 16px fingerprints
 * through the same press as the sleeves (build-music-art.mjs): the same cover
 * scores well under SAME_COVER. Card 135, Ants From Up There's sleeve, was
 * catalogued as For the First Time until 26 September 2026; this is the check
 * that catches that. A sleeve that differs, or has nothing to be compared
 * with, needs a look by eye, recorded in REVIEWED. check-music-sources.mjs
 * fails the build while an album has neither a matching cover nor a review.
 *
 * Downloads and answers are cached in .album-art-cache/, which is not
 * committed, so a rerun asks only about albums it has not seen.
 *
 *   node scripts/build-music-sources.mjs
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { press } from "./press-curve.mjs";
import { unpackRanking } from "../components/paper/music-ranking.mjs";

const root = new URL("../", import.meta.url).pathname;
const cacheDir = path.join(root, ".album-art-cache");
const AGENT = "akibwa-music-sources/1.0 (https://akibwa.com)";
// Mean difference per channel (0–255) between two 16px fingerprints; the same
// cover lands well under this (as in build-music-art.mjs).
const SAME_COVER = 24;

/*
 * Sleeves checked by eye where the fingerprint cannot settle it: a printed
 * card of another pressing, or no independent cover to compare with. Each
 * says what was seen.
 */
const REVIEWED = {
  "lf-8e9c2fc439ba2bd6": "The same drawing as Surf on Deezer, credited there to Donnie Trumpet & The Social Experiment.",
  "188": "The same cover; the printed card is a darker scan, framed a little differently.",
  "240": "The same photograph; the printed card is a warmer scan.",
  "lf-4f06c006ff18c338": "The 1999 album's cover, as on Deezer; Apple Music lists the 25th anniversary edition.",
  "history-7abaf827ee921950": "Bang on a Can's 1998 recording, the same cover as on Deezer, where it is credited to them.",
  "229": "The UK double EP's sleeve, the band in animal costumes under a starry BEATLES; the services show the US LP's yellow one.",
  "lf-516104b1b71f11e2": "The original sleeve; the services show the 2015 remaster's, the same portrait in a black frame.",
  "lf-6ad83c9cca124c69": "The same logo as on Deezer and Apple Music; its thin lines throw the fingerprint."
};

const sha = (value) => createHash("sha256").update(value).digest("hex").slice(0, 16);
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
// Joint credits ("Panda Bear & Sonic Boom") match either name.
const credits = (name) => new Set(fold(name).split(/\s+(?:and|with|x)\s+|\s*,\s*/).filter(Boolean));
const sameArtist = (a, b) => fold(a) === fold(b) || [...credits(a)].some((part) => credits(b).has(part));

// Each service's requests spaced to its limit (a slot is taken before any
// wait, so albums looked up side by side never share one), answers cached.
const nextAt = new Map();
async function turn(host, spacing) {
  const now = Date.now();
  const at = Math.max(now, nextAt.get(host) ?? 0);
  nextAt.set(host, at + spacing);
  if (at > now) await pause(at - now);
}
async function fetchBytes(url, { spacing = 0, headers = {} } = {}) {
  const cached = path.join(cacheDir, `sources-${sha(url)}.bin`);
  if (await exists(cached)) return readFile(cached);
  await turn(new URL(url).host, spacing);
  let response = null;
  try {
    response = await fetch(url, { headers: { "User-Agent": AGENT, ...headers }, redirect: "follow" });
  } catch {
    return null;
  }
  if (response.status === 429) {
    await pause(60000);
    return fetchBytes(url, { spacing, headers });
  }
  if (!response.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(cached, bytes);
  return bytes;
}
async function fetchJson(url, options) {
  const bytes = await fetchBytes(url, { ...options, headers: { Accept: "application/json" } });
  try {
    return bytes ? JSON.parse(bytes.toString("utf8")) : null;
  } catch {
    return null;
  }
}

// A 16px square fingerprint, pressed like the sleeves so tones compare.
async function print(bytes, pressed) {
  const small = sharp(bytes).resize(16, 16, { fit: "cover", position: "centre" }).removeAlpha().toColourspace("srgb");
  const pipeline = pressed ? small : await press(sharp, small);
  return pipeline.raw().toBuffer();
}
async function likeness(bytes, sleeve) {
  try {
    const [a, b] = await Promise.all([print(bytes, false), print(sleeve, true)]);
    let total = 0;
    for (let i = 0; i < a.length; i += 1) total += Math.abs(a[i] - b[i]);
    return total / a.length;
  } catch {
    return Infinity;
  }
}

const same = (a, b) => fold(a) === fold(b);

// The release group, its releases' links and its Wikidata item's.
async function musicBrainz(album) {
  const query = `releasegroup:"${album.title.replace(/"/g, "")}" AND artist:"${album.artist.replace(/"/g, "")}"`;
  const groups = await fetchJson(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=5`, { spacing: 1100 });
  // An album before an EP before anything else: a single can share the name.
  const kinds = ["Album", "EP"];
  const rank = (entry) => (kinds.includes(entry["primary-type"]) ? kinds.indexOf(entry["primary-type"]) : kinds.length);
  const group = (groups?.["release-groups"] ?? []).filter((entry) => entry.score >= 90 && same(entry.title, album.title)).sort((a, b) => rank(a) - rank(b))[0];
  if (!group) return null;
  const releases = await fetchJson(`https://musicbrainz.org/ws/2/release?release-group=${group.id}&inc=url-rels&fmt=json&limit=100`, { spacing: 1100 });
  const own = await fetchJson(`https://musicbrainz.org/ws/2/release-group/${group.id}?inc=url-rels&fmt=json`, { spacing: 1100 });
  const urls = [...(own?.relations ?? []), ...(releases?.releases ?? []).flatMap((release) => release.relations ?? [])].map((relation) => relation.url?.resource).filter(Boolean);
  const spotify = [];
  const apple = [];
  // Wikidata's own Spotify and Apple Music album IDs come first.
  const item = urls.find((url) => url.includes("wikidata.org/wiki/Q"))?.split("/").pop();
  if (item) {
    const entity = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${item}.json`, { spacing: 250 });
    const claim = (property) => entity?.entities?.[item]?.claims?.[property]?.map((entry) => entry.mainsnak?.datavalue?.value).filter(Boolean) ?? [];
    spotify.push(...claim("P2205"));
    apple.push(...claim("P2281"));
  }
  for (const url of urls) {
    const onSpotify = url.match(/open\.spotify\.com\/album\/([A-Za-z0-9]{22})/);
    if (onSpotify) spotify.push(onSpotify[1]);
    const onApple = url.match(/(?:music|itunes)\.apple\.com\/.*?album\/(?:[^/]+\/)?(?:id)?(\d{5,})/);
    if (onApple) apple.push(onApple[1]);
  }
  return { ref: `https://musicbrainz.org/release-group/${group.id}`, group: group.id, spotify: [...new Set(spotify)], apple: [...new Set(apple)] };
}

// A Spotify album that exists under this title (its public oEmbed).
async function spotifyAlbum(ids, album) {
  for (const id of ids.slice(0, 4)) {
    const url = `https://open.spotify.com/album/${id}`;
    const answer = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { spacing: 300 });
    if (answer?.title && same(answer.title, album.title)) return { url, thumbnail: answer.thumbnail_url ?? null };
  }
  return null;
}

// An Apple Music album in the UK store under this title and artist: by the
// IDs found above, else Apple's own search.
async function appleAlbum(ids, album) {
  const fits = (result) =>
    result?.collectionName && !/ - Single$/i.test(result.collectionName) && same(result.collectionName, album.title) && sameArtist(result.artistName ?? "", album.artist);
  const found = (result) => ({ url: result.collectionViewUrl?.split("?")[0], artwork: result.artworkUrl100?.replace(/\/[^/]+$/, "/600x600bb.jpg") });
  for (const id of ids.slice(0, 4)) {
    const answer = await fetchJson(`https://itunes.apple.com/lookup?id=${id}&entity=album&country=GB`, { spacing: 3200 });
    const result = (answer?.results ?? []).find((entry) => entry.wrapperType === "collection");
    if (fits(result)) return found(result);
  }
  for (const term of [`${album.artist} ${album.title}`, album.title]) {
    const attribute = term === album.title ? "&attribute=albumTerm" : "";
    const answer = await fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&country=GB&limit=50${attribute}`, { spacing: 3200 });
    const result = (answer?.results ?? []).find(fits);
    if (result) return found(result);
  }
  return null;
}

// Deezer's cover for the album, a large, reliable second opinion.
async function deezerCover(album) {
  const query = `artist:"${album.artist.replace(/"/g, "")}" album:"${album.title.replace(/"/g, "")}"`;
  const answer = await fetchJson(`https://api.deezer.com/search/album?q=${encodeURIComponent(query)}&limit=10`, { spacing: 150 });
  const result = (answer?.data ?? []).find((entry) => entry.record_type !== "single" && same(entry.title, album.title) && sameArtist(entry.artist?.name ?? "", album.artist));
  return result?.cover_xl ? { url: result.cover_xl, ref: result.link } : null;
}

async function lookUp(album) {
  const file = path.join(root, "public/album-art", `${album.id}-wall.webp`);
  const sleeve = (await exists(file)) ? await readFile(file) : null;
  const brainz = await musicBrainz(album);
  const [spotify, apple, deezer] = await Promise.all([spotifyAlbum(brainz?.spotify ?? [], album), appleAlbum(brainz?.apple ?? [], album), deezerCover(album)]);
  // The closest of the independent covers.
  const candidates = [
    deezer && { source: "deezer", ref: deezer.ref, image: deezer.url },
    apple?.artwork && { source: "apple music", ref: apple.url, image: apple.artwork },
    brainz && { source: "cover art archive", ref: brainz.ref, image: `https://coverartarchive.org/release-group/${brainz.group}/front-500` },
    spotify?.thumbnail && { source: "spotify", ref: spotify.url, image: spotify.thumbnail }
  ].filter(Boolean);
  let cover = null;
  if (sleeve) {
    for (const candidate of candidates) {
      const bytes = await fetchBytes(candidate.image, { spacing: 300 });
      if (!bytes) continue;
      const score = await likeness(bytes, sleeve);
      if (score < Infinity && (!cover || score < cover.score)) cover = { source: candidate.source, ref: candidate.ref, score: +score.toFixed(1) };
      if (cover && cover.score < SAME_COVER / 2) break;
    }
  }
  const verdict = REVIEWED[album.id] ? "reviewed" : !sleeve ? "no sleeve" : !cover ? "unchecked" : cover.score < SAME_COVER ? "same" : "differs";
  if (verdict !== "same" && verdict !== "reviewed") process.stderr.write(`  ${album.artist} — ${album.title}: ${verdict}${cover ? ` (${cover.score}, ${cover.source})` : ""}\n`);
  return {
    id: album.id,
    title: album.title,
    artist: album.artist,
    spotify: spotify?.url ?? null,
    apple: apple?.url ?? null,
    cover,
    verdict,
    ...(REVIEWED[album.id] ? { review: REVIEWED[album.id] } : {})
  };
}

async function main() {
  await mkdir(cacheDir, { recursive: true });
  const music = unpackRanking(JSON.parse(await readFile(path.join(root, "public/music-ranking.json"), "utf8")));
  const entries = new Array(music.albums.length);
  let done = 0;
  // A few albums at once: each waits only on its own services' spacing.
  const queue = [...music.albums.entries()];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [index, album] = next;
      entries[index] = await lookUp(album);
      done += 1;
      if (done % 10 === 0) process.stderr.write(`  ${done}/${music.albums.length}\n`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  await writeResults(entries);
}

async function writeResults(entries) {
  await writeFile(
    path.join(root, "data/music-sources.json"),
    `${JSON.stringify({ note: "Generated by scripts/build-music-sources.mjs: where each Music room album is heard, and whether its sleeve matches an independent cover.", sameCover: SAME_COVER, entries }, null, 2)}\n`
  );
  const links = Object.fromEntries(
    entries.filter((entry) => entry.apple || entry.spotify).map((entry) => [entry.id, { ...(entry.spotify ? { spotify: entry.spotify } : {}), ...(entry.apple ? { apple: entry.apple } : {}) }])
  );
  await writeFile(path.join(root, "public/music-links.json"), `${JSON.stringify({ schemaVersion: 1, albums: links })}\n`);
  const count = (verdict) => entries.filter((entry) => entry.verdict === verdict).length;
  console.log(
    `music-sources: ${entries.length} albums; covers ${count("same")} same, ${count("reviewed")} reviewed, ${count("differs")} differ, ${count("unchecked")} unchecked, ${count("no sleeve")} without a sleeve; ${entries.filter((entry) => entry.apple).length} on Apple Music, ${entries.filter((entry) => entry.spotify).length} on Spotify`
  );
}

await main();
