import { existsSync, readFileSync } from "node:fs";
import { websites } from "../data/websites.mjs";
import { unpackRanking } from "../components/paper/music-ranking.mjs";
import { albumSides, albumWeights, drawnOrder, layoutSquares, GAP } from "../components/paper/music-map.mjs";

/* Build-time contract for the paper homepage: one sheet with five things —
   music, features, websites, career and the trek — that open in place (the
   trek's room frames /trek/). Named public choices do not relax the
   private-data and search boundaries below. */

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
const music = read("components/paper/music-room.jsx");
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
requireText(layout, '["music","features","websites","career","trek"]', "the layout's room list must match the rooms that open in place");

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

// Five things, five rooms; the trek's frames its journey (Dan, 25 September 2026).
for (const id of ["music", "features", "websites", "career", "trek"]) {
  requireText(home, `id: "${id}"`, `the ${id} room must remain on the front page`);
  requireText(home, `<Room id="${id}"`, `the ${id} room must render`);
}
requireText(read("components/paper/trek-room.jsx"), ': "/trek/";', "the trek room must frame the journey");
requireText(trekTemplate, 'classList.add("is-embedded")', "the framed trek must hide its own way home");
requireText(home, "memo(MusicRoom)", "the music room must show the albums and songs mosaics");
requireText(home, 'className="visually-hidden" tabIndex={-1}', "rooms have no title on the page, only a heading for readers");
forbidText(home, "room-head", "rooms have no title on the page");
forbidText(home, "bar-home", "the bar has no wordmark");
requireText(home, "memo(CareerRail)", "the career room must be the railway of roles (Dan, 25 September 2026)");
requireText(music, "aria-pressed={view === name}", "albums and songs must be one switch");
requireText(music, "layoutSquares(", "albums and songs must be square sleeves packed with no holes");
requireText(music, "music-hours", "every sleeve must carry its hours listened");
requireText(music, "<AlbumTracks", "an album must open its track list");
requireText(music, "LARGE_ART[art]", "sleeves drawn large must offer their high-resolution rung");
{
  // The map itself, on the real albums: no holes or overlaps, the most
  // listened first, and the two ambient records near Graceland (Dan, 25 September 2026).
  const albums = unpackRanking(ranking).albums;
  const weights = albumWeights(albums);
  const order = drawnOrder(albums, weights);
  const find = (title) => weights[albums.findIndex((album) => album.title === title)];
  const graceland = find("Graceland");
  if (find("Music for Psychedelic Therapy") !== Math.round(graceland * 1.1) || find("Discreet Music") !== Math.round(graceland * 0.9)) {
    fail("Music for Psychedelic Therapy and Discreet Music must be drawn near Graceland's size");
  }
  if (order.slice(0, 3).map((entry) => entry.item.title).join("|") !== "Music for Psychedelic Therapy|Graceland|Discreet Music") {
    fail("the map must start with the most listened");
  }
  // Square sleeves, no holes or overlaps, at phone and desktop widths
  // (Dan, 25 September 2026: the covers keep their shape).
  const adjust = albumSides(order.map((entry) => entry.item));
  for (const [width, plan] of [[343, { cell: 24, aspect: 3, range: [0.35, 0.8], tries: 12, spread: 3 }], [1180, { cell: 32, aspect: 0.9, range: [0.14, 0.26] }]]) {
    const { height, tiles } = layoutSquares(order.map((entry) => entry.weight), width, { ...plan, adjust });
    const covered = tiles.reduce((sum, tile) => sum + (tile.w + GAP) * (tile.h + GAP), 0) / ((width + GAP) * (height + GAP));
    const overlap = tiles.some((a, i) => tiles.some((b, j) => j > i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
    if (!height || overlap || covered < 0.97 || tiles.some((tile) => tile.w !== tile.h || tile.w < plan.cell - GAP - 1 || tile.x < 0 || tile.x + tile.w > width || tile.y + tile.h > height)) {
      fail(`the albums at ${width}px must be square sleeves, none under a cell, with no holes or overlaps`);
    }
  }
}
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
  if (site.inReview && site.href) fail(`${site.title} is in review and must not link yet`);
  if (site.capture) fail(`${site.title} must be an illustration, not a screenshot of the site`);
}
if (/atkinson/i.test(JSON.stringify(websites))) fail("the websites data must not name Dan in full");

// The public music file carries aggregates only (Dan asked for hours listened
// on 24 September 2026): no dates, URIs, accounts or raw events.
if (ranking.schemaVersion !== 2 || !/^\d{4}-\d{2}-\d{2}$/.test(ranking.asOf)) fail("the music file must be versioned and dated");
if (ranking.songs.length !== 1000 || ranking.albums.length !== 100) fail("the music file must hold 1,000 songs and 100 albums");
const whole = (value) => Number.isSafeInteger(value) && value >= 0;
for (const [title, artist, plays, youtube, art, minutes] of ranking.songs) {
  if (typeof title !== "string" || !Number.isInteger(artist) || !ranking.names[artist]) fail("every song needs a title and a named artist");
  if (!whole(plays) || !whole(youtube) || youtube > plays || !whole(minutes)) fail("song counts must be whole plays and minutes");
  if (art !== null && !existsSync(new URL(`../public/album-art/${art}-wall.webp`, import.meta.url))) fail(`missing sleeve ${art}`);
}
for (const [id, title, artist, year, plays, minutes, tracks] of ranking.albums) {
  if (!existsSync(new URL(`../public/album-art/${id}-wall.webp`, import.meta.url))) fail(`missing sleeve ${id}`);
  if (typeof title !== "string" || !ranking.names[artist] || !(year === null || /^\d{4}$/.test(year))) fail("every album needs a title, artist and year or none");
  if (!whole(plays) || !whole(minutes) || !Array.isArray(tracks) || !tracks.length) fail(`${title} needs plays, minutes and its tracks`);
  if (tracks.some((track) => track.length !== 3 || typeof track[0] !== "string" || !whole(track[1]) || !whole(track[2]))) fail(`${title}'s tracks must be [title, plays, minutes]`);
}
// Only these fields, in fixed-length rows.
if (JSON.stringify(Object.keys(ranking).sort()) !== JSON.stringify(["albums", "asOf", "counts", "hours", "names", "schemaVersion", "songs"])) fail("the public music file has unexpected fields");
if (ranking.songs.some((row) => row.length !== 6) || ranking.albums.some((row) => row.length !== 7)) fail("music rows must keep their public fields");
const rankingText = JSON.stringify(ranking);
for (const [pattern, what] of [[/spotify:/i, "track URIs"], [/\d{4}-\d{2}-\d{2}T\d/, "timestamps"]]) {
  if (pattern.test(rankingText)) fail(`the public music file must not include ${what}`);
}

// Retired pages are deleted, not hidden. The site is one page; old links 301
// to it from the edge instead of loading a stub page that redirects itself.
for (const route of ["albums", "projects", "personal", "about", "contact", "offer", "professional", "systems", "work", "concept"]) {
  if (existsSync(new URL(`../app/${route}`, import.meta.url))) fail(`the retired /${route}/ route must not return`);
  for (const redirect of [`/${route} / 301`, `/${route}/* / 301`]) requireText(redirects, `\n${redirect}\n`, `old /${route}/ links must redirect to the homepage`);
}
requireText(redirects, "\n/portugal https://portuguesewithines.com/ 301\n", "the Portuguese short link must keep reaching Inês's site");
requireText(sitemap, 'const routes = [{ path: "/", priority: 1 }]', "only the Akibwa index belongs in the sitemap");

// The restored career lane keeps its original mechanics.
requireRuleText(".concept-career-section {", ["transition: padding-bottom 340ms", "--career-open-space: clamp(24px, 3vw, 36px)"]);

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
