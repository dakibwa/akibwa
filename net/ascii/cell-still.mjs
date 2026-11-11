// The nerve cell painted, then drawn again in characters small enough to read
// as a picture. KIT=<folder with @napi-rs/canvas> node net/ascii/cell-still.mjs <out.png> [options as key=value]

import { writeFileSync } from "node:fs";
import { loadGraph } from "../graph-check.mjs";
import { layoutCell } from "../cell.mjs";
import { createCanvas, loadImage, fontFile, makeGlyphs, toCells, drawCells, BASE } from "./engine.mjs";

const args = Object.fromEntries(process.argv.slice(3).map((pair) => pair.split("=")));
const out = process.argv[2] ?? "cell.png";
const W = 2880;
const H = 1800;
const cw = Number(args.cell ?? 6);
const ch = Math.round((cw * 10) / 6);
const under = Number(args.under ?? 0.55);
const vivid = Number(args.vivid ?? 1.45);
const lift = Number(args.lift ?? 0.32);
const mark = args.mark ?? "solid";
const slim = Number(args.slim ?? 1);
const word = args.word ?? "AKIBWA";

for (const w of [400, 500, 600, 700]) fontFile(`@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${w}-normal.woff2`, `Plex${w}`);
fontFile("@fontsource/fraunces/files/fraunces-latin-900-normal.woff2", "FrauncesBlack");
fontFile("@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2", "FrauncesVar");
const art = { family: "Plex700", weight: 400, tall: ch / cw };
const glyphs = makeGlyphs(art);

const KIND = { indie: "#3fe0c5", classics: "#ffe2a8", folk: "#9cf05f", hiphop: "#ffc21f", electronic: "#b093ff", ambient: "#4fb3ff", psych: "#ff6fbd" };
const NIGHT = "#0c0a09";
const CREAM = "#f6ecd9";
const ORANGE = "#ff7a3c";
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const rgba = (hex, a) => `rgba(${rgb(hex).join(",")},${a})`;
const tint = (hex, t) => {
  const [r, g, b] = rgb(hex);
  return `rgb(${Math.round(r + (255 - r) * t)},${Math.round(g + (255 - g) * t)},${Math.round(b + (255 - b) * t)})`;
};

const G = loadGraph();
const cx = W / 2;
const cy = H / 2;
const size = Number(args.size ?? 300);
const scene = createCanvas(W, H);
const x = scene.getContext("2d");
x.textBaseline = "alphabetic";
const setMark = () => {
  if (word === word.toLowerCase()) {
    x.font = `${size * 1.12}px 'FrauncesVar'`;
    x.fontVariationSettings = "'wght' 900, 'opsz' 144, 'SOFT' 100, 'WONK' 1";
  } else {
    x.font = `${size}px 'FrauncesBlack'`;
    x.fontVariationSettings = "normal";
  }
};
setMark();
const measured = x.measureText(word);
const markW = measured.width;
const markUp = measured.actualBoundingBoxAscent;
const markDown = measured.actualBoundingBoxDescent;
const markY = Math.round(cy - 34 + (markUp - markDown) / 2);
const inner = { a: markW / 2 + 150, b: (markUp + markDown) / 2 + 190 };
const L = layoutCell(G, { W, H, inner, scale: Number(args.scale ?? 1.2), slack: Number(args.slack ?? 12), verbose: true });
console.log(`scale ${L.scale.toFixed(2)}, ${L.artists.length} artists, ${L.albums.length} sleeves, ${L.songs.length} songs, ${L.branches.length} branch runs, ${L.threads.length} threads`);

x.fillStyle = "#000";
x.fillRect(0, 0, W, H);

// Threads across, dim, bowed towards the name.
x.lineCap = "round";
x.lineJoin = "round";
for (const t of L.threads) {
  const mx = (t.x0 + t.x1) / 2;
  const my = (t.y0 + t.y1) / 2;
  const bow = t.t === "guest" ? 0.08 : 0.22;
  x.strokeStyle = t.t === "together" ? `rgba(226,205,172,${0.17 + 1.6 * Math.max(0, t.s - 0.9)})` : "rgba(255,150,90,0.55)";
  x.lineWidth = t.t === "together" ? 1.8 : 2.2;
  x.beginPath();
  x.moveTo(t.x0, t.y0);
  x.quadraticCurveTo(mx + (cx - mx) * bow, my + (cy - my) * bow, t.x1, t.y1);
  x.stroke();
}
// Nothing crosses the name: the threads thin out towards it rather than stopping at a line.
for (let ring = 0; ring < 14; ring += 1) {
  const k = 0.74 + (ring / 13) * 0.3;
  x.fillStyle = ring === 0 ? "#000" : "rgba(0,0,0,0.2)";
  x.beginPath();
  for (let step = 0; step <= 360; step += 1) {
    const a = (step / 360) * Math.PI * 2;
    const r = L.rin(a) * k;
    if (step === 0) x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  x.fill();
}

// Dendrites: thick at the name, thin at the tips.
for (const pass of ["glow", "core"]) {
  for (const b of L.branches) {
    const colour = KIND[b.g];
    for (let k = 0; k < b.pts.length - 1; k += 1) {
      const [x0, y0, w0] = b.pts[k];
      const [x1, y1, w1] = b.pts[k + 1];
      const w = ((w0 + w1) / 2) * slim;
      x.strokeStyle = pass === "glow" ? rgba(colour, 0.16) : tint(colour, Math.min(0.45, w / 60));
      x.lineWidth = pass === "glow" ? w * 2.3 : w;
      x.beginPath();
      x.moveTo(x0, y0);
      x.lineTo(x1, y1);
      x.stroke();
    }
  }
}
// Twigs to sleeves and to loose songs.
for (const t of L.twigs) {
  x.strokeStyle = rgba(KIND[t.g], t.t === "album" ? 0.85 : 0.5);
  x.lineWidth = t.t === "album" ? 2.6 : 1.5;
  x.beginPath();
  x.moveTo(t.x0, t.y0);
  x.lineTo(t.x1, t.y1);
  x.stroke();
}
for (const s of L.songs) {
  x.fillStyle = tint(KIND[s.g], 0.3);
  x.beginPath();
  x.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  x.fill();
}
const sleeves = new Map();
await Promise.all(
  L.albums.map(async (a) => {
    try {
      sleeves.set(a.art, await loadImage(`public/album-art/${a.art}-${a.s > 150 ? "large" : "wall"}.webp`));
    } catch {
      sleeves.set(a.art, null);
    }
  })
);
for (const a of L.albums) {
  const img = sleeves.get(a.art);
  const left = Math.round((a.x - a.s / 2) / cw) * cw;
  const top = Math.round((a.y - a.s / 2) / ch) * ch;
  const sw = Math.max(cw * 4, Math.round(a.s / cw) * cw);
  const sh = Math.max(ch * 2, Math.round(a.s / ch) * ch);
  a.box = [left, top, sw, sh];
  x.fillStyle = "#000";
  x.fillRect(left - 3, top - 3, sw + 6, sh + 6);
  if (img) x.drawImage(img, left, top, sw, sh);
  else {
    x.fillStyle = rgba(KIND[a.g], 0.5);
    x.fillRect(left, top, sw, sh);
  }
}
for (const a of L.artists) {
  x.fillStyle = "#000";
  x.beginPath();
  x.arc(a.x, a.y, a.r + 3, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = tint(KIND[a.g], 0.55);
  x.beginPath();
  x.arc(a.x, a.y, a.r, 0, Math.PI * 2);
  x.fill();
}

// The name.
setMark();
const markX = Math.round(cx - markW / 2);
if (mark === "body") {
  const body = x.createRadialGradient(cx, cy - 34, 30, cx, cy - 34, markW * 0.6);
  body.addColorStop(0, "#ffc890");
  body.addColorStop(0.5, "#ff7a3c");
  body.addColorStop(0.85, "#6b2512");
  body.addColorStop(1, "rgba(0,0,0,0)");
  x.save();
  x.translate(cx, cy - 34);
  x.scale(1, (markUp + markDown + 150) / (markW * 1.1));
  x.translate(-cx, -(cy - 34));
  x.fillStyle = body;
  x.beginPath();
  x.arc(cx, cy - 34, markW * 0.6, 0, Math.PI * 2);
  x.fill();
  x.restore();
  x.fillStyle = "#000";
  x.fillText(word, markX, markY);
} else {
  const fill = x.createLinearGradient(0, markY - markUp, 0, markY + markDown);
  fill.addColorStop(0, "#fff6e4");
  fill.addColorStop(0.42, "#ffc27a");
  fill.addColorStop(0.72, "#ff7433");
  fill.addColorStop(1, "#b83c12");
  x.fillStyle = fill;
  x.fillText(word, markX, markY);
}
x.fontVariationSettings = "normal";

const cols = Math.floor(W / cw);
const rows = Math.floor(H / ch);
const cells = toCells(x.getImageData(0, 0, cols * cw, rows * ch), cols, rows, glyphs, { gamma: 0.9, gain: 1.1, lift, shape: 1.5, vivid });

// ---- words set plainly over the picture: twice the picture's letter size
const page = createCanvas(W, H);
const p = page.getContext("2d");
p.fillStyle = NIGHT;
p.fillRect(0, 0, W, H);
const taken = [];
const hits = (r) => taken.some((t) => r[0] < t[0] + t[2] && r[0] + r[2] > t[0] && r[1] < t[1] + t[3] && r[1] + r[3] > t[1]);
for (const a of L.albums) taken.push([a.box[0] - 4, a.box[1] - 4, a.box[2] + 8, a.box[3] + 8]);
taken.push([markX - 20, markY - markUp - 20, markW + 40, markUp + markDown + 40]);
const labels = [];
const lw = cw * 2;
const lh = ch * 2;
const place = (text, tries, colour, weight = 500) => {
  for (const [tx, ty] of tries) {
    const left = Math.round(tx / cw) * cw;
    const top = Math.round(ty / ch) * ch;
    const rect = [left - cw, top, text.length * lw + cw * 2, lh];
    if (rect[0] < 8 || rect[1] < 8 || rect[0] + rect[2] > W - 8 || rect[1] + rect[3] > H - 8) continue;
    if (hits(rect)) continue;
    taken.push(rect);
    labels.push({ text, left, top, colour, weight, rect });
    return true;
  }
  return false;
};
// The prompt under the name.
const prompt = "search an artist, album or song";
const pw = cw * 3;
const ph = ch * 3;
const promptLeft = Math.round((cx - ((prompt.length + 2) * pw) / 2) / cw) * cw;
const promptTop = Math.round((markY + markDown + 62) / ch) * ch;
taken.push([promptLeft - 30, promptTop - 10, (prompt.length + 3) * pw + 60, ph + 20]);
// Kinds, on their stems.
for (const k of L.kinds) {
  const text = k.label;
  const r = L.rin(k.angle) * 0.94;
  const ax = cx + Math.cos(k.angle) * r;
  const ay = cy + Math.sin(k.angle) * r;
  const half = (text.length * lw) / 2;
  place(text, [[ax - half, ay - lh / 2], [ax - half, ay - lh * 1.5], [ax - half, ay + lh / 2], [ax - half - 60, ay - lh / 2], [ax - half + 60, ay - lh / 2]], KIND[k.id], 600);
}
// The most played artists of each kind, named beside their nodes, on the side nearer the name.
const named = [];
for (const k of L.kinds) named.push(...L.artists.filter((a) => a.g === k.id).sort((p1, p2) => p2.w - p1.w).slice(0, Number(args.names ?? 6)));
named.sort((p1, p2) => p2.w - p1.w);
for (const a of named) {
  const wide = a.n.length * lw;
  const gap = a.r + 10;
  const tries = [];
  // Under or over its biggest sleeve, like a caption.
  const own = L.albums.filter((b) => b.of === a.i).sort((p1, p2) => p2.s - p1.s)[0];
  if (own) {
    const [bl, bt, bw, bh] = own.box;
    const songLines = Math.ceil(G.nodes[own.i].kids.length / Math.max(1, Math.floor(own.s / 9)));
    const under = bt + bh + (songLines ? songLines * 10 + 8 : 4);
    tries.push([bl, under], [bl + bw - wide, under], [bl, bt - lh - 4], [bl + bw - wide, bt - lh - 4], [bl + bw + 8, bt], [bl - wide - 8, bt]);
  }
  const near = [[a.x + gap, a.y - lh / 2], [a.x - gap - wide, a.y - lh / 2], [a.x - wide / 2, a.y - gap - lh], [a.x - wide / 2, a.y + gap]];
  const far = [[a.mx - wide / 2, a.my + a.reach + 4], [a.mx - wide / 2, a.my - a.reach - lh - 4], [a.mx + a.reach + 8, a.my - lh / 2], [a.mx - a.reach - wide - 8, a.my - lh / 2]];
  const more = [];
  for (const dy of [-lh, lh]) for (const [bx, by] of [...tries, ...near, ...far]) more.push([bx, by + dy]);
  place(a.n, [...tries, ...near, ...far, ...more], CREAM, 500) || console.log("no room to name", a.n);
}
// Clear the picture's letters from under the words, then draw both.
for (const l of labels) {
  const c0 = Math.round(l.rect[0] / cw);
  const r0 = Math.round(l.rect[1] / ch);
  for (let r = r0; r < r0 + 2; r += 1) for (let c = c0; c < c0 + Math.round(l.rect[2] / cw); c += 1) if (r >= 0 && r < rows && c >= 0 && c < cols) cells[r * cols + c] = null;
}
drawCells(p, cells, cols, rows, cw, ch, art, { under });
for (const l of labels) {
  p.font = `${lw / 0.6}px 'Plex${l.weight}'`;
  p.fillStyle = l.colour;
  p.fillText(l.text, l.left, l.top + Math.round(lh * BASE));
}
{
  const c0 = Math.round((promptLeft - 30) / cw);
  p.fillStyle = NIGHT;
  p.fillRect(c0 * cw, promptTop - 10, (prompt.length + 3) * pw + 60, ph + 20);
  p.font = `${pw / 0.6}px 'Plex500'`;
  p.fillStyle = ORANGE;
  p.fillText(">", promptLeft, promptTop + Math.round(ph * BASE));
  p.fillStyle = rgba(CREAM, 0.62);
  p.fillText(prompt, promptLeft + pw * 2, promptTop + Math.round(ph * BASE));
  p.fillStyle = ORANGE;
  p.fillRect(promptLeft + pw * (prompt.length + 2) + 6, promptTop + 3, pw - 4, ph - 6);
}
writeFileSync(out, page.toBuffer("image/png"));
if (args.scene) writeFileSync(out.replace(".png", "-scene.png"), scene.toBuffer("image/png"));
console.log(out, `${cols} x ${rows} characters, ${labels.length} names`);
