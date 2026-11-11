// A grid of square pixels to draw on, and a PNG of it. Everything the net
// shows is drawn on one of these, so every mark is the same size of pixel.

import { writeFileSync } from "node:fs";
import { encodePng } from "../world/png.mjs";

export const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export class Grid {
  constructor(W, H, bg) {
    this.W = W;
    this.H = H;
    this.bg = bg;
    this.px = new Float32Array(W * H * 3);
    for (let i = 0; i < W * H; i += 1) this.px.set(bg, i * 3);
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
  rect(x, y, w, h, c, a = 1) {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.plot(x + i, y + j, c, a);
  }
  // Rows of "#" and "." stamped at k pixels a cell; tone(col, row) picks the colour.
  stamp(rows, x, y, k, tone, a = 1) {
    rows.forEach((row, r) => {
      for (let q = 0; q < row.length; q += 1) {
        if (row[q] === ".") continue;
        const c = typeof tone === "function" ? tone(q, r, row[q]) : tone;
        if (c) this.rect(x + q * k, y + r * k, k, k, c, a);
      }
    });
  }
  save(file, scale = 1) {
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
