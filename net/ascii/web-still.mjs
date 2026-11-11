// The web as a still, drawn the way Features draws a board: a dark ground, a
// fine lattice, ring neurons and coloured threads. Every sleeve is written in
// the word akibwa. KIT=<folder with @napi-rs/canvas> FEATURES=<features repo>
// node net/ascii/web-still.mjs <out.png> [light=kind:hiphop | light=artist:Panda Bear]

import { readFileSync, writeFileSync } from "node:fs";
import { loadGraph } from "../graph-check.mjs";
import { layoutWeb } from "../web.mjs";
import { createCanvas, loadImage, GlobalFonts, fontFile, toNameCells, drawCells } from "./engine.mjs";

const args = Object.fromEntries(process.argv.slice(3).map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)]));
const out = process.argv[2] ?? "web.png";
const W = 2880;
const H = 1800;
const HEAD = 132;
const cw = 6;
const ch = 10;
for (const w of [400, 700]) fontFile(`@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${w}-normal.woff2`, `Plex${w}`);
const fonts = `${process.env.FEATURES}/assets/fonts`;
GlobalFonts.registerFromPath(`${fonts}/features-sans-bold.woff2`, "SansBold");
GlobalFonts.registerFromPath(`${fonts}/features-sans-regular.woff2`, "Sans");

// The game's own grounds and thread colours, and a pale seventh for ambient.
const PAPER = "#0e1214";
const SURFACE = "#161b1f";
const RULE = "#272f35";
const INK = "#f2f0ea";
const SOFT = "#9aa6ac";
const KIND = { hiphop: "#dd700c", indie: "#22a3dd", classics: "#efc319", folk: "#279b57", psych: "#da327b", electronic: "#7a68b6", ambient: "#c3dbe2" };
const ORDER = ["hiphop", "indie", "classics", "folk", "psych", "electronic", "ambient"];

const G = loadGraph();
const ties = JSON.parse(readFileSync("net/ties.json", "utf8")).ties;
const L = layoutWeb(G, ties, { W, H, top: HEAD, margin: 40, fill: Number(args.fill ?? 0.5), verbose: true });
const { neurons } = L;
console.log(`scale ${L.scale.toFixed(2)}, ${neurons.length} neurons (${neurons.filter((n) => n.t === "album").length} sleeves), ${L.joins.length} joins`);

const page = createCanvas(W, H);
const x = page.getContext("2d");
x.fillStyle = SURFACE;
x.fillRect(0, 0, W, H);
x.lineCap = "round";
x.lineJoin = "round";

// The lattice.
x.save();
x.beginPath();
x.rect(0, HEAD, W, H - HEAD);
x.clip();
x.strokeStyle = "rgba(255,255,255,0.032)";
x.lineWidth = 2;
const side = 54;
const rise = (side * Math.sqrt(3)) / 2;
for (let y = HEAD; y < H; y += rise) {
  x.beginPath();
  x.moveTo(0, y);
  x.lineTo(W, y);
  x.stroke();
}
for (let k = -H; k < W + H; k += side) {
  x.beginPath();
  x.moveTo(k, HEAD);
  x.lineTo(k + (H - HEAD) / Math.sqrt(3), H);
  x.stroke();
  x.beginPath();
  x.moveTo(k, HEAD);
  x.lineTo(k - (H - HEAD) / Math.sqrt(3), H);
  x.stroke();
}
x.restore();

// Sleeves written in the name.
const face = { family: "Plex700", weight: 400, tall: ch / cw };
const light = { family: "Plex400", weight: 400 };
const sleeves = new Map();
await Promise.all(
  neurons
    .filter((n) => n.t === "album")
    .map(async (n) => {
      const cols = Math.max(3, Math.round(n.s / cw));
      const rows = Math.max(2, Math.round(n.s / ch));
      n.box = [Math.round((n.x - (cols * cw) / 2) / cw) * cw, Math.round((n.y - (rows * ch) / 2) / ch) * ch, cols * cw, rows * ch];
      try {
        const img = await loadImage(`public/album-art/${n.art}-${n.s > 150 ? "large" : "wall"}.webp`);
        const small = createCanvas(cols * cw, rows * ch);
        const sx = small.getContext("2d");
        sx.drawImage(img, 0, 0, cols * cw, rows * ch);
        sleeves.set(n.id, { cols, rows, cells: toNameCells(sx.getImageData(0, 0, cols * cw, rows * ch), cols, rows, { lift: 0.4, vivid: 1.5, seed: n.id * 31 }) });
      } catch {
        sleeves.set(n.id, null);
      }
    })
);
const drawNeuron = (n, colour = KIND[n.g], strong = false) => {
  if (n.t === "album") {
    const [bx, by, bw, bh] = n.box;
    x.fillStyle = PAPER;
    x.fillRect(bx, by, bw, bh);
    const made = sleeves.get(n.id);
    if (made) drawCells(x, made.cells, made.cols, made.rows, cw, ch, face, { x: bx, y: by, under: 0.66, light });
    x.strokeStyle = colour;
    x.lineWidth = strong ? 6 : 4;
    x.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
  } else {
    x.fillStyle = SURFACE;
    x.strokeStyle = colour;
    x.lineWidth = strong ? 6 : 4;
    x.beginPath();
    x.arc(n.x, n.y, n.s / 2, 0, Math.PI * 2);
    x.fill();
    x.stroke();
  }
};
const thread = (path, colour, width, alpha = 1) => {
  x.globalAlpha = alpha;
  x.strokeStyle = colour;
  x.lineWidth = width;
  x.beginPath();
  path.forEach((id, k) => (k ? x.lineTo(neurons[id].x, neurons[id].y) : x.moveTo(neurons[id].x, neurons[id].y)));
  x.stroke();
  x.globalAlpha = 1;
};

// At rest: every join as a hairline, each kind's thread in its colour, then the neurons.
for (const j of L.joins) {
  x.strokeStyle = j.t === "together" ? "rgba(154,166,172,0.085)" : j.t === "tie" ? "rgba(154,166,172,0.26)" : "rgba(154,166,172,0.34)";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(neurons[j.a].x, neurons[j.a].y);
  x.lineTo(neurons[j.b].x, neurons[j.b].y);
  x.stroke();
}
for (const k of L.kinds) thread(k.path, KIND[k.id], 5, 0.9);
for (const n of neurons) drawNeuron(n);

// ---- a feature lit: everything else sinks behind a veil
const labels = [];
const taken = [[0, 0, W, HEAD]];
const hits = (r) => taken.some((t) => r[0] < t[0] + t[2] && r[0] + r[2] > t[0] && r[1] < t[1] + t[3] && r[1] + r[3] > t[1]);
const boxOf = (n) => (n.t === "album" ? [n.box[0] - 6, n.box[1] - 6, n.box[2] + 12, n.box[3] + 12] : [n.x - n.s / 2 - 6, n.y - n.s / 2 - 6, n.s + 12, n.s + 12]);
const say = (n, name, why, colour = INK) => {
  x.font = "26px 'SansBold'";
  const wide = Math.max(x.measureText(name).width, why ? ((x.font = "23px 'Sans'"), x.measureText(why).width) : 0);
  const tall = why ? 62 : 32;
  const [bx, by, bw, bh] = boxOf(n);
  const tries = [[bx + bw + 6, by + bh / 2 - tall / 2], [bx - wide - 6, by + bh / 2 - tall / 2], [bx, by + bh + 4], [bx + bw - wide, by + bh + 4], [bx, by - tall - 4], [bx + bw - wide, by - tall - 4], [bx + bw + 6, by], [bx - wide - 6, by], [bx + bw + 6, by + bh - tall], [bx - wide - 6, by + bh - tall]];
  for (const [tx, ty] of tries) {
    const rect = [tx - 6, ty - 4, wide + 12, tall + 8];
    if (rect[0] < 12 || rect[1] < HEAD + 8 || rect[0] + rect[2] > W - 12 || rect[1] + rect[3] > H - 12 || hits(rect)) continue;
    taken.push(rect);
    labels.push({ name, why, x: tx, y: ty, colour });
    return true;
  }
  return false;
};
let lit = null;
const footed = [];
if (args.light) {
  const [sort, ...rest] = args.light.split(":");
  const name = rest.join(":");
  x.fillStyle = "rgba(11,14,16,0.8)";
  x.fillRect(0, HEAD, W, H - HEAD);
  if (sort === "kind") {
    const k = L.kinds.find((it) => it.id === name);
    lit = { title: k.label, colour: KIND[k.id] };
    thread(k.path, KIND[k.id], 7);
    for (const id of k.ids) {
      drawNeuron(neurons[id], KIND[k.id], true);
      taken.push(boxOf(neurons[id]));
    }
    const albums = k.ids.map((id) => neurons[id]).filter((n) => n.t === "album").sort((p, q) => q.w - p.w);
    // Name the most played, beside the sleeve where there is room and across its foot where there is not.
    const seenArtist = new Set();
    for (const n of albums) {
      if (seenArtist.has(n.artist) || seenArtist.size >= Number(args.names ?? 9)) continue;
      seenArtist.add(n.artist);
      if (say(n, n.by, n.name)) continue;
      x.font = "20px 'SansBold'";
      if (x.measureText(n.by).width > n.box[2] - 12) continue;
      footed.push(n);
    }
    lit.note = `${albums.length} albums, ${new Set(k.ids.map((id) => neurons[id].artist)).size} artists`;
  } else {
    const f = L.featureOf(name);
    const colour = KIND[G.nodes[f.artist].g];
    lit = { title: name, colour };
    thread(f.path, colour, 7);
    for (const id of f.ids) {
      drawNeuron(neurons[id], colour, true);
      taken.push(boxOf(neurons[id]));
    }
    f.own.forEach((id, k) => say(neurons[id], k === 0 ? name : neurons[id].name, k === 0 && neurons[id].t === "album" ? neurons[id].name : null));
    const told = new Set();
    for (const id of f.ids) {
      const note = f.notes.get(id);
      if (!note || told.has(note.who)) continue;
      // Name each tied artist once, on its biggest neuron.
      const best = f.ids.filter((other) => f.notes.get(other)?.who === note.who).sort((p, q) => neurons[q].w - neurons[p].w)[0];
      if (say(neurons[best], note.who, note.why)) told.add(note.who);
    }
    lit.note = `${f.own.length} of their own, ${new Set([...f.notes.values()].map((v) => v.who)).size} tied in`;
  }
}
for (const n of footed) {
  const [bx, by, bw, bh] = n.box;
  x.fillStyle = "rgba(11,14,16,0.82)";
  x.fillRect(bx, by + bh - 34, bw, 34);
  x.font = "20px 'SansBold'";
  x.fillStyle = INK;
  x.fillText(n.by, bx + 6, by + bh - 11);
}
for (const l of labels) {
  x.font = "26px 'SansBold'";
  x.fillStyle = l.colour;
  x.fillText(l.name, l.x, l.y + 24);
  if (l.why) {
    x.font = "23px 'Sans'";
    x.fillStyle = SOFT;
    x.fillText(l.why, l.x, l.y + 54);
  }
}

// ---- the head: a small wordmark with its rule, the search, the kinds
x.fillStyle = SURFACE;
x.fillRect(0, 0, W, HEAD);
x.fillStyle = RULE;
x.fillRect(0, HEAD - 2, W, 2);
x.font = "54px 'SansBold'";
x.fillStyle = INK;
x.fillText("akibwa", 56, 78);
const wordW = x.measureText("akibwa").width;
["#22a3dd", "#efc319", "#279b57", "#dd700c"].forEach((c, k) => {
  x.fillStyle = c;
  x.fillRect(56 + (k * wordW) / 4, 92, wordW / 4, 6);
});
const searchX = 420;
x.font = lit ? "30px 'SansBold'" : "30px 'Sans'";
x.fillStyle = lit ? INK : SOFT;
x.fillText(lit ? lit.title : "search an artist, album or song", searchX, 76);
if (lit) {
  const tw = x.measureText(lit.title).width;
  x.font = "26px 'Sans'";
  x.fillStyle = SOFT;
  x.fillText(lit.note, searchX + tw + 22, 76);
}
x.fillStyle = lit ? lit.colour : RULE;
x.fillRect(searchX, 92, 640, lit ? 6 : 3);
let at = W - 56;
x.font = "25px 'Sans'";
for (const id of ORDER.slice().reverse()) {
  const label = G.groups.find((g) => g.id === id).label;
  const on = lit && lit.title === label;
  x.font = on ? "25px 'SansBold'" : "25px 'Sans'";
  const tw = x.measureText(label).width;
  at -= tw;
  x.fillStyle = on ? INK : SOFT;
  x.fillText(label, at, 76);
  at -= 30;
  x.strokeStyle = KIND[id];
  x.lineWidth = 4;
  x.fillStyle = on ? KIND[id] : SURFACE;
  x.beginPath();
  x.arc(at + 10, 67, 9, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  at -= 34;
}
writeFileSync(out, page.toBuffer("image/png"));
console.log(out, labels.length, "labels");
