// The wordmark and some line work in characters, to calibrate. KIT=… node net/ascii/mark-test.mjs <out.png>
import { writeFileSync } from "node:fs";
import { createCanvas, loadImage, fontFile, makeGlyphs, toCells, drawCells } from "./engine.mjs";

const out = process.argv[2] ?? "mark.png";
fontFile("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2", "Plex600");
fontFile("@fontsource/fraunces/files/fraunces-latin-900-normal.woff2", "FrauncesBlack");
fontFile("@fontsource/fraunces/files/fraunces-latin-900-italic.woff2", "FrauncesBlackItalic");
fontFile("@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2", "FrauncesVar");
const font = { family: "Plex600", weight: 400, tall: 10 / 6 };
const glyphs = makeGlyphs(font);
const W = 2880;
const H = 1800;
const cw = 6;
const ch = 10;
const scene = createCanvas(W, H);
const x = scene.getContext("2d");
x.fillStyle = "#000";
x.fillRect(0, 0, W, H);

// 1. Solid letters, cream down to ember.
const grad = (y0, y1) => {
  const g = x.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#fff3de");
  g.addColorStop(0.45, "#f7b26c");
  g.addColorStop(0.75, "#ee6f38");
  g.addColorStop(1, "#8e3418");
  return g;
};
x.textBaseline = "alphabetic";
x.font = "400px 'FrauncesBlack'";
x.fillStyle = grad(120, 420);
x.fillText("AKIBWA", 80, 420);
console.log("width", x.measureText("AKIBWA").width);
// Does the variable font answer to its axes?
x.font = "400px 'FrauncesVar'";
try {
  x.fontVariationSettings = "'wght' 900, 'opsz' 144, 'SOFT' 100, 'WONK' 1";
} catch (e) {
  console.log("no variation settings", e.message);
}
x.fillStyle = grad(520, 840);
x.fillText("akibwa", 1640, 420);
x.fontVariationSettings = "normal";
// 2. Outline with a stipple inside.
x.font = "400px 'FrauncesBlack'";
x.lineWidth = 7;
x.strokeStyle = "#f3e7d3";
x.strokeText("AKIBWA", 80, 900);
// 3. Knocked out of a glowing body.
{
  const cx = 800;
  const cy = 1330;
  const body = x.createRadialGradient(cx, cy, 40, cx, cy, 760);
  body.addColorStop(0, "#ffb070");
  body.addColorStop(0.55, "#e2622f");
  body.addColorStop(0.8, "#5a2413");
  body.addColorStop(1, "#000000");
  x.save();
  x.translate(cx, cy);
  x.scale(1, 0.42);
  x.translate(-cx, -cy);
  x.fillStyle = body;
  x.beginPath();
  x.arc(cx, cy, 780, 0, Math.PI * 2);
  x.fill();
  x.restore();
  x.fillStyle = "#000";
  x.font = "400px 'FrauncesBlack'";
  x.fillText("AKIBWA", 80, 1470);
}
// Line work: fans of strokes of several widths, and curves.
const fan = (cx, cy, widths, colour) => {
  x.strokeStyle = colour;
  x.lineCap = "round";
  widths.forEach((w, n) => {
    for (let a = 0; a < 12; a += 1) {
      const ang = (a / 12) * Math.PI * 2 + n * 0.09;
      x.lineWidth = w;
      x.beginPath();
      x.moveTo(cx + Math.cos(ang) * (40 + n * 70), cy + Math.sin(ang) * (40 + n * 70));
      x.lineTo(cx + Math.cos(ang) * (100 + n * 70), cy + Math.sin(ang) * (100 + n * 70));
      x.stroke();
    }
  });
};
fan(2050, 900, [10, 6, 4, 3, 2], "#d9c9a8");
x.strokeStyle = "#8fd0ae";
for (let n = 0; n < 7; n += 1) {
  x.lineWidth = 1.5 + n;
  x.beginPath();
  x.moveTo(1700, 1300 + n * 60);
  x.bezierCurveTo(2000, 1200 + n * 60, 2300, 1500 + n * 40, 2800, 1250 + n * 70);
  x.stroke();
}
// Small sleeves at the sizes they would have in the net.
const img = await loadImage("public/album-art/lf-9a73a1e5602a994d-large.webp");
const img2 = await loadImage("public/album-art/163-large.webp");
const img3 = await loadImage("public/album-art/lf-f396087d71105729-large.webp");
let px = 1660;
for (const s of [60, 90, 120, 160, 200]) {
  x.drawImage(img, px, 500, s, s);
  x.drawImage(img2, px, 720 - s / 2 + 100, s, s);
  px += s + 30;
}
x.drawImage(img3, 2560, 1500, 240, 240);

const cols = W / cw;
const rows = H / ch;
const cells = toCells(x.getImageData(0, 0, W, H), cols, rows, glyphs, { gamma: 0.9, gain: 1.05, lift: 0.5, shape: 1.5 });
const page = createCanvas(W, H);
const p = page.getContext("2d");
p.fillStyle = "#0e0c0a";
p.fillRect(0, 0, W, H);
drawCells(p, cells, cols, rows, cw, ch, font, { under: 0.2 });
writeFileSync(out, page.toBuffer("image/png"));
writeFileSync(out.replace(".png", "-scene.png"), scene.toBuffer("image/png"));
