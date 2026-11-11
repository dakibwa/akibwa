// Builds the valley as one page to open on its own: world/out/valley.html
// beside world/out/sleeves.jpg (every cover on one sheet).
// node world/bundle.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { albumWeights } from "../components/paper/music-map.mjs";

const OUT = "world/out";
const CELL = 128;
const COLS = 15;
mkdirSync(OUT, { recursive: true });

const ranking = JSON.parse(readFileSync("public/music-ranking.json", "utf8"));
const kinds = JSON.parse(readFileSync("world/kinds.json", "utf8")).kinds;
const list = ranking.albums.map((a) => ({ id: a[0], title: a[1], artist: ranking.names[a[2]], minutes: a[5] }));
const weights = albumWeights(list);
const albums = list.map((album, index) => ({ ...album, weight: weights[index], kind: kinds[album.id], cover: index }));
const rows = Math.ceil(albums.length / COLS);

// Every cover on one sheet.
const tiles = await Promise.all(
  albums.map(async (album, index) => ({
    input: await sharp(`public/album-art/${album.id}-wall.webp`).resize(CELL, CELL, { kernel: "lanczos3" }).removeAlpha().png().toBuffer(),
    left: (index % COLS) * CELL,
    top: Math.floor(index / COLS) * CELL
  }))
);
await sharp({ create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: "#2a2420" } })
  .composite(tiles)
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(`${OUT}/sleeves.jpg`);

// The code as one script: the modules in order, without their import and export lines.
const code = ["noise", "land", "dither", "paint", "things", "page"]
  .map((name) =>
    readFileSync(`world/${name}.mjs`, "utf8")
      .replace(/^import [^;]+;\n/gm, "")
      .replace(/^export (function|const|async function)/gm, "$1")
  )
  .join("\n");

const data = { seed: 7, atlas: { src: "sleeves.jpg", cell: CELL, cols: COLS, rows }, albums };
const html = readFileSync("world/page.html", "utf8")
  .replace("/*DATA*/", () => `window.VALLEY = ${JSON.stringify(data)};`)
  .replace("/*CODE*/", () => `(() => {\n${code}\n})();`);
writeFileSync(`${OUT}/valley.html`, html);
// The same page with the wrapper a browser needs when opened straight from disk.
writeFileSync(`${OUT}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`);
console.log(`valley.html ${Math.round(html.length / 1024)} KB, ${albums.length} albums, sheet ${COLS * CELL}x${rows * CELL}`);
