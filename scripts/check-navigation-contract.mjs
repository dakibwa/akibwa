import { existsSync, readFileSync } from "node:fs";
import { unpackRanking } from "../components/paper/music-ranking.mjs";
import { indexItems, search } from "../components/paper/music-search.mjs";
import { GAP, arrange, bounds, rowsFor, sideFor } from "../components/paper/music-shelf.mjs";

/* Build-time contract for akibwa.com. From 16 November 2026 (Dan) the site is
   one page, the music shelf; the trek keeps its own standalone page for old
   links. Named public choices do not relax the private-data and search
   boundaries below. */

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const css = read("app/globals.css");
const index = read("app/page.jsx");
const layout = read("app/layout.jsx");
const sitemap = read("app/sitemap.js");
const redirects = read("public/_redirects");
const music = read("components/paper/music-room.jsx");
const trekTemplate = read("scripts/trek-journey-template.html");
const trekPublished = read("public/trek/index.html");
const ranking = JSON.parse(read("public/music-ranking.json"));
const musicMeta = JSON.parse(read("public/music-meta.json"));
const musicKinds = JSON.parse(read("public/music-kinds.json"));

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

// The root route is the music shelf, and its search posture.
requireText(index, 'import { MusicRoom } from "@/components/paper/music-room"', "the public index must render the music shelf");
requireText(index, "<MusicRoom initial={musicSeed(ranking)} active />", "the music shelf must own the root route");
requireText(index, "noimageindex: true", "the public index must opt out of image indexing");
requireText(index, '"max-snippet": 120', "the public index must limit search snippets");
requireText(layout, 'applicationName: "Akibwa"', "site metadata must be brand-led");
requireText(layout, 'classList.add("js")', "the layout must mark scripted pages before the first paint");
// Old links stay useful now that there is one page.
requireText(layout, 'trek:"/trek/"', "old #trek links must reach the trek's own page");
requireText(layout, 'features:"https://features.games/"', "old #features links must reach the game's own address");
requireText(layout, 'websites:"https://ohlifestudios.com/"', "old #websites links must reach the studio");
requireRuleText("\nbody {", ["user-select: none"]);

// Retired with the front page and its rooms (Dan, 16 November 2026): deleted,
// not hidden.
for (const file of [
  "components/paper/paper-home.jsx",
  "components/paper/cast.jsx",
  "components/paper/things.jsx",
  "components/paper/name-flip.jsx",
  "components/paper/contact.jsx",
  "components/paper/night-switch.jsx",
  "components/paper/framed-room.jsx",
  "components/paper/career-cards.jsx",
  "components/career-bar.jsx",
  "components/paper/websites-room.jsx",
  "app/archive.css"
]) {
  if (existsSync(new URL(`../${file}`, import.meta.url))) fail(`${file} was retired with the front page and must not return`);
}
for (const room of ["trek", "career", "websites"]) forbidText(index + music, `id="${room}"`, `the ${room} room must not return to the page`);

// Dan, 16 November 2026: one shelf, each row of squares as large as its
// albums' hours between a floor and a cap, everything to know in the bar.
requireText(music, "aria-pressed={pressed === name}", "albums and songs must be one switch");
requireText(music, "rowsFor(group.entries, width, reference)", "the shelf must be laid out in rows sized by hours between a floor and a cap");
requireText(music, 'role="group" aria-label="Order"', "the bar must sort the whole shelf by hours, year, kind or name");
requireText(music, '<output className="music-now"', "the bar must say what the shelf holds and what is under the pointer");
requireText(music, "startTransition(() => setOrder(name))", "an order must answer before the shelf is sorted again");
requireText(music, "<AlbumTracks", "an album must open its track list");
requireText(music, "LARGE_ART[art]", "sleeves drawn large must offer their high-resolution rung");
// Dan, 25 September 2026: the switch answers at once and resizing is smooth.
requireText(music, "startTransition(() => setView(name))", "the albums/songs switch must answer before the shelf redraws");
requireText(music, "useSettledWidth(", "the shelf must lay out once the width settles");
requireText(music, ".animate(", "the shelf's sleeves must glide to a new order");
requireText(css, ".music-tracks {\n  -webkit-user-select: none;", "the track sheet must not select");
// Dan, 26 September 2026: songs that open their album, and where to hear it.
requireText(music, 'useRoomFile(active, "/music-years.json")', "the year order must place each album or song in the year it was played most");
requireText(music, 'useRoomFile(active, "/music-kinds.json")', "the kind order must group the shelf by kind of music");
requireText(music, "picked={song ? song.title : null}", "a song must open its album's track list with the song lit");
requireText(music, "links={listenLinks(", "every music sheet must link to Spotify and Apple Music");
requireText(css, "li:hover::after", "track bars must take their own colour under the pointer");
{
  // The shelf itself, on the real albums and songs: rows of one size, each as
  // large as its albums' hours between the floor and the cap, every full row
  // filling the width, sizes only ever stepping down, and each order placing
  // every album once.
  const { albums, songs } = unpackRanking(ranking);
  const byHours = [...albums].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank);
  if (byHours.slice(0, 3).map((album) => album.title).join("|") !== "Music for Psychedelic Therapy|Discreet Music|Graceland") fail("the shelf must start with the most listened");
  for (const [kind, list] of [["albums", byHours], ["songs", [...songs].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank)]]) {
    const reference = list[2].minutes;
    for (const width of [343, 1180, 1312]) {
      const limits = bounds(width);
      if (limits.floor < 44 || limits.cap > width * 0.5) fail(`squares at ${width}px must be big enough to see and never more than half the width`);
      if (sideFor(list[0].minutes, reference, limits) !== limits.cap) fail(`the most listened must reach the cap at ${width}px`);
      const rows = rowsFor(list.map((item) => ({ item })), width, reference);
      if (rows.reduce((sum, row) => sum + row.entries.length, 0) !== list.length) fail(`every ${kind} square must be on the shelf at ${width}px`);
      rows.forEach((row, at) => {
        if (row.side < limits.floor - 0.01 || row.side > limits.cap + 0.01) fail(`every ${kind} row at ${width}px must sit between the floor and the cap`);
        if (at && row.side > rows[at - 1].side + 0.01) fail(`a ${kind} row at ${width}px must never be larger than one above it`);
        const filled = row.entries.length * row.side + (row.entries.length - 1) * GAP;
        if (at < rows.length - 1 && (filled > width + 0.01 || filled < width - row.entries.length)) fail(`every full ${kind} row at ${width}px must fill the width exactly`);
      });
      if (width > 600 && rows[0].side ** 2 < rows.at(-1).side ** 2 * 4) fail("the shelf must show the difference in hours");
    }
  }
  const entries = byHours.map((item) => ({ item }));
  const years = JSON.parse(read("public/music-years.json"));
  for (const order of ["hours", "year", "kind", "name"]) {
    const groups = arrange(order, "albums", entries, { years, kinds: musicKinds });
    const placed = groups.flatMap((group) => group.entries.map((entry) => entry.item.id));
    if (placed.length !== albums.length || new Set(placed).size !== albums.length) fail(`the ${order} order must place every album once`);
    if (order !== "hours" && groups.some((group) => !group.label || !group.figures)) fail(`the ${order} order must head each group with what it needs`);
  }
}

// The address stays private.
const personalEmail = ["da", "kibwa", "@", "gmail", ".com"].join("");
for (const [source, label] of [[index, "the page"], [music, "the music shelf"], [layout, "the layout"]]) forbidText(source, personalEmail, `the contact address must not be present in ${label}`);

// The public music file carries aggregates only (Dan asked for hours listened
// on 24 September 2026): no dates, URIs, accounts or raw events.
if (ranking.schemaVersion !== 2 || !/^\d{4}-\d{2}-\d{2}$/.test(ranking.asOf)) fail("the music file must be versioned and dated");
if (ranking.songs.length !== 1000 || ranking.albums.length !== 150) fail("the music file must hold 1,000 songs and 150 albums");
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

// The search's knowledge is public MusicBrainz data only: genres and related
// artists by name, and each sleeve's release year (Dan, 25 September 2026).
if (JSON.stringify(Object.keys(musicMeta).sort()) !== JSON.stringify(["artists", "note", "schemaVersion", "years"])) fail("the music search file has unexpected fields");
for (const [name, facts] of Object.entries(musicMeta.artists)) {
  if (JSON.stringify(Object.keys(facts).sort()) !== JSON.stringify(["genres", "related"]) || ![...facts.genres, ...facts.related].every((value) => typeof value === "string")) fail(`${name}'s search facts must be genres and related artists only`);
}
if (!Object.values(musicMeta.years).every((year) => Number.isInteger(year) && year > 1900 && year < 2100)) fail("sleeve years must be plain years");
if (JSON.stringify(Object.keys(musicKinds).sort()) !== JSON.stringify(["artists", "kinds", "note", "schemaVersion"])) fail("the music kinds file has unexpected fields");
for (const name of ranking.names) {
  if (!Number.isInteger(musicKinds.artists[name]) || !musicKinds.kinds[musicKinds.artists[name]]) fail(`${name} must have a kind of music`);
}
{
  const albums = unpackRanking(ranking).albums;
  const index = indexItems(albums, { meta: musicMeta, yearOf: (album) => Number(album.year) || musicMeta.years[album.id] || null });
  const artistsFor = (query) => new Set((search(index, query) ?? []).map((album) => album.artist));
  if (!artistsFor("paul simon").has("Simon & Garfunkel")) fail("searching Paul Simon must find Simon & Garfunkel");
  if (!artistsFor("panda bear").has("Animal Collective")) fail("searching Panda Bear must find Animal Collective");
  const seventies = search(index, "70s") ?? [];
  if (!seventies.length || seventies.some((album) => { const year = Number(album.year) || musicMeta.years[album.id]; return year < 1970 || year > 1979; })) fail("searching an era must keep to its years");
  const songs = unpackRanking(ranking).songs;
  const songIndex = indexItems(songs, { meta: musicMeta, yearOf: (song) => musicMeta.years[song.art] ?? null });
  const sammySongs = songs.filter((song) => song.artist === "Sammy Virji");
  for (const query of ["sammy", "sammy virji"]) {
    const found = search(songIndex, query) ?? [];
    if (!found.length || found.length !== sammySongs.length || found.some((song) => song.artist !== "Sammy Virji")) fail(`${query} must find Sammy Virji's songs without another Sammy's band`);
  }
  if (search(index, "sammy")?.length) fail("an artist without a top album must not find a different member's band in albums");
  const member = search(songIndex, "sammy robinson") ?? [];
  if (!member.length || member.some((song) => song.artist !== "Yard Act")) fail("a band member's name must still find their band");
  if (search(songIndex, "sammy 70s")?.length) fail("a credited artist excluded by an era must not fall back to a different member's band");
  if (!search(songIndex, "dream job")?.some((song) => song.title === "Dream Job")) fail("song titles must remain searchable");
  if (!search(songIndex, "ambient")?.some((song) => song.artist === "Brian Eno")) fail("genres must remain searchable");
}

// Retired pages are deleted, not hidden. The site is one page; old links 301
// to it from the edge instead of loading a stub page that redirects itself.
for (const route of ["albums", "projects", "personal", "about", "contact", "offer", "professional", "systems", "work", "concept"]) {
  if (existsSync(new URL(`../app/${route}`, import.meta.url))) fail(`the retired /${route}/ route must not return`);
  for (const redirect of [`/${route} / 301`, `/${route}/* / 301`]) requireText(redirects, `\n${redirect}\n`, `old /${route}/ links must redirect to the homepage`);
}
requireText(redirects, "\n/portugal https://portuguesewithines.com/ 301\n", "the Portuguese short link must keep reaching Inês's site");
requireText(sitemap, 'const routes = [{ path: "/", priority: 1 }]', "only the Akibwa index belongs in the sitemap");

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

console.log("Akibwa public-boundary contract passed.");
