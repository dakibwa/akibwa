/*
 * The net of Dan's music, as plain data: the middle (Akibwa), kinds of
 * music, artists, albums and songs, and every link between them.
 *
 * Links are of four sorts:
 *   belongs  a song to its album, an album to its artist, an artist to a kind
 *   guest    a song to an artist named in its title ("feat.", "with")
 *   same     two artist names that share a person or band ("Panda Bear" and
 *            "Panda Bear & Sonic Boom")
 *   together two artists played in the same years: their hours rise and fall
 *            together across 2016 to 2026
 */

export const GROUPS = [
  { id: "hiphop", label: "hip-hop & soul" },
  { id: "psych", label: "psychedelic" },
  { id: "classics", label: "classics" },
  { id: "ambient", label: "ambient" },
  { id: "singles", label: "singles" },
  { id: "electronic", label: "electronic" },
  { id: "indie", label: "indie" },
  { id: "folk", label: "folk & songwriters" }
];
// The two records that ran for days are drawn near the next album's size.
const NIGHTS = new Set(["043", "lf-dbbd05ddffe94ea5"]);

export function makeGraph({ ranking, yearly, kindOf, weights, artistKinds = {} }) {
  // Artists known through songs alone are sorted by hand into the same kinds.
  const sorted = new Map();
  for (const [kind, list] of Object.entries(artistKinds)) for (const name of list) sorted.set(name, kind);
  const names = ranking.names;
  // The same artist can be spelt two ways ("Tyler, The Creator" / "Tyler, the Creator").
  const firstOf = new Map();
  const same = names.map((name, index) => {
    const key = name.toLowerCase().replace(/\s+/g, " ").trim();
    if (!firstOf.has(key)) firstOf.set(key, index);
    return firstOf.get(key);
  });
  const years = yearly.years;
  const blank = () => years.map(() => 0);

  const nodes = [{ t: "me", n: "Akibwa", p: -1 }];
  const groupNode = new Map();
  for (const g of GROUPS) {
    groupNode.set(g.id, nodes.length);
    nodes.push({ t: "kind", n: g.label, p: 0, g: g.id });
  }
  const albums = ranking.albums.map((a, i) => ({ id: a[0], title: a[1], artist: same[a[2]], minutes: a[5], weight: weights[i], kind: kindOf[a[0]] }));
  const kindsOfArtist = new Map();
  for (const a of albums) {
    const m = kindsOfArtist.get(a.artist) ?? new Map();
    m.set(a.kind, (m.get(a.kind) ?? 0) + a.weight);
    kindsOfArtist.set(a.artist, m);
  }
  const artistNode = new Map();
  const artistOf = (raw) => {
    const index = same[raw];
    if (artistNode.has(index)) return artistNode.get(index);
    const kinds = kindsOfArtist.get(index);
    const home = kinds ? [...kinds].sort((p, q) => q[1] - p[1])[0][0] : sorted.get(names[index]) ?? "singles";
    artistNode.set(index, nodes.length);
    nodes.push({ t: "artist", n: names[index], p: groupNode.get(home), g: home, w: 0, y: blank(), also: kinds ? [...kinds.keys()].filter((k) => k !== home) : [] });
    return artistNode.get(index);
  };
  const addYears = (node, rows, skip) => {
    if (skip) return;
    for (const [year, minutes] of rows ?? []) {
      const at = years.indexOf(year);
      if (at >= 0) node.y[at] += minutes;
    }
  };
  const albumNode = new Map();
  for (const a of albums) {
    const parent = artistOf(a.artist);
    albumNode.set(a.id, nodes.length);
    nodes.push({ t: "album", n: a.title, p: parent, g: a.kind, w: a.weight, m: a.minutes, art: a.id });
    nodes[parent].w += a.weight;
    addYears(nodes[parent], yearly.albums[a.id], NIGHTS.has(a.id));
  }
  const links = [];
  const clean = (title) => title.replace(/ - (\d{4} )?(Digital )?Remaster(ed)?( \d{4})?$/i, "").replace(/ - \d{4} Digital Master$/i, "");
  ranking.songs.forEach((song, index) => {
    const [title, artist, plays, , album, minutes] = song;
    const onAlbum = albumNode.has(album);
    const parent = onAlbum ? albumNode.get(album) : artistOf(artist);
    const me = nodes.length;
    nodes.push({ t: "song", n: clean(title), p: parent, g: nodes[parent].g, w: plays, m: minutes, art: album || null });
    if (!onAlbum) {
      nodes[parent].w += minutes;
      addYears(nodes[parent], yearly.songs[index], false);
    }
    const guests = /\((?:feat\.?|with) ([^)]+)\)/i.exec(title);
    if (guests) {
      for (const who of guests[1].split(/,|&| and /).map((s) => s.trim().toLowerCase()).filter(Boolean)) {
        const found = names.findIndex((n) => n.toLowerCase() === who);
        if (found >= 0 && same[found] !== same[artist]) links.push({ a: me, b: artistOf(found), t: "guest" });
      }
    }
  });
  const artists = nodes.map((n, i) => ({ n, i })).filter((x) => x.n.t === "artist");
  // A second kind, for artists with albums of two kinds.
  for (const { n, i } of artists) {
    for (const k of n.also) links.push({ a: i, b: groupNode.get(k), t: "belongs" });
    delete n.also;
  }
  // Names that share a person or a band.
  const parts = (name) => name.toLowerCase().split(/\s*(?:&|,| and | with |\/)\s*/).map((s) => s.trim()).filter((s) => s.length > 3);
  for (let p = 0; p < artists.length; p += 1) {
    for (let q = p + 1; q < artists.length; q += 1) {
      const A = artists[p].n.n.toLowerCase();
      const B = artists[q].n.n.toLowerCase();
      if (parts(A).includes(B) || parts(B).includes(A) || (parts(A)[0] === parts(B)[0] && parts(A).length > 1 && parts(B).length > 1)) links.push({ a: artists[p].i, b: artists[q].i, t: "same" });
    }
  }
  // Played in the same years: each artist is wired to the few whose hours
  // follow theirs most closely, when both were played enough to tell.
  const size = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const heard = artists.filter((x) => x.n.y.reduce((s, v) => s + v, 0) >= 240);
  const seen = new Set();
  for (const P of heard) {
    const scored = [];
    for (const Q of heard) {
      if (P === Q) continue;
      const dot = P.n.y.reduce((s, v, k) => s + v * Q.n.y[k], 0);
      const sim = dot / (size(P.n.y) * size(Q.n.y) || 1);
      if (sim > 0.9) scored.push([sim, Q.i]);
    }
    scored.sort((p, q) => q[0] - p[0]);
    for (const [sim, other] of scored.slice(0, 3)) {
      const key = P.i < other ? `${P.i}:${other}` : `${other}:${P.i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ a: P.i, b: other, t: "together", s: Math.round(sim * 100) / 100 });
    }
  }
  // When each artist was played most, as a year (with a fraction), for laying out by time.
  for (const { n } of artists) {
    const total = n.y.reduce((s, v) => s + v, 0);
    n.when = total ? n.y.reduce((s, v, k) => s + v * years[k], 0) / total : null;
  }
  return { groups: GROUPS, nodes, links, years };
}
