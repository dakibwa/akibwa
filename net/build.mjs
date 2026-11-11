// Builds the net of Dan's music as one page: net/out/net.html, beside
// net/out/covers.jpg (every cover, small, on one sheet) and net/out/art/
// (the 150 albums' covers, larger, fetched one at a time when opened).
// node net/build.mjs

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { albumWeights } from "../components/paper/music-map.mjs";

const OUT = "net/out";
const CELL = 112;
const COLS = 24;
mkdirSync(`${OUT}/art`, { recursive: true });

const ranking = JSON.parse(readFileSync("public/music-ranking.json", "utf8"));
const links = JSON.parse(readFileSync("public/music-links.json", "utf8")).albums;
const kindOf = JSON.parse(readFileSync("world/kinds.json", "utf8")).kinds;
const names = ranking.names;

// The groups the net branches into from its middle: seven kinds of music,
// and the artists known here only by single songs.
const GROUPS = [
  { id: "hiphop", label: "hip-hop & soul" },
  { id: "psych", label: "psychedelic" },
  { id: "classics", label: "classics" },
  { id: "ambient", label: "ambient" },
  { id: "singles", label: "singles" },
  { id: "electronic", label: "electronic" },
  { id: "indie", label: "indie" },
  { id: "folk", label: "folk & songwriters" }
];

const list = ranking.albums.map((a) => ({ id: a[0], title: a[1], artist: a[2], minutes: a[5] }));
const tamed = albumWeights(list.map((a) => ({ ...a, artist: names[a.artist] })));
const albumById = new Map(list.map((a, i) => [a.id, { ...a, weight: tamed[i], kind: kindOf[a.id] }]));

// Every cover that anything here points at, on one sheet.
const coverIds = [];
const coverAt = new Map();
const cover = (id) => {
  if (!id || !existsSync(`public/album-art/${id}-wall.webp`)) return -1;
  if (!coverAt.has(id)) {
    coverAt.set(id, coverIds.length);
    coverIds.push(id);
  }
  return coverAt.get(id);
};

const nodes = [{ t: "me", n: "Akibwa", p: -1 }];
const groupNode = new Map();
for (const g of GROUPS) {
  groupNode.set(g.id, nodes.length);
  nodes.push({ t: "kind", n: g.label, p: 0, g: g.id });
}

// Artists: each belongs with the kind most of their album hours are in, or
// with the singles when only their songs are here.
const artistNode = new Map();
const artistKinds = new Map();
for (const a of albumById.values()) {
  const m = artistKinds.get(a.artist) ?? new Map();
  m.set(a.kind, (m.get(a.kind) ?? 0) + a.weight);
  artistKinds.set(a.artist, m);
}
const artistOf = (index) => {
  if (artistNode.has(index)) return artistNode.get(index);
  const kinds = artistKinds.get(index);
  const home = kinds ? [...kinds].sort((p, q) => q[1] - p[1])[0][0] : "singles";
  const node = { t: "artist", n: names[index], p: groupNode.get(home), g: home, w: 0, also: kinds ? [...kinds.keys()].filter((k) => k !== home) : [] };
  artistNode.set(index, nodes.length);
  nodes.push(node);
  return artistNode.get(index);
};

const albumNode = new Map();
for (const a of albumById.values()) {
  const parent = artistOf(a.artist);
  albumNode.set(a.id, nodes.length);
  nodes.push({ t: "album", n: a.title, p: parent, g: a.kind, w: a.weight, m: a.minutes, c: cover(a.id), art: a.id, s: links[a.id]?.spotify ?? null, ap: links[a.id]?.apple ?? null });
  nodes[parent].w += a.weight;
}
const clean = (title) => title.replace(/ - (\d{4} )?(Digital )?Remaster(ed)?( \d{4})?$/i, "").replace(/ - \d{4} Digital Master$/i, "");
ranking.songs.forEach((song) => {
  const [title, artist, plays, , album, minutes] = song;
  const onAlbum = albumNode.has(album);
  const parent = onAlbum ? albumNode.get(album) : artistOf(artist);
  const node = { t: "song", n: clean(title), p: parent, g: nodes[parent].g, w: plays, m: minutes, c: cover(album) };
  if (!onAlbum) nodes[parent].w += minutes;
  // Guests named in the title link the song to them, where they are in the net too.
  const guests = /\((?:feat\.?|with) ([^)]+)\)/i.exec(title);
  if (guests) {
    const who = guests[1].split(/,|&| and /).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const found = who.map((w) => names.findIndex((n) => n.toLowerCase() === w)).filter((i) => i >= 0 && i !== artist && (artistNode.has(i) || artistKinds.has(i)));
    if (found.length) node.x = found.map((i) => artistOf(i));
  }
  nodes.push(node);
});
// An artist with albums of a second kind is tied to that kind as well.
for (const node of nodes) {
  if (node.t === "artist" && node.also.length) node.x = node.also.map((k) => groupNode.get(k));
  delete node.also;
}

// Covers: one sheet of small ones, and each album's larger one on its own.
const rows = Math.ceil(coverIds.length / COLS);
const tiles = await Promise.all(
  coverIds.map(async (id, index) => ({
    input: await sharp(`public/album-art/${id}-wall.webp`).resize(CELL, CELL, { kernel: "lanczos3" }).removeAlpha().png().toBuffer(),
    left: (index % COLS) * CELL,
    top: Math.floor(index / COLS) * CELL
  }))
);
await sharp({ create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: "#1e1a17" } }).composite(tiles).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/covers.jpg`);
await Promise.all(
  [...albumById.keys()].map((id) => {
    const from = existsSync(`public/album-art/${id}-large.webp`) ? "large" : "wall";
    return sharp(`public/album-art/${id}-${from}.webp`).resize(360, 360, { kernel: "lanczos3" }).webp({ quality: 84 }).toFile(`${OUT}/art/${id}.webp`);
  })
);

const strip = (file) =>
  readFileSync(file, "utf8")
    .replace(/^import [^;]+;\n/gm, "")
    .replace(/^export (function|const|async function)/gm, "$1");
const data = { groups: GROUPS, nodes, covers: { src: "covers.jpg", cell: CELL, cols: COLS, rows }, asOf: ranking.asOf };
const html = readFileSync("net/net.html", "utf8")
  .replace("/*DATA*/", () => `window.NET = ${JSON.stringify(data)};`)
  .replace("/*CODE*/", () => `(() => {\n${strip("net/net.mjs")}\n})();`);
writeFileSync(`${OUT}/net.html`, html);
writeFileSync(`${OUT}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`);
const count = (t) => nodes.filter((n) => n.t === t).length;
console.log(`net.html ${Math.round(html.length / 1024)} KB | artists ${count("artist")}, albums ${count("album")}, songs ${count("song")} | covers ${coverIds.length} (${COLS * CELL}x${rows * CELL}) | guest links ${nodes.filter((n) => n.t === "song" && n.x).length} | artists in two kinds ${nodes.filter((n) => n.t === "artist" && n.x).length}`);
for (const g of GROUPS) console.log(`  ${g.label.padEnd(19)} artists ${String(nodes.filter((n) => n.t === "artist" && n.g === g.id).length).padStart(3)}  albums ${String(nodes.filter((n) => n.t === "album" && n.g === g.id).length).padStart(3)}  songs ${String(nodes.filter((n) => n.t === "song" && n.g === g.id).length).padStart(3)}`);
