/*
 * The valley itself: one function that says, for any point, how high the land
 * is there and what grows or stands on it. The viewer is on a hillside at
 * (0, 0) looking down the valley (+z) to the sea.
 *
 * Near to far: the viewer's hill with its wall, fields and hedges on the
 * valley floor, a river winding to the estuary, a forested ridge on the left
 * with moor on top and a castle at its foot, lower pasture hills on the right
 * with the town on their seaward end, the sea, and snow mountains behind the
 * far shore on the left.
 */

import { makeNoise } from "./noise.mjs";

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const MAT = { GRASS: 0, WATER: 1, SAND: 2, TREE: 3, ROCK: 4, SNOW: 5, ROOF: 6, HEDGE: 7, MOOR: 8, FIELD: 9, STONE: 10, RIVER: 11 };

// Paint for each kind of ground, as it looks in plain white light.
const FIELDS = [
  [0.42, 0.6, 0.26],
  [0.5, 0.67, 0.3],
  [0.36, 0.54, 0.25],
  [0.46, 0.63, 0.28],
  [0.4, 0.58, 0.3],
  [0.64, 0.72, 0.33],
  [0.7, 0.74, 0.36],
  [0.82, 0.72, 0.4],
  [0.5, 0.38, 0.27],
  [0.55, 0.69, 0.31]
];
const HEDGE = [0.15, 0.29, 0.15];
const STONE = [0.6, 0.58, 0.52];
const ROUGH = [0.44, 0.55, 0.27];
const TREES = [
  [0.19, 0.41, 0.17],
  [0.23, 0.46, 0.19],
  [0.16, 0.36, 0.17],
  [0.28, 0.48, 0.18],
  [0.2, 0.4, 0.21]
];
const AUTUMN = [0.66, 0.47, 0.17];
const CONIFER = [0.11, 0.29, 0.2];
const MOOR = [0.47, 0.45, 0.24];
const HEATHER = [0.47, 0.32, 0.38];
const BRACKEN = [0.57, 0.37, 0.2];
const ROCK = [0.5, 0.48, 0.45];
const SNOW = [0.95, 0.96, 0.98];
const SAND = [0.86, 0.78, 0.58];
const ROOFS = [
  [0.8, 0.37, 0.22],
  [0.72, 0.31, 0.2],
  [0.86, 0.45, 0.26],
  [0.64, 0.29, 0.2],
  [0.78, 0.42, 0.3]
];
const PAVING = [0.8, 0.74, 0.62];
const KEEP = [0.74, 0.71, 0.64];

// Walls a house can have, by the number sample() leaves in `w`.
export const WALLS = [
  null,
  [0.93, 0.88, 0.74],
  [0.95, 0.94, 0.9],
  [0.93, 0.78, 0.42],
  [0.9, 0.66, 0.6],
  [0.7, 0.8, 0.9],
  [0.85, 0.62, 0.36],
  [0.7, 0.68, 0.62]
];

// How far the viewer's hill stands above the valley floor.
const FG = 190;

export function makeLand(seed) {
  const { hash, noise, fbm, ridged, worley } = makeNoise(seed);
  const cellA = { f1: 0, f2: 0, px: 0, pz: 0, id: 0, id2: 0 };
  const cellB = { f1: 0, f2: 0, px: 0, pz: 0, id: 0, id2: 0 };
  const cellC = { f1: 0, f2: 0, px: 0, pz: 0, id: 0, id2: 0 };
  const G = { sh: 0, floorH: 0, rx: 0, dxr: 0, rw: 0, ridgeL: 0, hillR: 0, mount: 0, fg: 0, edge: 0, cd2: 0, h: 0 };

  // The river's line down the valley.
  const riverX = (z) => 90 * Math.sin(z / 520 + 0.4) + 30 * Math.sin(z / 190 + 2.0) + 0.035 * z + 30;

  // Above zero on land, below at sea. The coast runs away to the far left,
  // so the sea fills the middle and right of the horizon.
  const shore = (x, z) => 2600 - z + 3.2 * Math.max(0, -(x - 100)) + 150 * fbm(x / 900, z / 900, 3, 11);

  // Where the viewer's hill breaks off towards the valley.
  const brow = (x) => 150 + 30 * noise(x / 150, 1.7, 51) + (x > 0 ? x * 0.08 : -x * 0.04);

  // A castle on a knoll at the foot of the ridge, in the middle distance.
  const castleZ = 1020;
  const castleX = riverX(castleZ) - 195;

  // The shape of the land before anything grows or is built on it.
  function ground(x, z, g) {
    const sh = shore(x, z);
    const floorH = clamp(sh, 0, 4200) * 0.011;
    const rx = riverX(z);
    const dxr = x - rx;
    const wx = x + 110 * fbm(x / 520, z / 520, 3, 21);
    const side = sstep(70, 380, Math.abs(dxr));

    // The forested ridge on the left, highest in the middle distance.
    const axisL = rx - 520 - 0.02 * z;
    const envL = sstep(120, 520, z) * (1 - sstep(1500, 2450, z));
    const dL = (wx - axisL) / 400;
    const ridgeL = 300 * side * envL * Math.exp(-dL * dL) * (0.72 + 0.5 * fbm(x / 380, z / 380, 4, 31));

    // Lower pasture hills on the right.
    const axisR = rx + 600 + 0.18 * z;
    const envR = sstep(350, 900, z) * (1 - sstep(2250, 2650, z));
    const dR = (wx - axisR) / 430;
    const hillR = 140 * side * envR * Math.exp(-dR * dR) * (0.75 + 0.45 * fbm(x / 300 + 4, z / 300, 4, 37));

    // Snow mountains inland of the far shore.
    const inland = sstep(500, 1700, sh) * sstep(2700, 3900, z);
    const mount = inland > 0 ? inland * (330 + 1080 * ridged(x / 1700, z / 1700, 5, 41)) : 0;

    // The viewer's hill.
    const edge = brow(x);
    const fg = FG * (1 - sstep(edge - 20, edge + 330, z));

    // The castle's knoll.
    const cdx = x - castleX;
    const cdz = z - castleZ;
    const cd2 = cdx * cdx + cdz * cdz;
    const knoll = cd2 < 160000 ? 34 * Math.exp(-cd2 / 12000) : 0;

    g.sh = sh;
    g.floorH = floorH;
    g.rx = rx;
    g.dxr = dxr;
    g.rw = 7 + 0.02 * z + 70 * sstep(2050, 2600, z);
    g.ridgeL = ridgeL;
    g.hillR = hillR;
    g.mount = mount;
    g.fg = fg;
    g.edge = edge;
    g.cd2 = cd2;
    g.h = floorH + ridgeL + hillR + mount + fg + knoll + (sh > 0 ? (5 - 3.6 * (fg / FG)) * fbm(x / 70, z / 70, 3, 61) : 0);
    return g;
  }

  const castleBase = ground(castleX, castleZ, G).h;

  /*
   * The land at (x, z), written into `o`: height h, paint r g b, material m,
   * and w, the kind of wall under a roof (0 where nothing is built). `fp` is
   * how much ground one screen pixel covers there, so detail finer than a
   * pixel is averaged rather than left to sparkle.
   */
  function sample(x, z, fp, o) {
    o.w = 0;
    ground(x, z, G);
    const { sh, floorH, dxr, rw, ridgeL, hillR, mount, fg, edge, cd2 } = G;
    let h = G.h;

    // Sea.
    if (sh <= 0) {
      o.h = 0;
      o.r = 0;
      o.g = 0;
      o.b = 0;
      o.m = MAT.WATER;
      return o;
    }

    // The river, cut into the valley floor, widening to its estuary.
    const inValley = 1 - sstep(0.1, 0.4, fg / FG);
    const ad = Math.abs(dxr);
    if (inValley > 0) {
      const bank = sstep(rw, rw + 14 + 0.01 * z, ad);
      h = mix(mix(h, Math.min(h, floorH - 2.2), inValley), h, bank);
      if (ad < rw && inValley > 0.5) {
        o.h = floorH - 1.4;
        o.r = 0;
        o.g = 0;
        o.b = 0;
        o.m = MAT.RIVER;
        return o;
      }
    }

    // Beach.
    if (sh < 24) {
      const t = sh / 24;
      const n = 0.94 + 0.08 * noise(x / 9, z / 9, 63);
      o.h = h * t + 0.6 * (1 - t);
      o.r = SAND[0] * n;
      o.g = SAND[1] * n;
      o.b = SAND[2] * n;
      o.m = MAT.SAND;
      return o;
    }

    const up = h - floorH;
    const grain = 1 + 0.07 * fbm(x / 11, z / 11, 2, 64) + 0.04 * (hash(Math.floor(x * 1.3), Math.floor(z * 1.3), 65) - 0.5);
    let r;
    let g;
    let b;
    let m;

    if (mount > 60) {
      // Mountain: rock, with snow above a wandering line and forest at its feet.
      const line = 640 + 160 * fbm(x / 600, z / 600, 3, 43);
      const snow = sstep(line - 60, line + 90, h + 90 * fbm(x / 140, z / 140, 3, 44));
      const rock = 0.9 + 0.2 * ridged(x / 220, z / 220, 3, 45);
      const feet = (1 - sstep(260, 430, h)) * sstep(-0.2, 0.3, fbm(x / 500, z / 500, 3, 46));
      r = mix(mix(ROCK[0] * rock * 0.86, SNOW[0], snow), CONIFER[0] * 1.15, feet);
      g = mix(mix(ROCK[1] * rock * 0.86, SNOW[1], snow), CONIFER[1] * 1.15, feet);
      b = mix(mix(ROCK[2] * rock * 0.92, SNOW[2], snow), CONIFER[2] * 1.15, feet);
      m = snow > 0.5 ? MAT.SNOW : MAT.ROCK;
    } else {
      const woodN = fbm(x / 260, z / 260, 3, 71);
      const onRidge = ridgeL > 20;
      const moor = clamp(sstep(205, 250, ridgeL + 40 * woodN) + sstep(118, 150, hillR + 25 * woodN));
      const onHill = fg > FG * 0.22;

      // The town climbs the seaward end of the right-hand hills, above the estuary.
      const townZ = sstep(1420, 1640, z) * (1 - sstep(2330, 2500, z));
      const townX = sstep(rw + 30, rw + 90, dxr) * (1 - sstep(480, 760, dxr));
      const town = townZ * townX > 0 ? townZ * townX * sstep(-0.5, 0, fbm(x / 230, z / 230, 2, 85) + 0.5 - dxr / 900) : 0;
      const built = town > 0.3;

      let wood = 0;
      if (!onHill && !built) {
        if (onRidge && up < 250) wood = sstep(-0.45, -0.15, woodN) * (1 - moor) * sstep(14, 40, ridgeL);
        if (!onRidge && up < 70) wood = Math.max(wood, sstep(0.36, 0.5, woodN));
        if (hillR > 30) wood = Math.max(wood, sstep(0.18, 0.34, woodN) * (1 - moor));
        // A clearing round the castle.
        if (cd2 < 16000) wood *= sstep(3000, 12000, cd2);
      }

      // Ground first: fields below, rough pasture above, moor on top.
      worley(x + 26 * noise(x / 190, z / 190, 73), z + 26 * noise(x / 190 + 5, z / 190, 74), 84, 75, cellA);
      const lowland = 1 - sstep(70, 105, up);
      const border = cellA.f2 - cellA.f1;
      const lineW = Math.max(2.3, fp * 0.8);
      const F = FIELDS[(cellA.id * FIELDS.length) | 0];
      const tone = 0.84 + 0.32 * cellA.id2;
      // Mowing lines, when near enough to see.
      const ang = cellA.id2 * 3.14159;
      const stripe = fp < 1.7 ? 1 + 0.035 * Math.sin((x * Math.cos(ang) + z * Math.sin(ang)) / 2.6) : 1;
      r = mix(ROUGH[0], F[0] * tone * stripe, lowland);
      g = mix(ROUGH[1], F[1] * tone * stripe, lowland);
      b = mix(ROUGH[2], F[2] * tone * stripe, lowland);
      m = lowland > 0.5 ? MAT.FIELD : MAT.GRASS;
      if (built) {
        r = PAVING[0];
        g = PAVING[1];
        b = PAVING[2];
        m = MAT.GRASS;
      }

      if (moor > 0) {
        const hn = fbm(x / 90, z / 90, 3, 77);
        const heath = sstep(0.0, 0.35, hn);
        const fern = sstep(-0.1, -0.4, hn);
        r = mix(r, mix(mix(MOOR[0], HEATHER[0], heath), BRACKEN[0], fern), moor);
        g = mix(g, mix(mix(MOOR[1], HEATHER[1], heath), BRACKEN[1], fern), moor);
        b = mix(b, mix(mix(MOOR[2], HEATHER[2], heath), BRACKEN[2], fern), moor);
        if (moor > 0.5) m = MAT.MOOR;
        // Outcrops.
        const crag = sstep(0.62, 0.72, ridged(x / 120, z / 120, 3, 78)) * moor;
        if (crag > 0) {
          h += 7 * crag;
          r = mix(r, ROCK[0], crag);
          g = mix(g, ROCK[1], crag);
          b = mix(b, ROCK[2], crag);
          if (crag > 0.5) m = MAT.ROCK;
        }
      }

      // Hedges between lowland fields, dry-stone walls up the slopes.
      const lined = !onHill && !built && wood < 0.5 && moor < 0.6;
      if (lined && border < lineW * 2) {
        const edgeT = 1 - sstep(lineW * 0.9, lineW * 2, border);
        const hedge = up < 46;
        const P = hedge ? HEDGE : STONE;
        r = mix(r, P[0], edgeT);
        g = mix(g, P[1], edgeT);
        b = mix(b, P[2], edgeT);
        h += (hedge ? 3.2 : 1.3) * edgeT * (1 - clamp((fp - 3) / 6));
        if (edgeT > 0.5) m = hedge ? MAT.HEDGE : MAT.STONE;
      }

      // The viewer's hill: rough grass, a dry-stone wall near its brow, and a
      // tree or two to frame the view.
      let framing = 0;
      if (onHill) {
        const tuft = fbm(x / 6, z / 6, 3, 79);
        r = mix(r, ROUGH[0] * (0.92 + 0.22 * tuft), 0.9);
        g = mix(g, ROUGH[1] * (0.92 + 0.22 * tuft), 0.9);
        b = mix(b, ROUGH[2] * (0.92 + 0.16 * tuft), 0.9);
        m = MAT.GRASS;
        h += 0.5 * Math.max(0, tuft);
        const wallZ = edge - 34 + 7 * noise(x / 60, 3.3, 80);
        if (Math.abs(z - wallZ) < 1.5) {
          const cap = 0.86 + 0.22 * hash(Math.floor(x / 2.2), Math.floor(z / 2.0), 81);
          h += 2.6 + 0.5 * hash(Math.floor(x / 2.2), 0, 82);
          r = 0.86 * cap;
          g = 0.83 * cap;
          b = 0.76 * cap;
          m = MAT.STONE;
        }
        if (z > edge - 110 && z < edge - 6 && Math.abs(x) > 0.34 * z) framing = 0.5;
      }

      // Trees: broadleaves low down, conifers higher up the ridge.
      const hedgerow = lined && border < lineW * 1.6 && up < 60 ? 0.3 : 0;
      const density = Math.max(wood * 0.92, hedgerow);
      if (density > 0.02) {
        const far = clamp((fp - 2.2) / 5);
        worley(x, z, 16, 83, cellB);
        const conifer = onRidge && sstep(120, 180, up + 30 * cellB.id2) > 0.5;
        const rad = conifer ? 4.6 + 1.6 * cellB.id2 : 5.6 + 3.6 * cellB.id2;
        const tall = conifer ? 15 + 6 * cellB.id : 9.5 + 7 * cellB.id;
        let canopy = 0;
        if (cellB.id < density && cellB.f1 < rad) {
          const q = cellB.f1 / rad;
          canopy = (conifer ? 1 - q : Math.sqrt(1 - q * q)) * (0.86 + 0.16 * noise(x / 2.1, z / 2.1, 84));
        }
        // Too far to tell one crown from the next: an even canopy instead.
        const cover = mix(canopy, density * 0.62, far);
        if (cover > 0.02) {
          const T = conifer ? CONIFER : cellB.id2 > 0.93 ? AUTUMN : TREES[((cellB.id2 * 97) % TREES.length) | 0];
          const lightT = 0.9 + 0.2 * cellB.id;
          const a = clamp(cover * 3);
          h += tall * cover;
          r = mix(r, T[0] * lightT, a);
          g = mix(g, T[1] * lightT, a);
          b = mix(b, T[2] * lightT, a);
          m = MAT.TREE;
        }
      } else if (framing > 0) {
        worley(x, z, 46, 88, cellB, 0.8);
        const rad = 13 + 5 * cellB.id2;
        if (cellB.id < framing && cellB.f1 < rad) {
          const q = cellB.f1 / rad;
          const crown = Math.sqrt(1 - q * q) * (0.84 + 0.2 * noise(x / 1.7, z / 1.7, 84));
          const T = TREES[((cellB.id2 * 97) % TREES.length) | 0];
          h += (17 + 7 * cellB.id2) * crown;
          r = T[0] * 1.08;
          g = T[1] * 1.08;
          b = T[2] * 1.08;
          m = MAT.TREE;
        }
      }

      if (built) {
        // Houses in the town: a box of wall under a tiled roof.
        worley(x, z, 21, 86, cellC, 0.7);
        const hw = 4.2 + 4.2 * cellC.id;
        const hd = 4.2 + 4.2 * cellC.id2;
        if (cellC.id2 < 0.22 + town * 0.72 && Math.abs(x - cellC.px) < hw && Math.abs(z - cellC.pz) < hd) {
          const tower = cellC.id > 0.965;
          const roof = ROOFS[((cellC.id * 53) % ROOFS.length) | 0];
          h += tower ? 34 : 8 + 11 * cellC.id2;
          r = roof[0];
          g = roof[1];
          b = roof[2];
          m = MAT.ROOF;
          o.w = tower ? 7 : 1 + (((cellC.id2 * 61) % 6) | 0);
        }
      } else if (m === MAT.FIELD && fp < 10) {
        // A barn or a farmhouse here and there among the fields.
        worley(x, z, 230, 87, cellC, 0.8);
        if (cellC.id < 0.55 && Math.abs(x - cellC.px) < 7.5 && Math.abs(z - cellC.pz) < 5) {
          const farm = cellC.id2 > 0.6;
          h += farm ? 7 : 5.5;
          r = farm ? 0.72 : 0.46;
          g = farm ? 0.33 : 0.41;
          b = farm ? 0.22 : 0.37;
          m = MAT.ROOF;
          o.w = farm ? 2 : 7;
        }
      }

      // The castle: a curtain wall with a tower at each corner, standing level.
      const cdx = Math.abs(x - castleX);
      const cdz = Math.abs(z - castleZ);
      if (cdx < 38 && cdz < 28) {
        const corner = cdx > 25 && cdz > 17;
        const curtain = cdx > 32 || cdz > 23;
        const lift = corner ? 36 : curtain ? 23 : 2;
        const cap = 0.94 + 0.1 * hash(Math.floor(x / 3), Math.floor(z / 3), 89);
        h = castleBase + lift;
        r = KEEP[0] * cap;
        g = KEEP[1] * cap;
        b = KEEP[2] * cap;
        m = MAT.STONE;
        o.w = lift > 2 ? 7 : 0;
      }
    }

    o.h = h;
    o.r = r * grain;
    o.g = g * grain;
    o.b = b * grain;
    o.m = m;
    return o;
  }

  return { sample, ground, riverX, shore, brow, castle: { x: castleX, z: castleZ, base: castleBase } };
}
