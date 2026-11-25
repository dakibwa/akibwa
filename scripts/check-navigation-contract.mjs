import { existsSync, readFileSync } from "node:fs";
import { fold, unpackRanking } from "../components/paper/music-ranking.mjs";
import { indexItems, search } from "../components/paper/music-search.mjs";
import { GAP, arrange, bounds, mergeShelf, rowsFor, sideFor, songTitle } from "../components/paper/music-shelf.mjs";

/* Build-time contract for akibwa.com. From 16 November 2026 (Dan) the site is
   one page, the music shelf. Retired paths return 404. The checks
   below protect the public content and search settings. */

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const css = read("app/globals.css");
const index = read("app/page.jsx");
const layout = read("app/layout.jsx");
const sitemap = read("app/sitemap.js");
const music = read("components/paper/music-room.jsx");
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
requireText(index, "noimageindex: true", "the public index must opt out of image indexing");
requireText(index, '"max-snippet": 120', "the public index must limit search snippets");
requireText(layout, 'applicationName: "Akibwa"', "site metadata must be brand-led");
requireText(layout, 'classList.add("js")', "the layout must mark scripted pages before the first paint");
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
requireText(music, "if (!found) return index.entries;", "albums and singles must share the one shelf (Dan, 25 November 2026)");
forbidText(music, "music-singles", "the bar must not switch between albums and singles (Dan, 25 November 2026)");
requireText(music, 'className="music-find"', "on a phone the bar must keep one row, the search waiting behind its mark (Dan, 16 November 2026)");
requireText(css, ".music-tools[data-finding=\"true\"] .music-search {", "the phone's search must slide out over the orders");
requireText(music, "rowsFor(group.entries, width, group.reference ?? reference)", "the shelf must be laid out in rows sized by hours between a floor and a cap");
requireText(music, 'role="group" aria-label="Order"', "the bar must sort the whole shelf by time listened, genre, release date or listen date");
requireText(music, 'id={pinned ? "record-tracks" : "record-glance"}', "a sleeve under the pointer must open its sheet beside its row, and a press must keep it open (Dan, 25 November 2026)");
requireText(music, "startTransition(() => setOrder(name))", "an order must answer before the shelf is sorted again");
requireText(music, "<AlbumTracks", "an album must open its track list");
// Dan, 25 September 2026: resizing is smooth.
requireText(music, "useSettledWidth(", "the shelf must lay out once the width settles");
requireText(music, ".animate(", "the shelf's sleeves must glide to a new order");
{
  // The shelf itself, on the real albums and songs (Dan, 16 November 2026):
  // one shelf of records, every album and every song placed once; rows of
  // one size, each as large as its records' hours between the floor and the
  // cap, every full row filling the width, sizes only ever stepping down;
  // and each order placing every record once.
  const { albums, songs, sleeves, singles } = unpackRanking(ranking);
  const records = mergeShelf(albums, songs, sleeves, singles);
  if (records.slice(0, 3).map((record) => record.title).join("|") !== "Music for Psychedelic Therapy|Discreet Music|Graceland") fail("the shelf must start with the most listened");
  if (records.filter((record) => record.kind === "album").length !== albums.length) fail("every top album must be a record on the shelf");
  // Dan, 18 November 2026: the shelf is his top 1,000 records, each song
  // counts on one record only, a single folds into the album it is on, and a
  // record that is over 90% one song is that song's single.
  const placedSongs = records.flatMap((record) => record.songs.map((song) => song.rank));
  if (new Set(placedSongs).size !== placedSongs.length || placedSongs.length !== songs.filter((song) => song.art).length) fail("every top song on the shelf must belong to exactly one record");
  if (placedSongs.length < 900) fail("nearly all the top songs must be on the shelf's records");
  if (records.length !== 1000) fail(`the shelf must hold the top 1,000 records [${records.length}]`);
  // Records Dan asked to keep off the shelf stay off it.
  const hiddenRecords = JSON.parse(read("data/music-hidden.json")).records;
  for (const gone of hiddenRecords) if (records.some((record) => record.artist === gone.artist && record.title === gone.title)) fail(`${gone.artist}'s ${gone.title} must stay off the shelf`);
  if (!singles.length || singles.some((single) => single.tracks.length !== 1)) fail("the singles must each be one song");
  const loss = records.find((record) => record.artist === "MGMT" && record.tracks.some((track) => track.title === "Bubblegum Dog"));
  if (loss?.title !== "Loss of Life") fail("a single must fold into the album it is on, as Bubblegum Dog into Loss of Life");
  // Melt My Eyez See Your Future is really Walkin.
  if (records.some((record) => record.title === "Melt My Eyez See Your Future")) fail("a record over 90% one song must not stand as its album");
  if (!singles.some((record) => record.title === "Walkin" && record.artist === "Denzel Curry")) fail("Melt My Eyez See Your Future must be on the shelf as the single Walkin");
  // A long piece (over ten minutes a play) is an album in itself.
  const song = (track) => track.minutes <= track.plays * 10;
  if (sleeves.some((record) => (record.tracks.length === 1 || record.tracks[0].minutes > record.minutes * 0.9) && song(record.tracks[0]))) fail("a record over 90% one song must be that song's single");
  if (records.some((record) => /Everasking Edition/.test(record.title)) || !records.some((record) => record.title === "Desire, I Want to Turn Into You")) fail("an album's editions must fold into one record");
  if (!records.some((record) => record.title === "Hey World!" && record.artist === "King Krule")) fail("a record loved for one song, such as King Krule's Hey World!, must be on the shelf");
  // Dan, 16 November 2026: such a record lists every track he played from it.
  const trex = records.find((record) => record.title === "T. Rex" && record.artist === "T. Rex");
  if (!trex || trex.tracks.length < 10 || !trex.tracks.some((track) => track.title === "Diamond Meadows")) fail("a record brought by one song, such as T. Rex's Diamond Meadows, must list every track he played from it");
  if (records.some((record) => record.kind === "sleeve" && record.tracks && record.songs.some((song) => !record.tracks.some((track) => fold(songTitle(track.title)).trim() === fold(songTitle(song.title)).trim())))) fail("a record's track list must include every top song that brought it");
  const reference = records[2].minutes;
  for (const width of [343, 1180, 1312]) {
    const limits = bounds(width);
    if (limits.floor < 44 || limits.cap > width * 0.5) fail(`squares at ${width}px must be big enough to see and never more than half the width`);
    if (sideFor(records[0].minutes, reference, limits) !== limits.cap) fail(`the most listened must reach the cap at ${width}px`);
    const rows = rowsFor(records.map((item) => ({ item })), width, reference);
    if (rows.reduce((sum, row) => sum + row.entries.length, 0) !== records.length) fail(`every record must be on the shelf at ${width}px`);
    rows.forEach((row, at) => {
      if (row.side < limits.floor - 0.01 || row.side > limits.cap + 0.01) fail(`every row at ${width}px must sit between the floor and the cap`);
      if (at && row.side > rows[at - 1].side + 0.01) fail(`a row at ${width}px must never be larger than one above it`);
      const filled = row.entries.length * row.side + (row.entries.length - 1) * GAP;
      if (at < rows.length - 1 && (filled > width + 0.01 || filled < width - row.entries.length)) fail(`every full row at ${width}px must fill the width exactly`);
    });
    if (width > 600 && rows[0].side ** 2 < rows.at(-1).side ** 2 * 4) fail("the shelf must show the difference in hours");
  }
  const entries = records.map((item) => ({ item }));
  const years = JSON.parse(read("public/music-years.json"));
  for (const order of ["hours", "kind", "released"]) {
    const groups = arrange(order, entries, { years, kinds: musicKinds });
    const placed = groups.flatMap((group) => group.entries.map((entry) => entry.item.key));
    if (placed.length !== records.length || new Set(placed).size !== records.length) fail(`the ${order} order must place every record once`);
    if (order !== "hours" && groups.some((group) => !group.label || !group.figures)) fail(`the ${order} order must head each group with what it needs`);
  }
  // Dan, 18 November 2026: a year holds every record played for an hour or
  // more that year, as large as that year's hours, newest year first; pressed
  // again, the two orders by date turn round.
  const byYear = arrange("year", entries, { years });
  if (byYear.length < 5 || byYear.some((group, at) => at && Number(group.key) > Number(byYear[at - 1].key))) fail("the year order must run newest year first");
  for (const group of byYear) {
    const keys = group.entries.map((entry) => entry.item.record);
    if (new Set(keys).size !== keys.length || group.entries.some((entry) => entry.item.minutes < 60 || entry.item.inYear !== Number(group.key))) fail(`${group.key} must hold each record played an hour or more that year, once`);
  }
  const busiest = Math.max(...byYear.map((group) => group.entries.length));
  if (busiest < 100) fail("a year must hold every record played that year, not only those played most then");
  if (arrange("year", entries, { years, reverse: true })[0].key !== byYear.at(-1).key) fail("the year order must turn round to oldest first");
  // Dan, 25 November 2026: by release date, a decade at a time, newest first,
  // the records with no known year last either way round.
  const byRelease = arrange("released", entries, {});
  const decades = byRelease.filter((group) => group.key !== "undated").map((group) => Number(group.key));
  if (decades.length < 5 || decades.some((decade, at) => at && decade > decades[at - 1])) fail("the release date order must run newest decade first");
  if (byRelease.some((group) => group.key !== "undated" && group.entries.some((entry) => Math.floor(Number(entry.item.year) / 10) * 10 !== Number(group.key)))) fail("a decade must hold the records released in it");
  const oldestFirst = arrange("released", entries, { reverse: true });
  if (oldestFirst[0].key !== String(decades.at(-1)) || (byRelease.some((group) => group.key === "undated") && (byRelease.at(-1).key !== "undated" || oldestFirst.at(-1).key !== "undated"))) fail("the release date order must turn round to oldest first and keep undated records last");
}

// The address stays private.
const personalEmail = ["da", "kibwa", "@", "gmail", ".com"].join("");
for (const [source, label] of [[index, "the page"], [music, "the music shelf"], [layout, "the layout"]]) forbidText(source, personalEmail, `the contact address must not be present in ${label}`);

// The public music file carries aggregates only (Dan asked for hours listened
// on 24 September 2026): no dates, URIs, accounts or raw events.
if (ranking.schemaVersion !== 2 || !/^\d{4}-\d{2}-\d{2}$/.test(ranking.asOf)) fail("the music file must be versioned and dated");
if (ranking.songs.length !== 1000 || ranking.albums.length !== 150) fail("the music file must hold 1,000 songs and 150 albums");
const whole = (value) => Number.isSafeInteger(value) && value >= 0;
const recordIds = new Set([...ranking.albums, ...ranking.sleeves, ...ranking.singles].map((row) => row[0]));
for (const [title, artist, plays, youtube, art, minutes] of ranking.songs) {
  if (typeof title !== "string" || !Number.isInteger(artist) || !ranking.names[artist]) fail("every song needs a title and a named artist");
  if (!whole(plays) || !whole(youtube) || youtube > plays || !whole(minutes)) fail("song counts must be whole plays and minutes");
  if (art !== null && !recordIds.has(art)) fail(`a song names a record that is not on the shelf: ${art}`);
}
// The other albums and the singles carry the same public fields as the top
// albums, and their cover's id or none (Dan, 16 and 18 November 2026).
for (const row of [...ranking.albums, ...ranking.sleeves, ...ranking.singles]) {
  const [id, title, artist, year, plays, minutes, tracks] = row;
  const art = row.length === 8 ? row[7] : id;
  if (art !== null && !existsSync(new URL(`../public/album-art/${art}-wall.webp`, import.meta.url))) fail(`missing sleeve ${art}`);
  if (typeof title !== "string" || !ranking.names[artist] || !(year === null || /^\d{4}$/.test(year))) fail("every album needs a title, artist and year or none");
  if (!whole(plays) || !whole(minutes) || !Array.isArray(tracks) || !tracks.length) fail(`${title} needs plays, minutes and its tracks`);
  if (tracks.some((track) => track.length !== 3 || typeof track[0] !== "string" || !whole(track[1]) || !whole(track[2]))) fail(`${title}'s tracks must be [title, plays, minutes]`);
}
// Only these fields, in fixed-length rows.
if (JSON.stringify(Object.keys(ranking).sort()) !== JSON.stringify(["albums", "asOf", "counts", "hours", "names", "schemaVersion", "singles", "sleeves", "songs"])) fail("the public music file has unexpected fields");
if (ranking.songs.some((row) => row.length !== 6) || ranking.albums.some((row) => row.length !== 7) || [...ranking.sleeves, ...ranking.singles].some((row) => row.length !== 8)) fail("music rows must keep their public fields");
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
if (Object.keys(musicKinds).some((key) => !["artists", "kinds", "note", "schemaVersion", "subkinds", "subs"].includes(key))) fail("the music kinds file has unexpected fields");
for (const name of ranking.names) {
  if (!Number.isInteger(musicKinds.artists[name]) || !musicKinds.kinds[musicKinds.artists[name]]) fail(`${name} must have a kind of music`);
}
// Dan, 25 November 2026: each genre in sub-genres, one for each artist, and
// every sub-genre's name its own.
if (musicKinds.subkinds) {
  if (musicKinds.subkinds.length !== musicKinds.kinds.length || musicKinds.subkinds.some((names) => !Array.isArray(names) || names.length < 2 || names.some((name) => typeof name !== "string" || !name))) fail("every kind of music must list its sub-genres");
  const subNames = musicKinds.subkinds.flat();
  if (new Set(subNames).size !== subNames.length) fail("a sub-genre's name must be its own");
  // An artist with a record on the shelf has one; a few artists are named
  // only by songs that stand on someone else's record.
  const shelved = unpackRanking(ranking);
  for (const name of new Set(mergeShelf(shelved.albums, shelved.songs, shelved.sleeves, shelved.singles).map((record) => record.artist))) {
    if (!musicKinds.subkinds[musicKinds.artists[name]][musicKinds.subs?.[name]]) fail(`${name} must have a sub-genre within its kind of music`);
  }
  for (const [at, names] of musicKinds.subkinds.entries()) {
    for (const [sub, name] of names.entries()) {
      if (!Object.entries(musicKinds.subs).some(([artist, index]) => index === sub && musicKinds.artists[artist] === at)) fail(`no artist is filed under ${name}`);
    }
  }
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

// Old page paths are absent from the export. The standalone game is staged
// under public/features for its own deployment and excluded from this site.
for (const route of ["trek", "albums", "projects", "personal", "about", "contact", "offer", "professional", "systems", "work", "concept", "onebagger", "meditator", "portugal", "probe", "features"]) {
  const paths = [`app/${route}`];
  if (route !== "features") paths.push(`public/${route}/index.html`);
  for (const path of paths) {
    if (existsSync(new URL(`../${path}`, import.meta.url))) fail(`the retired /${route}/ route must stay out of the site`);
  }
}
requireText(read("public/.assetsignore"), "\n/features/\n", "only the standalone game host may publish the game");
requireText(read("wrangler.jsonc"), '"not_found_handling": "404-page"', "missing routes must use the real 404 page");
requireText(sitemap, 'const routes = [{ path: "/", priority: 1 }]', "only the Akibwa index belongs in the sitemap");

if (existsSync(new URL("../public/life-map/index.html", import.meta.url))) {
  fail("the detailed Life in Maps page must not ship");
}

if (existsSync(new URL("../public/trek", import.meta.url))) {
  fail("the retired Trek files must stay out of the public export");
}

console.log("Akibwa public-boundary contract passed.");
