/*
 * Paints the valley as the viewer sees it: the land is sampled once along
 * every line of sight, lit by a low sun with long shadows, thinned by haze
 * with distance, and laid down nearest first. Sky, cloud and water are
 * painted per pixel. The result is full colour; dither.mjs brings it down to
 * a small palette afterwards.
 */

import { makeLand, MAT, WALLS, clamp, mix, sstep } from "./land.mjs";
import { makeNoise } from "./noise.mjs";

const ZFAR = 17000;

const lerp3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

// The light at a few hours of the day; any hour between is a blend.
const HOURS = [
  {
    at: 5.2, disc: [0.9, 0.92, 1], // before dawn
    sunEl: -6, sunAz: 24, sun: [0.25, 0.3, 0.5], amb: [0.2, 0.24, 0.36],
    top: [0.16, 0.2, 0.36], mid: [0.42, 0.42, 0.56], low: [0.86, 0.62, 0.56], glow: [1, 0.62, 0.45],
    haze: [0.5, 0.5, 0.62], hazeDist: 3600, mist: 0.5, cloudLit: [0.95, 0.66, 0.6], cloudMid: [0.6, 0.5, 0.62], cloudDark: [0.32, 0.32, 0.48], stars: 0.5, night: 0.6
  },
  {
    at: 7.2, disc: [1, 0.97, 0.86], // morning
    sunEl: 12, sunAz: -128, sun: [1.2, 1.02, 0.78], amb: [0.44, 0.52, 0.66],
    top: [0.56, 0.74, 0.9], mid: [0.8, 0.88, 0.92], low: [0.98, 0.9, 0.78], glow: [1, 0.86, 0.6],
    haze: [0.78, 0.84, 0.88], hazeDist: 4200, mist: 0.42, cloudLit: [1, 0.96, 0.88], cloudMid: [0.9, 0.86, 0.86], cloudDark: [0.66, 0.68, 0.78], stars: 0, night: 0
  },
  {
    at: 13, disc: [1, 1, 0.94], // midday
    sunEl: 52, sunAz: -60, sun: [1.22, 1.16, 1.02], amb: [0.42, 0.52, 0.7],
    top: [0.36, 0.62, 0.9], mid: [0.62, 0.8, 0.94], low: [0.86, 0.92, 0.94], glow: [1, 0.98, 0.9],
    haze: [0.74, 0.84, 0.92], hazeDist: 6500, mist: 0.08, cloudLit: [1, 1, 0.98], cloudMid: [0.9, 0.92, 0.95], cloudDark: [0.7, 0.74, 0.82], stars: 0, night: 0
  },
  {
    at: 19.3, disc: [1, 0.96, 0.8], // the golden hour
    sunEl: 8, sunAz: 13, sun: [1.42, 1.04, 0.62], amb: [0.42, 0.48, 0.58],
    top: [0.95, 0.94, 0.82], mid: [0.99, 0.93, 0.77], low: [1, 0.85, 0.63], glow: [1, 0.72, 0.4],
    haze: [0.86, 0.78, 0.68], hazeDist: 4600, mist: 0.3, cloudLit: [1, 0.82, 0.6], cloudMid: [0.96, 0.62, 0.52], cloudDark: [0.64, 0.54, 0.66], stars: 0, night: 0
  },
  {
    at: 20.7, disc: [1, 0.8, 0.6], // dusk
    sunEl: -5, sunAz: 30, sun: [0.3, 0.3, 0.46], amb: [0.24, 0.26, 0.4],
    top: [0.2, 0.24, 0.42], mid: [0.5, 0.42, 0.56], low: [0.96, 0.6, 0.44], glow: [1, 0.55, 0.32],
    haze: [0.52, 0.46, 0.58], hazeDist: 3800, mist: 0.4, cloudLit: [0.98, 0.56, 0.44], cloudMid: [0.56, 0.4, 0.56], cloudDark: [0.26, 0.26, 0.42], stars: 0.45, night: 0.65
  },
  {
    at: 23.5, disc: [0.93, 0.95, 1], // night, by the moon
    sunEl: 12.5, sunAz: 13, sun: [0.3, 0.38, 0.6], amb: [0.1, 0.13, 0.24],
    top: [0.03, 0.05, 0.13], mid: [0.06, 0.09, 0.2], low: [0.13, 0.17, 0.32], glow: [0.5, 0.6, 0.85],
    haze: [0.1, 0.14, 0.27], hazeDist: 4200, mist: 0.36, cloudLit: [0.34, 0.4, 0.58], cloudMid: [0.16, 0.2, 0.36], cloudDark: [0.07, 0.09, 0.2], stars: 1, night: 1
  }
];

export function atmosphere(time) {
  const t = ((time % 24) + 24) % 24;
  let a = HOURS[HOURS.length - 1];
  let b = HOURS[0];
  let span = b.at + 24 - a.at;
  let into = t >= a.at ? t - a.at : t + 24 - a.at;
  for (let i = 0; i < HOURS.length - 1; i += 1) {
    if (t >= HOURS[i].at && t < HOURS[i + 1].at) {
      a = HOURS[i];
      b = HOURS[i + 1];
      span = b.at - a.at;
      into = t - a.at;
    }
  }
  const u = clamp(into / span);
  const s = u * u * (3 - 2 * u);
  const out = {};
  for (const key of Object.keys(a)) {
    if (key === "at") continue;
    out[key] = Array.isArray(a[key]) ? lerp3(a[key], b[key], s) : mix(a[key], b[key], s);
  }
  // The sun's bearing turns the short way round.
  let dAz = b.sunAz - a.sunAz;
  if (dAz > 180) dAz -= 360;
  if (dAz < -180) dAz += 360;
  out.sunAz = a.sunAz + dAz * s;
  return out;
}

export function paintValley({ W, H, seed = 7, time = 19.3, fov = 60, horizon = 0.42, eye = 30 }) {
  const land = makeLand(seed);
  const { hash, noise, fbm } = makeNoise(seed + 1009);
  const A = atmosphere(time);
  const k = (2 * Math.tan((fov * Math.PI) / 360)) / W;
  const f = 1 / k;
  const hy = Math.round(H * horizon);
  const o = { h: 0, r: 0, g: 0, b: 0, m: 0, w: 0 };
  land.sample(0, 0, 1, o);
  const camH = o.h + eye;

  // The sun (or moon), as a direction and as a place on the screen.
  const el = (A.sunEl * Math.PI) / 180;
  const az = (A.sunAz * Math.PI) / 180;
  const Lx = Math.sin(az) * Math.cos(el);
  const Ly = Math.sin(el);
  const Lz = Math.cos(az) * Math.cos(el);
  const sunAhead = Math.cos(az) > 0.05;
  const sunX = sunAhead ? W / 2 + Math.tan(az) * f : -9999;
  const sunY = sunAhead ? hy - (Math.tan(el) / Math.cos(az)) * f : -9999;
  const lit = clamp((A.sunEl + 2) / 6);

  // Depths to sample: close together near the viewer, a steady ratio beyond.
  const zs = [];
  const reach = eye * f;
  let z = Math.max(8, (reach / (H - hy)) * 0.7);
  while (z < ZFAR) {
    zs.push(z);
    z += Math.min((z * z * 0.8) / reach, z * 0.0125);
  }
  const nv = zs.length;
  const lnMin = Math.log(zs[0]);
  const lnMax = Math.log(zs[nv - 1]);
  const LUT = 2048;
  const sliceOf = new Float32Array(LUT + 1);
  {
    let v = 0;
    for (let i = 0; i <= LUT; i += 1) {
      const zz = Math.exp(lnMin + ((lnMax - lnMin) * i) / LUT);
      while (v < nv - 2 && zs[v + 1] < zz) v += 1;
      sliceOf[i] = v + clamp((zz - zs[v]) / (zs[v + 1] - zs[v]));
    }
  }
  const sliceAt = (zz) => {
    const u = ((Math.log(zz) - lnMin) / (lnMax - lnMin)) * LUT;
    const i = u | 0;
    return sliceOf[i] + (sliceOf[Math.min(LUT, i + 1)] - sliceOf[i]) * (u - i);
  };

  // The land along every line of sight.
  const n = nv * W;
  const Hh = new Float32Array(n);
  const R = new Float32Array(n);
  const G = new Float32Array(n);
  const B = new Float32Array(n);
  const M = new Uint8Array(n);
  const Wk = new Uint8Array(n);
  const Hzd = new Float32Array(n);
  for (let v = 0; v < nv; v += 1) {
    const zz = zs[v];
    const fp = k * zz;
    for (let x = 0; x < W; x += 1) {
      const i = v * W + x;
      land.sample((x + 0.5 - W / 2) * fp, zz, fp, o);
      Hh[i] = o.h;
      R[i] = o.r;
      G[i] = o.g;
      B[i] = o.b;
      M[i] = o.m;
      Wk[i] = o.w;
    }
  }

  const heightAt = (gx, gv) => {
    const x0 = gx | 0;
    const v0 = gv | 0;
    const x1 = Math.min(W - 1, x0 + 1);
    const v1 = Math.min(nv - 1, v0 + 1);
    const tx = gx - x0;
    const tv = gv - v0;
    const a = Hh[v0 * W + x0] + (Hh[v0 * W + x1] - Hh[v0 * W + x0]) * tx;
    const b = Hh[v1 * W + x0] + (Hh[v1 * W + x1] - Hh[v1 * W + x0]) * tx;
    return a + (b - a) * tv;
  };

  const hazeAt = (x) => {
    // Warmer towards the sun, cooler away from it.
    const d = (x - sunX) / (W * 0.5);
    const warm = sunAhead ? Math.exp(-d * d * 2.2) * 0.55 * lit : 0;
    return [mix(A.haze[0], A.glow[0], warm), mix(A.haze[1], A.glow[1], warm), mix(A.haze[2], A.glow[2], warm)];
  };

  // Light every sample.
  const C = new Float32Array(n * 3);
  for (let v = 0; v < nv; v += 1) {
    const zz = zs[v];
    const fp = k * zz;
    const vn = Math.max(0, v - 1);
    const vf = Math.min(nv - 1, v + 1);
    const dz = zs[vf] - zs[vn];
    for (let x = 0; x < W; x += 1) {
      const i = v * W + x;
      if (M[i] === MAT.WATER || M[i] === MAT.RIVER) continue;
      const xl = Math.max(0, x - 1);
      const xr = Math.min(W - 1, x + 1);
      const tx = (xr - xl) * fp;
      const ty = Hh[v * W + xr] - Hh[v * W + xl];
      const ux = (x + 0.5 - W / 2) * k * dz;
      const uy = Hh[vf * W + x] - Hh[vn * W + x];
      let nx = -ty * dz;
      let ny = tx * dz;
      let nz = -(tx * uy - ty * ux);
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const h = Hh[i];
      const wx = (x + 0.5 - W / 2) * fp;

      // Shadow: walk towards the sun and see whether the land rises above.
      let shade = 1;
      if (Ly > 0.01) {
        let t = 2.5 + fp * 1.5;
        for (let s = 0; s < 26; s += 1) {
          const pz = zz + Lz * t;
          if (pz <= zs[0] || pz >= zs[nv - 1]) break;
          const gx = (wx + Lx * t) / (k * pz) + W / 2 - 0.5;
          if (gx < 0 || gx > W - 1) break;
          const d = heightAt(gx, sliceAt(pz)) - (h + 1.2 + Ly * t);
          if (d > 0) {
            shade = Math.min(shade, 1 - d / (0.07 * t + 0.8));
            if (shade <= 0) {
              shade = 0;
              break;
            }
          }
          t *= 1.33;
        }
      } else {
        shade = 0;
      }

      let ndl = nx * Lx + ny * Ly + nz * Lz;
      const leafy = M[i] === MAT.TREE || M[i] === MAT.HEDGE;
      // Leaves let some light through and catch it on their edges.
      if (leafy) ndl = (ndl + 0.35) / 1.35;
      else ndl = (ndl + 0.16) / 1.16;
      ndl = Math.max(0, ndl);
      const sunPart = ndl * shade;
      const sky = 0.56 + 0.44 * ny;
      let r = R[i] * (A.sun[0] * sunPart + A.amb[0] * sky);
      let g = G[i] * (A.sun[1] * sunPart + A.amb[1] * sky);
      let b = B[i] * (A.sun[2] * sunPart + A.amb[2] * sky);
      // Snow glows in low light.
      if (M[i] === MAT.SNOW) {
        r += 0.1 * A.sun[0] * shade;
        g += 0.06 * A.sun[1] * shade;
      }

      // Haze with distance, and mist lying in the valley.
      const hz = 1 - Math.exp(-zz / A.hazeDist);
      const floor = clamp(2600 - zz, 0, 4200) * 0.011;
      const mist = A.mist * Math.exp(-Math.max(0, h - floor) / 60) * (1 - Math.exp(-zz / 1100));
      const a = clamp(hz + mist * (1 - hz));
      const Hz = hazeAt(x);
      Hzd[i] = a;
      C[i * 3] = mix(r, Hz[0], a);
      C[i * 3 + 1] = mix(g, Hz[1], a);
      C[i * 3 + 2] = mix(b, Hz[2], a);
    }
  }

  // Sky and cloud for a pixel.
  const skyAt = (x, y, out) => {
    const up = clamp((hy - y) / (hy + 0.001));
    const t = Math.pow(up, 0.7);
    let r = t < 0.5 ? mix(A.low[0], A.mid[0], t * 2) : mix(A.mid[0], A.top[0], t * 2 - 1);
    let g = t < 0.5 ? mix(A.low[1], A.mid[1], t * 2) : mix(A.mid[1], A.top[1], t * 2 - 1);
    let b = t < 0.5 ? mix(A.low[2], A.mid[2], t * 2) : mix(A.mid[2], A.top[2], t * 2 - 1);
    const dx = (x - sunX) / f;
    const dy = (y - sunY) / f;
    const d2 = dx * dx + dy * dy;
    if (sunAhead) {
      const wide = Math.exp(-d2 * 3.2) * 0.5 * lit * (1 - 0.6 * A.night);
      const near = Math.exp(-d2 * 60) * 0.75 * lit * (1 - 0.4 * A.night);
      r = mix(r, A.glow[0], wide);
      g = mix(g, A.glow[1], wide);
      b = mix(b, A.glow[2], wide);
      r = mix(r, A.disc[0], near);
      g = mix(g, A.disc[1], near);
      b = mix(b, A.disc[2], near);
    }

    // A bank of cloud over the horizon, flat underneath, heaped on top.
    const u = x / (W * 0.19) + 3.1;
    const vv = (hy - y) / (H * 0.085);
    const shape = fbm(u, vv * 0.9, 5, 91);
    const band = Math.exp(-((vv - 1.25) * (vv - 1.25)) / 0.9) * sstep(0.05, 0.5, vv);
    const dens = shape * 0.6 + band * 0.8 - 0.45;
    // High thin streaks.
    const streak = fbm(x / (W * 0.4) + 7, (hy - y) / (H * 0.03), 4, 92) * 0.5 + fbm(x / (W * 0.12), (hy - y) / (H * 0.02) + 4, 3, 93) * 0.2;
    const thin = sstep(0.16, 0.34, streak) * sstep(0.25, 0.5, up) * 0.6;
    let cover = sstep(0.0, 0.2, dens);
    if (cover > 0 || thin > 0) {
      // Lit from the sun's side and from below when the sun is low.
      const toSunX = sunAhead ? clamp((sunX - x) / (W * 0.18), -1, 1) * 0.09 : 0.05;
      const lightN = fbm(u + toSunX, vv * 0.9 - 0.14, 5, 91);
      const facing = clamp(0.5 + (shape - lightN) * 3.2 + (1 - clamp(dens * 2.5)) * 0.25);
      const sunny = sunAhead ? Math.exp(-d2 * 1.4) : 0.3;
      let cr = mix(A.cloudDark[0], A.cloudMid[0], sstep(0.15, 0.55, facing));
      let cg = mix(A.cloudDark[1], A.cloudMid[1], sstep(0.15, 0.55, facing));
      let cb = mix(A.cloudDark[2], A.cloudMid[2], sstep(0.15, 0.55, facing));
      const hi = sstep(0.5, 0.9, facing) * (0.45 + 0.55 * sunny);
      cr = mix(cr, A.cloudLit[0], hi);
      cg = mix(cg, A.cloudLit[1], hi);
      cb = mix(cb, A.cloudLit[2], hi);
      r = mix(r, cr, cover * 0.94);
      g = mix(g, cg, cover * 0.94);
      b = mix(b, cb, cover * 0.94);
      const tl = thin * (1 - cover);
      r = mix(r, A.cloudLit[0], tl);
      g = mix(g, A.cloudLit[1], tl);
      b = mix(b, A.cloudLit[2], tl);
    }
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = cover;
    return out;
  };

  // Lay the land down, nearest first.
  const img = new Float32Array(W * H * 3);
  const kind = new Uint8Array(W * H); // 0 sky, 1 land, 2 sea, 3 river
  const depth = new Float32Array(W * H).fill(ZFAR * 2);
  const mat = new Uint8Array(W * H).fill(255); // what each pixel shows; 255 is sky, 254 a built wall
  const ybuf = new Int16Array(W).fill(H);
  const lastH = new Float32Array(W).fill(-1e9);
  const front = Ly > 0 ? Math.max(0, -Lz) : 0;
  for (let v = 0; v < nv; v += 1) {
    const zz = zs[v];
    for (let x = 0; x < W; x += 1) {
      const i = v * W + x;
      // The first sight of something built is its wall, facing the viewer.
      const wall = Wk[i] > 0 && Hh[i] - lastH[x] > 2.5;
      lastH[x] = Hh[i];
      let y = Math.floor(hy + ((camH - Hh[i]) / zz) * f);
      if (y >= ybuf[x]) continue;
      if (y < 0) y = 0;
      const m = M[i];
      const kd = m === MAT.WATER ? 2 : m === MAT.RIVER ? 3 : 1;
      let cr = C[i * 3];
      let cg = C[i * 3 + 1];
      let cb = C[i * 3 + 2];
      if (wall) {
        const Wc = WALLS[Wk[i]];
        const Hc = hazeAt(x);
        const glance = 0.3 * lit + front * 0.7;
        cr = mix(Wc[0] * (A.amb[0] * 1.15 + A.sun[0] * glance), Hc[0], Hzd[i]);
        cg = mix(Wc[1] * (A.amb[1] * 1.15 + A.sun[1] * glance), Hc[1], Hzd[i]);
        cb = mix(Wc[2] * (A.amb[2] * 1.15 + A.sun[2] * glance), Hc[2], Hzd[i]);
      }
      // A pitched roof shows as the top of the front.
      const eaves = wall ? y + Math.max(1, Math.round((ybuf[x] - y) * 0.38)) : 0;
      for (let yy = y; yy < ybuf[x]; yy += 1) {
        const p = yy * W + x;
        // Lit windows after dark.
        if (wall && yy < eaves) {
          img[p * 3] = C[i * 3];
          img[p * 3 + 1] = C[i * 3 + 1];
          img[p * 3 + 2] = C[i * 3 + 2];
        } else if (wall && A.night > 0.3 && hash(x * 3 + Wk[i], yy, 98) < 0.34 * A.night) {
          img[p * 3] = mix(1.0, cr, 0.15);
          img[p * 3 + 1] = mix(0.8, cg, 0.15);
          img[p * 3 + 2] = mix(0.44, cb, 0.15);
        } else {
          img[p * 3] = cr;
          img[p * 3 + 1] = cg;
          img[p * 3 + 2] = cb;
        }
        kind[p] = kd;
        depth[p] = zz;
        mat[p] = wall ? 250 + Math.min(4, Wk[i] === 7 ? 4 : 0) : m;
      }
      ybuf[x] = y;
    }
  }

  // Sky above the land.
  const px4 = [0, 0, 0, 0];
  const cloud = new Float32Array(W * H);
  for (let x = 0; x < W; x += 1) {
    for (let y = 0; y < ybuf[x]; y += 1) {
      const p = y * W + x;
      skyAt(x, y, px4);
      img[p * 3] = px4[0];
      img[p * 3 + 1] = px4[1];
      img[p * 3 + 2] = px4[2];
      cloud[p] = px4[3];
    }
  }

  // Water mirrors what is above it, broken by small waves and the sun's path.
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (kind[p] < 2) continue;
      const below = y - hy;
      const far = clamp(1 - below / (H - hy));
      const wob = noise(x / 23, y * 0.75, 95) * (1 + 5 * (1 - far));
      const mx = clamp(Math.round(x + wob), 0, W - 1);
      const my = Math.max(0, Math.round(hy - below * 0.92 - 1));
      const q = my * W + mx;
      let r;
      let g;
      let b;
      if (kind[q] === 1) {
        r = img[q * 3] * 0.82;
        g = img[q * 3 + 1] * 0.84;
        b = img[q * 3 + 2] * 0.88;
      } else {
        skyAt(mx, my, px4);
        r = px4[0];
        g = px4[1];
        b = px4[2];
      }
      // Looking down into nearer water, it darkens.
      const deep = kind[p] === 3 ? 0.34 + 0.2 * (1 - far) : 0.16 + 0.42 * Math.pow(1 - far, 1.3);
      const D = [mix(0.1, A.amb[0] * 0.5, 0.5), mix(0.22, A.amb[1] * 0.55, 0.5), mix(0.3, A.amb[2] * 0.6, 0.5)];
      r = mix(r, D[0], deep);
      g = mix(g, D[1], deep);
      b = mix(b, D[2], deep);
      // Short strokes of wave.
      const wave = noise(x / 11, y * 1.15, 96);
      if (wave > 0.3) {
        r *= 0.9;
        g *= 0.91;
        b *= 0.93;
      } else if (wave < -0.36) {
        r = mix(r, A.mid[0], 0.16);
        g = mix(g, A.mid[1], 0.16);
        b = mix(b, A.mid[2], 0.16);
      }
      // The sun's path, glittering.
      if (sunAhead && lit > 0) {
        const wdt = 4 + 0.42 * below;
        const dxs = (x - sunX) / wdt;
        const path = Math.exp(-dxs * dxs) * lit * (kind[p] === 3 ? 0.16 : 1);
        if (hash(x, y, 97) < path * 0.7) {
          r = mix(r, A.disc[0], 0.85);
          g = mix(g, A.disc[1] * 0.96, 0.85);
          b = mix(b, A.disc[2] * 0.9, 0.85);
        } else {
          r = mix(r, A.glow[0], path * 0.3);
          g = mix(g, A.glow[1], path * 0.3);
          b = mix(b, A.glow[2], path * 0.3);
        }
      }
      img[p * 3] = r;
      img[p * 3 + 1] = g;
      img[p * 3 + 2] = b;
    }
  }

  // The sun's disc, where no cloud or land covers it.
  if (sunAhead) {
    const rad = Math.max(2.2, W * (0.012 + 0.006 * A.night));
    for (let y = Math.max(0, Math.floor(sunY - rad)); y <= Math.min(H - 1, Math.ceil(sunY + rad)); y += 1) {
      for (let x = Math.max(0, Math.floor(sunX - rad)); x <= Math.min(W - 1, Math.ceil(sunX + rad)); x += 1) {
        const p = y * W + x;
        if (kind[p] !== 0) continue;
        if (Math.hypot(x + 0.5 - sunX, y + 0.5 - sunY) > rad) continue;
        const cv = cloud[p];
        img[p * 3] = mix(A.disc[0], img[p * 3], cv * 0.8);
        img[p * 3 + 1] = mix(A.disc[1], img[p * 3 + 1], cv * 0.8);
        img[p * 3 + 2] = mix(A.disc[2], img[p * 3 + 2], cv * 0.8);
      }
    }
  }

  // Stars, where the sky is clear. `stars` may give each its place (0 to 1
  // across, 0 to 1 up the sky) and brightness; otherwise they are scattered.
  const starry = [];
  if (A.stars > 0.02) {
    const count = Math.round((W * hy) / 55);
    for (let s = 0; s < count; s += 1) {
      const x = Math.floor(hash(s, 1, 99) * W);
      const y = Math.floor(Math.pow(hash(s, 2, 99), 1.25) * (hy - 2));
      const p = y * W + x;
      if (kind[p] !== 0 || cloud[p] > 0.25) continue;
      const bright = Math.pow(hash(s, 3, 99), 3);
      const a = (0.35 + 0.65 * bright) * A.stars;
      const tint = hash(s, 4, 99);
      const sr = tint > 0.8 ? 1 : 0.86;
      const sb = tint < 0.2 ? 0.8 : 1;
      img[p * 3] = mix(img[p * 3], sr, a);
      img[p * 3 + 1] = mix(img[p * 3 + 1], 0.92, a);
      img[p * 3 + 2] = mix(img[p * 3 + 2], sb, a);
      if (bright > 0.72) {
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const q = (y + oy) * W + x + ox;
          if (x + ox < 0 || x + ox >= W || y + oy < 0 || kind[q] !== 0) continue;
          img[q * 3] = mix(img[q * 3], sr, a * 0.4);
          img[q * 3 + 1] = mix(img[q * 3 + 1], 0.92, a * 0.4);
          img[q * 3 + 2] = mix(img[q * 3 + 2], sb, a * 0.4);
        }
      }
      starry.push({ x, y, bright });
    }
  }

  // Where a world point lands on the screen, for placing things later.
  const project = (wx, wy, wz) => ({ x: W / 2 + wx / (k * wz), y: hy + ((camH - wy) / wz) * f, scale: f / wz });

  return { W, H, img, kind, depth, mat, cloud, stars: starry, hy, f, k, camH, A, project, land, sun: { x: sunX, y: sunY, ahead: sunAhead } };
}
