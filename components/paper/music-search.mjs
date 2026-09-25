/*
 * The Music room's search (Dan, 25 September 2026): one box that understands
 * artists and the artists around them, genres and eras, as well as titles.
 *
 *   "paul simon"  Paul Simon, and Simon & Garfunkel, which he was in
 *   "panda bear"  Panda Bear, Animal Collective and Panda Bear & Sonic Boom
 *   "ambient"     artists MusicBrainz files under ambient
 *   "70s", "sixties", "1986", "1990-1995"  releases from then
 *   "90s rap"     both at once
 *   "graceland"   the album, or its songs' titles
 *
 * Genres, relationships and years come from public/music-meta.json
 * (scripts/build-music-meta.mjs); without it the search still matches words.
 */

export const fold = (text) =>
  String(text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// A joint credit belongs to each of its artists.
export const credits = (name) =>
  String(name)
    .split(/\s+(?:&|and|with|x|feat\.?|featuring)\s+|\s*,\s*|\s*\/\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

const DECADE_WORDS = { sixties: 1960, seventies: 1970, eighties: 1980, nineties: 1990, noughties: 2000, aughts: 2000, tens: 2010 };

// Words that mean the same genre as one MusicBrainz uses.
const GENRE_WORDS = {
  rap: ["hip hop", "rap"],
  hiphop: ["hip hop"],
  electronic: ["electronic", "electronica", "idm", "techno", "house", "downtempo", "synth"],
  dance: ["dance", "house", "disco", "techno"],
  psych: ["psychedelic"],
  psychedelic: ["psychedelic"],
  rnb: ["r and b", "rhythm and blues", "soul"],
  indie: ["indie"],
  folk: ["folk"],
  jazz: ["jazz"],
  soul: ["soul"],
  ambient: ["ambient", "drone"],
  classical: ["classical", "minimalism", "modern classical"],
  experimental: ["experimental", "avant garde", "noise"],
  punk: ["punk"],
  rock: ["rock"],
  pop: ["pop"],
  country: ["country", "americana"],
  metal: ["metal"],
  reggae: ["reggae", "dub"],
  blues: ["blues"]
};

// Eras out of the query, and whatever words are left.
export function parseQuery(query) {
  const eras = [];
  const words = [];
  const tokens = fold(query.replace(/[–—]/g, "-").replace(/(\d{4})\s*-\s*(\d{2,4})/g, "$1to$2")).split(" ").filter(Boolean);
  for (const token of tokens) {
    let match;
    if ((match = token.match(/^(\d{4})to(\d{2,4})$/))) {
      const from = Number(match[1]);
      const to = match[2].length === 2 ? Math.floor(from / 100) * 100 + Number(match[2]) : Number(match[2]);
      eras.push([Math.min(from, to), Math.max(from, to)]);
    } else if ((match = token.match(/^(19|20)(\d)0s$/))) {
      const from = Number(`${match[1]}${match[2]}0`);
      eras.push([from, from + 9]);
    } else if ((match = token.match(/^(\d)0s$/))) {
      const digit = Number(match[1]);
      const from = digit <= 2 ? 2000 + digit * 10 : 1900 + digit * 10;
      eras.push([from, from + 9]);
    } else if (DECADE_WORDS[token]) {
      eras.push([DECADE_WORDS[token], DECADE_WORDS[token] + 9]);
    } else if (/^(19|20)\d\d$/.test(token)) {
      eras.push([Number(token), Number(token)]);
    } else {
      words.push(token);
    }
  }
  return { eras, words, phrase: words.join(" ") };
}

// Each item's searchable parts: its words, its artist's circle, genres, year.
export function indexItems(items, { meta, yearOf, extraText = () => "" }) {
  const artists = meta?.artists ?? {};
  // Relations run both ways: a band lists its members, a member its bands.
  const circles = new Map();
  const link = (a, b) => {
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!circles.has(from)) circles.set(from, new Set());
      circles.get(from).add(to);
    }
  };
  for (const [name, facts] of Object.entries(artists)) {
    for (const other of facts.related ?? []) link(fold(name), fold(other));
    for (const part of credits(name)) if (fold(part) !== fold(name)) link(fold(name), fold(part));
  }
  return items.map((item) => {
    const own = fold(item.artist);
    const circle = new Set([own, ...credits(item.artist).map(fold), ...(circles.get(own) ?? [])]);
    const genres = new Set();
    for (const name of [item.artist, ...credits(item.artist)]) for (const genre of artists[name]?.genres ?? []) genres.add(fold(genre));
    // An artist MusicBrainz gives no genres takes their band's (Panda Bear, Animal Collective's).
    if (!genres.size) {
      for (const other of artists[item.artist]?.related ?? []) for (const genre of artists[other]?.genres ?? []) genres.add(fold(genre));
    }
    return {
      item,
      circle: [...circle],
      genres: [...genres],
      year: yearOf(item),
      text: fold(`${item.title} ${item.artist} ${extraText(item)}`)
    };
  });
}

// Every word starts a word of the text.
const startsWords = (text, words) => words.every((word) => ` ${text}`.includes(` ${word}`));

const inEra = (entry, eras) => !eras.length || (entry.year && eras.some(([from, to]) => entry.year >= from && entry.year <= to));

// A query that names an artist (or anyone in their circle) or a genre.
function namedBy(entry, { words, phrase }) {
  if (!words.length) return true;
  if (entry.circle.some((name) => ` ${name}`.includes(` ${phrase}`))) return true;
  // A genre, by its own name or a word that means it.
  const wanted = words.flatMap((word) => GENRE_WORDS[word] ?? []);
  if (wanted.length && words.every((word) => GENRE_WORDS[word]) && entry.genres.some((genre) => wanted.some((name) => genre.includes(name)))) return true;
  return entry.genres.some((genre) => genre === phrase || genre.startsWith(`${phrase} `) || genre.endsWith(` ${phrase}`));
}

// Otherwise every word somewhere in its title, tracks, artist, circle or genres.
const wordsIn = (entry, { words }) => words.every((word) => ` ${entry.text} ${entry.circle.join(" ")} ${entry.genres.join(" ")}`.includes(` ${word}`));

/*
 * Only what the query names, if it names anything: "paul simon" is Paul Simon
 * and Simon & Garfunkel, not every band with a Paul and a Simon in it. Words
 * that name nothing fall back to titles and the rest.
 */
export function search(index, query) {
  const parsed = parseQuery(query);
  if (!parsed.eras.length && !parsed.words.length) return null;
  const dated = index.filter((entry) => inEra(entry, parsed.eras));
  const named = dated.filter((entry) => namedBy(entry, parsed));
  return (named.length ? named : dated.filter((entry) => wordsIn(entry, parsed))).map((entry) => entry.item);
}
