import { existsSync, readFileSync } from "node:fs";
import { stackArtwork } from "../components/taste-layout.mjs";
import { websites } from "../data/websites.mjs";

/* Build-time contract for the paper homepage: one sheet with five things —
   taste, features, websites, career and the trek — that open in place (the trek on
   its own page). Named public choices do not relax the private-data and search
   boundaries below. */

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const css = read("app/globals.css") + read("app/archive.css");
const index = read("app/page.jsx");
const layout = read("app/layout.jsx");
const sitemap = read("app/sitemap.js");
const redirects = read("public/_redirects");
const home = read("components/paper/paper-home.jsx");
const names = read("components/paper/name-flip.jsx");
const contact = read("components/paper/contact.jsx");
const taste = read("components/taste-library.jsx");
const career = read("components/career-bar.jsx");
const features = read("public/features/index.html");
const trekTemplate = read("scripts/trek-journey-template.html");
const trekPublished = read("public/trek/index.html");
const ranking = JSON.parse(read("public/music-ranking.json"));

const fail = (message) => {
  throw new Error(`Navigation contract failed: ${message}`);
};

const requireText = (source, text, message) => {
  if (!source.includes(text)) fail(message);
};

const forbidText = (source, text, message) => {
  if (source.includes(text)) fail(message);
};

const rule = (selector) => {
  const start = css.indexOf(selector);
  if (start === -1) fail(`missing CSS rule ${selector}`);
  const end = css.indexOf("}", start);
  if (end === -1) fail(`unterminated CSS rule ${selector}`);
  return css.slice(start, end + 1);
};

const requireRuleText = (selector, declarations) => {
  const cssRule = rule(selector);
  for (const declaration of declarations) {
    requireText(cssRule, declaration, `${selector} must include ${declaration}`);
  }
};

// The root route and its search posture.
requireText(index, 'import { PaperHome } from "@/components/paper/paper-home"', "the public index must render the paper homepage");
requireText(index, "<PaperHome", "the paper homepage must own the root route");
requireText(index, "noimageindex: true", "the public index must opt out of image indexing");
requireText(index, '"max-snippet": 120', "the public index must limit search snippets");
requireText(layout, 'applicationName: "Akibwa"', "site metadata must be brand-led");
requireText(layout, 'classList.add("js")', "the layout must mark scripted pages before the first paint");
requireText(layout, '["taste","features","websites","career"]', "the layout's room list must match the rooms that open in place");

// The approved introduction: Daniel ↔ Akibwa on the original timing.
requireText(names, '"Daniel", "Akibwa"', "the name change must alternate Daniel and Akibwa");
requireText(names, "3200", "the name change keeps its first change at 3.2 seconds");
requireText(names, "4200", "the name change keeps its 4.2 second rhythm");
requireText(names, "prefers-reduced-motion", "the name change must respect reduced motion");
requireText(names, "visibilitychange", "the name change must pause in hidden tabs");
requireText(names, "I’m Daniel. Online as Akibwa.", "the heading must carry both names for assistive technology");
requireText(home, "Building in the age of AI.", "the front page must preserve Dan's proposition");
requireText(names, "dataset.sky", "the name change must turn the sky: the sun for Daniel, the moon for Akibwa");
requireRuleText('html[data-sky="night"] .sky-wheel {', ["animation: sky-dusk"]);
requireRuleText('html[data-sky="day"] .sky-wheel {', ["animation: sky-dawn"]);
requireRuleText("\nbody {", ["user-select: none"]);

// Five things: four rooms and the trek's own page.
for (const id of ["taste", "features", "websites", "career"]) {
  requireText(home, `id: "${id}"`, `the ${id} room must remain on the front page`);
  requireText(home, `<Room id="${id}"`, `the ${id} room must render`);
}
requireText(home, 'href: "/trek/"', "the trek must open its standalone journey");
requireText(home, "<TasteLibrary", "the taste room must be the restored Taste Library");
requireText(home, "<CareerTimeline", "the career room must be the restored career timeline");
requireText(taste, '["songs", "Songs"', "the Taste Library must offer the top 1,000 songs");
requireText(taste, '["artists", "Artists"', "the Taste Library must offer the top 100 artists");
requireText(career, "export function CareerTimeline", "the career timeline must stay available to the room");
for (const text of ['id="capabilities"', "What Akibwa does", "Make the mess legible"]) forbidText(home, text, "rejected capability content must not return");

// Contact without publishing the address.
requireText(contact, 'aria-label="Email Akibwa"', "the homepage must retain a private-by-default contact action");
const personalEmail = ["da", "kibwa", "@", "gmail", ".com"].join("");
for (const [source, label] of [[contact, "contact"], [home, "the homepage"]]) forbidText(source, personalEmail, `the contact address must not be present in ${label}`);
requireText(contact, "https://www.instagram.com/dakibwa/", "the approved Instagram profile must remain");
requireText(contact, "https://x.com/dakibwa", "the approved X profile must remain");

// Websites: the three Dan chose, nothing that names him in full, and a site
// still in review shown without a link.
if (JSON.stringify(websites.map((site) => site.id)) !== JSON.stringify(["portuguese", "castle-bank", "butterfly-rose"])) {
  fail("the websites room lists Português com a Inês, Castle Bank and Butterfly Rose");
}
for (const site of websites) {
  if (!existsSync(new URL(`../public${site.src}`, import.meta.url))) fail(`${site.title} artwork is missing`);
  if (!site.alt || !site.description) fail(`${site.title} needs alt text and a description`);
  if (site.capture?.review && site.href) fail(`${site.title} is in review and must not link yet`);
}
if (/atkinson/i.test(JSON.stringify(websites))) fail("the websites data must not name Dan in full");
if (!websites.find((site) => site.id === "castle-bank").capture?.hide?.includes(".hero-team")) {
  fail("Castle Bank's screenshot must hide its named founders");
}

// The public song ranking carries aggregates only.
if (ranking.schemaVersion !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(ranking.asOf)) fail("the song ranking must be versioned and dated");
if (ranking.songs.length !== 1000 || ranking.artists.length !== 100) fail("the ranking must hold 1,000 songs and 100 artists");
for (const [title, artist, plays, youtube, art] of ranking.songs) {
  if (typeof title !== "string" || !Number.isInteger(artist) || !ranking.names[artist]) fail("every song needs a title and a named artist");
  if (!Number.isSafeInteger(plays) || !Number.isSafeInteger(youtube) || youtube > plays) fail("song counts must be whole plays");
  if (art !== null && !existsSync(new URL(`../public/album-art/${art}-wall.webp`, import.meta.url))) fail(`missing sleeve ${art}`);
}
// Only these fields, in fixed-length rows: no listening time, dates, URIs or accounts.
if (JSON.stringify(Object.keys(ranking).sort()) !== JSON.stringify(["artists", "asOf", "counts", "names", "schemaVersion", "songs"])) fail("the public song ranking has unexpected fields");
if (ranking.songs.some((row) => row.length !== 5) || ranking.artists.some((row) => row.length !== 5)) fail("ranking rows must keep their five public fields");
const rankingText = JSON.stringify(ranking);
for (const [pattern, what] of [[/spotify:/i, "track URIs"], [/\d{4}-\d{2}-\d{2}T\d/, "timestamps"]]) {
  if (pattern.test(rankingText)) fail(`the public song ranking must not include ${what}`);
}

// Retired pages are deleted, not hidden. The site is one page; old links 301
// to it from the edge instead of loading a stub page that redirects itself.
for (const route of ["albums", "projects", "personal", "about", "contact", "offer", "professional", "systems", "work", "concept"]) {
  if (existsSync(new URL(`../app/${route}`, import.meta.url))) fail(`the retired /${route}/ route must not return`);
  for (const redirect of [`/${route} / 301`, `/${route}/* / 301`]) requireText(redirects, `\n${redirect}\n`, `old /${route}/ links must redirect to the homepage`);
}
requireText(redirects, "\n/portugal https://portuguesewithines.com/ 301\n", "the Portuguese short link must keep reaching Inês's site");
requireText(sitemap, 'const routes = [{ path: "/", priority: 1 }]', "only the Akibwa index belongs in the sitemap");

// The restored Taste wall and career lane keep their original mechanics.
requireRuleText(".personal-taste-rail {", ["grid-auto-flow: column", "overflow-x: auto"]);
requireRuleText(".concept-career-section {", ["transition: padding-bottom 340ms", "--career-open-space: clamp(24px, 3vw, 36px)"]);
for (const height of [104, 132, 198]) for (const availableHeight of [330, 480, 640]) {
  const columns = stackArtwork(Array(50).fill(height), { availableHeight, visibleColumns: 9 });
  if (columns.some(column => column.height > availableHeight)) fail("ranked Taste covers must fit the available shelf height");
  if (columns.length <= 9) fail("long Taste shelves must extend sideways beyond the available width");
  if (new Set(columns.slice(0, -1).map(column => column.height)).size !== 1) fail("complete equal-sized columns must finish flush");
}
for (const [size, height] of [[26,198], [28,176], [25,132]]) {
  const columns = stackArtwork(Array(size).fill(height), { availableHeight: 600, visibleColumns: 9 });
  if (columns.length <= 9 || columns.some(column => column.indices.length >= 4)) fail("shorter TV, game and podcast shelves must spread across the width instead of making four-high stacks");
}
const captionColumns = stackArtwork(Array.from({length: 26}, (_, index) => 198 + (index % 3) * 24), { availableHeight: 460, visibleColumns: 3 });
if (captionColumns.some(column => column.height > 460)) fail("visible phone captions count towards the shelf height");
if (stackArtwork([198,198,198], {visibleColumns:9}).length !== 3) fail("short search results must stay in one row");
for (const size of [1, 3, 48, 50, 84]) for (const captions of [false, true]) {
  const columns = stackArtwork(Array.from({ length: size }, (_, index) => 132 + (captions ? index % 3 * 16 : 0)));
  const readingOrder = Array.from({ length: Math.max(...columns.map(column => column.indices.length)) }, (_, row) => columns.flatMap(column => column.indices[row] === undefined ? [] : [column.indices[row]])).flat();
  if (readingOrder.length !== size || readingOrder.some((index, position) => index !== position)) fail("Taste ranking must read left to right across rows, including captions and loaded records");
}

if (existsSync(new URL("../public/life-map/index.html", import.meta.url))) {
  fail("the detailed Life in Maps page must not ship");
}

for (const [source, label] of [
  [trekTemplate, "the Trek source template"],
  [trekPublished, "the generated Trek page"]
]) {
  requireText(source, "noindex", `${label} must be excluded from search indexing`);
  requireText(source, "noimageindex", `${label} must opt out of image indexing`);
  forbidText(source, "data-akibwa-project", `${label} must remain standalone`);
  forbidText(source, "akibwa-project-banner", `${label} must not expose the portfolio identity`);
  requireText(source, "24 September to 28 November 2019", `${label} must retain the exact journey date range`);
}

requireText(features, '<p class="akibwa-project-banner__identity">Akibwa</p>', "Features project view must use only the Akibwa brand");
const retiredPersonalClass = ["name--", String.fromCharCode(100, 97, 110, 105, 101, 108)].join("");
forbidText(features, retiredPersonalClass, "Features project view must not carry a personal identity state");
requireText(features, "Building in the age of AI.", "Features must retain the Akibwa proposition");

console.log("Akibwa public-boundary contract passed.");
