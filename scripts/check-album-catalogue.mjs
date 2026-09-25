import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { browseAlbums } from "../components/album-catalogue.mjs";
import { tasteItemKey } from "../components/taste-identity.mjs";
// The application is not a Node ESM package; load this self-contained browser
// helper as ESM without changing the repository's package module convention.
const { readSessionJson, fetchSessionJson } = await import(
  `data:text/javascript,${encodeURIComponent(readFileSync(new URL("../components/remote-data-cache.js", import.meta.url), "utf8"))}`
);
const read = (file) =>
  JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url)));
const wall = read("album-wall.json"),
  curation = read("taste-curation.json");

// data/album-wall.json is the retained Last.fm snapshot that listening:build
// reconciles against. Its printed and played identities must stay unique.
const snapshot = [...wall.sleeves, ...(wall.played || [])].filter((row) => !row.duplicateOf);
assert.equal(new Set(snapshot.map((row) => row.id)).size, snapshot.length);
assert(snapshot.length > 1500);

// The Music shelf orders by recorded plays; unknown counts sort last and ties
// fall back to artist, then album. The input is never mutated.
const input = [
  { id: "a", artist: "Zulu", album: "First", plays: 2 },
  { id: "b", artist: "Alpha", album: "Second", plays: null },
  { id: "c", artist: "Alpha", album: "Third", plays: 2 },
  { id: "d", artist: "Beta", album: "Fourth", plays: 0 },
];
assert.deepEqual(browseAlbums(input).map((a) => a.id), ["c", "a", "d", "b"]);
assert.deepEqual(input.map((a) => a.id), ["a", "b", "c", "d"]);

const music = [
  { id: "first", title: "Shared title", creator: "Artist One", kind: "music" },
  { id: "second", title: "Shared title", creator: "Artist Two", kind: "music" },
];
assert.notEqual(tasteItemKey(music[0]), tasteItemKey(music[1]));

// Session data is explicitly cached, not fetched/fresh. Invalid successful
// responses and HTTP failures must not overwrite the last usable packet.
const store = new Map(),
  savedFetch = globalThis.fetch,
  savedWindow = globalThis.window;
globalThis.window = {
  sessionStorage: {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  },
};
const good = { asOf: "2026-09-05", albums: [{ id: "first" }] };
const accept = (packet) => Array.isArray(packet?.albums) && packet.albums.length > 0;
const respond = (packet) => ({ ok: true, text: async () => JSON.stringify(packet) });
let requestInit;
globalThis.fetch = async (_url, init) => { requestInit = init; return respond(good); };
assert.deepEqual(await fetchSessionJson("test-albums", { accept }), good);
// Revalidate rather than re-download: an unchanged catalogue answers 304.
assert.equal(requestInit.cache, "no-cache");
assert.deepEqual(readSessionJson("test-albums"), good);
for (const bad of [{ asOf: "2026-09-06", albums: [] }, { plays: { first: 999 } }]) {
  globalThis.fetch = async () => respond(bad);
  assert.equal(await fetchSessionJson("test-albums", { accept }), null);
  assert.deepEqual(readSessionJson("test-albums"), good);
}
globalThis.fetch = async () => ({ ok: false });
assert.equal(await fetchSessionJson("test-albums", { accept }), null);
assert.deepEqual(readSessionJson("test-albums"), good);
globalThis.fetch = savedFetch;
if (savedWindow === undefined) delete globalThis.window;
else globalThis.window = savedWindow;

assert.equal(new Set(curation.albumIds).size, curation.albumIds.length);
assert.deepEqual(
  Object.keys(curation).sort(),
  ["source", "career", "albumIds", "podcasts", "podcastListening"].sort(),
);
const safeFields = [
  "name",
  "role",
  "span",
  "accent",
  "logo",
  "tile",
  "title",
  "creator",
  "year",
  "art",
  "note",
  "href",
  "statement",
  "emphasis",
  "listens",
  "appleEpisodes",
];
for (const category of ["career", "podcasts"])
  for (const row of curation[category]) {
    assert(Object.keys(row).every((key) => safeFields.includes(key)));
    const path = row.logo || row.art;
    if (path) assert(existsSync(new URL(`../public${path}`, import.meta.url)), `${category}: missing ${path}`);
    else assert.equal(category, "podcasts", "only a podcast may use a typographic cover");
    if (row.href) assert(row.href.startsWith("https://"));
  }
assert(curation.career.every((job) => job.statement && job.emphasis.every((term) => job.statement.includes(term))));
assert(new Set(curation.podcasts.map((show) => show.title)).size === curation.podcasts.length);
assert(curation.podcasts.every((show) => !("listens" in show) && !("appleEpisodes" in show)), "curation must not retain stale provider-only counts");
console.log(
  `Album catalogue passed: ${snapshot.length} unique snapshot records; shelf ordering, session cache and approved curation.`,
);
