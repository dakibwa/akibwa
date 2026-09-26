/*
 * The Music room's own data, checked offline from the committed files (Dan,
 * 26 September 2026):
 *
 *   - every album's sleeve matches an independent cover of that album, or was
 *     checked by eye (data/music-sources.json, from build-music-sources.mjs),
 *     so a sleeve catalogued as the wrong album cannot reach the room again;
 *   - the links are Spotify and Apple Music albums, for albums in the room;
 *   - every album and song has its hours by year, adding up to its hours
 *     (public/music-years.json, from build-music-ranking.mjs).
 */
import { readFileSync } from "node:fs";

const read = (file) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const ranking = read("public/music-ranking.json");
const sources = read("data/music-sources.json");
const links = read("public/music-links.json");
const years = read("public/music-years.json");

const problems = [];
const looked = new Map(sources.entries.map((entry) => [entry.id, entry]));
for (const [id, title] of ranking.albums) {
  const entry = looked.get(id);
  if (!entry) {
    problems.push(`${title} (${id}) has not been looked up: run node scripts/build-music-sources.mjs`);
  } else if (entry.verdict === "differs") {
    problems.push(`${title} (${id}): its sleeve differs from ${entry.cover.source}'s cover (${entry.cover.score}); look at both and record what you see in REVIEWED in build-music-sources.mjs`);
  } else if (entry.verdict === "unchecked") {
    problems.push(`${title} (${id}): no independent cover was found to compare its sleeve with; look at it and record what you see in REVIEWED in build-music-sources.mjs`);
  }
}

const inRoom = new Set(ranking.albums.map(([id]) => id));
for (const [id, found] of Object.entries(links.albums)) {
  if (!inRoom.has(id)) problems.push(`music-links.json lists ${id}, which is not in the room`);
  if (found.spotify && !/^https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]{22}$/.test(found.spotify)) problems.push(`${id}: ${found.spotify} is not a Spotify album`);
  if (found.apple && !/^https:\/\/music\.apple\.com\/[a-z]{2}\/album\//.test(found.apple)) problems.push(`${id}: ${found.apple} is not an Apple Music album`);
}

const sum = (pairs) => (pairs ?? []).reduce((total, [, minutes]) => total + minutes, 0);
for (const [id, title, , , , minutes] of ranking.albums) {
  if (sum(years.albums[id]) !== minutes) problems.push(`${title}: its hours by year do not add up to its hours; rebuild the ranking`);
}
ranking.songs.forEach(([title, , , , , minutes], index) => {
  if (sum(years.songs[index]) !== minutes) problems.push(`${title}: its hours by year do not add up to its hours; rebuild the ranking`);
});
if (!years.years.length || years.years.some((year, index) => index && year <= years.years[index - 1])) problems.push("music-years.json must offer its years in order");

if (problems.length) {
  console.error(`Music room data check failed:\n  - ${problems.slice(0, 40).join("\n  - ")}${problems.length > 40 ? `\n  …and ${problems.length - 40} more` : ""}`);
  process.exit(1);
}
const count = (verdict) => sources.entries.filter((entry) => entry.verdict === verdict).length;
console.log(
  `Music room data passed: ${count("same")} sleeves match an independent cover, ${count("reviewed")} checked by eye, ${count("no sleeve")} without one; ${Object.keys(links.albums).length} albums with direct links; hours by year for ${years.years[0]}–${years.years.at(-1)}.`
);
