/*
 * The web: every album is a neuron, and so is every artist known only through
 * songs. Neurons of a kind settle together, so the kinds form on their own.
 * Anything that several neurons share is a feature: a kind of music, an
 * artist, a tie between two artists. A feature is drawn as one thread through
 * its neurons, the way the game Features draws them.
 *
 * Nothing here draws; it returns positions and paths.
 */

const hash = (i, k = 0) => {
  let h = Math.imul(i + 1, 0x27d4eb2d) ^ Math.imul(k + 7, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

// Rectangles whose areas follow `sizes`, kept as square as the space allows.
function squarify(items, x, y, w, h) {
  const out = [];
  const total = items.reduce((s, it) => s + it.size, 0);
  let rest = items.map((it) => ({ ...it, area: (it.size / total) * w * h }));
  const worst = (row, side) => {
    const sum = row.reduce((s, r) => s + r.area, 0);
    const most = Math.max(...row.map((r) => r.area));
    const least = Math.min(...row.map((r) => r.area));
    return Math.max((side * side * most) / (sum * sum), (sum * sum) / (side * side * least));
  };
  while (rest.length) {
    const side = Math.min(w, h);
    let row = [rest[0]];
    let k = 1;
    while (k < rest.length && worst([...row, rest[k]], side) <= worst(row, side)) {
      row.push(rest[k]);
      k += 1;
    }
    const sum = row.reduce((s, r) => s + r.area, 0);
    if (w >= h) {
      const rw = sum / h;
      let at = y;
      for (const r of row) {
        out.push({ id: r.id, x, y: at, w: rw, h: r.area / rw });
        at += r.area / rw;
      }
      x += rw;
      w -= rw;
    } else {
      const rh = sum / w;
      let at = x;
      for (const r of row) {
        out.push({ id: r.id, x: at, y, w: r.area / rh, h: rh });
        at += r.area / rh;
      }
      y += rh;
      h -= rh;
    }
    rest = rest.slice(k);
  }
  return out;
}

// One line through a set of points, short and without crossing itself.
export function threadThrough(points, first = 0) {
  if (points.length < 3) return points.map((_, n) => n);
  const d = (a, b) => Math.hypot(points[a][0] - points[b][0], points[a][1] - points[b][1]);
  const left = new Set(points.map((_, n) => n));
  const order = [first];
  left.delete(first);
  while (left.size) {
    const from = order.at(-1);
    let best = -1;
    let bestD = Infinity;
    for (const n of left) {
      const dist = d(from, n);
      if (dist < bestD) {
        bestD = dist;
        best = n;
      }
    }
    order.push(best);
    left.delete(best);
  }
  // Uncross: reverse any stretch that shortens the line, keeping the first point first.
  for (let improved = true, guard = 0; improved && guard < 60; guard += 1) {
    improved = false;
    for (let a = 0; a < order.length - 2; a += 1) {
      for (let b = a + 2; b < order.length; b += 1) {
        const before = d(order[a], order[a + 1]) + (b + 1 < order.length ? d(order[b], order[b + 1]) : 0);
        const after = d(order[a], order[b]) + (b + 1 < order.length ? d(order[a + 1], order[b + 1]) : 0);
        if (after < before - 0.01) {
          const mid = order.slice(a + 1, b + 1).reverse();
          order.splice(a + 1, mid.length, ...mid);
          improved = true;
        }
      }
    }
  }
  return order;
}

export function layoutWeb(G, ties, options) {
  const { W, H, top = 0, margin = 36, fill = 0.5 } = options;
  const { nodes, links } = G;
  nodes.forEach((n, i) => {
    n.i = i;
    n.kids = [];
  });
  nodes.forEach((n) => n.p >= 0 && nodes[n.p].kids.push(n.i));
  const artistOf = (i) => {
    let at = i;
    while (at >= 0 && nodes[at].t !== "artist") at = nodes[at].p;
    return at;
  };
  const maxAlbum = Math.max(...nodes.filter((n) => n.t === "album").map((n) => n.w));

  // ---- the neurons
  const neurons = [];
  const ofArtist = new Map();
  const add = (artist, neuron) => {
    neuron.id = neurons.length;
    neurons.push(neuron);
    ofArtist.set(artist, [...(ofArtist.get(artist) ?? []), neuron.id]);
  };
  for (const n of nodes) {
    if (n.t === "album") add(n.p, { t: "album", i: n.i, artist: n.p, g: n.g, w: n.w, art: n.art, name: n.n, by: nodes[n.p].n, songs: n.kids.length });
  }
  for (const n of nodes) {
    if (n.t === "artist" && !ofArtist.has(n.i)) add(n.i, { t: "artist", i: n.i, artist: n.i, g: n.g, w: n.w, name: n.n, by: n.n, songs: n.kids.length });
  }
  const primary = (artist) => (ofArtist.get(artist) ?? []).slice().sort((p, q) => neurons[q].w - neurons[p].w)[0];
  const byName = new Map(nodes.filter((n) => n.t === "artist").map((n) => [n.n, n.i]));

  // ---- what joins them
  const joins = [];
  const seen = new Set();
  const join = (a, b, t, why, s = 1) => {
    if (a === undefined || b === undefined || a === b) return;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    joins.push({ a, b, t, why, s });
  };
  for (const ids of ofArtist.values()) {
    const sorted = ids.slice().sort((p, q) => neurons[q].w - neurons[p].w);
    for (let k = 1; k < sorted.length; k += 1) join(sorted[k - 1], sorted[k], "same", "the same artist");
  }
  const tiesOf = new Map();
  const tie = (a, b, why) => {
    tiesOf.set(a, [...(tiesOf.get(a) ?? []), { other: b, why }]);
    tiesOf.set(b, [...(tiesOf.get(b) ?? []), { other: a, why }]);
  };
  for (const [a, b, why] of ties) {
    if (!byName.has(a) || !byName.has(b)) continue;
    tie(byName.get(a), byName.get(b), why);
    join(primary(byName.get(a)), primary(byName.get(b)), "tie", why);
  }
  for (const l of links) {
    if (l.t === "guest") {
      const host = artistOf(l.a);
      if (!(tiesOf.get(host) ?? []).some((x) => x.other === l.b)) tie(host, l.b, `a guest on ${nodes[l.a].n.replace(/\s*\((?:feat\.?|with) [^)]+\)/i, "")}`);
      join(primary(host), primary(l.b), "tie", "a guest");
    } else if (l.t === "same") {
      if (!(tiesOf.get(l.a) ?? []).some((x) => x.other === l.b)) tie(l.a, l.b, "a shared name");
      join(primary(l.a), primary(l.b), "tie", "a shared name");
    } else if (l.t === "together") join(primary(l.a), primary(l.b), "together", "played in the same years", l.s);
  }

  // ---- where each kind lives, by the room its neurons need
  const board = { x: margin, y: top + margin, w: W - margin * 2, h: H - top - margin * 2 };
  const gap = 12;
  const raw = (n) => (n.t === "album" ? 30 + 100 * Math.pow(n.w / maxAlbum, 0.85) : 2 * (4.5 + 1.5 * Math.sqrt(n.songs)));
  const want = neurons.reduce((s, n) => s + raw(n) * raw(n), 0);
  let scale = options.scale ?? Math.sqrt((board.w * board.h * fill) / want);
  const kindsHere = [...new Set(neurons.map((n) => n.g))];

  const attempt = (k) => {
    for (const n of neurons) n.s = raw(n) * k;
    const sizes = kindsHere.map((id) => ({ id, size: neurons.filter((n) => n.g === id).reduce((s, n) => s + (n.s + gap) ** 2, 0) })).sort((p, q) => q.size - p.size);
    const regions = new Map(squarify(sizes, board.x, board.y, board.w, board.h).map((r) => [r.id, r]));
    for (const n of neurons) {
      const r = regions.get(n.g);
      n.x = r.x + n.s / 2 + hash(n.i, 1) * Math.max(1, r.w - n.s);
      n.y = r.y + n.s / 2 + hash(n.i, 2) * Math.max(1, r.h - n.s);
    }
    const pull = { same: 0.05, tie: 0.004, together: 0.0012 };
    let worst = 0;
    for (let pass = 0; pass < 1100; pass += 1) {
      // Pull along the joins while there is heat; the last passes only part what still overlaps.
      const settling = pass >= 820;
      const heat = Math.max(0.12, 1 - pass / 700);
      for (const j of settling ? [] : joins) {
        const A = neurons[j.a];
        const B = neurons[j.b];
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const d = Math.hypot(dx, dy) || 1;
        const rest = (A.s + B.s) / 2 + gap * 1.5;
        if (d <= rest) continue;
        const f = (d - rest) * pull[j.t] * heat;
        const share = (B.s * B.s) / (A.s * A.s + B.s * B.s);
        A.x += (dx / d) * f * share;
        A.y += (dy / d) * f * share;
        B.x -= (dx / d) * f * (1 - share);
        B.y -= (dy / d) * f * (1 - share);
      }
      worst = 0;
      for (let p = 0; p < neurons.length; p += 1) {
        const A = neurons[p];
        for (let q = p + 1; q < neurons.length; q += 1) {
          const B = neurons[q];
          const reach = (A.s + B.s) / 2 + gap;
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const px = reach - Math.abs(dx);
          const py = reach - Math.abs(dy);
          if (px <= 0 || py <= 0) continue;
          worst = Math.max(worst, Math.min(px, py) - gap);
          const share = (B.s * B.s) / (A.s * A.s + B.s * B.s);
          if (px < py) {
            const dir = dx >= 0 ? 1 : -1;
            A.x -= dir * px * share * 0.6;
            B.x += dir * px * (1 - share) * 0.6;
          } else {
            const dir = dy >= 0 ? 1 : -1;
            A.y -= dir * py * share * 0.6;
            B.y += dir * py * (1 - share) * 0.6;
          }
        }
      }
      for (const n of neurons) {
        const r = regions.get(n.g);
        // Lean back into its kind's ground, and never leave the board.
        const lx = Math.min(r.x + r.w - n.s / 2, Math.max(r.x + n.s / 2, n.x));
        const ly = Math.min(r.y + r.h - n.s / 2, Math.max(r.y + n.s / 2, n.y));
        const lean = settling ? 0.02 : 0.16;
        n.x += (lx - n.x) * lean;
        n.y += (ly - n.y) * lean;
        n.x = Math.min(board.x + board.w - n.s / 2, Math.max(board.x + n.s / 2, n.x));
        n.y = Math.min(board.y + board.h - n.s / 2, Math.max(board.y + n.s / 2, n.y));
      }
    }
    return { worst, regions };
  };
  let fit = attempt(scale);
  const log = [[scale, fit.worst]];
  for (let tries = 0; fit.worst > (options.slack ?? 3) && tries < 14; tries += 1) {
    scale *= 0.95;
    fit = attempt(scale);
    log.push([scale, fit.worst]);
  }
  if (options.verbose) console.log(log.map(([k, w]) => `${k.toFixed(2)}:${w.toFixed(1)}`).join("  "));

  // ---- the features
  const through = (ids, first) => {
    const pts = ids.map((id) => [neurons[id].x, neurons[id].y]);
    const start = first === undefined ? pts.reduce((best, p, n) => (p[0] + p[1] < pts[best][0] + pts[best][1] ? n : best), 0) : ids.indexOf(first);
    return threadThrough(pts, Math.max(0, start)).map((n) => ids[n]);
  };
  const kinds = kindsHere.map((id) => {
    const ids = neurons.filter((n) => n.g === id).map((n) => n.id);
    return { id, label: G.groups.find((g) => g.id === id).label, ids, path: through(ids), region: fit.regions.get(id) };
  });
  // An artist as a feature: its own neurons, then everything tied to it, with the reason for each tie.
  const featureOf = (name) => {
    const artist = byName.get(name);
    if (artist === undefined) return null;
    const own = (ofArtist.get(artist) ?? []).slice().sort((p, q) => neurons[q].w - neurons[p].w);
    const notes = new Map();
    const ids = [...own];
    for (const t of tiesOf.get(artist) ?? []) {
      for (const id of ofArtist.get(t.other) ?? []) {
        if (ids.includes(id)) continue;
        ids.push(id);
        notes.set(id, { who: nodes[t.other].n, why: t.why });
      }
    }
    return { name, artist, own, ids, notes, path: through(ids, own[0]) };
  };
  return { neurons, joins, kinds, featureOf, scale, board, ofArtist, tiesOf, byName };
}
