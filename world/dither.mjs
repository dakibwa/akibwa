/*
 * Brings a full-colour painting down to a small palette, the way the valley
 * is meant to look: a few dozen colours chosen from the picture itself, mixed
 * by eye through an ordered dither.
 */

const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

// Display colour (0 to 1) to OKLab, where equal steps look equal.
export function toLab(r, g, b, out, at = 0) {
  const lr = lin(r < 0 ? 0 : r > 1 ? 1 : r);
  const lg = lin(g < 0 ? 0 : g > 1 ? 1 : g);
  const lb = lin(b < 0 ? 0 : b > 1 ? 1 : b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  out[at] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[at + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[at + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return out;
}

const CHROMA = 1.5; // hue counts for a little more than lightness when matching

/*
 * A palette of `count` colours for the picture: the colours the picture
 * mostly is, found by gathering its pixels into groups (k-means in OKLab).
 */
export function buildPalette(img, W, H, count = 32, rounds = 12) {
  const step = Math.max(1, Math.floor((W * H) / 24000));
  const pts = [];
  const lab = [0, 0, 0];
  for (let p = 0; p < W * H; p += step) {
    toLab(img[p * 3], img[p * 3 + 1], img[p * 3 + 2], lab);
    pts.push([lab[0], lab[1] * CHROMA, lab[2] * CHROMA, img[p * 3], img[p * 3 + 1], img[p * 3 + 2]]);
  }
  // Start from colours spread evenly from dark to light.
  const sorted = pts.slice().sort((a, b) => a[0] - b[0]);
  const centres = [];
  for (let i = 0; i < count; i += 1) centres.push(sorted[Math.floor(((i + 0.5) / count) * sorted.length)].slice());
  const owner = new Int32Array(pts.length);
  for (let round = 0; round < rounds; round += 1) {
    const sum = centres.map(() => [0, 0, 0, 0, 0, 0, 0]);
    for (let i = 0; i < pts.length; i += 1) {
      const P = pts[i];
      let best = 0;
      let bd = 1e9;
      for (let c = 0; c < count; c += 1) {
        const Cc = centres[c];
        const d = (P[0] - Cc[0]) ** 2 + (P[1] - Cc[1]) ** 2 + (P[2] - Cc[2]) ** 2;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      owner[i] = best;
      const S = sum[best];
      for (let j = 0; j < 6; j += 1) S[j] += P[j];
      S[6] += 1;
    }
    for (let c = 0; c < count; c += 1) {
      const S = sum[c];
      if (S[6] > 0) for (let j = 0; j < 6; j += 1) centres[c][j] = S[j] / S[6];
    }
  }
  return centres.map((c) => ({ L: c[0], a: c[1], b: c[2], rgb: [c[3], c[4], c[5]] }));
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

/*
 * The picture in the palette's colours, as RGBA bytes. Between two palette
 * colours the dither's fixed pattern decides which one a pixel takes.
 */
export function ditherTo(img, W, H, palette, spread = 0.06) {
  const out = new Uint8ClampedArray(W * H * 4);
  const lab = [0, 0, 0];
  const n = palette.length;
  const pick = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      toLab(img[p * 3], img[p * 3 + 1], img[p * 3 + 2], lab);
      const t = BAYER[(y & 3) * 4 + (x & 3)] * spread;
      const L = lab[0] + t;
      const a = lab[1] * CHROMA;
      const b = lab[2] * CHROMA;
      let best = 0;
      let bd = 1e9;
      for (let c = 0; c < n; c += 1) {
        const P = palette[c];
        const d = (L - P.L) * (L - P.L) + (a - P.a) * (a - P.a) + (b - P.b) * (b - P.b);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      pick[p] = best;
      const rgb = palette[best].rgb;
      out[p * 4] = rgb[0] * 255;
      out[p * 4 + 1] = rgb[1] * 255;
      out[p * 4 + 2] = rgb[2] * 255;
      out[p * 4 + 3] = 255;
    }
  }
  return { rgba: out, pick };
}

// The picture as it is, without a palette, for comparing.
export function plain(img, W, H) {
  const out = new Uint8ClampedArray(W * H * 4);
  for (let p = 0; p < W * H; p += 1) {
    out[p * 4] = img[p * 3] * 255;
    out[p * 4 + 1] = img[p * 3 + 1] * 255;
    out[p * 4 + 2] = img[p * 3 + 2] * 255;
    out[p * 4 + 3] = 255;
  }
  return out;
}
