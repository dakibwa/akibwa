// Packs the sleeves into sheets, writes the data, and assembles the page.
// KIT=<folder with @napi-rs/canvas> node net/sea/build.mjs <out-folder>

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { albumWeights } from "../../components/paper/music-map.mjs";
import { layoutSea } from "./layout.mjs";

const require = createRequire(`${process.env.KIT}/package.json`);
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const out = process.argv[2] ?? "net/sea/out";
mkdirSync(out, { recursive: true });
const ranking = JSON.parse(readFileSync("public/music-ranking.json", "utf8"));
const names = ranking.names;
const weights = albumWeights(ranking.albums.map((a) => ({ title: a[1], artist: names[a[2]], minutes: a[5] })));
const top = Math.max(...weights);

// Every sleeve once: the albums by hours, then sleeves known only through songs, by plays.
const albumIds = new Set(ranking.albums.map((a) => a[0]));
const tiles = ranking.albums
  .map((a, n) => ({ id: a[0], title: a[1], artist: names[a[2]], kind: "album", hours: Math.round(a[5] / 60), size: weights[n] / top }))
  .sort((p, q) => q.size - p.size);
const bySleeve = new Map();
for (const s of ranking.songs) {
  if (!s[4] || albumIds.has(s[4])) continue;
  const list = bySleeve.get(s[4]) ?? [];
  list.push(s);
  bySleeve.set(s[4], list);
}
const songs = [...bySleeve].map(([id, list]) => {
  list.sort((p, q) => q[2] - p[2]);
  return { id, title: list[0][0], artist: names[list[0][1]], kind: "song", plays: list.reduce((sum, s) => sum + s[2], 0), more: list.length - 1 };
});
songs.sort((p, q) => q.plays - p.plays);
const mostPlays = songs[0].plays;
for (const s of songs) s.size = Math.sqrt(s.plays / mostPlays);
tiles.push(...songs);

// Two sheets: small for the sea, large for under the lens.
const sheet = async (side, per, name) => {
  const pages = Math.ceil(tiles.length / (per * per));
  const files = [];
  for (let page = 0; page < pages; page += 1) {
    const slice = tiles.slice(page * per * per, (page + 1) * per * per);
    const rows = Math.ceil(slice.length / per);
    const canvas = createCanvas(per * side, rows * side);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    for (let n = 0; n < slice.length; n += 1) {
      const img = await loadImage(`public/album-art/${slice[n].id}-wall.webp`);
      ctx.drawImage(img, (n % per) * side, Math.floor(n / per) * side, side, side);
      if (side <= 128) {
        const d = ctx.getImageData((n % per) * side, Math.floor(n / per) * side, side, side).data;
        let sum = 0;
        for (let p = 0; p < d.length; p += 16) sum += 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2];
        slice[n].light = Math.round((sum / (d.length / 16) / 255) * 100) / 100;
      }
    }
    const file = `${name}${pages > 1 ? `-${page + 1}` : ""}.webp`;
    writeFileSync(`${out}/${file}`, await canvas.encode("webp", side <= 128 ? 80 : 84));
    files.push(file);
  }
  return { side, per, files };
};
const small = await sheet(96, 21, "sleeves-small");
const large = await sheet(264, 15, "sleeves-large");
// The name is spelt by the most played albums; a sleeve too dark to read as a lit square gives its place to the next.
const NAMED = 92;
const albums = tiles.filter((t) => t.kind === "album");
const bright = albums.filter((t) => t.light >= 0.17);
const chosen = new Set(bright.slice(0, NAMED));
for (const t of albums) if (chosen.size < NAMED) chosen.add(t);
const ordered = [...tiles.filter((t) => chosen.has(t)), ...tiles.filter((t) => !chosen.has(t))];
const slotOf = new Map(tiles.map((t, n) => [t, n]));
console.log(`name: ${chosen.size} albums, ${albums.slice(0, NAMED).filter((t) => !chosen.has(t)).length} dark ones passed over (${albums.slice(0, NAMED).filter((t) => !chosen.has(t)).map((t) => t.title).join(", ")})`);
const data = {
  small,
  large,
  named: NAMED,
  tiles: ordered.map((t) => [t.title, t.artist, t.kind === "album" ? 1 : 0, Math.round(t.size * 1000) / 1000, t.kind === "album" ? t.hours : t.plays, t.more ?? 0, slotOf.get(t)])
};
writeFileSync(`${out}/sea.json`, JSON.stringify(data));

const layout = readFileSync("net/sea/layout.mjs", "utf8").replace(/^export /gm, "");
const code = readFileSync("net/sea/sea.js", "utf8");
const page = readFileSync("net/sea/page.html", "utf8").replace("/*LAYOUT*/", () => layout).replace("/*CODE*/", () => code).replace("/*DATA*/", () => JSON.stringify(data));
writeFileSync(`${out}/page.html`, page);
writeFileSync(`${out}/index.html`, `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body style="margin:0">\n${page}\n</body></html>\n`);
const L = layoutSea(tiles.length, 1440, 900, data.named);
console.log(`${tiles.length} sleeves (${ranking.albums.length} albums, ${songs.length} from songs); grid ${L.cols} x ${L.rows} at ${L.pitch.toFixed(1)}px, ${L.lit} cells in the name`);
console.log(`sheets: ${[...small.files, ...large.files].join(", ")}`);
