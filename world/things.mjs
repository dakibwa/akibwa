/*
 * The albums in the valley. Each kind of music belongs to one part of the
 * land, and its albums fly above that place as a bunch of square kites on
 * strings (lanterns after dark), each sleeve as large as its hours earn.
 *
 * Laying out is separate from drawing: layoutThings() decides where every
 * sleeve goes and returns plain numbers, which the page also uses to know
 * what is under a finger; drawThings() paints them into a picture.
 */

export const KINDS = [
  { id: "electronic", label: "electronic", place: "the snow" },
  { id: "indie", label: "indie", place: "the hill" },
  { id: "psych", label: "psychedelic", place: "the forest" },
  { id: "classics", label: "classics", place: "the castle" },
  { id: "folk", label: "folk & songwriters", place: "the fields" },
  { id: "hiphop", label: "hip-hop & soul", place: "the town" },
  { id: "ambient", label: "ambient", place: "the sea" }
];

// What each kind's place looks like in the picture: the materials to look
// for (see MAT in land.mjs; 250 is a house front, 254 a stone front), and
// where in that patch to tie the bunch (0 to 1 across and down it).
const PLACES = {
  ambient: { mats: [1], at: [0.74, 0.42] },
  hiphop: { mats: [6, 250], at: [0.45, 0.4] },
  folk: { mats: [9], at: [0.62, 0.5] },
  classics: { mats: [254, 10], at: [0.5, 0.3], castle: true },
  psych: { mats: [3], at: [0.3, 0.62] },
  indie: { mats: [10], at: [0.4, 0.5], rows: [0.62, 1] },
  electronic: { mats: [5], at: [0.5, 0.5] }
};

const clampN = (v, a, b) => (v < a ? a : v > b ? b : v);

// The side of a sleeve, in picture pixels, for the hours it is drawn at.
export function sleeveSide(weight, heaviest, smallest, largest) {
  return Math.round(clampN(largest * Math.sqrt(weight / heaviest), smallest, largest));
}

/*
 * Where everything goes. `albums` carry { id, kind, weight } and are taken
 * heaviest first; `perKind` is how many of each kind fly at once.
 */
export function layoutThings(view, albums, { perKind = 6, smallest = 9, largest = 22, gap = 2, pixel = 3, edge = 16, tagSize = null } = {}) {
  const { W, H, depth, kind: kindAt, project, land, sun } = view;
  const o = { h: 0, r: 0, g: 0, b: 0, m: 0, w: 0 };
  const taken = new Uint8Array(W * H);
  const block = (x0, y0, x1, y1) => {
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y += 1) for (let x = Math.max(0, x0); x < Math.min(W, x1); x += 1) taken[y * W + x] = 1;
  };
  const free = (x0, y0, x1, y1) => {
    if (x0 < 2 || y0 < 2 || x1 > W - 2 || y1 > H - 2) return false;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) if (taken[y * W + x]) return false;
    return true;
  };

  // Tether each kind where its place can be seen in this picture: find the
  // pixels that show it, and tie the bunch to one near the chosen part.
  const { mat } = view;
  const anchors = [];
  KINDS.forEach((K, order) => {
    const P = PLACES[K.id];
    let x = -1;
    let y = -1;
    if (P.castle) {
      const c = project(land.castle.x, land.castle.base + 30, land.castle.z);
      if (c.x > 10 && c.x < W - 10 && c.y > 14 && c.y < H - 6) {
        x = Math.round(c.x);
        y = Math.round(c.y);
      }
    }
    if (x < 0) {
      const xs = [];
      const ys = [];
      const top = P.rows ? Math.max(14, Math.round(H * P.rows[0])) : 14;
      const bottom = P.rows ? Math.min(H - 6, Math.round(H * P.rows[1])) : H - 6;
      for (let py = top; py < bottom; py += 1) {
        for (let px = 10; px < W - 10; px += 1) {
          if (P.mats.includes(mat[py * W + px])) {
            xs.push(px);
            ys.push(py);
          }
        }
      }
      if (xs.length >= 24) {
        const sx = xs.slice().sort((a, b) => a - b);
        const sy = ys.slice().sort((a, b) => a - b);
        const tx = sx[Math.floor((sx.length - 1) * P.at[0])];
        const ty = sy[Math.floor((sy.length - 1) * P.at[1])];
        let bd = 1e9;
        for (let i = 0; i < xs.length; i += 1) {
          const d = (xs[i] - tx) ** 2 + (ys[i] - ty) ** 2;
          if (d < bd) {
            bd = d;
            x = xs[i];
            y = ys[i];
          }
        }
      }
    }
    // Nothing of its place in view: tie it along the horizon instead.
    if (x < 0) {
      x = Math.round(((order + 0.5) / KINDS.length) * (W - 30) + 15);
      y = view.hy + 4;
    }
    anchors.push({ kind: K.id, label: K.label, place: K.place, x, y, z: depth[y * W + x], sea: kindAt[y * W + x] === 2 });
  });

  // A name tag hangs under each tether. Its size comes from the page, which
  // can measure the words; without one it is reckoned from their length.
  const margin = Math.ceil(edge / pixel);
  for (const A of anchors) {
    A.count = albums.filter((album) => album.kind === A.kind).length;
    const size = tagSize ? tagSize(A) : { w: (7.4 * (A.label.length + String(A.count).length) + 46) / pixel, h: 32 / pixel };
    A.tw = Math.ceil(size.w);
    A.th = Math.ceil(size.h);
    A.tx = Math.round(clampN(A.x - A.tw / 2, margin, W - margin - A.tw));
    A.ty = Math.min(H - A.th - 2, A.y + 2);
  }
  // Tags that would overlap step down past one another.
  for (let round = 0; round < 6; round += 1) {
    const sorted = anchors.slice().sort((a, b) => a.ty - b.ty || a.tx - b.tx);
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const P = sorted[i];
        const Q = sorted[j];
        if (Q.tx < P.tx + P.tw + 2 && P.tx < Q.tx + Q.tw + 2 && Q.ty < P.ty + P.th + 1) Q.ty = Math.min(H - Q.th - 2, P.ty + P.th + 1);
      }
    }
  }

  // Keep the sun or moon, each tether and each tag clear.
  if (sun.ahead) block(Math.round(sun.x) - 9, Math.round(sun.y) - 9, Math.round(sun.x) + 10, Math.round(sun.y) + 10);
  for (const A of anchors) {
    block(A.x - 7, A.y - 9, A.x + 8, A.y + 3);
    block(A.tx - 1, A.ty - 1, A.tx + A.tw + 1, A.ty + A.th + 1);
  }

  const heaviest = Math.max(...albums.map((album) => album.weight));
  const chosen = [];
  for (const A of anchors) {
    const mine = albums.filter((album) => album.kind === A.kind).slice(0, perKind);
    let area = 0;
    for (const album of mine) {
      const s = sleeveSide(album.weight, heaviest, smallest, largest);
      area += (s + gap) * (s + gap);
      chosen.push({ album, s, anchor: A });
    }
    const radius = Math.sqrt(area / Math.PI);
    A.cx = clampN(A.x, radius + 4, W - radius - 4);
    A.cy = clampN(A.y - 16 - radius, radius + 4, H - radius - 4);
    A.r = radius;
  }
  // Bunches that would run into each other step apart, staying over their own tether.
  for (let round = 0; round < 40; round += 1) {
    for (let i = 0; i < anchors.length; i += 1) {
      for (let j = i + 1; j < anchors.length; j += 1) {
        const P = anchors[i];
        const Q = anchors[j];
        const dx = Q.cx - P.cx;
        const dy = Q.cy - P.cy;
        const d = Math.hypot(dx, dy) || 1;
        const need = P.r + Q.r + 7;
        if (d >= need) continue;
        const push = (need - d) / 2;
        P.cx -= (dx / d) * push;
        P.cy -= (dy / d) * push;
        Q.cx += (dx / d) * push;
        Q.cy += (dy / d) * push;
      }
    }
    for (const A of anchors) {
      A.cx = clampN(A.cx + (A.x - A.cx) * 0.04, A.r + 4, W - A.r - 4);
      A.cy = clampN(A.cy, A.r + 4, Math.min(H - A.r - 4, A.y - 8 - A.r * 0.6));
    }
  }

  // Largest first, each as near its bunch's middle as there is room.
  chosen.sort((a, b) => b.s - a.s || a.album.rank - b.album.rank);
  const reach = Math.max(W, H);
  const items = [];
  for (const C of chosen) {
    const { s, anchor: A } = C;
    let best = null;
    let bestD = 1e9;
    for (let r = 0; r <= reach && !best; r += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = Math.round(A.cx - s / 2) + dx;
          const y = Math.round(A.cy - s / 2) + dy;
          if (y + s > A.y - 5) continue; // kites fly above their tether
          if (!free(x - gap, y - gap, x + s + gap, y + s + gap)) continue;
          const d = Math.hypot(dx, dy * 1.15);
          if (d < bestD) {
            bestD = d;
            best = { x, y };
          }
        }
      }
    }
    if (!best) continue;
    block(best.x - gap + 1, best.y - gap + 1, best.x + s + gap - 1, best.y + s + gap - 1);
    items.push({ id: C.album.id, kind: A.kind, x: best.x, y: best.y, s, ax: A.x, ay: A.y });
  }
  return { anchors, items };
}

const blend = (rgba, W, H, x, y, r, g, b, a) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const p = (y * W + x) * 4;
  rgba[p] += (r - rgba[p]) * a;
  rgba[p + 1] += (g - rgba[p + 1]) * a;
  rgba[p + 2] += (b - rgba[p + 2]) * a;
};

const line = (rgba, W, H, x0, y0, x1, y1, r, g, b, a) => {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    blend(rgba, W, H, x, y, r, g, b, a);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
};

/*
 * Paints the strings and sleeves into `rgba`. `sleeve(id, side)` returns that
 * album's cover as side × side RGB bytes. `night` runs 0 to 1; `sway` moves
 * each sleeve a little, for the living page.
 */
export function drawThings(rgba, W, H, layout, sleeve, { night = 0, sway = null } = {}) {
  const ink = night > 0.5 ? [8, 10, 22] : [38, 30, 26];
  const cord = night > 0.5 ? [200, 196, 190] : [52, 42, 36];
  const placed = layout.items.map((item, index) => {
    const move = sway ? sway(item, index) : [0, 0];
    return { ...item, x: item.x + move[0], y: item.y + move[1] };
  });
  // Strings first, so every sleeve sits over them.
  for (const item of placed) {
    line(rgba, W, H, item.x + (item.s >> 1), item.y + item.s, item.ax, item.ay, cord[0], cord[1], cord[2], night > 0.5 ? 0.28 : 0.42);
  }
  // A stake where each bunch is tied.
  for (const A of layout.anchors) {
    blend(rgba, W, H, A.x, A.y, ink[0], ink[1], ink[2], 0.9);
    blend(rgba, W, H, A.x, A.y - 1, ink[0], ink[1], ink[2], 0.9);
  }
  // After dark each sleeve is a lantern, with a warm glow round it.
  if (night > 0.3) {
    for (const item of placed) {
      for (let dy = -4; dy < item.s + 4; dy += 1) {
        for (let dx = -4; dx < item.s + 4; dx += 1) {
          const ox = dx < 0 ? -dx : dx >= item.s ? dx - item.s + 1 : 0;
          const oy = dy < 0 ? -dy : dy >= item.s ? dy - item.s + 1 : 0;
          const d = Math.hypot(ox, oy);
          if (d === 0 || d > 4.2) continue;
          blend(rgba, W, H, item.x + dx, item.y + dy, 255, 196, 120, (0.34 * night * (4.2 - d)) / 4.2);
        }
      }
    }
  }
  for (const item of placed) {
    const { x, y, s } = item;
    const art = sleeve(item.id, s);
    for (let i = -1; i <= s; i += 1) {
      blend(rgba, W, H, x + i, y - 1, ink[0], ink[1], ink[2], 0.85);
      blend(rgba, W, H, x + i, y + s, ink[0], ink[1], ink[2], 0.85);
      blend(rgba, W, H, x - 1, y + i, ink[0], ink[1], ink[2], 0.85);
      blend(rgba, W, H, x + s, y + i, ink[0], ink[1], ink[2], 0.85);
    }
    if (!art) continue;
    for (let j = 0; j < s; j += 1) {
      for (let i = 0; i < s; i += 1) {
        const q = (j * s + i) * 3;
        blend(rgba, W, H, x + i, y + j, art[q], art[q + 1], art[q + 2], 1);
      }
    }
  }
  return placed;
}
