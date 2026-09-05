import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  albumCatalogue,
  browseAlbums,
  overlayPlays,
  safeLastfmUrl,
  validCount,
  acceptsAlbumPacket,
  albumSnapshot,
  snapshotCoverage,
} from "../components/album-catalogue.mjs";
import {
  tasteItemKey,
  tasteItemHash,
  resolveTasteItem,
} from "../components/taste-identity.mjs";
// The application is not a Node ESM package; load this self-contained browser
// helper as ESM without changing the repository's package module convention.
const { readSessionJson, fetchSessionJson } = await import(
  `data:text/javascript,${encodeURIComponent(readFileSync(new URL("../components/remote-data-cache.js", import.meta.url), "utf8"))}`
);
const read = (file) =>
  JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url)));
const data = read("album-wall.json"),
  catalogue = albumCatalogue(data),
  curation = read("taste-curation.json"),
  summary = read("listening-summary.json");
assert.equal(new Set(catalogue.map((a) => a.id)).size, catalogue.length);
assert(catalogue.length > 1500);
assert(
  catalogue.every((a) =>
    Object.keys(a).every((key) =>
      [
        "id",
        "artist",
        "album",
        "year",
        "printed",
        "plays",
        "lastfmUrl",
      ].includes(key),
    ),
  ),
);
for (const value of [
  null,
  undefined,
  "12",
  -1,
  NaN,
  Infinity,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
])
  assert.equal(validCount(value), null);
assert.equal(validCount(0), 0);
assert.equal(validCount(42), 42);

const baselineAt = "2026-08-27T00:00:00Z",
  now = Date.parse("2026-09-05T12:00:00Z");
const fixture = [
  { id: "first", album: "Shared title", artist: "Artist One", plays: 10 },
  { id: "second", album: "Shared title", artist: "Artist Two", plays: 20 },
  { id: "third", album: "Third", artist: "Artist Three", plays: null },
];
const cached = {
  refreshedAt: "2026-09-03T00:00:00Z",
  plays: { first: 12, second: 22 },
};
const partial = {
  refreshedAt: "2026-09-04T00:00:00Z",
  plays: { first: 0, second: "invalid", unknown: 900 },
};
const mixed = albumSnapshot(
  fixture,
  baselineAt,
  [
    { data: cached, origin: "session" },
    { data: partial, origin: "network" },
  ],
  now,
);
assert.deepEqual(
  mixed.map((row) => [row.plays, row.countOrigin, row.countAsOf]),
  [
    [0, "network", partial.refreshedAt],
    [22, "session", cached.refreshedAt],
    [null, "saved", baselineAt],
  ],
);
assert.deepEqual(snapshotCoverage(mixed), { saved: 1, session: 1, network: 1 });
assert.equal(
  albumSnapshot(
    fixture,
    undefined,
    [{ data: partial, origin: "network" }],
    now,
  )[0].plays,
  0,
);
assert.equal(
  albumSnapshot(
    fixture,
    "invalid",
    [{ data: partial, origin: "network" }],
    now,
  )[0].countOrigin,
  "network",
);
const older = {
  refreshedAt: "2026-09-01T00:00:00Z",
  plays: { first: 1, second: 2 },
};
assert.deepEqual(
  albumSnapshot(
    fixture,
    baselineAt,
    [
      { data: cached, origin: "session" },
      { data: older, origin: "network" },
    ],
    now,
  ).map((row) => row.plays),
  [12, 22, null],
);
for (const rejected of [
  { plays: {} },
  { refreshedAt: partial.refreshedAt, plays: {} },
  { refreshedAt: partial.refreshedAt, plays: { unknown: 1 } },
  { refreshedAt: partial.refreshedAt, plays: { first: -1 } },
  { refreshedAt: "2020-01-01", plays: { first: 2 } },
  { refreshedAt: "2099-01-01", plays: { first: 2 } },
]) {
  assert.equal(
    Boolean(acceptsAlbumPacket(rejected, fixture, baselineAt, now)),
    false,
  );
  assert.deepEqual(
    albumSnapshot(
      fixture,
      baselineAt,
      [{ data: rejected, origin: "network" }],
      now,
    ).map((row) => row.plays),
    [10, 20, null],
  );
}
const music = fixture
  .slice(0, 2)
  .map((row) => ({
    ...row,
    title: row.album,
    creator: row.artist,
    kind: "music",
  }));
assert.notEqual(tasteItemKey(music[0]), tasteItemKey(music[1]));
for (const item of music)
  assert.equal(resolveTasteItem(tasteItemHash(item), fixture, {}).id, item.id);
assert.equal(
  resolveTasteItem("#taste-item=music:Shared%20title", fixture, {}),
  null,
);
assert.equal(resolveTasteItem("#taste-item=music:%ZZ", fixture, {}), null);

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
const accept = (packet) => acceptsAlbumPacket(packet, fixture, baselineAt, now);
globalThis.fetch = async () => ({ ok: true, json: async () => cached });
assert.deepEqual(await fetchSessionJson("test-albums", { accept }), cached);
assert.deepEqual(readSessionJson("test-albums"), cached);
for (const bad of [
  { refreshedAt: partial.refreshedAt, plays: {} },
  { plays: { first: 999 } },
]) {
  globalThis.fetch = async () => ({ ok: true, json: async () => bad });
  assert.equal(await fetchSessionJson("test-albums", { accept }), null);
  assert.deepEqual(readSessionJson("test-albums"), cached);
}
globalThis.fetch = async () => ({ ok: true, json: async () => older });
assert.equal(
  await fetchSessionJson("test-albums", {
    accept: (packet) =>
      acceptsAlbumPacket(packet, fixture, cached.refreshedAt, now),
  }),
  null,
);
assert.deepEqual(readSessionJson("test-albums"), cached);
globalThis.fetch = async () => ({ ok: false });
assert.equal(await fetchSessionJson("test-albums", { accept }), null);
assert.deepEqual(readSessionJson("test-albums"), cached);
globalThis.fetch = savedFetch;
if (savedWindow === undefined) delete globalThis.window;
else globalThis.window = savedWindow;
for (const url of [
  "javascript:alert(1)",
  "https://evil.test/music/a",
  "http://www.last.fm/music/a",
  "https://user:pass@www.last.fm/music/a",
  "https://www.last.fm:8443/music/a",
])
  assert.equal(safeLastfmUrl(url), null);
assert.equal(
  safeLastfmUrl("https://www.last.fm/music/Test"),
  "https://www.last.fm/music/Test",
);
const input = [
  {
    id: "a",
    artist: "Zulu",
    album: "First",
    year: 2001,
    printed: true,
    plays: 2,
  },
  {
    id: "b",
    artist: "Alpha",
    album: "Second",
    year: 2020,
    printed: false,
    plays: null,
  },
  {
    id: "c",
    artist: "Alpha",
    album: "Third",
    year: 1999,
    printed: true,
    plays: 0,
  },
];
assert.deepEqual(
  overlayPlays(input, { plays: { a: 0, b: 9, c: "bad", unknown: 100 } }).map(
    (a) => a.plays,
  ),
  [0, 9, 0],
);
assert.equal(overlayPlays(input, { plays: [] }), input);
assert.deepEqual(
  browseAlbums(input, { query: " ALPHA ", sort: "year" }).map((a) => a.id),
  ["b", "c"],
);
assert.deepEqual(
  browseAlbums(input, { filter: "printed" }).map((a) => a.id),
  ["a", "c"],
);
assert.deepEqual(
  browseAlbums(input, { filter: "recorded" }).map((a) => a.id),
  ["a"],
);
assert.deepEqual(
  input.map((a) => a.id),
  ["a", "b", "c"],
);
assert(curation.albumIds.every((id) => catalogue.some((a) => a.id === id)));
assert.equal(new Set(curation.albumIds).size, curation.albumIds.length);
const openingAlbum = catalogue.find((album) => album.id === curation.albumIds[0]);
assert.equal(openingAlbum.album, "Graceland");
assert.equal(openingAlbum.artist, "Paul Simon");
assert.deepEqual(
  Object.keys(curation).sort(),
  ["source", "career", "albumIds", "films", "games", "tv", "podcasts"].sort(),
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
];
for (const category of ["career", "films", "games", "tv", "podcasts"])
  for (const row of curation[category]) {
    assert(Object.keys(row).every((key) => safeFields.includes(key)));
    const path =
      row.logo ||
      row.art
        .replace("/film-posters/", "/taste-art/films/")
        .replace("/game-covers/", "/taste-art/games/")
        .replace("/tv-posters/", "/taste-art/tv/");
    assert(
      existsSync(new URL(`../public${path}`, import.meta.url)),
      `${category}: missing ${path}`,
    );
    if (row.href) assert(row.href.startsWith("https://"));
  }
assert.deepEqual(summary.musicAudio, {
  playbackEvents: 250327,
  eventsAtLeast30Seconds: 187592,
  millisecondsPlayed: 49147249496,
});
assert.deepEqual(summary.coverage.missingYears, [2013, 2015]);
console.log(
  `Album catalogue passed: ${catalogue.length} unique records; stable IDs, safe counts and links, source separation and approved curation.`,
);
