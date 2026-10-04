import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { unpackRanking } from "../components/paper/music-ranking.mjs";

const ranking = JSON.parse(readFileSync(new URL("../public/music-ranking.json", import.meta.url), "utf8"));

test("the published ranking decodes all albums, songs and track lists", () => {
  const result = unpackRanking(ranking);
  assert.equal(result.albums.length, 150);
  assert.equal(result.songs.length, 1000);
  assert.ok(result.albums.every((album) => album.artist && album.tracks));
});

test("empty, partial and unsupported responses cannot replace the music seed", () => {
  for (const packet of [null, {}, { ...ranking, songs: [] }, { ...ranking, albums: [] }, { ...ranking, names: [] }, { ...ranking, schemaVersion: 99 }]) {
    assert.throws(() => unpackRanking(packet), /incomplete or unsupported/);
  }
});

test("bad artist references, titles, durations and tracks are rejected before rendering", () => {
  for (const breakPacket of [
    (packet) => { packet.songs[0][1] = packet.names.length; },
    (packet) => { packet.songs[0][0] = null; },
    (packet) => { packet.songs[0][5] = -1; },
    (packet) => { packet.albums[0][6] = {}; },
    (packet) => { packet.albums[0][6][0][0] = null; }
  ]) {
    const packet = structuredClone(ranking);
    breakPacket(packet);
    assert.throws(() => unpackRanking(packet), /incomplete or unsupported/);
  }
});
