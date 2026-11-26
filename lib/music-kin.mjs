// Which artists on the shelf stand together, so a record under the pointer
// lights the records that go with it (Dan, 26 November 2026: "you should be
// holistic in how you find all the suitable links"), worked out from what
// MusicBrainz says of each artist (data/music-links.json, gathered by
// scripts/build-music-meta.mjs).
//
// Two credited names are kin when:
// - they are, or include, the same artist: "Nick Cave & Warren Ellis" and
//   "Nick Cave & The Bad Seeds" both name Nick Cave, and Four Tet is Kieran
//   Hebden under another name;
// - one is in the other: a member and their band, a band and the band it is
//   part of, an artist and a collaboration that has a name of its own;
// - they are bands that share a member: Joy Division and New Order,
//   Spacemen 3 and Spiritualized;
// - they are members of one band: Panda Bear and Avey Tare, of Animal
//   Collective; Tyler, The Creator and Frank Ocean, of Odd Future.
//
// The last two are held to what a listener would call a link:
// - Someone passing through does not join two bands. Terry Chimes drummed for
//   Black Sabbath for a year, which does not put them beside The Clash: a
//   stay MusicBrainz dates at under VISIT years, by someone not there from
//   the start, is left out of that rule.
// - A band with a record here puts all its members together. One without
//   must be a band: BAND members at most, and not an orchestra or a choir.
//   In one of CLOSE members or fewer every person counts. In a larger one
//   only those MusicBrainz dates or calls original do, since a charity
//   single's band is a list of names with no dates (The Conspirators, twelve
//   of them, would put Lou Reed beside Peter Gabriel). A band named as a
//   member counts where it is dated or original too, or where the band is a
//   joining of two or three acts ("black midi, New Road"); Beachy Head names
//   the bands its players came from, which is not Slowdive beside The
//   Flaming Lips.
// - A membership that began and ended in one year is no membership at all.
// Nothing reaches further than that: a bandmate's other band is not kin.

const BAND = 24;
const CLOSE = 10;
const JOINING = 3;
const VISIT = 3;
const NOT_BANDS = new Set(["Orchestra", "Choir"]);
// Said by hand: a mash-up's name is not a band its artists were in.
const NO_SUCH_BAND = new Set(["Madvillainz"]);
// And said by hand where MusicBrainz has no such link to give. Gorillaz are
// drawn characters: it lists them, and not the man who writes and sings their
// records. Nico sang on The Velvet Underground's first record without being
// in the band.
const BY_HAND = [["Damon Albarn", "Gorillaz"], ["Nico", "The Velvet Underground"]];

export function kinOf(names, { credits, artists }, { reasons = false } = {}) {
  // An artist's other names are that artist.
  const one = new Map();
  const of = (id) => {
    let at = id;
    while (one.has(at) && one.get(at) !== at) at = one.get(at);
    return at;
  };
  for (const [id, facts] of Object.entries(artists)) for (const other of Object.keys(facts.same ?? {})) one.set(of(other), of(id));

  // Who is in what, said from either side, and how each stands there.
  const inside = new Map();   // a band → those in it
  const belongs = new Map();  // an artist → the bands they are in
  const named = new Map();
  const kind = new Map();
  const ties = new Map();     // a band and one in it → { dated, original, short }
  const put = (table, key, value) => {
    if (!table.has(key)) table.set(key, new Set());
    table.get(key).add(value);
  };
  const tieOf = (band, member) => ties.get(`${band} ${member}`) ?? {};
  const tie = (band, member, link) => {
    const [from, to] = link.span ?? [];
    const was = tieOf(band, member);
    ties.set(`${band} ${member}`, {
      dated: was.dated || Boolean(from),
      original: was.original || Boolean(link.as?.includes("original")),
      short: was.short || Boolean(from && to && to - from < VISIT)
    });
    put(inside, band, member);
    put(belongs, member, band);
  };
  const oneYear = (link) => link.span && link.span[0] && link.span[0] === link.span[1];
  for (const [id, facts] of Object.entries(artists)) {
    named.set(of(id), named.get(of(id)) ?? facts.name);
    kind.set(of(id), facts.type);
    for (const [group, link] of Object.entries(facts.groups ?? {})) {
      named.set(of(group), named.get(of(group)) ?? link.name);
      if (!kind.has(of(group))) kind.set(of(group), link.type);
      if (oneYear(link) || NOT_BANDS.has(link.type)) continue;
      tie(of(group), of(id), link);
    }
    for (const [member, link] of Object.entries(facts.members ?? {})) {
      named.set(of(member), named.get(of(member)) ?? link.name);
      if (!kind.has(of(member))) kind.set(of(member), link.type);
      if (oneYear(link) || NOT_BANDS.has(facts.type)) continue;
      tie(of(id), of(member), link);
    }
  }
  const settled = (band, member) => tieOf(band, member).dated || tieOf(band, member).original;
  const visited = (band, member) => tieOf(band, member).short && !tieOf(band, member).original;

  // The names on the shelf each artist is credited under.
  const here = new Map();
  const who = new Map();
  for (const name of names) {
    const ids = [...new Set((credits[name] ?? []).map(of))];
    who.set(name, ids);
    for (const id of ids) put(here, id, name);
  }

  const kin = new Map(names.map((name) => [name, new Map()]));
  const join = (a, b, why) => {
    if (a === b) return;
    if (!kin.get(a).has(b)) kin.get(a).set(b, why);
    if (!kin.get(b).has(a)) kin.get(b).set(a, why);
  };
  const together = (ids, why) => {
    const all = [...new Set(ids.flatMap((id) => [...(here.get(id) ?? [])]))];
    for (const a of all) for (const b of all) if (a < b) join(a, b, why);
  };
  for (const [id, credited] of here) {
    // The same artist under two credits.
    together([id], `both ${named.get(id) ?? "the same artist"}`);
    // One in the other.
    for (const group of belongs.get(id) ?? []) if (here.has(group)) for (const a of credited) for (const b of here.get(group)) join(a, b, `${named.get(id)} is in ${named.get(group)}`);
  }
  // Bands that share a member who stayed.
  for (const [member, groups] of belongs) {
    const bands = [...groups].filter((group) => here.has(group) && !visited(group, member));
    if (bands.length > 1) together(bands, `${named.get(member)} is in both`);
  }
  // Members of one band.
  for (const [group, members] of inside) {
    let known = [...members].filter((member) => here.has(member));
    if (!here.has(group)) {
      if (kind.get(group) !== "Group" || NO_SUCH_BAND.has(named.get(group)) || members.size > BAND) continue;
      known = known.filter((member) => settled(group, member) || members.size <= (kind.get(member) === "Group" ? JOINING : CLOSE));
    }
    if (known.length > 1) together(known, `both in ${named.get(group)}`);
  }

  for (const [a, b] of BY_HAND) if (kin.has(a) && kin.has(b)) join(a, b, "said by hand");

  // For the search: the names an artist goes with, those on the shelf first.
  const related = {};
  for (const name of names) {
    const ids = who.get(name);
    const joint = ids.length > 1 ? ids.map((id) => named.get(id)).filter(Boolean) : [];
    const near = ids.flatMap((id) => [...(belongs.get(id) ?? []), ...(inside.get(id) ?? [])]);
    const aliases = ids.flatMap((id) => Object.entries(artists).filter(([other]) => of(other) === id).flatMap(([, facts]) => [facts.name, ...Object.values(facts.same ?? {}).map((link) => link.name)]));
    const all = [...new Set([...joint, ...aliases, ...near.sort((a, b) => Number(here.has(b)) - Number(here.has(a))).map((id) => named.get(id))])].filter((other) => other && other !== name);
    related[name] = all.slice(0, 16);
  }

  const sorted = (map) => [...map.keys()].sort((a, b) => a.localeCompare(b));
  return {
    related,
    kin: Object.fromEntries(names.map((name) => [name, sorted(kin.get(name))])),
    ...(reasons ? { why: Object.fromEntries(names.map((name) => [name, Object.fromEntries(kin.get(name))])) } : {})
  };
}
