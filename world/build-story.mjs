// Builds the scrolling story of the valley: world/out/story.html, beside
// world/out/sleeves.jpg (every cover, small, on one sheet) and world/out/art/
// (the covers the story shows large, kept sharp).
// node world/build-story.mjs

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { albumWeights } from "../components/paper/music-map.mjs";
import { KINDS } from "./things.mjs";

const OUT = "world/out";
const CELL = 128;
const COLS = 15;
mkdirSync(`${OUT}/art`, { recursive: true });

/*
 * The journey, as the listening years tell it: each stretch of years, the
 * kind of music that led it, and the view of the valley that goes with it
 * (`wide` for screens wider than tall, `tall` for phones). `aim` is the place
 * on the land the view looks at; `at` how far down the picture it sits.
 */
const CHAPTERS = [
  { id: "town", years: [2016], kind: "hiphop", wide: { time: 8.2, fov: 22, aim: [300, 1950], at: 0.66 }, tall: { time: 8.2, fov: 17, aim: [300, 1950], at: 0.56 } },
  { id: "forest", years: [2017], kind: "psych", wide: { time: 10.2, fov: 20, aim: [-430, 1300], at: 0.62 }, tall: { time: 10.2, fov: 15, aim: [-430, 1300], at: 0.56 } },
  { id: "castle", years: [2018, 2019], kind: "classics", wide: { time: 13, fov: 24, aim: [-56, 1020], at: 0.66 }, tall: { time: 13, fov: 16, aim: [-56, 1020], at: 0.56 } },
  { id: "sea", years: [2020], kind: "ambient", wide: { time: 15.8, fov: 18, aim: [900, 3500], at: 0.6 }, tall: { time: 15.8, fov: 14, aim: [900, 3500], at: 0.52 } },
  { id: "snow", years: [2021], kind: "electronic", wide: { time: 14.6, fov: 14, aim: [-1500, 5200], at: 0.56, clear: 2.6 }, tall: { time: 14.6, fov: 10, aim: [-1500, 5200], at: 0.5, clear: 2.6 } },
  { id: "hill", years: [2022, 2023, 2024], kind: "indie", wide: { time: 18.9, fov: 50, yaw: 6, horizon: 0.4, eye: 20 }, tall: { time: 18.9, fov: 34, yaw: 8, horizon: 0.36, eye: 20 } },
  { id: "fields", years: [2025, 2026], kind: "folk", wide: { time: 19.7, fov: 26, aim: [250, 1050], at: 0.66 }, tall: { time: 19.7, fov: 18, aim: [250, 1050], at: 0.56 } }
];
const OPEN = { wide: { time: 19.3, fov: 60, horizon: 0.37, eye: 54 }, tall: { time: 19.3, fov: 50, horizon: 0.35, eye: 135 } };
const NIGHT = { wide: { time: 23.5, fov: 60, horizon: 0.37, eye: 54 }, tall: { time: 23.5, fov: 50, horizon: 0.35, eye: 135 } };
// The two records that run for days: they belong to the night, not to a year.
const NIGHTS = new Set(["043", "lf-dbbd05ddffe94ea5"]);
// An album that belongs with a stretch other than the one where its hours peak.
const PINNED = { 216: "snow" };

const ranking = JSON.parse(readFileSync("public/music-ranking.json", "utf8"));
const yearly = JSON.parse(readFileSync("public/music-years.json", "utf8"));
const kinds = JSON.parse(readFileSync("world/kinds.json", "utf8")).kinds;
const names = ranking.names;
const list = ranking.albums.map((a) => ({ id: a[0], title: a[1], artist: names[a[2]], minutes: a[5] }));
const weights = albumWeights(list);
const albums = list.map((album, index) => ({ ...album, weight: weights[index], kind: kinds[album.id], cover: index }));
const byId = new Map(albums.map((a) => [a.id, a]));
const chapterOf = new Map(CHAPTERS.flatMap((c, i) => c.years.map((y) => [y, i])));
const rows = Math.ceil(albums.length / COLS);
const has = (id, size) => existsSync(`public/album-art/${id}-${size}.webp`);

// Where each album belongs: the stretch where its hours peak.
const inChapter = CHAPTERS.map(() => []);
for (const album of albums) {
  if (NIGHTS.has(album.id)) continue;
  const years = (yearly.albums[album.id] ?? []).filter(([y]) => chapterOf.has(y));
  if (!years.length) continue;
  const peak = years.reduce((best, row) => (row[1] > best[1] ? row : best))[0];
  let home = chapterOf.get(peak);
  if (PINNED[album.id]) home = CHAPTERS.findIndex((c) => c.id === PINNED[album.id]);
  const then = years.filter(([y]) => CHAPTERS[home].years.includes(y)).reduce((sum, row) => sum + row[1], 0);
  inChapter[home].push({ id: album.id, title: album.title, artist: album.artist, minutes: album.minutes, then });
}
// Songs the same way, most played first.
const songsIn = CHAPTERS.map(() => []);
ranking.songs.forEach((song, index) => {
  const years = (yearly.songs[index] ?? []).filter(([y]) => chapterOf.has(y));
  if (!years.length) return;
  const peak = years.reduce((best, row) => (row[1] > best[1] ? row : best))[0];
  songsIn[chapterOf.get(peak)].push({ title: song[0].replace(/ - \d{4}( Digital)? Remaster(ed)?$/i, ""), artist: names[song[1]], plays: song[2], album: song[4] && has(song[4], "wall") ? song[4] : null, single: !byId.has(song[4]) });
});

const art = new Map(); // file name → [source, size]
const big = (id, hero) => {
  const from = has(id, "large") ? "large" : "wall";
  art.set(`a-${id}-300.webp`, [`public/album-art/${id}-${from}.webp`, 300]);
  if (hero && from === "large") art.set(`a-${id}-600.webp`, [`public/album-art/${id}-large.webp`, 600]);
  return { src: `art/a-${id}-300.webp`, src2: hero && from === "large" ? `art/a-${id}-600.webp` : null };
};
const small = (id) => {
  if (!id) return null;
  art.set(`s-${id}.webp`, [`public/album-art/${id}-wall.webp`, 112]);
  return `art/s-${id}.webp`;
};

const label = (id) => KINDS.find((k) => k.id === id);
const span = (years) => (years.length > 1 ? `${years[0]}–${String(years[years.length - 1]).slice(2)}` : String(years[0]));
const chapters = CHAPTERS.map((chapter, index) => {
  const mine = inChapter[index].sort((a, b) => b.then - a.then).slice(0, 7);
  const songs = songsIn[index].sort((a, b) => b.plays - a.plays).slice(0, 5);
  const hero = mine[0];
  return {
    id: chapter.id,
    years: span(chapter.years),
    kind: chapter.kind,
    label: label(chapter.kind).label,
    place: label(chapter.kind).place,
    fact: `${Math.round(hero.then / 60)} hours of ${hero.title}.`,
    wide: chapter.wide,
    tall: chapter.tall,
    albums: mine.map((a, i) => ({ ...a, weight: a.then, ...big(a.id, i < 2) })),
    songs: songs.map((s) => ({ title: s.title, artist: s.artist, plays: s.plays, single: s.single, art: small(s.album) }))
  };
});
const nights = [...NIGHTS].map((id) => {
  const a = byId.get(id);
  const since = Math.min(...(yearly.albums[id] ?? []).filter(([y, m]) => chapterOf.has(y) && m > 0).map(([y]) => y));
  return { id, title: a.title, artist: a.artist, minutes: a.minutes, since, ...big(id, true) };
});
// The night shows every kind at once: its leading albums need their covers too.
for (const K of KINDS) for (const a of albums.filter((x) => x.kind === K.id).slice(0, 8)) big(a.id, false);

await Promise.all([...art].map(([name, [from, size]]) => sharp(from).resize(size, size, { kernel: "lanczos3" }).webp({ quality: 84 }).toFile(`${OUT}/art/${name}`)));
const tiles = await Promise.all(
  albums.map(async (album, index) => ({
    input: await sharp(`public/album-art/${album.id}-wall.webp`).resize(CELL, CELL, { kernel: "lanczos3" }).removeAlpha().png().toBuffer(),
    left: (index % COLS) * CELL,
    top: Math.floor(index / COLS) * CELL
  }))
);
await sharp({ create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: "#2a2420" } }).composite(tiles).jpeg({ quality: 84, mozjpeg: true }).toFile(`${OUT}/sleeves.jpg`);

const strip = (name) =>
  readFileSync(`world/${name}.mjs`, "utf8")
    .replace(/^import [^;]+;\n/gm, "")
    .replace(/^export (function|const|async function)/gm, "$1");
// The painter runs off the main thread, so scrolling never waits for it.
const engine = `${["noise", "land", "dither", "paint", "things"].map(strip).join("\n")}\n${strip("story-worker")}`;
const data = {
  seed: 7,
  atlas: { src: "sleeves.jpg", cell: CELL, cols: COLS, rows },
  kinds: KINDS,
  albums: albums.map((a) => ({ id: a.id, title: a.title, artist: a.artist, minutes: a.minutes, weight: a.weight, kind: a.kind, cover: a.cover, art: art.has(`a-${a.id}-300.webp`) ? `art/a-${a.id}-300.webp` : null })),
  open: OPEN,
  night: NIGHT,
  chapters,
  nights
};
const html = readFileSync("world/story.html", "utf8")
  .replace("/*DATA*/", () => `window.STORY = ${JSON.stringify(data)};\nwindow.STORY_ENGINE = ${JSON.stringify(engine)};`)
  .replace("/*CODE*/", () => `(() => {\n${strip("story")}\n})();`);
writeFileSync(`${OUT}/story.html`, html);
writeFileSync(`${OUT}/story-local.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`);
writeFileSync(`${OUT}/art-list.json`, JSON.stringify([...art.keys()].sort()));
console.log(`story.html ${Math.round(html.length / 1024)} KB, ${art.size} covers`);
for (const c of chapters) console.log(`${c.years.padEnd(8)} ${c.label.padEnd(19)} ${c.fact.padEnd(44)} | ${c.albums.map((a) => a.title.slice(0, 16)).join(", ")} | songs: ${c.songs.map((s) => s.title.slice(0, 18)).join(", ")}`);
