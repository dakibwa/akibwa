// Pictures in characters. A picture is cut into cells; each cell is matched to
// the character whose ink sits in the same parts of the cell (six parts: two
// across, three down), so edges keep their direction and tone keeps its weight.
// The characters are small enough that the page reads as a picture first.
//
// Run from Node for stills: KIT points at a folder holding @napi-rs/canvas.

import { createRequire } from "node:module";

const require = createRequire(`${process.env.KIT}/package.json`);
export const { createCanvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");
export const fontFile = (path, family) => GlobalFonts.registerFromPath(`${process.env.KIT}/node_modules/${path}`, family);

export const CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
// Where the baseline sits in a cell, as a share of its height.
export const BASE = 0.8;
// The band of a cell that capital letters fill, top and bottom, as shares of its height.
const BAND = [0.1, 0.84];

// How much ink each character puts in each sixth of its cell.
export function makeGlyphs(font, chars = CHARS) {
  const w = 30;
  const h = Math.round(30 * (font.tall ?? 2));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const glyphs = [];
  for (const ch of chars) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.font = `${font.weight ?? 400} ${w / 0.6}px '${font.family}'`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(ch, 0, Math.round(h * BASE));
    const data = ctx.getImageData(0, 0, w, h).data;
    const v = [0, 0, 0, 0, 0, 0];
    const y0 = Math.round(h * BAND[0]);
    const y1 = Math.round(h * BAND[1]);
    let spill = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const a = data[(y * w + x) * 4];
        if (y < y0 || y >= y1) spill += a;
        else v[Math.min(2, Math.floor(((y - y0) * 3) / (y1 - y0))) * 2 + Math.floor((x * 2) / w)] += a;
      }
    }
    const part = (w / 2) * ((y1 - y0) / 3) * 255;
    glyphs.push({ ch, v: v.map((s) => s / part), spill: spill / (w * h * 255) });
  }
  const inks = glyphs.map((g) => g.v.reduce((s, x) => s + x, 0) / 6).sort((a, b) => b - a);
  // The fifth-heaviest character counts as full tone, so a flat light has several letters to choose from.
  const top = inks[4];
  for (const g of glyphs) {
    g.n = g.v.map((s) => s / top);
    g.ink = g.n.reduce((s, x) => s + x, 0) / 6;
    g.d = g.n.map((x) => x - g.ink);
  }
  return { list: glyphs, top, font };
}

const hash = (a, b) => {
  let h = Math.imul(a + 1, 0x27d4eb2d) ^ Math.imul(b + 7, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

// A picture (RGBA) to cells. Each cell: a character, a colour, and how lit it is.
export function toCells(image, cols, rows, glyphs, options = {}) {
  const { gain = 1, gamma = 1, floor = 0, grain = 0.035, lift = 0.55, shape = 1, vivid = 1 } = options;
  const { data, width, height } = image;
  const cw = width / cols;
  const ch = height / rows;
  const cells = new Array(cols * rows);
  const list = glyphs.list;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const s = [0, 0, 0, 0, 0, 0];
      const n = [0, 0, 0, 0, 0, 0];
      let R = 0;
      let G = 0;
      let B = 0;
      let W = 0;
      let R0 = 0;
      let G0 = 0;
      let B0 = 0;
      let N = 0;
      const x0 = Math.round(c * cw);
      const x1 = Math.round((c + 1) * cw);
      const y0 = Math.round(r * ch);
      const y1 = Math.round((r + 1) * ch);
      for (let y = y0; y < y1; y += 1) {
        const py = Math.min(2, Math.floor(((y - y0) * 3) / (y1 - y0)));
        for (let x = x0; x < x1; x += 1) {
          const p = (y * width + x) * 4;
          const l = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
          const k = py * 2 + Math.min(1, Math.floor(((x - x0) * 2) / (x1 - x0)));
          s[k] += l;
          n[k] += 1;
          const wgt = l + 0.02;
          R0 += data[p];
          G0 += data[p + 1];
          B0 += data[p + 2];
          N += 1;
          R += data[p] * wgt;
          G += data[p + 1] * wgt;
          B += data[p + 2] * wgt;
          W += wgt;
        }
      }
      let mean = 0;
      for (let k = 0; k < 6; k += 1) {
        s[k] = Math.pow(Math.max(0, Math.min(1, (s[k] / n[k] - floor) * gain)), gamma);
        mean += s[k] / 6;
      }
      if (mean < 0.004) {
        cells[r * cols + c] = null;
        continue;
      }
      // Stretch the cell's own contrast a little so an edge inside it picks an edged character.
      if (shape !== 1) for (let k = 0; k < 6; k += 1) s[k] = Math.max(0, mean + (s[k] - mean) * shape);
      const tone = Math.min(1.08, mean + (hash(c, r) - 0.5) * 2 * grain);
      let contrast = 0;
      for (let k = 0; k < 6; k += 1) contrast += (s[k] - mean) * (s[k] - mean);
      // A flat cell is matched on tone alone; an edged one on where its light sits.
      const edged = Math.min(1, contrast * 14);
      const near = [];
      for (const g of list) {
        let d = (tone - g.ink) * (tone - g.ink) * 6;
        let e = 0;
        for (let k = 0; k < 6; k += 1) {
          const x = s[k] - mean - g.d[k];
          e += x * x;
        }
        d += e * (0.12 + 0.88 * edged);
        if (near.length < 6) {
          near.push([d, g]);
          near.sort((p, q) => p[0] - q[0]);
        } else if (d < near[5][0]) {
          near[5] = [d, g];
          near.sort((p, q) => p[0] - q[0]);
        }
      }
      const slack = near[0][0] * (1.4 - 0.35 * edged) + 0.006 * (1 - edged);
      const ties = near.filter((x) => x[0] <= slack);
      const pick = ties[Math.floor(hash(r + 91, c + 17) * ties.length)][1];
      if (pick.ch === " ") {
        cells[r * cols + c] = null;
        continue;
      }
      const top = Math.max(R, G, B) / W / 255 || 1e-6;
      const scale = Math.pow(top, lift) / top;
      // Colour is pushed away from grey, so a sleeve keeps its punch when it is only letters.
      const rich = (r, g, b, k) => {
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return [Math.max(0, Math.min(255, y + (r - y) * k)), Math.max(0, Math.min(255, y + (g - y) * k)), Math.max(0, Math.min(255, y + (b - y) * k))];
      };
      const ink = rich(Math.min(255, (R / W) * scale), Math.min(255, (G / W) * scale), Math.min(255, (B / W) * scale), vivid);
      const wash = rich(R0 / N, G0 / N, B0 / N, vivid);
      cells[r * cols + c] = { ch: pick.ch, r: ink[0], g: ink[1], b: ink[2], wr: wash[0], wg: wash[1], wb: wash[2], l: mean };
    }
  }
  return cells;
}

// A picture written in one word over and over. The letter in each cell is fixed
// by the word; the picture comes through in colour, and in how heavy each
// letter is set: small and light in the dark, capital and bold in the light.
export function toNameCells(image, cols, rows, options = {}) {
  const { word = "akibwa", lift = 0.4, vivid = 1.4, gamma = 0.9, seed = 0 } = options;
  const { data, width, height } = image;
  const cw = width / cols;
  const ch = height / rows;
  const cells = new Array(cols * rows);
  const rich = (r, g, b, k) => {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return [Math.max(0, Math.min(255, y + (r - y) * k)), Math.max(0, Math.min(255, y + (g - y) * k)), Math.max(0, Math.min(255, y + (b - y) * k))];
  };
  for (let r = 0; r < rows; r += 1) {
    const start = Math.floor(hash(r + seed, 77) * word.length);
    for (let c = 0; c < cols; c += 1) {
      let R = 0;
      let G = 0;
      let B = 0;
      let N = 0;
      const x0 = Math.round(c * cw);
      const x1 = Math.round((c + 1) * cw);
      const y0 = Math.round(r * ch);
      const y1 = Math.round((r + 1) * ch);
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const p = (y * width + x) * 4;
          R += data[p];
          G += data[p + 1];
          B += data[p + 2];
          N += 1;
        }
      }
      R /= N;
      G /= N;
      B /= N;
      const light = Math.pow((0.2126 * R + 0.7152 * G + 0.0722 * B) / 255, gamma);
      const letter = word[(c + start) % word.length];
      const top = Math.max(R, G, B) / 255 || 1e-6;
      const scale = Math.pow(top, lift) / top;
      const ink = rich(Math.min(255, R * scale), Math.min(255, G * scale), Math.min(255, B * scale), vivid);
      const wash = rich(R, G, B, vivid);
      cells[r * cols + c] = { ch: light > 0.62 ? letter.toUpperCase() : letter, heavy: light > 0.3, r: ink[0], g: ink[1], b: ink[2], wr: wash[0], wg: wash[1], wb: wash[2], l: light };
    }
  }
  return cells;
}

// Cells drawn as text. `under` lays a faint wash of each cell's colour beneath its character.
export function drawCells(ctx, cells, cols, rows, cw, ch, font, { x = 0, y = 0, under = 0, light = null } = {}) {
  ctx.textBaseline = "alphabetic";
  // Two passes when some letters are set lighter than the rest.
  for (const pass of light ? ["light", "heavy"] : ["all"]) {
    const face = pass === "light" ? light : font;
    ctx.font = `${face.weight ?? 400} ${cw / 0.6}px '${face.family}'`;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cell = cells[r * cols + c];
        if (!cell) continue;
        if (pass !== "all" && (pass === "heavy") !== Boolean(cell.heavy)) continue;
        if (under > 0) {
          ctx.fillStyle = `rgba(${cell.wr | 0},${cell.wg | 0},${cell.wb | 0},${under})`;
          ctx.fillRect(x + c * cw, y + r * ch, cw, ch);
        }
        ctx.fillStyle = `rgb(${cell.r | 0},${cell.g | 0},${cell.b | 0})`;
        ctx.fillText(cell.ch, x + c * cw, y + r * ch + Math.round(ch * BASE));
      }
    }
  }
}
