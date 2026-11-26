/*
 * Draw the link-preview card, public/share-card-sleeves.jpg.
 *
 *   node scripts/build-share-card.mjs
 *
 * The card is the page in one picture: the Akibwa mark at the top left of a
 * wall of the records played most, in their own sleeves (Dan, 26 November
 * 2026, of the card that was a photograph of the page: "can we create a
 * super tasteful image here that represents what it is"; "put him top left
 * and then see how everything else fits"; "fill the white space so there is
 * albums everwyehere", "so it feels like the wall of albums").
 *
 * For an afternoon the sleeves were redrawn as block prints in the mark's
 * nine colours, and only the abstract ones were hung. That was turned down
 * the same day ("is it a bit too arty and esoteric now should we just return
 * to the actual album arts and lots of them", "so it's obvious what the site
 * is"); do not bring it back.
 *
 * - Which records: the most played, as many as the wall has places, with no
 *   picking among them.
 * - How large: the wall is a grid of small squares (UNIT) and a sleeve takes
 *   a square of them, as PLACES lays out. The larger places go to the most
 *   played, but never to a sleeve as pale at its edges as the paper it hangs
 *   on, which makes a hole in the wall ("the big white one there feels
 *   weird", "can we choose one with darker borders", of the most played
 *   record of all, a white sleeve, hung largest). Those hang small.
 * - Where: not in the order of listening. Sleeves of a size change places
 *   until each sits beside sleeves of its own colours, so the wall reads as
 *   a mosaic ("do it in a way that the colours of adjacanet thing compliment
 *   eachother so it feels like a mosaic of sorts", "rather than just by
 *   order of listening"). The mark counts as a neighbour too.
 * - The mark's own square takes ten across. Its halo and rays stand in the
 *   two rows above it, with paper beside them: sleeves hung there were taken
 *   down ("lets remove them ones I think above his head").
 *
 * The same records always give the same wall: the changing of places is
 * seeded. Link previews keep the copy they have, so when the card changes,
 * give it a new file name here and in app/layout.jsx.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { unpackRanking } from "../components/paper/music-ranking.mjs";
import { mergeShelf } from "../components/paper/music-shelf.mjs";

const root = new URL("../", import.meta.url).pathname;
const flag = (name) => process.argv.find((given) => given.startsWith(`--${name}=`))?.slice(name.length + 3);
const out = flag("out") ?? path.join(root, "public/share-card-sleeves.jpg");

const W = 1200;
const H = 630;
const K = 2;                    // drawn at twice the size and made small, for clean edges
const UNIT = 42;                // a small square of the wall
const GAP = 6;                  // the paper between two sleeves
const LEFT = 15;
const TOP = 24;
const ROUND = 4;                // a sleeve's corners, as on the shelf
const PAPER = "#f3ecdf";        // the page's paper (app/globals.css)
const INK = "#21190f";          // the mark's ink
const PALE = 200;               // an edge this light, of 255, is as pale as the paper

// The mark's square: column, row and units across. Its halo and rays stand in the rows above.
const MARK = { column: 0, row: 2, across: 10 };
// Where the sleeves hang: column, row, units across.
const band = (row, across, columns) => columns.map((column) => ({ column, row, across }));
const every = (from, to, step) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);
const PLACES = [
  // Beside the mark: two large, and four in the corner.
  ...band(0, 6, [10, 16]), ...band(0, 3, [22, 25]), ...band(3, 3, [22, 25]),
  // Under those: two, and two rows of small ones.
  ...band(6, 4, [10, 14]), ...[6, 8].flatMap((row) => band(row, 2, every(18, 26, 2))),
  // The foot of the wall, the last row under the mark too.
  ...band(10, 2, every(10, 26, 2)),
  ...band(12, 2, every(0, 26, 2))
];

const at = ({ column, row }) => ({ left: (LEFT + column * UNIT) * K, top: (TOP + row * UNIT) * K });
const side = (across) => (across * UNIT - GAP) * K;
const pictureOf = (record) => path.join(root, "public/album-art", `${record.art ?? record.id}-large.webp`);

// A colour as the eye tells colours apart (CIE Lab), from sRGB bytes.
function lab(r, g, b) {
  const linear = [r, g, b].map((value) => { const v = value / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const x = (0.4124 * linear[0] + 0.3576 * linear[1] + 0.1805 * linear[2]) / 0.95047;
  const y = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const z = (0.0193 * linear[0] + 0.1192 * linear[1] + 0.9505 * linear[2]) / 1.08883;
  const [fx, fy, fz] = [x, y, z].map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116));
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/*
 * How a picture looks to its neighbours: its colour as a whole and along
 * each of its sides, and how light it is round its edge (0 to 255).
 */
async function lookOf(picture, { left = 0, top = 0, width, height } = {}) {
  const across = 48;
  const strip = 8;
  let image = sharp(picture);
  if (width) image = image.extract({ left, top, width, height });
  const { data } = await image.resize(across, across, { fit: "fill" }).flatten({ background: PAPER }).raw().toBuffer({ resolveWithObject: true });
  const sums = { whole: [0, 0, 0, 0], top: [0, 0, 0, 0], bottom: [0, 0, 0, 0], left: [0, 0, 0, 0], right: [0, 0, 0, 0] };
  const add = (name, colour) => { const sum = sums[name]; sum[0] += colour[0]; sum[1] += colour[1]; sum[2] += colour[2]; sum[3] += 1; };
  let light = 0;
  let ring = 0;
  for (let y = 0; y < across; y += 1) {
    for (let x = 0; x < across; x += 1) {
      const from = (y * across + x) * 3;
      const colour = lab(data[from], data[from + 1], data[from + 2]);
      add("whole", colour);
      if (y < strip) add("top", colour);
      if (y >= across - strip) add("bottom", colour);
      if (x < strip) add("left", colour);
      if (x >= across - strip) add("right", colour);
      if (Math.min(x, y, across - 1 - x, across - 1 - y) < 4) {
        light += 0.2126 * data[from] + 0.7152 * data[from + 1] + 0.0722 * data[from + 2];
        ring += 1;
      }
    }
  }
  const mean = ([l, a, b, count]) => [l / count, a / count, b / count];
  return { whole: mean(sums.whole), top: mean(sums.top), bottom: mean(sums.bottom), left: mean(sums.left), right: mean(sums.right), edge: light / ring };
}

// A sleeve with the shelf's round corners and a hair of ink round it, so a
// pale sleeve keeps its edge on the paper.
async function sleeve(record, across) {
  const size = side(across);
  const corners = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${ROUND * K}"/></svg>`);
  const edge = Buffer.from(`<svg width="${size}" height="${size}"><rect x="${K / 2}" y="${K / 2}" width="${size - K}" height="${size - K}" rx="${ROUND * K - K / 2}" fill="none" stroke="${INK}" stroke-opacity="0.16" stroke-width="${K}"/></svg>`);
  const cut = await sharp(pictureOf(record)).resize(size, size, { fit: "cover" }).composite([{ input: corners, blend: "dest-in" }]).png().toBuffer();
  return sharp(cut).composite([{ input: edge }]).png().toBuffer();
}

// The mark drawn so many pixels across, and how far down it its square begins.
async function mark(width) {
  const drawn = await sharp(path.join(root, "public/akibwa-mark.svg"), { density: 300 }).resize({ width }).png().toBuffer();
  const { data, info } = await sharp(drawn).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let row = 0; row < info.height; row += 1) {
    let solid = 0;
    for (let column = 0; column < info.width; column += 1) if (data[(row * info.width + column) * 4 + 3] > 40) solid += 1;
    if (solid > info.width * 0.9) return { drawn, square: row, width: info.width, height: info.height };
  }
  throw new Error("The mark has no square to stand on.");
}

// How much of a side two squares of the wall share, in units, and which side.
function touching(a, b) {
  const shared = (from, length, other, otherLength) => Math.max(0, Math.min(from + length, other + otherLength) - Math.max(from, other));
  if (a.column + a.across === b.column) return { length: shared(a.row, a.across, b.row, b.across), sides: ["right", "left"] };
  if (b.column + b.across === a.column) return { length: shared(a.row, a.across, b.row, b.across), sides: ["left", "right"] };
  if (a.row + a.across === b.row) return { length: shared(a.column, a.across, b.column, b.across), sides: ["bottom", "top"] };
  if (b.row + b.across === a.row) return { length: shared(a.column, a.across, b.column, b.across), sides: ["top", "bottom"] };
  return { length: 0 };
}

// A seeded run of numbers from 0 to 1, so the same records give the same wall.
function seeded(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shelf = unpackRanking(JSON.parse(await readFile(path.join(root, "public/music-ranking.json"), "utf8")));
const ranked = mergeShelf(shelf.albums, shelf.songs, shelf.sleeves, shelf.singles);
const places = PLACES.slice().sort((a, b) => b.across - a.across || a.row - b.row || a.column - b.column);

// The most played records that have a picture large enough, one for each place.
const records = [];
for (const record of ranked) {
  if (records.length === places.length) break;
  if (await access(pictureOf(record)).then(() => true, () => false)) records.push(record);
}
const looks = new Map();
for (const record of records) looks.set(record, await lookOf(pictureOf(record)));

// A large place takes the most played record still to hang whose edge is not
// pale; a small one takes the most played still to hang, whatever its edge.
const waiting = records.slice();
const hung = places.map((place) => {
  const index = place.across > 2 ? Math.max(0, waiting.findIndex((record) => looks.get(record).edge < PALE)) : 0;
  return waiting.splice(index, 1)[0];
});

// The mark as a neighbour: its square's colours, as a sleeve's are read.
const standing = await mark(side(MARK.across));
const markLook = await lookOf(standing.drawn, { left: 0, top: standing.square, width: standing.width, height: standing.height - standing.square });

// Every two neighbours, and how much of a side they share.
const pairs = [];
for (let a = 0; a < places.length; a += 1) {
  for (let b = a + 1; b < places.length; b += 1) {
    const { length, sides } = touching(places[a], places[b]);
    if (length > 0) pairs.push({ a, b, length, sides });
  }
  const { length, sides } = touching(places[a], MARK);
  if (length > 0) pairs.push({ a, b: -1, length, sides });
}
const lookAt = (index) => (index < 0 ? markLook : looks.get(hung[index]));
// How ill two neighbours sit: mostly the colours where they meet, partly their colours as wholes.
const clash = ({ a, b, length, sides }) => length * (0.6 * apart(lookAt(a)[sides[0]], lookAt(b)[sides[1]]) + 0.4 * apart(lookAt(a).whole, lookAt(b).whole));
const clashAround = (index) => pairs.reduce((sum, pair) => (pair.a === index || pair.b === index ? sum + clash(pair) : sum), 0);
const clashOfAll = () => pairs.reduce((sum, pair) => sum + clash(pair), 0);

// Sleeves of a size change places, two at a time, keeping a change that lets
// the wall sit better and, early on, some that do not (simulated annealing).
const random = seeded(1126);
const turns = 60000;
const began = clashOfAll();
for (let turn = 0; turn < turns; turn += 1) {
  const a = Math.floor(random() * places.length);
  const b = Math.floor(random() * places.length);
  if (a === b || places[a].across !== places[b].across) continue;
  const before = clashAround(a) + clashAround(b);
  [hung[a], hung[b]] = [hung[b], hung[a]];
  const after = clashAround(a) + clashAround(b);
  const heat = 40 * (1 - turn / turns) ** 2;
  if (after > before && random() >= Math.exp((before - after) / Math.max(heat, 1e-6))) [hung[a], hung[b]] = [hung[b], hung[a]];
}

const layers = [];
for (const [index, place] of places.entries()) layers.push({ input: await sleeve(hung[index], place.across), ...at(place) });
const stand = at(MARK);
layers.push({ input: standing.drawn, left: stand.left, top: stand.top - standing.square });

const card = await sharp({ create: { width: W * K, height: H * K, channels: 3, background: PAPER } }).composite(layers).png().toBuffer();
const written = await sharp(card).resize(W, H).jpeg({ quality: 88, mozjpeg: true }).toFile(out);
console.log(`${path.basename(out)} written: ${places.length} sleeves, ${Math.round(written.size / 1024)} KB; neighbours sit ${Math.round((1 - clashOfAll() / began) * 100)}% closer in colour than in the order of listening`);
