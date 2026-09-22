#!/usr/bin/env node
// Run locally against the owning private history. Never copy source events into
// this repository. Only the allowlisted public counts are written.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildListeningCounts } from "../lib/listening-counts.mjs";
import { applyListeningArtwork } from "../lib/listening-artwork.mjs";

const root = process.argv[process.argv.indexOf("--history-root") + 1];
if (!process.argv.includes("--history-root") || !root || root.startsWith("--"))
  throw Error("Usage: node scripts/build-listening-counts.mjs --history-root PRIVATE_HISTORY_DIRECTORY");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const rows = (path) => readFileSync(resolve(root, path), "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const spotify = rows("private/spotify/extended-streaming-history.jsonl");
const packet = buildListeningCounts({
  wall: json(new URL("../data/album-wall.json", import.meta.url)),
  curation: json(new URL("../data/taste-curation.json", import.meta.url)),
  spotify,
  youtube: rows("private/youtube/history.jsonl"),
  youtubeAnnotations: rows("private/youtube/music-reconciliation.jsonl"),
  lastfm: rows("private/lastfm/scrobbles.jsonl"),
  lastfmAnnotations: rows("private/lastfm/media-reconciliation.jsonl"),
  apple: json(resolve(root, "data/apple-podcasts.json")),
  asOf: new Date().toISOString().slice(0, 10),
});
packet.albums = applyListeningArtwork(packet.albums, json(new URL("../data/listening-artwork.json", import.meta.url)));
writeFileSync(new URL("../public/listening-catalogue.json", import.meta.url), JSON.stringify(packet) + "\n");
console.log(JSON.stringify({ albums: packet.albums.length, podcasts: packet.podcasts.length, diagnostics: packet.diagnostics }, null, 2));
