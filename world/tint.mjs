/*
 * Paints a view of the valley in the colours of one record: the cover's own
 * colours, ordered from dark to light, become the picture's colours from
 * dark to light. A little of the land's own colour is kept so water, grass
 * and stone can still be told apart.
 */

import { toLab } from "./dither.mjs";

const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
export function fromLab(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (v) => Math.min(1, Math.max(0, gamma(v)));
  return [clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}

/*
 * The cover's colours as steps from dark to light. `pixels` is RGB bytes.
 * Colours are gathered into groups, and small groups still count, so an
 * accent on the sleeve is not lost.
 */
export function coverSteps(pixels, count = 7) {
  const n = pixels.length / 3;
  const pts = [];
  const lab = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    toLab(pixels[i * 3] / 255, pixels[i * 3 + 1] / 255, pixels[i * 3 + 2] / 255, lab);
    pts.push([lab[0], lab[1], lab[2]]);
  }
  const sorted = pts.slice().sort((p, q) => p[0] - q[0]);
  const centres = [];
  for (let i = 0; i < count; i += 1) centres.push(sorted[Math.floor(((i + 0.5) / count) * sorted.length)].slice());
  for (let round = 0; round < 10; round += 1) {
    const sum = centres.map(() => [0, 0, 0, 0]);
    for (const P of pts) {
      let best = 0;
      let bd = 1e9;
      for (let c = 0; c < count; c += 1) {
        const d = (P[0] - centres[c][0]) ** 2 + ((P[1] - centres[c][1]) * 2) ** 2 + ((P[2] - centres[c][2]) * 2) ** 2;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      sum[best][0] += P[0];
      sum[best][1] += P[1];
      sum[best][2] += P[2];
      sum[best][3] += 1;
    }
    for (let c = 0; c < count; c += 1) if (sum[c][3]) centres[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]];
  }
  return centres.sort((p, q) => p[0] - q[0]);
}

// The hue a lightness takes, read off the cover's steps.
function hueAt(steps, L) {
  if (L <= steps[0][0]) return steps[0];
  for (let i = 1; i < steps.length; i += 1) {
    if (L <= steps[i][0]) {
      const t = (L - steps[i - 1][0]) / Math.max(1e-6, steps[i][0] - steps[i - 1][0]);
      return [L, steps[i - 1][1] + (steps[i][1] - steps[i - 1][1]) * t, steps[i - 1][2] + (steps[i][2] - steps[i - 1][2]) * t];
    }
  }
  return steps[steps.length - 1];
}

/*
 * Recolours a palette (from buildPalette) with a cover's steps. `keep` is how
 * much of the land's own colour stays (0 none, 1 all).
 */
export function tintPalette(palette, steps, keep = 0.28) {
  const lo = steps[0][0];
  const hi = steps[steps.length - 1][0];
  let pl = 1;
  let ph = 0;
  for (const P of palette) {
    pl = Math.min(pl, P.L);
    ph = Math.max(ph, P.L);
  }
  return palette.map((P) => {
    // The picture keeps most of its own light and dark, drawn a little towards the cover's range.
    const t = (P.L - pl) / Math.max(1e-6, ph - pl);
    const L = P.L * 0.6 + (lo + (hi - lo) * t) * 0.4;
    const H = hueAt(steps, lo + (hi - lo) * t);
    const a = (P.a / 1.5) * keep + H[1] * (1 - keep);
    const b = (P.b / 1.5) * keep + H[2] * (1 - keep);
    return { ...P, rgb: fromLab(L, a, b) };
  });
}
