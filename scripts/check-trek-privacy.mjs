#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fail = (message) => {
  throw new Error(`Trek privacy check failed: ${message}`);
};
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const json = (relative) => JSON.parse(read(relative));
const exists = (relative) => fs.existsSync(path.join(root, relative));
const sorted = (values) => [...values].sort();
const sameKeys = (value, allowed) =>
  JSON.stringify(sorted(Object.keys(value))) === JSON.stringify(sorted(allowed));
const findKey = (value, blocked, trail = "") => {
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    const location = trail ? `${trail}.${key}` : key;
    if (blocked.has(key)) return location;
    const found = findKey(child, blocked, location);
    if (found) return found;
  }
  return null;
};

for (const relative of [
  "public/life-map",
  "public/project-art/personal/life-map-card.webp",
  "data/trek-journal.json",
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
if (!sameKeys(routeData, ["facts", "countries", "countryRings", "days"])) {
  fail("data/trek-days.json must contain only aggregate facts, country geometry and abstract days");
}
if (!sameKeys(routeData.facts, ["km", "walked", "numbered", "countries", "from", "to", "tauern"])) {
  fail("Trek facts must stay aggregate-only");
}
for (const day of routeData.days) {
  const allowed = ["n", "country", "walked", ...(day.recordKey ? ["recordKey"] : [])];
  if (!sameKeys(day, allowed)) fail(`day ${day.n} contains a non-public field`);
}
const blockedRouteField = findKey(routeData.days, new Set([
  "date",
  "raw",
  "title",
  "km",
  "x",
  "y",
  "movingMin",
  "elevM",
  "tracks",
  "note",
]));
if (blockedRouteField) fail(`private route field remains at ${blockedRouteField}`);

for (const relative of ["data/trek-matches.json", "data/trek-covers.json"]) {
  const value = json(relative);
  const blocked = findKey(value, new Set(["note", "unmatched"]));
  if (blocked) fail(`${relative} retains private or unverified material at ${blocked}`);
}

const photos = json("public/trek/photos/manifest.json");
const blockedPhotos = new Set([
  "d03-01.webp", "d04-06.webp", "d07-02.webp", "d20-07.webp", "d23-05.webp",
  "d25-01.webp", "d32-06.webp", "d33-05.webp", "d40-08.webp", "d42-01.webp",
  "d46-01.webp", "d48-04.webp", "d48-05.webp", "d54-01.webp", "d58-03.webp",
  "d65-01.webp", "d66-04.webp",
]);
for (const photo of photos) {
  if (!sameKeys(photo, ["day", "src", "w", "h", "alt"])) {
    fail(`${photo.src || "photo"} contains capture metadata or private copy`);
  }
  if (blockedPhotos.has(photo.src)) fail(`${photo.src} failed the identifying-image review`);
}
const photoDir = path.join(root, "public/trek/photos");
const servedPhotos = fs.readdirSync(photoDir).filter((name) => name.endsWith(".webp")).sort();
const listedPhotos = photos.map((photo) => photo.src).sort();
if (JSON.stringify(servedPhotos) !== JSON.stringify(listedPhotos)) {
  fail("public/trek/photos must contain only manifest-reviewed photographs");
}

const publicTrekSources = [
  "data/trek-days.json",
  "data/trek-matches.json",
  "public/trek/photos/manifest.json",
  "scripts/trek-page-template.html",
];
if (exists("public/trek/index.html")) publicTrekSources.push("public/trek/index.html");
for (const relative of publicTrekSources) {
  const source = read(relative);
  const privateName = String.fromCharCode(100, 97, 110, 105, 101, 108, 32, 97, 116, 107, 105, 110, 115, 111, 110);
  const privateMailbox = ["da", "kibwa", "@", "gmail"].join("");
  if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(source)) fail(`${relative} contains an email address`);
  if (/\b20\d{2}-\d{2}-\d{2}\b/.test(source)) fail(`${relative} contains an exact calendar date`);
  if (
    source.toLowerCase().includes(privateName) ||
    source.toLowerCase().includes(privateMailbox) ||
    /\b(?:24 sep|28 nov)\b/i.test(source)
  ) {
    fail(`${relative} contains identifying or dated Trek copy`);
  }
  if (/data-akibwa-project|akibwa-project-banner/i.test(source)) {
    fail(`${relative} exposes the personal portfolio identity on Trek`);
  }
}

console.log(
  `Trek privacy check passed: abstract route data, ${photos.length} reviewed photographs, no Life in Maps surface`
);
