// A few sleeves in characters, to judge the look. KIT=… node net/ascii/sleeves-test.mjs <out.png> [cell] [weight] [under]
import { writeFileSync } from "node:fs";
import { createCanvas, loadImage, fontFile, makeGlyphs, toCells, drawCells } from "./engine.mjs";

const out = process.argv[2] ?? "sleeves.png";
const cw = Number(process.argv[3] ?? 6);
const weight = Number(process.argv[4] ?? 500);
const under = Number(process.argv[5] ?? 0);
for (const w of [400, 500, 600, 700]) fontFile(`@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${w}-normal.woff2`, `Plex${w}`);
const tall = Number(process.argv[6] ?? 10 / 6);
const font = { family: `Plex${weight}`, weight: 400, tall };
const glyphs = makeGlyphs(font);
console.log("densest:", glyphs.list.slice().sort((a, b) => b.ink - a.ink).slice(0, 12).map((g) => g.ch).join(""), "top", glyphs.top.toFixed(3));
const ch = Math.round(cw * tall);
const vivid = Number(process.argv[7] ?? 1);
const lift = Number(process.argv[8] ?? 0.5);
const ids = (process.argv[9] ?? "lf-9a73a1e5602a994d,163,201,lf-f396087d71105729,135,208").split(",");
const W = 2880;
const H = 1800;
const size = 780;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#100d0b";
ctx.fillRect(0, 0, W, H);
for (let n = 0; n < ids.length; n += 1) {
  const img = await loadImage(`public/album-art/${ids[n]}-large.webp`);
  const cols = Math.floor(size / cw);
  const rows = Math.floor(size / ch);
  const src = createCanvas(cols * cw, rows * ch);
  const sx = src.getContext("2d");
  sx.drawImage(img, 0, 0, cols * cw, rows * ch);
  const cells = toCells(sx.getImageData(0, 0, cols * cw, rows * ch), cols, rows, glyphs, { gamma: 0.9, gain: 1.05, lift, shape: 1.5, vivid });
  const x = 135 + (n % 3) * (size + 135);
  const y = 80 + Math.floor(n / 3) * (size + 80);
  drawCells(ctx, cells, cols, rows, cw, ch, font, { x, y, under });
}
writeFileSync(out, canvas.toBuffer("image/png"));
console.log(out);
