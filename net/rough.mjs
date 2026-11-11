// Three rough designs of the net, drawn from the real data, for Dan to choose
// between. node net/rough.mjs <out-folder>

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { albumWeights } from "../components/paper/music-map.mjs";
import { encodePng } from "../world/png.mjs";
import { makeGraph } from "./graph.mjs";

const out = process.argv[2] ?? "net/out";
mkdirSync(out, { recursive: true });
const ranking = JSON.parse(readFileSync("public/music-ranking.json", "utf8"));
const yearly = JSON.parse(readFileSync("public/music-years.json", "utf8"));
const kindOf = JSON.parse(readFileSync("world/kinds.json", "utf8")).kinds;
const weights = albumWeights(ranking.albums.map((a) => ({ title: a[1], artist: ranking.names[a[2]], minutes: a[5] })));
const G = makeGraph({ ranking, yearly, kindOf, weights });
const { nodes, links } = G;
nodes.forEach((n, i) => {
  n.i = i;
  n.kids = [];
});
nodes.forEach((n) => n.p >= 0 && nodes[n.p].kids.push(n.i));
const leaves = (i) => (nodes[i].leaves = nodes[i].kids.length ? nodes[i].kids.reduce((s, k) => s + leaves(k), 0) : 1);
leaves(0);
const hash = (i, k = 0) => {
  let h = Math.imul(i + 1, 0x27d4eb2d) ^ Math.imul(k + 7, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const DARK = { bg: hex("#1e1a17"), bg2: hex("#2a2521"), ink: hex("#f1e9db"), soft: hex("#bfb5a3"), faint: hex("#82786b"), me: hex("#f0703a"), meLight: hex("#ffa56e"), meEdge: hex("#100d0b"),
  k: { hiphop: hex("#f2a65a"), psych: hex("#ee8dbb"), classics: hex("#d9c7a1"), ambient: hex("#7fc2e4"), singles: hex("#b7afa2"), electronic: hex("#b9a8f5"), indie: hex("#f0d667"), folk: hex("#a8d273") } };
const LIGHT = { bg: hex("#f3ecdf"), bg2: hex("#faf6ee"), ink: hex("#2a2420"), soft: hex("#5f554b"), faint: hex("#a09382"), me: hex("#c24e1c"), meLight: hex("#e8793f"), meEdge: hex("#2a2420"),
  k: { hiphop: hex("#b8620f"), psych: hex("#b93b78"), classics: hex("#7d6436"), ambient: hex("#2a7399"), singles: hex("#6f675c"), electronic: hex("#5c49b8"), indie: hex("#94760a"), folk: hex("#4b7a25") } };

const FONT = { A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101101111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110", 4: "101101111001001", 5: "111100110001110", 6: "011100110101010", 7: "111001010010010", 8: "010101010101010", 9: "010101011001110", " ": "000000000000000", "-": "000000111000000", "&": "010101010101011", ".": "000000000000010", ",": "000000000010100", "'": "010010000000000", "!": "010010010000010", ":": "000010000010000", "/": "001001010100100", "(": "001010010010001", ")": "100010010010100", "+": "000010111010000", "?": "110001010000010" };
const LETTERS = {
  A: ["..###..", ".#####.", "##...##", "##...##", "#######", "#######", "##...##", "##...##", "##...##"],
  K: ["##...##", "##..##.", "##.##..", "####...", "###....", "####...", "##.##..", "##..##.", "##...##"],
  I: ["######", "######", "..##..", "..##..", "..##..", "..##..", "..##..", "######", "######"],
  B: ["######.", "#######", "##...##", "##...##", "######.", "##...##", "##...##", "#######", "######."],
  W: ["##...##", "##...##", "##...##", "##...##", "##.#.##", "##.#.##", "#######", "###.###", "##...##"]
};

class Board {
  constructor(W, H, P) {
    this.W = W;
    this.H = H;
    this.P = P;
    this.px = new Float32Array(W * H * 3);
    for (let i = 0; i < W * H; i += 1) this.px.set(P.bg, i * 3);
  }
  plot(x, y, c, a = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    const p = (y * this.W + x) * 3;
    this.px[p] += (c[0] - this.px[p]) * a;
    this.px[p + 1] += (c[1] - this.px[p + 1]) * a;
    this.px[p + 2] += (c[2] - this.px[p + 2]) * a;
  }
  line(x0, y0, x1, y1, c, a = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 4000; guard += 1) {
      this.plot(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  path(points, c, a = 1) {
    for (let i = 1; i < points.length; i += 1) this.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], c, a);
  }
  rect(x, y, w, h, c, a = 1) {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.plot(x + i, y + j, c, a);
  }
  frame(x, y, w, h, c, a = 1) {
    for (let i = 0; i < w; i += 1) { this.plot(x + i, y, c, a); this.plot(x + i, y + h - 1, c, a); }
    for (let j = 1; j < h - 1; j += 1) { this.plot(x, y + j, c, a); this.plot(x + w - 1, y + j, c, a); }
  }
  disc(cx, cy, r, c, a = 1) {
    for (let j = -r; j <= r; j += 1) for (let i = -r; i <= r; i += 1) if (i * i + j * j <= r * r + r * 0.6) this.plot(cx + i, cy + j, c, a);
  }
  width(str, k = 1) { return str.length * 4 * k - k; }
  text(str, x, y, c, k = 1, a = 1) {
    let at = Math.round(x);
    for (const ch of String(str).toUpperCase()) {
      const g = FONT[ch] ?? FONT["?"];
      for (let r = 0; r < 5; r += 1) for (let q = 0; q < 3; q += 1) if (g[r * 3 + q] === "1") this.rect(at + q * k, Math.round(y) + r * k, k, k, c, a);
      at += 4 * k;
    }
    return at - Math.round(x) - k;
  }
  // Text on a small ground of the board's own colour, so it reads over lines.
  tag(str, x, y, c, k = 1) {
    this.rect(Math.round(x) - 2, Math.round(y) - 2, this.width(str, k) + 4, 5 * k + 4, this.P.bg, 0.86);
    this.text(str, x, y, c, k);
  }
  wordmark(cx, cy, k) {
    const word = "AKIBWA";
    const widths = [...word].map((ch) => LETTERS[ch][0].length);
    const total = widths.reduce((s, w) => s + w, 0) + (word.length - 1) * 2;
    const draw = (ox, oy, c) => {
      let at = Math.round(cx - (total * k) / 2);
      [...word].forEach((ch, n) => {
        LETTERS[ch].forEach((row, r) => [...row].forEach((bit, q) => bit === "#" && this.rect(at + q * k + ox, Math.round(cy - 4.5 * k) + r * k + oy, k, k, c)));
        at += (widths[n] + 2) * k;
      });
    };
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [2, 2], [1, 2], [2, 1]]) draw(ox * Math.max(1, k >> 1), oy * Math.max(1, k >> 1), this.P.meEdge);
    draw(0, 0, this.P.me);
    // A lighter top edge on each letter.
    let at = Math.round(cx - (total * k) / 2);
    [...word].forEach((ch, n) => {
      [...LETTERS[ch][0]].forEach((bit, q) => bit === "#" && this.rect(at + q * k, Math.round(cy - 4.5 * k), k, Math.max(1, k >> 1), this.P.meLight));
      at += (widths[n] + 2) * k;
    });
    return total * k;
  }
  search(text) {
    const w = Math.min(190, this.W - 24);
    const x = Math.round(this.W / 2 - w / 2);
    this.rect(x, 7, w, 15, this.P.bg2);
    this.frame(x, 7, w, 15, this.P.ink);
    this.text(text, x + 6, 12, text.startsWith("SEARCH") ? this.P.soft : this.P.ink);
  }
  save(file, scale = 3) {
    const rgba = new Uint8ClampedArray(this.W * this.H * 4);
    for (let i = 0; i < this.W * this.H; i += 1) {
      rgba[i * 4] = this.px[i * 3];
      rgba[i * 4 + 1] = this.px[i * 3 + 1];
      rgba[i * 4 + 2] = this.px[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
    writeFileSync(file, encodePng(rgba, this.W, this.H, scale));
  }
}

const artists = nodes.filter((n) => n.t === "artist");
const maxArtist = Math.max(...artists.map((n) => n.w));
const maxAlbum = Math.max(...nodes.filter((n) => n.t === "album").map((n) => n.w));
const maxSong = Math.max(...nodes.filter((n) => n.t === "song").map((n) => n.w));
const centreOut = (list) => {
  const sorted = list.slice().sort((a, b) => nodes[b].leaves + (nodes[b].w ?? 0) * 1e-6 - nodes[a].leaves - (nodes[a].w ?? 0) * 1e-6);
  const out = [];
  sorted.forEach((i, n) => (n % 2 ? out.unshift(i) : out.push(i)));
  return out;
};
// Share an arc among a node's children, bigger families getting more of it.
function fan(i, a0, a1, radiusOf) {
  const n = nodes[i];
  n.a = (a0 + a1) / 2;
  n.r = radiusOf(n);
  if (!n.kids.length) return;
  const kids = centreOut(n.kids);
  const pad = (a1 - a0) * (n.t === "me" ? 0 : 0.05);
  const share = kids.map((k) => Math.pow(nodes[k].leaves, 0.82) + 0.35);
  const total = share.reduce((s, v) => s + v, 0);
  let a = a0 + pad;
  kids.forEach((k, at) => {
    const span = ((a1 - a0 - pad * 2) * share[at]) / total;
    fan(k, a, a + span, radiusOf);
    a += span;
  });
}
const selected = nodes.findIndex((n) => n.t === "artist" && n.n === "Panda Bear");
const pathUp = (i) => {
  const set = new Set();
  for (let k = i; k >= 0; k = nodes[k].p) set.add(k);
  return set;
};
const under = (i, set = new Set()) => {
  set.add(i);
  nodes[i].kids.forEach((k) => under(k, set));
  return set;
};
const lit = new Set([...pathUp(selected), ...under(selected)]);
for (const l of links) if (l.a === selected || l.b === selected) lit.add(l.a === selected ? l.b : l.a);
const friends = links.filter((l) => (l.a === selected || l.b === selected) && l.t !== "belongs").map((l) => nodes[l.a === selected ? l.b : l.a].n);

function card(B, x, y, P) {
  const lines = ["PANDA BEAR", "ARTIST - PSYCHEDELIC", `${nodes[selected].kids.filter((k) => nodes[k].t === "album").length} ALBUMS, ${[...under(selected)].filter((k) => nodes[k].t === "song").length} SONGS`, "PLAYED WITH", ...friends.slice(0, 3)];
  const w = Math.max(...lines.map((s) => B.width(s))) + 12;
  const h = lines.length * 8 + 10;
  x = Math.min(B.W - w - 6, Math.max(6, x));
  y = Math.min(B.H - h - 6, Math.max(26, y));
  B.rect(x, y, w, h, P.bg2);
  B.frame(x, y, w, h, P.ink);
  lines.forEach((s, n) => B.text(s, x + 6, y + 6 + n * 8, n === 0 ? P.ink : n === 3 ? P.faint : n > 3 ? P.k.psych : P.soft));
}

// ---------------------------------------------------------------- 1: neuron
// Branches grow out of AKIBWA like a nerve cell's: kinds, then artists, then
// albums, then songs. Fine threads cross between artists played together.
function neuron(W, H, P, file) {
  const B = new Board(W, H, P);
  const cx = W / 2;
  const cy = H / 2 + 6;
  const rx = W * 0.47;
  const ry = (H - 30) * 0.58;
  const radiusOf = (n) => {
    if (n.t === "me") return 0;
    if (n.t === "kind") return 0.27;
    if (n.t === "artist") return 0.42 + 0.27 * (1 - Math.pow(n.w / maxArtist, 0.35)) + (hash(n.i, 1) - 0.5) * 0.05;
    if (n.t === "album") return nodes[n.p].r + 0.085 + (hash(n.i, 2) - 0.5) * 0.02;
    return nodes[n.p].r + 0.062 + 0.019 * (n.i % 4) + (hash(n.i, 3) - 0.5) * 0.012;
  };
  const kinds = nodes[0].kids;
  const share = kinds.map((k) => Math.pow(nodes[k].leaves, 0.72));
  const total = share.reduce((s, v) => s + v, 0);
  let a = -Math.PI / 2 - (share[0] / total) * Math.PI;
  kinds.forEach((k, at) => {
    const span = (share[at] / total) * Math.PI * 2;
    fan(k, a, a + span, radiusOf);
    a += span;
  });
  const at = (r, ang) => [cx + Math.cos(ang) * r * rx, cy + Math.sin(ang) * r * ry];
  const xy = (n) => at(n.r, n.a);
  const limb = (p, n) => {
    const pts = [];
    for (let s = 0; s <= 8; s += 1) {
      const t = s / 8;
      pts.push(at(p.r + (n.r - p.r) * t, p.a + (n.a - p.a) * (1 - Math.pow(1 - t, 2.4))));
    }
    return pts;
  };
  // Threads between artists, bowed towards the middle.
  for (const l of links) {
    if (l.t === "belongs") continue;
    const A = nodes[l.a];
    const Bn = nodes[l.b];
    const [x0, y0] = xy(A);
    const [x1, y1] = xy(Bn);
    const mx = cx + ((x0 + x1) / 2 - cx) * 0.55;
    const my = cy + ((y0 + y1) / 2 - cy) * 0.55;
    const pts = [];
    for (let s = 0; s <= 10; s += 1) {
      const t = s / 10;
      pts.push([(1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * mx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * my + t * t * y1]);
    }
    const on = lit.has(l.a) && lit.has(l.b) && (l.a === selected || l.b === selected);
    B.path(pts, on ? P.me : P.ink, on ? 0.9 : l.t === "together" ? 0.07 : 0.2);
  }
  for (const n of nodes) {
    if (n.p < 0) continue;
    const p = nodes[n.p];
    const on = lit.has(n.i) && lit.has(n.p);
    const c = on ? P.me : P.k[n.g];
    const alpha = on ? 1 : n.t === "song" ? 0.2 : n.t === "album" ? 0.34 : 0.3;
    if (p.t === "me") B.path([at(0.1, n.a), xy(n)], c, on ? 1 : 0.7);
    else B.path(limb(p, n), c, alpha);
  }
  for (const n of nodes) {
    if (n.t === "me") continue;
    const [x, y] = xy(n);
    const on = lit.has(n.i);
    const c = on && n.t !== "kind" ? P.me : P.k[n.g];
    if (n.t === "song") B.plot(x, y, c, on ? 1 : 0.5 + 0.5 * (n.w / maxSong));
    else if (n.t === "album") {
      const s = 2 + Math.round(2.4 * Math.sqrt(n.w / maxAlbum));
      B.rect(Math.round(x - s / 2), Math.round(y - s / 2), s, s, c);
    } else if (n.t === "artist") B.disc(Math.round(x), Math.round(y), n.w / maxArtist > 0.25 ? 2 : n.w / maxArtist > 0.04 ? 1 : 0, c);
    else {
      B.disc(Math.round(x), Math.round(y), 3, P.bg);
      B.disc(Math.round(x), Math.round(y), 3, c, 0.35);
      B.disc(Math.round(x), Math.round(y), 1, c);
    }
  }
  B.wordmark(cx, cy, W > 300 ? 2 : 1);
  for (const k of kinds) {
    const n = nodes[k];
    const [x, y] = at(n.r + 0.035, n.a);
    const w = B.width(n.n);
    B.tag(n.n, Math.cos(n.a) < -0.3 ? x - w - 3 : Math.cos(n.a) > 0.3 ? x + 4 : x - w / 2, Math.sin(n.a) < -0.5 ? y - 9 : Math.sin(n.a) > 0.5 ? y + 5 : y - 2, P.k[n.g]);
  }
  const big = artists.slice().sort((p, q) => q.w - p.w).slice(0, W > 300 ? 9 : 4);
  for (const n of big) {
    if (n.i === selected) continue;
    const [x, y] = xy(n);
    B.tag(n.n, Math.cos(n.a) < 0 ? x - B.width(n.n) - 5 : x + 5, y - 2, P.ink);
  }
  const [sx, sy] = xy(nodes[selected]);
  B.frame(Math.round(sx) - 4, Math.round(sy) - 4, 9, 9, P.me);
  card(B, sx + 10, sy - 30, P);
  B.search("SEARCH AN ARTIST, ALBUM OR SONG");
  B.save(file, W > 300 ? 3 : 2);
}

// ---------------------------------------------------------------- 2: layers
// Drawn the way a neural network is: rings of cells, each wired to the next.
// Songs on the outside feed albums, albums feed artists, artists feed kinds,
// and it all arrives at AKIBWA.
function layers(W, H, P, file) {
  const B = new Board(W, H, P);
  const cx = W / 2;
  const cy = H / 2 + 6;
  const rx = W * 0.46;
  const ry = (H - 30) * 0.56;
  const radiusOf = (n) => (n.t === "me" ? 0 : n.t === "kind" ? 0.25 : n.t === "artist" ? 0.47 + 0.035 * (n.i % 3) : n.t === "album" ? 0.69 : 0.86 + 0.035 * (n.i % 4));
  const kinds = nodes[0].kids;
  const share = kinds.map((k) => Math.pow(nodes[k].leaves, 0.75));
  const total = share.reduce((s, v) => s + v, 0);
  let a = -Math.PI / 2 - (share[0] / total) * Math.PI;
  kinds.forEach((k, at) => {
    const span = (share[at] / total) * Math.PI * 2;
    fan(k, a, a + span, radiusOf);
    a += span;
  });
  const xy = (n) => [cx + Math.cos(n.a) * n.r * rx, cy + Math.sin(n.a) * n.r * ry];
  for (const r of [0.25, 0.5, 0.69, 0.91]) {
    for (let s = 0; s < 720; s += 1) B.plot(cx + Math.cos((s / 720) * Math.PI * 2) * r * rx, cy + Math.sin((s / 720) * Math.PI * 2) * r * ry, P.ink, 0.07);
  }
  for (const l of links) {
    if (l.t === "belongs") continue;
    const [x0, y0] = xy(nodes[l.a]);
    const [x1, y1] = xy(nodes[l.b]);
    const on = l.a === selected || l.b === selected;
    B.line(x0, y0, x1, y1, on ? P.me : P.ink, on ? 0.9 : l.t === "together" ? 0.06 : 0.16);
  }
  for (const n of nodes) {
    if (n.p < 0) continue;
    const p = nodes[n.p];
    const on = lit.has(n.i) && lit.has(n.p);
    const [x0, y0] = p.t === "me" ? [cx + Math.cos(n.a) * 0.08 * rx, cy + Math.sin(n.a) * 0.08 * ry] : xy(p);
    const [x1, y1] = xy(n);
    B.line(x0, y0, x1, y1, on ? P.me : P.k[n.g], on ? 1 : n.t === "song" ? 0.2 : 0.34);
  }
  for (const n of nodes) {
    if (n.t === "me") continue;
    const [x, y] = xy(n);
    const on = lit.has(n.i);
    const c = on && n.t !== "kind" ? P.me : P.k[n.g];
    if (n.t === "song") B.plot(x, y, c, 0.85);
    else if (n.t === "album") B.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, c);
    else if (n.t === "artist") B.disc(Math.round(x), Math.round(y), n.w / maxArtist > 0.2 ? 2 : 1, c);
    else {
      B.disc(Math.round(x), Math.round(y), 4, P.bg);
      B.disc(Math.round(x), Math.round(y), 4, c, 0.3);
      B.disc(Math.round(x), Math.round(y), 2, c);
    }
  }
  B.wordmark(cx, cy, W > 300 ? 2 : 1);
  for (const k of kinds) {
    const n = nodes[k];
    const x = cx + Math.cos(n.a) * 0.33 * rx;
    const y = cy + Math.sin(n.a) * 0.36 * ry;
    B.tag(n.n, x - B.width(n.n) / 2, y - 2, P.k[n.g]);
  }
  if (W > 300) {
    B.tag("ARTISTS", cx - B.width("ARTISTS") / 2, cy - 0.5 * ry - 9, P.faint);
    B.tag("ALBUMS", cx - B.width("ALBUMS") / 2, cy - 0.69 * ry - 9, P.faint);
    B.tag("SONGS", cx - B.width("SONGS") / 2, cy - 0.91 * ry - 9, P.faint);
  }
  const [sx, sy] = xy(nodes[selected]);
  B.frame(Math.round(sx) - 4, Math.round(sy) - 4, 9, 9, P.me);
  card(B, sx + 10, sy - 30, P);
  B.search("SEARCH AN ARTIST, ALBUM OR SONG");
  B.save(file, W > 300 ? 3 : 2);
}

// ---------------------------------------------------------------- 3: years
// A web with time in it: each artist sits at the years you played them most,
// going round like a clock from 2016 to now, the most played nearest AKIBWA.
// Artists played in the same years are wired together.
function dial(W, H, P, file) {
  const B = new Board(W, H, P);
  const cx = W / 2;
  const cy = H / 2 + 6;
  const rx = W * 0.44;
  const ry = (H - 40) * 0.47;
  const first = G.years[0] - 0.5;
  const last = G.years[G.years.length - 1] + 0.5;
  const angle = (when) => -Math.PI / 2 + ((when - first) / (last - first)) * Math.PI * 2;
  const spot = new Map();
  for (const n of artists) {
    const a = angle(n.when ?? G.years[0]) + (hash(n.i, 4) - 0.5) * 0.3;
    const r = 0.3 + 0.62 * (1 - Math.pow(n.w / maxArtist, 0.3)) * (0.82 + 0.36 * hash(n.i, 5));
    spot.set(n.i, [cx + Math.cos(a) * r * rx, cy + Math.sin(a) * r * ry, a]);
  }
  // Ease apart any that sit on top of each other.
  const list = [...spot.values()];
  for (let round = 0; round < 40; round += 1) {
    for (let p = 0; p < list.length; p += 1) {
      for (let q = p + 1; q < list.length; q += 1) {
        const dx = list[q][0] - list[p][0];
        const dy = list[q][1] - list[p][1];
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= 5) continue;
        const push = (5 - d) / 2;
        list[p][0] -= (dx / d) * push;
        list[p][1] -= (dy / d) * push;
        list[q][0] += (dx / d) * push;
        list[q][1] += (dy / d) * push;
      }
    }
  }
  for (let s = 0; s < 900; s += 1) {
    const a = (s / 900) * Math.PI * 2;
    B.plot(cx + Math.cos(a) * rx * 1.0, cy + Math.sin(a) * ry * 1.0, P.ink, 0.12);
  }
  for (const year of G.years) {
    const a = angle(year);
    B.line(cx + Math.cos(a) * rx * 0.97, cy + Math.sin(a) * ry * 0.97, cx + Math.cos(a) * rx * 1.03, cy + Math.sin(a) * ry * 1.03, P.ink, 0.6);
    const label = String(year);
    B.text(label, cx + Math.cos(a) * rx * 1.09 - B.width(label) / 2, cy + Math.sin(a) * ry * 1.1 - 2, P.soft);
  }
  for (const l of links) {
    if (l.t === "belongs" || !spot.has(l.a) || !spot.has(l.b)) continue;
    const on = l.a === selected || l.b === selected;
    const same = nodes[l.a].g === nodes[l.b].g;
    B.line(spot.get(l.a)[0], spot.get(l.a)[1], spot.get(l.b)[0], spot.get(l.b)[1], on ? P.me : same ? P.k[nodes[l.a].g] : P.ink, on ? 1 : same ? 0.3 : 0.13);
  }
  for (const n of artists) {
    const [x, y] = spot.get(n.i);
    const on = lit.has(n.i);
    const c = on ? P.me : P.k[n.g];
    B.line(cx + (x - cx) * 0.18, cy + (y - cy) * 0.18, x, y, c, on ? 0.7 : 0.05);
    // Albums and songs gather round their artist.
    const kids = [...under(n.i)].filter((k) => k !== n.i);
    kids.forEach((k, at) => {
      const kid = nodes[k];
      const ka = (at / Math.max(1, kids.length)) * Math.PI * 2 + hash(k, 6);
      const kr = kid.t === "album" ? 3.5 : 5 + (at % 3) * 1.6;
      const kx = x + Math.cos(ka) * kr;
      const ky = y + Math.sin(ka) * kr * 0.9;
      if (kid.t === "album") B.rect(Math.round(kx), Math.round(ky), 2, 2, c, 0.95);
      else B.plot(kx, ky, c, 0.5);
    });
    B.disc(Math.round(x), Math.round(y), n.w / maxArtist > 0.25 ? 2 : n.w / maxArtist > 0.03 ? 1 : 0, c);
  }
  B.wordmark(cx, cy, W > 300 ? 2 : 1);
  const big = artists.slice().sort((p, q) => q.w - p.w).slice(0, W > 300 ? 12 : 5);
  for (const n of big) {
    if (n.i === selected) continue;
    const [x, y] = spot.get(n.i);
    B.tag(n.n, x < cx ? x - B.width(n.n) - 5 : x + 5, y - 2, P.k[n.g]);
  }
  const [sx, sy] = spot.get(selected);
  B.frame(Math.round(sx) - 4, Math.round(sy) - 4, 9, 9, P.me);
  card(B, sx + 10, sy - 30, P);
  B.search("SEARCH AN ARTIST, ALBUM OR SONG");
  B.save(file, W > 300 ? 3 : 2);
}

neuron(480, 300, DARK, `${out}/rough-1-neuron.png`);
layers(480, 300, LIGHT, `${out}/rough-2-layers.png`);
dial(480, 300, DARK, `${out}/rough-3-years.png`);
neuron(195, 422, DARK, `${out}/rough-1-neuron-phone.png`);
dial(195, 422, DARK, `${out}/rough-3-years-phone.png`);
console.log("roughs written", friends.slice(0, 5));
