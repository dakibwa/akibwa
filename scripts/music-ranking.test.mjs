import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { unpackRanking } from "../components/paper/music-ranking.mjs";

import { compileCatalogue } from "../lib/paper-home.mjs";
import { openCatalogue } from "../components/paper/music-catalogue.mjs";
import { mergeShelf, yearPairs } from "../components/paper/music-shelf.mjs";
import { indexItems } from "../components/paper/music-search.mjs";

const ranking = JSON.parse(readFileSync(new URL("../public/music-ranking.json", import.meta.url), "utf8"));

test("the published ranking decodes all albums, songs and track lists", () => {
  const result = unpackRanking(ranking);
  assert.equal(result.albums.length, 150);
  assert.equal(result.songs.length, 1000);
  assert.ok(result.albums.every((album) => album.artist && album.tracks));
  // The other records the songs come from, each with its tracks.
  assert.ok(result.sleeves.length > 0 && result.sleeves.every((record) => record.artist && record.tracks.length));
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

test("the browser catalogue preserves every record, track, year and artist connection", () => {
  const read = name => JSON.parse(readFileSync(new URL(`../public/music-${name}.json`, import.meta.url)));
  const meta = read("meta");
  const years = read("years");
  const kinds = read("kinds");
  const full = unpackRanking(ranking);
  const records = mergeShelf(full.albums, full.songs, full.sleeves, full.singles);
  const original = indexItems(records, {
    meta, yearOf: item => Number(item.year) || meta.years[item.art] || null,
    extraText: item => [...(item.tracks ?? []), ...item.songs].map(track => track.title).join(" ")
  });
  const browser = openCatalogue(compileCatalogue(ranking, meta, years, kinds, () => ""));
  assert.deepEqual(browser.credited, original.credited);
  assert.equal(browser.entries.length, records.length);
  browser.entries.forEach((entry, i) => {
    const { item } = entry;
    const source = records[i];
    for (const field of ["key", "title", "artist", "plays", "minutes", "art", "kind", "id"]) assert.equal(item[field], source[field]);
    assert.deepEqual(item.tracks, (source.tracks ?? source.fallback ?? []).map(t => [t.title, t.plays, t.minutes]));
    assert.deepEqual(browser.years.albums[item.id], yearPairs(source, years).filter(([, minutes]) => minutes >= 60));
    assert.equal(browser.kinds.artists[item.artist], kinds.artists[item.artist]);
    assert.deepEqual(entry.circle, original.entries[i].circle);
    assert.deepEqual(entry.kin, original.entries[i].kin);
    assert.deepEqual(entry.genres, original.entries[i].genres);
    assert.equal(entry.year, original.entries[i].year);
    assert.equal(entry.artist, original.entries[i].artist);
    assert.deepEqual(new Set(entry.text.split(" ")), new Set(original.entries[i].text.split(" ")));
  });
});
