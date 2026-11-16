import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { browseAlbums } from "../components/album-catalogue.mjs";
const read = (file) =>
  JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url)));
const wall = read("album-wall.json");

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

console.log(`Album catalogue passed: ${snapshot.length} unique snapshot records; shelf ordering.`);
