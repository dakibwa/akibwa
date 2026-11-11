/*
 * The nerve cell: where everything in the net sits on a screen.
 *
 * The name is the cell body in the middle. Each kind of music is one dendrite
 * leaving it; the dendrite forks and forks until every artist of that kind has
 * a twig of its own. An artist carries its records as sleeves and its songs as
 * small seeds: an album's songs sit round its sleeve, the rest round the artist.
 *
 * Nothing here draws. It returns plain positions, so the same layout can be
 * painted any way: in characters, in pixels, on a phone.
 */

const hash = (i, k = 0) => {
  let h = Math.imul(i + 1, 0x27d4eb2d) ^ Math.imul(k + 7, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// Clockwise from the top: the biggest kinds get the wide bands above and below the name.
export const ROUND = ["indie", "classics", "folk", "hiphop", "electronic", "ambient", "psych"];

// The distance from the middle to a rounded-rectangle edge, in a direction.
const edge = (angle, a, b, n = 3.4) => Math.pow(Math.pow(Math.abs(Math.cos(angle)) / a, n) + Math.pow(Math.abs(Math.sin(angle)) / b, n), -1 / n);

export function layoutCell(G, options) {
  const { W, H, inner, margin = 46, unit = 1 } = options;
  const cx = W / 2;
  const cy = H / 2;
  const outer = { a: W / 2 - margin, b: H / 2 - margin };
  const rin = (angle) => edge(angle, inner.a, inner.b, 2.6);
  const rout = (angle) => edge(angle, outer.a, outer.b, 3.6);
  const { nodes, links } = G;
  nodes.forEach((n, i) => {
    n.i = i;
    n.kids = [];
  });
  nodes.forEach((n) => n.p >= 0 && nodes[n.p].kids.push(n.i));
  const artists = nodes.filter((n) => n.t === "artist");
  const maxArtist = Math.max(...artists.map((n) => n.w));
  const maxAlbum = Math.max(...nodes.filter((n) => n.t === "album").map((n) => n.w));
  const maxSong = Math.max(...nodes.filter((n) => n.t === "song").map((n) => n.w));

  // ---- an artist's own cluster: loose songs seeded round the artist, sleeves
  // packed close about that, each sleeve with its own songs in a row beneath it
  const cluster = (artist, scale) => {
    const nodeR = (5 + 8 * Math.sqrt(artist.w / maxArtist)) * unit;
    const singles = artist.kids.filter((k) => nodes[k].t === "song").sort((p, q) => nodes[q].w - nodes[p].w);
    const albums = artist.kids.filter((k) => nodes[k].t === "album").sort((p, q) => nodes[q].w - nodes[p].w);
    const pitch = 9.5 * unit;
    const seeds = singles.map((k, n) => ({ k, r: nodeR + 5 * unit + pitch * Math.sqrt(n + 0.35), a: n * GOLDEN + hash(artist.i, 3) * 6.28 }));
    const core = seeds.length ? seeds.at(-1).r + 5 * unit : nodeR + 3 * unit;
    const gap = 7 * unit;
    const rects = [];
    for (const k of albums) {
      const album = nodes[k];
      const side = Math.round((24 + 168 * Math.pow(album.w / maxAlbum, 0.88)) * unit * scale);
      const across = Math.max(1, Math.floor(side / (9 * unit)));
      const lines = Math.ceil(album.kids.length / across);
      const w = side;
      const h = side + (lines ? lines * 10 * unit + 3 * unit : 0);
      let best = null;
      for (let a = 0; a < 32; a += 1) {
        const angle = (a / 32) * Math.PI * 2 + hash(artist.i, 11) * 0.2;
        for (let d = core; d < core + 1400 * unit; d += 4 * unit) {
          const x = Math.cos(angle) * d;
          const y = Math.sin(angle) * d;
          const nx = Math.max(x - w / 2, Math.min(0, x + w / 2));
          const ny = Math.max(y - h / 2, Math.min(0, y + h / 2));
          if (Math.hypot(nx, ny) < core + gap * 0.6) continue;
          if (rects.some((r) => Math.abs(r.x - x) < (r.w + w) / 2 + gap && Math.abs(r.y - y) < (r.h + h) / 2 + gap)) continue;
          const far = Math.hypot(Math.abs(x) + w / 2, Math.abs(y) + h / 2);
          if (!best || far < best.far) best = { k, x, y, w, h, side, across, far };
          break;
        }
      }
      rects.push(best);
    }
    // The smallest circle that holds the lot; the artist need not be at its middle.
    const points = [];
    for (let a = 0; a < 12; a += 1) points.push([Math.cos((a / 12) * Math.PI * 2) * core, Math.sin((a / 12) * Math.PI * 2) * core]);
    for (const r of rects) for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) points.push([r.x + (sx * r.w) / 2, r.y + (sy * r.h) / 2]);
    let ox = points.reduce((sum, q) => sum + q[0], 0) / points.length;
    let oy = points.reduce((sum, q) => sum + q[1], 0) / points.length;
    let radius = 0;
    for (let pass = 0; pass < 60; pass += 1) {
      let far = null;
      let most = 0;
      for (const q of points) {
        const d = Math.hypot(q[0] - ox, q[1] - oy);
        if (d > most) {
          most = d;
          far = q;
        }
      }
      radius = most;
      ox += (far[0] - ox) * 0.08 * (1 - pass / 60);
      oy += (far[1] - oy) * 0.08 * (1 - pass / 60);
    }
    radius = Math.max(...points.map((q) => Math.hypot(q[0] - ox, q[1] - oy))) + 2 * unit;
    return { nodeR, seeds, covers: rects, radius, ox, oy };
  };

  // ---- each kind's share of the ring round the name, by the room its artists need
  const present = ROUND.filter((id) => artists.some((n) => n.g === id));
  const STEPS = 1440;
  const areaAt = (s) => {
    const angle = (s / STEPS) * Math.PI * 2;
    return 0.5 * (rout(angle) ** 2 - rin(angle) ** 2) * ((Math.PI * 2) / STEPS);
  };
  const ringArea = Array.from({ length: STEPS }, (_, s) => areaAt(s)).reduce((a, b) => a + b, 0);

  const attempt = (scale) => {
    const built = new Map(artists.map((n) => [n.i, cluster(n, scale)]));
    const need = present.map((id) => artists.filter((n) => n.g === id).reduce((sum, n) => sum + built.get(n.i).radius ** 2, 0));
    const total = need.reduce((a, b) => a + b, 0);
    // Walk round from the top, giving each kind the arc that holds its share of the room.
    const first = (need[0] / total) * ringArea;
    let start = Math.round(STEPS * 0.75);
    for (let acc = 0; acc < first / 2; start -= 1) acc += areaAt((start - 1 + STEPS) % STEPS);
    const wedges = [];
    let at = start;
    present.forEach((id, k) => {
      const want = (need[k] / total) * ringArea;
      const from = at;
      for (let acc = 0; acc < want && at - start < STEPS; at += 1) acc += areaAt(at % STEPS);
      wedges.push({ id, a0: (from / STEPS) * Math.PI * 2, a1: (at / STEPS) * Math.PI * 2 });
    });
    wedges.at(-1).a1 = wedges[0].a0 + Math.PI * 2;
    const discs = [];
    for (const wedge of wedges) {
      const mine = artists.filter((n) => n.g === wedge.id).sort((p, q) => q.w - p.w);
      mine.forEach((n, rank) => {
        const c = built.get(n.i);
        const angle = wedge.a0 + (wedge.a1 - wedge.a0) * (0.06 + 0.88 * ((rank * 0.6180339887 + hash(n.i, 5) * 0.2) % 1));
        const t = (rank + 0.5) / mine.length;
        const r0 = rin(angle) + c.radius;
        const r1 = Math.max(r0 + 1, rout(angle) - c.radius);
        const r = Math.sqrt(r0 * r0 + Math.pow(t, 0.85) * (r1 * r1 - r0 * r0));
        discs.push({ n, c, wedge, r: c.radius, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, home: t, shy: hash(n.i, 9) * 70 * unit });
      });
    }
    // Push overlapping clusters apart, keep each inside its arc and the screen.
    const gap = 5 * unit;
    let worst = 0;
    for (let pass = 0; pass < 520; pass += 1) {
      worst = 0;
      for (let p = 0; p < discs.length; p += 1) {
        const A = discs[p];
        for (let q = p + 1; q < discs.length; q += 1) {
          const B = discs[q];
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const reach = A.r + B.r + gap;
          if (Math.abs(dx) >= reach || Math.abs(dy) >= reach) continue;
          const d = Math.hypot(dx, dy) || 0.01;
          if (d >= reach) continue;
          const over = reach - d;
          worst = Math.max(worst, over - gap);
          const share = (B.r * B.r) / (A.r * A.r + B.r * B.r);
          const ux = dx / d;
          const uy = dy / d;
          A.x -= ux * over * share * 0.6;
          A.y -= uy * over * share * 0.6;
          B.x += ux * over * (1 - share) * 0.6;
          B.y += uy * over * (1 - share) * 0.6;
        }
      }
      const loosen = Math.max(0, 1 - pass / 320);
      for (const D of discs) {
        const dx = D.x - cx;
        const dy = D.y - cy;
        let angle = Math.atan2(dy, dx);
        let r = Math.hypot(dx, dy);
        // Lean back towards its kind's arc.
        const span = D.wedge.a1 - D.wedge.a0;
        let rel = (((angle - D.wedge.a0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (rel > span + (Math.PI * 2 - span) / 2) rel -= Math.PI * 2;
        const pad = Math.min(span * 0.45, Math.asin(Math.min(1, D.r / Math.max(r, D.r))) * 0.7);
        const kept = Math.min(span - pad, Math.max(pad, rel));
        if (kept !== rel) angle += (kept - rel) * 0.25;
        // Between the name and the edge of the screen, no nearer than its arc is wide enough to hold it.
        const fits = D.r / Math.sin(Math.min(Math.PI / 2, span * 0.5));
        const hi = rout(angle) - D.r - D.shy;
        const lo = Math.min(Math.max(rin(angle) + D.r + 6 * unit, fits * 0.9), Math.max(rin(angle) + D.r + 6 * unit, hi));
        const want = Math.sqrt(lo * lo + Math.pow(D.home, 0.85) * Math.max(0, hi * hi - lo * lo));
        r += (want - r) * 0.01 * loosen;
        if (r < lo) r += (lo - r) * 0.6;
        if (r > hi && hi > lo) r += (hi - r) * 0.6;
        D.x = cx + Math.cos(angle) * r;
        D.y = cy + Math.sin(angle) * r;
        D.x = Math.min(W - margin * 0.5 - D.r, Math.max(margin * 0.5 + D.r, D.x));
        D.y = Math.min(H - margin * 0.5 - D.r, Math.max(margin * 0.5 + D.r, D.y));
      }
    }
    return { discs, wedges, worst };
  };

  let scale = options.scale ?? 1;
  let fit = attempt(scale);
  const log = [[scale, fit.worst]];
  for (let tries = 0; fit.worst > (options.slack ?? 7) * unit && tries < 16; tries += 1) {
    scale *= 0.95;
    fit = attempt(scale);
    log.push([scale, fit.worst]);
  }
  if (options.verbose) console.log(log.map(([k, w]) => `${k.toFixed(2)}:${w.toFixed(1)}`).join("  "));
  const { discs, wedges } = fit;

  // ---- place each cluster's sleeves and songs
  const out = { W, H, cx, cy, scale, inner, artists: [], albums: [], songs: [], twigs: [], branches: [], threads: [], kinds: [] };
  const where = new Map();
  for (const D of discs) {
    D.mx = D.x;
    D.my = D.y;
    D.x -= D.c.ox;
    D.y -= D.c.oy;
    out.artists.push({ i: D.n.i, n: D.n.n, g: D.n.g, w: D.n.w, x: D.x, y: D.y, r: D.c.nodeR, reach: D.r, mx: D.mx, my: D.my });
    where.set(D.n.i, [D.x, D.y]);
    for (const seed of D.c.seeds) {
      const x = D.x + Math.cos(seed.a) * seed.r;
      const y = D.y + Math.sin(seed.a) * seed.r;
      const song = nodes[seed.k];
      const r = (2.4 + 3.2 * Math.sqrt(song.w / maxSong)) * unit;
      out.songs.push({ i: song.i, n: song.n, g: D.n.g, w: song.w, x, y, r, of: D.n.i });
      out.twigs.push({ x0: D.x, y0: D.y, x1: x, y1: y, g: D.n.g, t: "song" });
      where.set(song.i, [x, y]);
    }
    for (const cover of D.c.covers) {
      const album = nodes[cover.k];
      const left = D.x + cover.x - cover.w / 2;
      const top = D.y + cover.y - cover.h / 2;
      const x = left + cover.side / 2;
      const y = top + cover.side / 2;
      out.albums.push({ i: album.i, n: album.n, g: album.g, w: album.w, art: album.art, x, y, s: cover.side, of: D.n.i });
      out.twigs.push({ x0: D.x, y0: D.y, x1: x, y1: y, g: D.n.g, t: "album" });
      where.set(album.i, [x, y]);
      // Its songs in a row beneath the sleeve, most played first.
      const songs = album.kids.slice().sort((p, q) => nodes[q].w - nodes[p].w);
      songs.forEach((k, n) => {
        const song = nodes[k];
        const col = n % cover.across;
        const line = Math.floor(n / cover.across);
        const sx = left + ((col + 0.5) * cover.side) / cover.across;
        const sy = top + cover.side + (7 + line * 10) * unit;
        const r = (2.2 + 2.6 * Math.sqrt(song.w / maxSong)) * unit;
        out.songs.push({ i: song.i, n: song.n, g: album.g, w: song.w, x: sx, y: sy, r, of: album.i });
        where.set(song.i, [sx, sy]);
      });
    }
  }

  // ---- the dendrites: from the name, growing towards whichever artists are nearest
  for (const wedge of wedges) {
    const mine = discs.filter((D) => D.wedge === wedge);
    if (!mine.length) continue;
    // Start under the middle of the kind's artists, not the middle of its arc.
    let sx = 0;
    let sy = 0;
    for (const D of mine) {
      sx += (D.x - cx) * D.r;
      sy += (D.y - cy) * D.r;
    }
    const mid = Math.atan2(sy, sx);
    const root = { x: cx + Math.cos(mid) * rin(mid) * 0.9, y: cy + Math.sin(mid) * rin(mid) * 0.9, parent: -1, kids: [] };
    const tree = [root];
    const alive = new Set(mine);
    const step = 17 * unit;
    for (let pass = 0; pass < 900 && alive.size; pass += 1) {
      const pull = new Map();
      for (const D of [...alive]) {
        let near = 0;
        let best = Infinity;
        for (let n = 0; n < tree.length; n += 1) {
          const d = (tree[n].x - D.x) ** 2 + (tree[n].y - D.y) ** 2;
          if (d < best) {
            best = d;
            near = n;
          }
        }
        const d = Math.sqrt(best);
        if (d < step * 1.3) {
          tree.push({ x: D.x, y: D.y, parent: near, kids: [], artist: D.n.i });
          tree[near].kids.push(tree.length - 1);
          alive.delete(D);
          continue;
        }
        const p = pull.get(near) ?? { x: 0, y: 0, first: D };
        // Nearer artists pull harder, so a branch commits to one before the next.
        const k = 1 / Math.pow(d, 1.25);
        p.x += ((D.x - tree[near].x) / d) * k;
        p.y += ((D.y - tree[near].y) / d) * k;
        pull.set(near, p);
      }
      for (const [n, p] of pull) {
        let len = Math.hypot(p.x, p.y);
        if (len < 1e-9) {
          p.x = p.first.x - tree[n].x;
          p.y = p.first.y - tree[n].y;
          len = Math.hypot(p.x, p.y);
        }
        // Keep some of the way it was already going, so a branch bends rather than turns.
        let ux = p.x / len;
        let uy = p.y / len;
        const back = tree[n].parent;
        if (back >= 0) {
          const bx = tree[n].x - tree[back].x;
          const by = tree[n].y - tree[back].y;
          const bl = Math.hypot(bx, by) || 1;
          ux = ux * 0.62 + (bx / bl) * 0.38;
          uy = uy * 0.62 + (by / bl) * 0.38;
          const ul = Math.hypot(ux, uy) || 1;
          ux /= ul;
          uy /= ul;
        }
        const x = tree[n].x + ux * step;
        const y = tree[n].y + uy * step;
        if (tree[n].kids.some((k) => Math.hypot(tree[k].x - x, tree[k].y - y) < step * 0.35)) {
          // Stuck between two pulls: go to the first of them.
          const d = Math.hypot(p.first.x - tree[n].x, p.first.y - tree[n].y);
          const x2 = tree[n].x + ((p.first.x - tree[n].x) / d) * step;
          const y2 = tree[n].y + ((p.first.y - tree[n].y) / d) * step;
          if (tree[n].kids.some((k) => Math.hypot(tree[k].x - x2, tree[k].y - y2) < step * 0.2)) continue;
          tree.push({ x: x2, y: y2, parent: n, kids: [] });
        } else tree.push({ x, y, parent: n, kids: [] });
        tree[n].kids.push(tree.length - 1);
      }
    }
    // How many artists hang from each point decides how thick the branch is there.
    const load = (n) => (tree[n].load = (tree[n].artist !== undefined ? 1 : 0) + tree[n].kids.reduce((s, k) => s + load(k), 0));
    load(0);
    const thick = (n) => (1.5 + 1.75 * Math.pow(tree[n].load, 0.46)) * unit;
    // Cut into runs between forks, and round each run's corners.
    const runs = [];
    const walk = (from) => {
      for (const kid of tree[from].kids) {
        if (!tree[kid].load) continue;
        const run = [from];
        let at = kid;
        for (;;) {
          run.push(at);
          const next = tree[at].kids.filter((k) => tree[k].load);
          if (next.length !== 1) break;
          at = next[0];
        }
        runs.push(run);
        walk(at);
      }
    };
    walk(0);
    for (const run of runs) {
      let pts = run.map((n) => [tree[n].x, tree[n].y, thick(n)]);
      for (let round = 0; round < 3 && pts.length > 2; round += 1) {
        const next = [pts[0]];
        for (let k = 0; k < pts.length - 1; k += 1) {
          const [a, b] = [pts[k], pts[k + 1]];
          next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25, a[2] * 0.75 + b[2] * 0.25]);
          next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75, a[2] * 0.25 + b[2] * 0.75]);
        }
        next.push(pts.at(-1));
        pts = next;
      }
      out.branches.push({ g: wedge.id, pts, load: tree[run.at(-1)].load });
    }
    // The stem back into the name.
    out.branches.push({ g: wedge.id, stem: true, pts: [[cx + Math.cos(mid) * rin(mid) * 0.55, cy + Math.sin(mid) * rin(mid) * 0.55, thick(0) * 1.25], [root.x, root.y, thick(0)]], load: tree[0].load });
    const label = G.groups.find((g) => g.id === wedge.id).label;
    out.kinds.push({ id: wedge.id, label, angle: mid, x: root.x, y: root.y, a0: wedge.a0, a1: wedge.a1, artists: mine.length });
  }

  // ---- the threads across: guests, shared names, and artists played in the same years
  for (const l of links) {
    if (l.t === "belongs") continue;
    const A = where.get(l.a);
    const B = where.get(l.b);
    if (!A || !B) continue;
    out.threads.push({ t: l.t, s: l.s ?? 1, a: l.a, b: l.b, x0: A[0], y0: A[1], x1: B[0], y1: B[1] });
  }
  out.rin = rin;
  out.rout = rout;
  return out;
}
