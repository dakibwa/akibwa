#!/usr/bin/env node
// Run locally against the owning private history. Never copy source events into
// this repository. Only allowlisted public counts and the Spotify time summary
// are written.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildListeningCounts, spotifyMusicAudioSummary } from "../lib/listening-counts.mjs";

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
writeFileSync(new URL("../public/listening-catalogue.json", import.meta.url), JSON.stringify(packet) + "\n");
const summaryPath = new URL("../data/listening-summary.json", import.meta.url);
const summary = json(summaryPath);
summary.asOf = packet.asOf;
summary.musicAudio = spotifyMusicAudioSummary(spotify);
summary.method = "Recorded playback includes short and skipped events. Listening time is the provider's recorded duration, not proof of attention or completed tracks. Coverage has gaps and is not a complete lifetime total. Same-account playbacks with identical track, platform, stop time and duration are counted once, including records whose offline/shuffle/reason flags differ. YouTube and Last.fm supply no duration and are not added to this time summary.";
writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ albums: packet.albums.length, podcasts: packet.podcasts.length, diagnostics: packet.diagnostics }, null, 2));
