#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fail = (message) => {
  throw new Error(`Trek journal check failed: ${message}`);
};
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const json = (relative) => JSON.parse(read(relative));
const exists = (relative) => fs.existsSync(path.join(root, relative));
const sorted = (values) => [...values].sort();
const sameKeys = (value, allowed) =>
  JSON.stringify(sorted(Object.keys(value))) === JSON.stringify(sorted(allowed));

for (const relative of [
  "public/life-map",
  "public/project-art/personal/life-map-card.webp",
]) {
  if (exists(relative)) fail(`${relative} must not exist`);
}

const lifeMapSources = [
  "app/sitemap.js",
  "components/image-variants.json",
  "components/pages/editorial-home-concept.jsx",
  "data/public-surfaces.json",
  "docs/publication-workflow.md",
  "README.md",
  "scripts/generate-image-variants.mjs",
];
for (const relative of lifeMapSources) {
  const source = read(relative);
  if (/\/life-map\/?|life-map-card|life in maps/i.test(source)) {
    fail(`${relative} still references the removed Life in Maps surface`);
  }
}

const routeData = json("data/trek-days.json");
if (!sameKeys(routeData, ["facts", "countries", "countryRings", "tracks", "days"])) {
  fail("data/trek-days.json must retain the complete public route dataset");
}
if (routeData.facts.start !== "2019-09-24" || routeData.facts.end !== "2019-11-28") {
  fail("the exact Trek date range must remain available");
}
if (routeData.days.length !== 67 || Object.keys(routeData.tracks).length !== 52) {
  fail("the 67 numbered days and 52 recorded tracks must remain available");
}
for (const [index, day] of routeData.days.entries()) {
  const required = ["n", "date", "title", "raw", "x", "y", "walked", "country"];
  if (!required.every((key) => Object.hasOwn(day, key))) {
    fail(`day ${day.n ?? index + 1} is missing route data`);
  }
  if (day.n !== index + 1 || !Number.isFinite(day.x) || !Number.isFinite(day.y)) {
    fail(`day ${day.n ?? index + 1} has altered route coordinates or numbering`);
  }
  if (day.date !== null && !/^2019-\d{2}-\d{2}$/.test(day.date)) {
    fail(`day ${day.n} has lost its exact calendar date`);
  }
  if (Object.hasOwn(day, "km") &&
      (!Object.hasOwn(day, "movingMin") || !Object.hasOwn(day, "elevM"))) {
    fail(`day ${day.n} has an incomplete metrics record`);
  }
}

const photos = json("public/trek/photos/manifest.json");
if (photos.length !== 394) fail(`expected all 394 dated Trek photographs, found ${photos.length}`);
for (const photo of photos) {
  if (!sameKeys(photo, ["day", "src", "w", "h", "taken", "caption", "alt"])) {
    fail(`${photo.src || "photo"} is missing its date grouping or capture time`);
  }
  if (!/^\d{2}:\d{2}$/.test(photo.taken)) fail(`${photo.src} is missing an exact capture time`);
  if (!exists(path.join("public/trek/photos", photo.src))) fail(`${photo.src} is missing from the public photo set`);
}

const journal = json("data/trek-journal.json");
if (!journal.editorialPolicy.includes("first-person reflection")) {
  fail("the journal must state its factual-only public boundary");
}
const firstPerson = /\b(?:i|me|my|myself|we|us|our|ours|ourselves)\b/i;
const personalDetail = /\b(?:meditat\w*|transcenden\w*|relationship\w*|money|guesthouse|raki|beard|reborn|purpose|happ\w*|anxiety|doubt|stranger|invited|welcome|cold bath\w*|human interaction|fear|wolves|health)\b/i;
let journalEntries = 0;
for (const [day, entries] of Object.entries(journal.days)) {
  for (const entry of entries) {
    journalEntries += 1;
    if (!sameKeys(entry, ["sourceDate", "label", "text"])) {
      fail(`journal day ${day} contains an unexpected field`);
    }
    if (!/^2019-\d{2}-\d{2}$/.test(entry.sourceDate)) {
      fail(`journal day ${day} must retain its exact source date`);
    }
    const prose = `${entry.label} ${entry.text}`;
    if (firstPerson.test(prose)) fail(`journal day ${day} still contains first-person detail`);
    if (personalDetail.test(prose)) fail(`journal day ${day} still contains personal narrative detail`);
  }
}
if (journalEntries < 40) fail(`too little factual route context remains (${journalEntries} entries)`);

const generated = read("public/trek/index.html");
if (!/<meta name="robots" content="[^"]*noindex[^"]*noimageindex[^"]*">/.test(generated)) {
  fail("generated Trek must remain outside search and image indexes");
}
if (/data-akibwa-project|akibwa-project-banner/i.test(generated)) {
  fail("generated Trek must not expose the former personal portfolio identity");
}
for (const required of ["2019-09-24", '"taken":"08:59"']) {
  if (!generated.includes(required)) fail(`generated Trek is missing restored data: ${required}`);
}
const generatedDataMatch = generated.match(/  var DATA = (.+);\n  var days = DATA\.days;/);
if (!generatedDataMatch) fail("generated Trek data could not be inspected");
const generatedData = JSON.parse(generatedDataMatch[1]);
if (JSON.stringify(generatedData.photos) !== JSON.stringify(photos)) fail("all original photograph metadata must remain available");
const lastDay = generatedData.days.at(-1);
if (!(generatedData.stats.ascent > 0 && generatedData.stats.minutes > 0) || generatedData.stats.ascent !== lastDay.cumElev || generatedData.stats.minutes !== lastDay.cumMin) fail("the journey must retain its ascent and moving-time totals");
for (const day of generatedData.days) {
  const expected = journal.days[String(day.n)] || [];
  if (JSON.stringify(day.j) !== JSON.stringify(expected)) {
    fail(`generated Trek has stale or unsanitized journal text for day ${day.n}`);
  }
}

console.log(
  `Trek journal check passed: ${journalEntries} factual notes, exact dates/times and ${photos.length} photos retained, no Life in Maps surface`
);
