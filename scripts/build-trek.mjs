#!/usr/bin/env node
// Build /trek — the 2019 walk, Paris to Sofia, travelled through the map.
//
// The page is one full-screen atlas. Scroll walks the line: the camera
// follows a walker along the GPS day points, towns arrive and pass, each
// country opens with its Imagine ground, and records and journal beats surface
// at their walked days. Rest points remain on the line but pass silently.
//
//   data/trek-days.json          ← regenerated: days + distances + sleeves + geometry
//   public/trek/index.html       ← rendered from scripts/trek-page-template.html
//
// Optional: --distances <json> with { "<dayN>": { km, movingMin, elevM, date } }
// bakes per-day distances into data/trek-days.json once; afterwards the data
// travels with the repo.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "data/trek-days.json");
const coversPath = path.join(root, "data/trek-covers.json");
const templatePath = path.join(root, "scripts/trek-page-template.html");
const outPath = path.join(root, "public/trek/index.html");

const argIdx = process.argv.indexOf("--distances");
const distancesPath = argIdx > -1 ? process.argv[argIdx + 1] : null;

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const covers = JSON.parse(fs.readFileSync(coversPath, "utf8"));

// ---------------------------------------------------------------- distances
if (distancesPath) {
  const dist = JSON.parse(fs.readFileSync(distancesPath, "utf8"));
  for (const day of data.days) {
    const d = dist[String(day.n)];
    if (d) {
      day.km = d.km ?? null;
      day.movingMin = d.movingMin ?? null;
      day.elevM = d.elevM ?? null;
      if (!day.date && d.date) day.date = d.date;
      if (!day.title && d.name) {
        day.title = d.name.replace(/^Day\s+\d+\s*[-–—]\s*/, "").trim() || null;
      }
    }
  }
}

// ------------------------------------------------------------------ sleeves
for (const day of data.days) {
  delete day.cover;
  delete day.coverArtist;
  delete day.coverAlbum;
  delete day.coverKind;
  const m = day.title && covers.titles[day.title];
  if (m) {
    day.sleeve = {
      slug: m.slug,
      kind: m.kind,
      song: m.song,
      album: m.album,
      artist: m.artist,
      note: m.note || null,
    };
  } else {
    delete day.sleeve;
  }
}

// -------------------------------------------------------------- story beats
// Public-safe excerpts from the 2019 journal (A Generous Slice). The day-card
// notes keep the travel, weather, landscape and practical experience while
// deliberately leaving relationships, health, money and identifying third-
// party details in the private source journal.
const JOURNAL = {
  1: "My navigation immediately took me through beautiful farmland and forest — the first hint of what beauty was yet to be seen.",
  2: "A quiet, peaceful path ran beside a clear green river. I had imagined motorways; instead I kept finding fields.",
  3: "I followed the green river for 20 km, then stopped in a church in Château-Thierry before returning to the wooded paths.",
  7: "The canal left Châlons-en-Champagne between vineyards and orchards, under a boiling late-September sun.",
  8: "A monumental thunderstorm broke over the route into Bar-le-Duc: pouring rain, lightning and a pause beneath the trees.",
  9: "In the woods the wind went still and the sun came through. For a moment, everything in the air was calm.",
  11: "The path to Nancy ran through a national park in hard rain, with the trees rising high overhead.",
  14: "Cliff faces stood on both sides of the path, blue flies fluttering between them as Witchi Tai To played.",
  15: "Back on the canal out of Saverne, heading towards the Rhine and the German border.",
  25: "The best running rhythm of the journey so far, with the Austrian mountains finally visible ahead.",
  27: "The Austrian border began with a sharp climb and a small waterfall — mountains all around, country three underfoot.",
  28: "A cold, crisp morning turned into glaring sun. The route was beginning to rise towards the Ankogel mountains.",
  29: "A whole new terrain of steep mountain paths, each climb opening another view across Austria.",
  30: "At 2,500 metres it was almost silent: only my breath and footsteps, then a race down the empty ski slopes before dark.",
  31: "The sun kept beaming down despite it being almost November; another 50 km had begun to feel methodical.",
  32: "Lacing my shoes, heading for the trails and covering the next stretch had become ordinary everyday life.",
  35: "I stopped tracking every kilometre so closely and tried to pay more attention to the day-to-day details as they appeared.",
  36: "More than 50 km through drizzle, rain, wind chill, flooded paths and fog, ending with a wooded climb in darkness.",
  37: "Another 50 km in rain and low temperatures, followed by a warm arrival in Ptuj.",
  38: "Croatia arrived after nearly fifteen consecutive days on the road: first the main road, then the welcome quiet of a canal path.",
  40: "Grey roads and monotonous trails headed east across Croatia, with Osijek the next clear point on the horizon.",
  41: "A warm, sunny day across the sparse northern Croatian plain — a startling contrast with the Austrian mountains.",
  42: "Trains bridged the unsafe main-road sections; after the last stop, 40 km of flat farms stretched to Osijek.",
  47: "New shoes, a half-marathon run and, beside the Croatian road, the unexpected sight of a warning sign for mines.",
  48: "The last muddy fields of Croatia led to passport control, then river paths and fishing huts on the Serbian side.",
  49: "Seventy kilometres to Novi Sad, finishing after dark through technical paths, brambles and whatever route the app could find.",
  53: "Walking into Belgrade in perfect weather, I decided to take my time before the final push towards Sofia.",
  57: "A farm track, small tractors chugging past and one farmer tipping his hat in acknowledgement.",
  58: "A pipeline construction made an unexpectedly direct path; the guesthouse welcome was tea, wafers and home-brewed raki.",
  59: "A short day with a stray dog for company — named Dogmeat in the journal — following part of the route.",
  65: "Country seven. Crossing into Bulgaria made the end feel suddenly close: Sofia was one more day away.",
  66: "Sofia, at last. The arrival closed this part of the road and opened a few quiet days to take it all in.",
};

const BEATS = {
  30: {
    label: "the high point",
    quote:
      "Today's seen me climb over the Austrian Alps to a peak height of 2500m. The climb involved a variety of terrains spanning from walking up streams, technical scrambles and narrow ridge trails.",
  },
  32: {
    label: "the routine",
    quote:
      "It's occurred to me that this is now my everyday life. Today, like yesterday, I've gone through the motions of my morning routine, lacing up my shoes, heading for the trails.",
  },
  36: {
    label: "rain over Slovenia",
    quote:
      "After navigating the many hills, the busy roadsides and the waterlogged footpaths, I arrived at what I thought was a short walk — only to find another steep wooded climb in the darkness.",
  },
  42: {
    label: "the safer line",
    quote:
      "I caught a few trains to avoid travelling on main roads. Jumping off the train saw 40 km ahead of me, which proved to be a linear eight-hour walk through the flat Croatian farms.",
  },
  49: {
    label: "the furthest day",
    quote:
      "Today I have set a new personal record, not for speed but instead for the furthest I've ever travelled on foot. My ankles feel shot but surprisingly the rest of my body feels full of vigor.",
  },
  65: {
    label: "country seven",
    quote:
      "Having crossed the border, something seems to have clicked and it has occurred to me how close I am to achieving what I set out to do. Tomorrow I will be arriving in Sofia.",
  },
};
// -------------------------------------------------------------------- towns
// Staging posts. These are the anchors: the line visits each city, and the
// GPS fills the journey between them. Coordinates are Web Mercator (same
// CRS as the Strava tracks). Paris is the walk start at Charles de Gaulle,
// not the city centre.
// Every non-pass entry is a visited stop and therefore a hard route anchor:
// the rendered line must meet its city marker exactly. The raw GPS supplies
// the shape between those anchors. Paris stays at the CDG start, not Notre-Dame.
const TOWNS = [
  { name: "Paris", lon: 2.55, lat: 49.01, dx: -10, dy: -12, anchor: "end", start: true },
  { name: "Reims", lon: 4.03, lat: 49.26, dx: 0, dy: -14 },
  { name: "Nancy", lon: 6.18, lat: 48.69, dx: 0, dy: 22 },
  { name: "Saverne", lon: 7.36, lat: 48.74, dx: 0, dy: -14, day: 14 },
  { name: "Pforzheim", lon: 8.7, lat: 48.89, dx: 0, dy: -14 },
  { name: "Stuttgart", lon: 9.18, lat: 48.78, dx: 0, dy: 22 },
  { name: "Augsburg", lon: 10.9, lat: 48.37, dx: 0, dy: -14 },
  { name: "Munich", lon: 11.58, lat: 48.14, dx: 12, dy: -10, anchor: "start" },
  { name: "Zell am See", lon: 12.8, lat: 47.32, dx: 12, dy: -8, anchor: "start" },
  { name: "the Tauern", lon: 13.15, lat: 47.15, dx: 14, dy: 4, anchor: "start", pass: true },
  { name: "Klagenfurt", lon: 14.31, lat: 46.62, dx: 0, dy: 22 },
  { name: "Ptuj", lon: 15.87, lat: 46.42, dx: 0, dy: -14 },
  { name: "Osijek", lon: 18.69, lat: 45.55, dx: 0, dy: -14 },
  { name: "Novi Sad", lon: 19.85, lat: 45.25, dx: 0, dy: -14 },
  { name: "Belgrade", lon: 20.46, lat: 44.82, dx: 14, dy: 6, anchor: "start" },
  { name: "Niš", lon: 21.9, lat: 43.32, dx: 14, dy: 0, anchor: "start" },
  { name: "Sofia", lon: 23.32, lat: 42.7, dx: 0, dy: 24 },
];

const mercDeg = (lat) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
const start = data.tracks[0][0];
const sofia = data.days.find((d) => d.n === 67);
const A0 = { lon: 2.548, lat: 49.01, x: start[0], y: start[1] };
const A1 = { lon: 23.32, lat: 42.697, x: sofia.x, y: sofia.y };
const ax = (A1.x - A0.x) / (A1.lon - A0.lon);
const bx = A0.x - ax * A0.lon;
const ay = (A1.y - A0.y) / (mercDeg(A1.lat) - mercDeg(A0.lat));
const by = A0.y - ay * mercDeg(A0.lat);
const proj = ({ lon, lat }) => [ax * lon + bx, ay * mercDeg(lat) + by];
const invMercDeg = (m) => (Math.atan(Math.sinh((m * Math.PI) / 180)) * 180) / Math.PI;
const unproj = (x, y) => ({ lon: (x - bx) / ax, lat: invMercDeg((y - by) / ay) });

const EARTH = 6378137;
const mercProj = ({ lon, lat }) => [
  EARTH * ((lon * Math.PI) / 180),
  -(EARTH * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))),
];

function flattenTracks(tracks) {
  const verts = [];
  let s = 0;
  let prev = null;
  for (const t of tracks) {
    for (const [x, y] of t) {
      if (prev) s += Math.hypot(x - prev[0], y - prev[1]);
      verts.push({ x, y, s });
      prev = [x, y];
    }
  }
  return verts;
}

function nearestOnVerts(px, py, verts) {
  let best = { x: verts[0].x, y: verts[0].y, s: verts[0].s, d: Infinity, i: 1 };
  for (let i = 1; i < verts.length; i++) {
    const a = verts[i - 1];
    const b = verts[i];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len = Math.hypot(vx, vy) || 1;
    const u = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / (len * len)));
    const qx = a.x + u * vx;
    const qy = a.y + u * vy;
    const d = Math.hypot(px - qx, py - qy);
    if (d < best.d) best = { x: qx, y: qy, s: a.s + u * len, d, i };
  }
  return best;
}

const UA = "akibwa.com trek page builder";
const terrainCachePath = path.join(root, "data/trek-terrain.json");
const waterCachePath = path.join(root, "data/trek-water.json");
const WATER_SOURCES = {
  lakes: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson",
  rivers:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson",
};
const WATER_NAMES = {
  lakes: new Set(["Lake Geneva", "Bodensee", "Lake Balaton"]),
  rivers: new Set(["Marne", "Rhine", "Danube", "Sava"]),
};

async function fetchElevBatch(lats, lons) {
  const url =
    "https://api.open-meteo.com/v1/elevation?latitude=" +
    lats.map((n) => n.toFixed(4)).join(",") +
    "&longitude=" +
    lons.map((n) => n.toFixed(4)).join(",");
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error("elevation " + res.status);
  const json = await res.json();
  return json.elevation || [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchElevations(points) {
  const out = new Array(points.length);
  const CHUNK = 60;
  for (let i = 0; i < points.length; i += CHUNK) {
    const slice = points.slice(i, i + CHUNK);
    let elev = null;
    for (let attempt = 0; attempt < 6 && !elev; attempt++) {
      try {
        elev = await fetchElevBatch(
          slice.map((p) => p.lat),
          slice.map((p) => p.lon)
        );
      } catch (err) {
        const wait = err.message.includes("429") ? 3500 * (attempt + 1) : 500 * (attempt + 1);
        if (attempt === 5) throw err;
        await sleep(wait);
      }
    }
    for (let j = 0; j < slice.length; j++) out[i + j] = elev[j] ?? 0;
    if (i + CHUNK < points.length) await sleep(900);
  }
  return out;
}

function sampleGrid(grid, lon, lat) {
  const { west, east, south, north, cols, rows, elev } = grid;
  const u = ((lon - west) / (east - west)) * (cols - 1);
  const v = ((north - lat) / (north - south)) * (rows - 1);
  const c0 = Math.max(0, Math.min(cols - 2, Math.floor(u)));
  const r0 = Math.max(0, Math.min(rows - 2, Math.floor(v)));
  const fu = u - c0;
  const fv = v - r0;
  const e = (r, c) => elev[r * cols + c] || 0;
  return (
    e(r0, c0) * (1 - fu) * (1 - fv) +
    e(r0, c0 + 1) * fu * (1 - fv) +
    e(r0 + 1, c0) * (1 - fu) * fv +
    e(r0 + 1, c0 + 1) * fu * fv
  );
}

async function loadTerrain(bbox) {
  const cols = 56;
  const rows = 34;
  const meta = { ...bbox, cols, rows };
  let cached = null;
  if (fs.existsSync(terrainCachePath)) {
    try {
      cached = JSON.parse(fs.readFileSync(terrainCachePath, "utf8"));
    } catch {}
  }
  const same =
    cached &&
    Math.abs(cached.west - bbox.west) < 0.01 &&
    Math.abs(cached.east - bbox.east) < 0.01 &&
    Math.abs(cached.south - bbox.south) < 0.01 &&
    Math.abs(cached.north - bbox.north) < 0.01 &&
    cached.cols === cols &&
    cached.rows === rows &&
    Array.isArray(cached.elev) &&
    cached.elev.length === cols * rows;
  if (same) return cached;

  const points = [];
  for (let r = 0; r < rows; r++) {
    const lat = bbox.north - (r * (bbox.north - bbox.south)) / (rows - 1);
    for (let c = 0; c < cols; c++) {
      const lon = bbox.west + (c * (bbox.east - bbox.west)) / (cols - 1);
      points.push({ lat, lon });
    }
  }
  console.log(`sampling ${points.length} elevations (Open-Meteo)…`);
  const elev = await fetchElevations(points);
  const grid = { ...meta, elev, source: "open-meteo", sampledAt: new Date().toISOString() };
  fs.writeFileSync(terrainCachePath, JSON.stringify(grid) + "\n");
  return grid;
}

function pointSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (!dx && !dy) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy))
  );
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function simplifyLine(points, tolerance = 0.018) {
  if (points.length < 3) return points;
  let furthest = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = pointSegmentDistance(points[i], points[0], points[points.length - 1]);
    if (distance > furthest) {
      furthest = distance;
      index = i;
    }
  }
  if (furthest <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplifyLine(points.slice(0, index + 1), tolerance);
  const right = simplifyLine(points.slice(index), tolerance);
  return left.slice(0, -1).concat(right);
}

function geometryLines(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

function geometryRings(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

function trimToBbox(points, bbox) {
  const pad = 0.8;
  const inside = ([lon, lat]) =>
    lon >= bbox.west - pad && lon <= bbox.east + pad && lat >= bbox.south - pad && lat <= bbox.north + pad;
  const indexes = points.map((point, i) => (inside(point) ? i : -1)).filter((i) => i >= 0);
  if (!indexes.length) return [];
  const first = Math.max(0, indexes[0] - 1);
  const last = Math.min(points.length, indexes[indexes.length - 1] + 2);
  return points.slice(first, last);
}

async function fetchGeoJson(url) {
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`water ${response.status}`);
  return response.json();
}

async function loadWater(bbox) {
  if (fs.existsSync(waterCachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(waterCachePath, "utf8"));
      if (Array.isArray(cached.lakes) && Array.isArray(cached.rivers)) return cached;
    } catch {}
  }
  const [lakeData, riverData] = await Promise.all([
    fetchGeoJson(WATER_SOURCES.lakes),
    fetchGeoJson(WATER_SOURCES.rivers),
  ]);
  const lakes = lakeData.features
    .filter((feature) => WATER_NAMES.lakes.has(feature.properties?.name))
    .map((feature) => ({
      name: feature.properties.name,
      rings: geometryRings(feature.geometry).map((ring) => simplifyLine(ring, 0.012)),
    }));
  const rivers = riverData.features
    .filter((feature) => WATER_NAMES.rivers.has(feature.properties?.name))
    .map((feature) => ({
      name: feature.properties.name,
      lines: geometryLines(feature.geometry)
        .map((line) => trimToBbox(line, bbox))
        .filter((line) => line.length > 1)
        .map((line) => simplifyLine(line, 0.025)),
    }))
    .filter((feature) => feature.lines.length);
  const water = {
    source: "Natural Earth 1:10m physical vectors",
    sourceUrls: WATER_SOURCES,
    fetchedAt: new Date().toISOString(),
    lakes,
    rivers,
  };
  fs.writeFileSync(waterCachePath, JSON.stringify(water, null, 1) + "\n");
  return water;
}

try {
  await buildAtlas();
} catch (err) {
  console.error(err);
  process.exit(1);
}

async function buildAtlas() {
// ------------------------------------------------------------- SVG geometry
const pts = data.days;
const xs = pts.map((d) => d.x);
const ys = pts.map((d) => d.y);
const pad = 260000;
const minX = Math.min(...xs) - pad;
const maxX = Math.max(...xs) + pad;
const minY = Math.min(...ys) - pad;
const maxY = Math.max(...ys) + pad;
// One drawing unit = 1000 projection units, so coordinates stay readable.
const U = 1000;
const sx = (x) => +((x - minX) / U).toFixed(1);
const sy = (y) => +((y - minY) / U).toFixed(1);
const VBW = Math.round((maxX - minX) / U);
const VBH = Math.round((maxY - minY) / U);

const corners = [
  unproj(minX, minY),
  unproj(maxX, minY),
  unproj(minX, maxY),
  unproj(maxX, maxY),
];
const bbox = {
  west: Math.min(...corners.map((c) => c.lon)) - 0.4,
  east: Math.max(...corners.map((c) => c.lon)) + 0.4,
  south: Math.min(...corners.map((c) => c.lat)) - 0.3,
  north: Math.max(...corners.map((c) => c.lat)) + 0.3,
};

let grid = null;
try {
  grid = await loadTerrain(bbox);
} catch (err) {
  console.warn("elevation skipped:", err.message);
}

let water = { lakes: [], rivers: [] };
try {
  water = await loadWater(bbox);
} catch (err) {
  console.warn("water skipped:", err.message);
}

const altAt = (x, y) => {
  if (!grid) return 0;
  const { lon, lat } = unproj(x, y);
  return sampleGrid(grid, lon, lat);
};
// The atlas is drawn as an oblique paper diorama rather than a flat plan.
// Geographic north/south is foreshortened into the "floor" and elevation
// rises vertically from it, so the Alps visibly stand up as the camera nears.
const FLOOR_TILT = 0.66;
const RELIEF_SCALE = 0.092;
const groundPoint = (x, y) => ({
  x: sx(x),
  y: +(((sy(y) - VBH / 2) * FLOOR_TILT + VBH / 2)).toFixed(1),
});
const mapPoint = (x, y, altitude = altAt(x, y)) => {
  const ground = groundPoint(x, y);
  return {
    x: ground.x,
    y: +(ground.y - Math.max(0, altitude) * RELIEF_SCALE).toFixed(1),
    groundY: ground.y,
    alt: altitude,
  };
};
const mapLonLat = ({ lon, lat }, altitude) => {
  const [x, y] = mercProj({ lon, lat });
  return mapPoint(x, y, altitude == null ? altAt(x, y) : altitude);
};

const gpsVerts = flattenTracks(data.tracks);
const dayPositions = pts.map((d) => ({
  day: d.n,
  country: d.country,
  s: nearestOnVerts(d.x, d.y, gpsVerts).s,
}));
const MERGE_M = 3000;
const townsPlaced = [];
for (const t of TOWNS) {
  if (t.start) {
    const [px, py] = [gpsVerts[0].x, gpsVerts[0].y];
    townsPlaced.push({ ...t, x: px, y: py, s: 0, alt: altAt(px, py), snapM: 0 });
    continue;
  }
  const [px, py] = mercProj(t);
  const snap = nearestOnVerts(px, py, gpsVerts);
  if (t.pass) {
    townsPlaced.push({
      ...t,
      x: snap.x,
      y: snap.y,
      s: snap.s,
      alt: altAt(snap.x, snap.y),
      snapM: snap.d,
    });
    continue;
  }
  townsPlaced.push({
    ...t,
    x: px,
    y: py,
    s: snap.s,
    alt: altAt(px, py),
    snapM: snap.d,
  });
}
for (let i = 1; i < townsPlaced.length; i++) {
  if (townsPlaced[i].s <= townsPlaced[i - 1].s) {
    townsPlaced[i].s = townsPlaced[i - 1].s + 1;
  }
}

const route = [];
const pushRoute = (p) => {
  const last = route[route.length - 1];
  if (last && Math.hypot(last.x - p.x, last.y - p.y) < 80) return;
  route.push(p);
};
const anchors = townsPlaced.filter((t) => !t.pass);
for (let i = 0; i < anchors.length; i++) {
  const town = anchors[i];
  if (i > 0) {
    const prev = anchors[i - 1];
    for (const v of gpsVerts) {
      if (v.s <= prev.s + 80 || v.s >= town.s - 80) continue;
      if (Math.hypot(v.x - prev.x, v.y - prev.y) < MERGE_M) continue;
      if (Math.hypot(v.x - town.x, v.y - town.y) < MERGE_M) continue;
      pushRoute({ x: v.x, y: v.y, s: v.s, kind: "gps" });
    }
  }
  pushRoute({ x: town.x, y: town.y, s: town.s, kind: "town", name: town.name });
}

const COUNTRY_COLOR = Object.fromEntries(data.countries.map((c) => [c.name, c.color]));

const ringPaths = data.countryRings
  .map((c) => {
    const d = c.rings
      .map(
        (ring) =>
          "M" +
          ring
            .map(([x, y]) => {
              const point = mapPoint(x, y);
              return `${point.x} ${point.y}`;
            })
            .join("L") +
          "Z"
      )
      .join("");
    return `<path class="country-ring" data-country="${c.name.toLowerCase()}" d="${d}" fill="${c.color}" fill-opacity=".05" stroke="${c.color}" stroke-opacity=".28" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;
  })
  .join("\n    ");

function terrainCellColor(points, facet = 0) {
  const altitude = points.reduce((sum, point) => sum + point.alt, 0) / points.length;
  const eastSlope = (points[1].alt + points[2].alt - points[0].alt - points[3].alt) / 1150;
  const southSlope = (points[2].alt + points[3].alt - points[0].alt - points[1].alt) / 1150;
  const normalLength = Math.hypot(eastSlope, southSlope, 1);
  const nx = -eastSlope / normalLength;
  const ny = -southSlope / normalLength;
  const nz = 1 / normalLength;
  const light = Math.max(-1, Math.min(1, nx * -0.48 + ny * -0.62 + nz * 0.62));
  let hue = 74;
  let saturation = 14;
  let luminance = 17;
  if (altitude > 1750) {
    hue = 39;
    saturation = 12;
    luminance = 36 + Math.min(18, ((altitude - 1750) / 900) * 18);
  } else if (altitude > 1050) {
    hue = 44;
    saturation = 14;
    luminance = 27 + ((altitude - 1050) / 700) * 8;
  } else if (altitude > 360) {
    hue = 66;
    saturation = 15;
    luminance = 20 + ((altitude - 360) / 690) * 7;
  } else {
    luminance = 16 + Math.max(0, altitude) / 90;
  }
  luminance = Math.round(Math.max(10, Math.min(62, luminance + light * 7.5 + facet)));
  return `hsl(${Math.round(hue)} ${Math.round(saturation)}% ${luminance}%)`;
}

const terrainBuckets = new Map();
const terrainRisers = [];
const addTerrainFacet = (bucket, color, points) => {
  const d = `M${points.map((point) => `${point.x},${point.y}`).join("L")}Z`;
  bucket.set(color, (bucket.get(color) || "") + d);
};
const terrainGridPoint = (row, column) => {
  const lon = grid.west + (column * (grid.east - grid.west)) / (grid.cols - 1);
  const lat = grid.north - (row * (grid.north - grid.south)) / (grid.rows - 1);
  const altitude = grid.elev[row * grid.cols + column] || 0;
  return mapLonLat({ lon, lat }, altitude);
};
if (grid) {
  for (let row = 0; row < grid.rows - 1; row++) {
    for (let column = 0; column < grid.cols - 1; column++) {
      const points = [
        terrainGridPoint(row, column),
        terrainGridPoint(row, column + 1),
        terrainGridPoint(row + 1, column + 1),
        terrainGridPoint(row + 1, column),
      ];
      addTerrainFacet(terrainBuckets, terrainCellColor(points, -1.1), [points[0], points[1], points[2]]);
      addTerrainFacet(terrainBuckets, terrainCellColor(points, 1.1), [points[0], points[2], points[3]]);
    }
  }
  for (let row = 0; row < grid.rows; row += 2) {
    for (let column = 0; column < grid.cols; column += 2) {
      const point = terrainGridPoint(row, column);
      if (point.alt < 260 || point.groundY - point.y < 8) continue;
      terrainRisers.push(`M${point.x},${point.y}L${point.x},${point.groundY}`);
    }
  }
}
const terrainCells = Array.from(terrainBuckets, ([color, d]) =>
  `<path class="terrain-cell" d="${d}" fill="${color}" stroke="${color}"/>`
);

// The high-ground sections become literal map specimens: actual sampled
// elevation on top, with a shallow geological cutaway beneath. They sit in
// the atlas all along, then lift into full contrast as the walker reaches them.
const TERRAIN_BLOCKS = [
  { name: "vosges", start: 13, end: 16, west: 6.15, east: 7.85, south: 47.75, north: 49.35, depth: 23 },
  { name: "alps", start: 25, end: 34, west: 11.45, east: 14.85, south: 46.15, north: 48.45, depth: 43 },
  { name: "dinaric", start: 35, end: 38, west: 14.05, east: 16.75, south: 45.25, north: 47.05, depth: 31 },
  { name: "balkan", start: 62, end: 66, west: 20.9, east: 23.85, south: 42.05, north: 44.35, depth: 36 },
];

function terrainBlock(region) {
  if (!grid) return "";
  const columns = 15;
  const rows = 11;
  const points = [];
  for (let row = 0; row < rows; row++) {
    const lat = region.north - (row * (region.north - region.south)) / (rows - 1);
    const line = [];
    for (let column = 0; column < columns; column++) {
      const lon = region.west + (column * (region.east - region.west)) / (columns - 1);
      const altitude = Math.max(0, sampleGrid(grid, lon, lat));
      line.push(mapLonLat({ lon, lat }, altitude));
    }
    points.push(line);
  }

  const facets = new Map();
  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const cell = [
        points[row][column],
        points[row][column + 1],
        points[row + 1][column + 1],
        points[row + 1][column],
      ];
      addTerrainFacet(facets, terrainCellColor(cell, -2), [cell[0], cell[1], cell[2]]);
      addTerrainFacet(facets, terrainCellColor(cell, 2), [cell[0], cell[2], cell[3]]);
    }
  }

  const north = points[0];
  const east = points.map((line) => line[line.length - 1]).slice(1);
  const south = points[points.length - 1].slice().reverse().slice(1);
  const west = points.map((line) => line[0]).reverse().slice(1, -1);
  const perimeter = north.concat(east, south, west);
  const topD = `M${perimeter.map((point) => `${point.x},${point.y}`).join("L")}Z`;
  const southernEdge = points[points.length - 1];
  const easternEdge = points.map((line) => line[line.length - 1]);
  const westernEdge = points.map((line) => line[0]);
  const side = (edge, depth) =>
    `M${edge.map((point) => `${point.x},${point.y}`).join("L")}L${edge
      .slice()
      .reverse()
      .map((point) => `${point.x},${point.y + depth}`)
      .join("L")}Z`;
  const stratum = (edge, offset) =>
    `M${edge.map((point) => `${point.x},${point.y + offset}`).join("L")}`;
  const minX = Math.min(...perimeter.map((point) => point.x));
  const maxX = Math.max(...perimeter.map((point) => point.x));
  const minY = Math.min(...perimeter.map((point) => point.y));
  const maxY = Math.max(...perimeter.map((point) => point.y)) + region.depth;
  const facetPaths = Array.from(facets, ([color, d]) =>
    `<path class="terrain-block-facet" d="${d}" fill="${color}" stroke="${color}"/>`
  ).join("\n        ");

  return `<g class="terrain-block" data-name="${region.name}" data-start="${region.start}" data-end="${region.end}" data-cx="${((minX + maxX) / 2).toFixed(1)}" data-cy="${((minY + maxY) / 2).toFixed(1)}" data-width="${(maxX - minX).toFixed(1)}" data-height="${(maxY - minY).toFixed(1)}">
      <path class="terrain-block-shadow" d="${topD}" transform="translate(0 ${region.depth + 8})"/>
      <path class="terrain-block-side terrain-block-side-west" d="${side(westernEdge, region.depth * .72)}"/>
      <path class="terrain-block-side terrain-block-side-east" d="${side(easternEdge, region.depth * .84)}"/>
      <path class="terrain-block-front" d="${side(southernEdge, region.depth)}"/>
      <path class="terrain-block-stratum" d="${stratum(southernEdge, region.depth * .28)}"/>
      <path class="terrain-block-stratum terrain-block-stratum-mid" d="${stratum(southernEdge, region.depth * .57)}"/>
      <path class="terrain-block-stratum terrain-block-stratum-deep" d="${stratum(southernEdge, region.depth * .82)}"/>
      <path class="terrain-block-bed" d="${topD}"/>
      <g class="terrain-block-top">
        ${facetPaths}
      </g>
      <path class="terrain-block-grain" d="${topD}"/>
      <path class="terrain-block-outline" d="${topD}"/>
    </g>`;
}

const terrainBlocks = TERRAIN_BLOCKS.map(terrainBlock).join("\n    ");

function linePath(points, altitude) {
  return points
    .map(([lon, lat], index) => {
      const point = mapLonLat({ lon, lat }, altitude);
      return `${index ? "L" : "M"}${point.x} ${point.y}`;
    })
    .join("");
}

const lakePaths = water.lakes
  .map((lake) => {
    const all = lake.rings.flat();
    const centre = all.reduce(
      (sum, point) => ({ lon: sum.lon + point[0] / all.length, lat: sum.lat + point[1] / all.length }),
      { lon: 0, lat: 0 }
    );
    const [cx, cy] = mercProj(centre);
    const altitude = Math.max(0, altAt(cx, cy));
    const d = lake.rings.map((ring) => linePath(ring, altitude) + "Z").join("");
    const label = mapLonLat(centre, altitude);
    return `<g class="lake"><path d="${d}"/><text x="${label.x}" y="${label.y}" class="waterlabel">${lake.name}</text></g>`;
  })
  .join("\n      ");

const riverPaths = water.rivers
  .flatMap((river) => river.lines.map((line) => `<path class="river" data-name="${river.name}" d="${linePath(line)}"/>`))
  .join("\n      ");

const MOUNTAINS = [
  { name: "Vosges", lon: 7.05, lat: 48.22 },
  { name: "the Alps", lon: 13.05, lat: 47.05 },
  { name: "Dinaric Alps", lon: 15.25, lat: 45.72 },
  { name: "Balkan Mountains", lon: 22.72, lat: 43.18 },
];
const mountainMarks = MOUNTAINS.map((mountain) => {
  const point = mapLonLat(mountain);
  return `<g class="mountain" transform="translate(${point.x} ${point.y})">
      <path d="M-7 4L0-5L7 4M-2.8 4L2-1L6.5 4"/>
      <text x="0" y="13" text-anchor="middle">${mountain.name}</text>
    </g>`;
}).join("\n    ");

// Upright paper landmarks. These are deliberately illustrative silhouettes,
// not generic map pins: they unfold as the route reaches each place and make
// the atlas read like a travelling pop-up book.
const LANDMARKS = [
  { name: "Champagne country", short: "Champagne", lon: 4.45, lat: 49.05, kind: "vines", color: "#C7A35A" },
  { name: "Munich Frauenkirche", short: "Frauenkirche", lon: 11.58, lat: 48.14, kind: "frauenkirche", town: "munich" },
  { name: "Lake Zell", short: "Zeller See", lon: 12.8, lat: 47.32, kind: "lake", town: "zell-am-see" },
  { name: "the High Tauern", short: "High Tauern", lon: 13.32, lat: 47.05, kind: "peaks", town: "the-tauern", labelX: 13, labelAnchor: "end" },
  { name: "the Victor, Belgrade", short: "the Victor", lon: 20.46, lat: 44.82, kind: "victor", town: "belgrade" },
  { name: "Alexander Nevsky Cathedral", short: "Alexander Nevsky", lon: 23.32, lat: 42.7, kind: "domes", town: "sofia" },
];

function landmarkIcon(kind) {
  if (kind === "vines") return `
      <path class="landmark-floor landmark-line" d="M-19 1L-10-7M-11 2L-3-7M-3 2L5-7M5 2L13-7M13 2L20-5"/>
      <g class="landmark-rise">
        <path class="landmark-line" d="M-13 0V-14M-3 0V-17M7 0V-13M16 0V-10"/>
        <path class="landmark-accent" d="M-17-9c4-5 8-5 12 0-4 4-8 4-12 0Zm10-5c4-5 8-5 12 0-4 4-8 4-12 0Zm10 3c4-5 8-5 12 0-4 4-8 4-12 0Z"/>
      </g>`;
  if (kind === "frauenkirche") return `
      <g class="landmark-rise">
        <path class="landmark-paper" d="M-15 0v-18h30V0Zm3-18v-12h7v12Zm17 0v-12h7v12Z"/>
        <path class="landmark-accent" d="M-13-30c0-4 2-7 4.5-9 2.5 2 4.5 5 4.5 9Zm17 0c0-4 2-7 4.5-9 2.5 2 4.5 5 4.5 9Z"/>
        <path class="landmark-cut" d="M-2 0v-9c0-4 4-4 4 0V0"/>
      </g>`;
  if (kind === "lake") return `
      <path class="landmark-floor landmark-water" d="M-23-1c5-7 15-10 26-8 8 1 15 5 20 10-7 5-17 7-28 6-8-1-14-4-18-8Z"/>
      <g class="landmark-rise">
        <path class="landmark-paper" d="M-19-6-10-23-2-13 6-30 17-7 11-12 5-5-7-10-12 7Z"/>
        <path class="landmark-snow" d="m-10-23 3 4 5 6m8-17 4 7 4-3"/>
      </g>`;
  if (kind === "peaks") return `
      <g class="landmark-rise">
        <path class="landmark-paper" d="M-23 0-12-19-5-10 4-34 14-17 21-25 29 0Z"/>
        <path class="landmark-snow" d="m-12-19 3 5 4-4M4-34l4 8 4-4m9 5 3 7 3-3"/>
      </g>`;
  if (kind === "victor") return `
      <g class="landmark-rise">
        <path class="landmark-paper" d="M-8 0h16L5-4H-5Zm3-4h10v-23H-5Z"/>
        <path class="landmark-accent" d="M0-37c2 0 3 2 2 4l3 7-4 2-2-5-4 5-2-2 5-7c-1-2 0-4 2-4Z"/>
        <path class="landmark-line" d="M2-32l7-4M-3-31l-6-3"/>
      </g>`;
  return `
      <g class="landmark-rise">
        <path class="landmark-paper" d="M-19 0v-13h7v-8h8v8h8v-11h7v11h8V0Z"/>
        <path class="landmark-accent" d="M-15-21c0-5 6-5 6 0Zm14-3c0-7 10-7 10 0Zm13 3c0-5 6-5 6 0Z"/>
        <path class="landmark-line" d="M0-31v7m15-4v7m-27-7v7"/>
      </g>`;
}

const landmarkMarks = LANDMARKS.map((landmark) => {
  const [x, y] = mercProj(landmark);
  const point = mapPoint(x, y);
  const routePosition = nearestOnVerts(x, y, gpsVerts).s;
  const nearestDay = dayPositions.reduce(
    (best, day) => (Math.abs(day.s - routePosition) < Math.abs(best.s - routePosition) ? day : best),
    dayPositions[0]
  );
  return `<g class="landmark" data-day="${nearestDay.day}" data-kind="${landmark.kind}"${landmark.town ? ` data-town="${landmark.town}"` : ""} style="--landmark-color:${landmark.color || COUNTRY_COLOR[nearestDay.country]}" transform="translate(${point.x} ${point.y})">
      <title>${landmark.name}</title>
      <ellipse class="landmark-shadow" cx="0" cy="2" rx="18" ry="4"/>
      ${landmarkIcon(landmark.kind).trim()}
      <text class="landmark-label" x="${landmark.labelX || 0}" y="11" text-anchor="${landmark.labelAnchor || "middle"}">${landmark.short}</text>
    </g>`;
}).join("\n    ");

function contourPath(level) {
  if (!grid) return "";
  const point = (r, c) => {
    const lon = grid.west + (c * (grid.east - grid.west)) / (grid.cols - 1);
    const lat = grid.north - (r * (grid.north - grid.south)) / (grid.rows - 1);
    const [x, y] = mercProj({ lon, lat });
    const z = grid.elev[r * grid.cols + c] || 0;
    const mapped = mapPoint(x, y, z);
    return { x: mapped.x, y: mapped.y, z };
  };
  const crossing = (a, b) => {
    if (!((a.z < level && b.z >= level) || (a.z >= level && b.z < level))) return null;
    const u = (level - a.z) / (b.z - a.z || 1);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  };
  const segments = [];
  for (let r = 0; r < grid.rows - 1; r++) {
    for (let c = 0; c < grid.cols - 1; c++) {
      const corners = [point(r, c), point(r, c + 1), point(r + 1, c + 1), point(r + 1, c)];
      const hits = [
        crossing(corners[0], corners[1]),
        crossing(corners[1], corners[2]),
        crossing(corners[2], corners[3]),
        crossing(corners[3], corners[0]),
      ].filter(Boolean);
      const add = (a, b) => {
        segments.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
      };
      if (hits.length === 2) add(hits[0], hits[1]);
      else if (hits.length === 4) {
        const centre = corners.reduce((sum, p) => sum + p.z, 0) / 4;
        if (centre >= level) {
          add(hits[0], hits[3]);
          add(hits[1], hits[2]);
        } else {
          add(hits[0], hits[1]);
          add(hits[2], hits[3]);
        }
      }
    }
  }
  return segments.join("");
}

const contourLevels = [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400];
const contourPaths = grid
  ? contourLevels
      .map((level) => {
        const d = contourPath(level);
        if (!d) return "";
        const major = level % 800 === 0 ? " major" : "";
        return `<path class="contour${major}" data-elevation="${level}" d="${d}"/>`;
      })
      .filter(Boolean)
      .join("\n      ")
  : "";

const trackPath =
  "M" +
  route
    .map((p) => {
      const point = mapPoint(p.x, p.y);
      return `${point.x} ${point.y}`;
    })
    .join("L");

function nearestRouteIdx(x, y, from = 0) {
  let best = from;
  let bd = Infinity;
  for (let i = from; i < route.length; i++) {
    const d = Math.hypot(route[i].x - x, route[i].y - y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

const walkPaths = {};
const segs = [];
let routeAt = 0;
for (let i = 0; i < pts.length; i++) {
  const d = pts[i];
  const arrivalTown = townsPlaced.find((town) => town.day === d.n);
  const endX = arrivalTown ? arrivalTown.x : d.x;
  const endY = arrivalTown ? arrivalTown.y : d.y;
  const i1 = Math.max(routeAt, nearestRouteIdx(endX, endY, routeAt));
  let slice = route.slice(routeAt, i1 + 1);
  if (slice.length < 2) {
    const a = route[routeAt] || route[0];
    const b = route[i1] || a;
    slice = [a, b];
  }
  routeAt = i1;
  walkPaths[d.n] = slice.map((p) => {
    const altitude = altAt(p.x, p.y);
    const point = mapPoint(p.x, p.y, altitude);
    return { x: point.x, y: point.y, alt: Math.round(altitude) };
  });
  const pathD =
    "M" +
    slice
      .map((p) => {
        const point = mapPoint(p.x, p.y);
        return `${point.x} ${point.y}`;
      })
      .join("L");
  segs.push(
    `<path id="seg-${d.n}" d="${pathD}" fill="none" stroke="${COUNTRY_COLOR[d.country]}" stroke-width="2.6" vector-effect="non-scaling-stroke" ${d.walked ? "" : 'stroke-dasharray="3 6"'} class="seg"/>`
  );
}

function placeOnTown(x, y, day) {
  const assigned = townsPlaced.find((town) => town.day === day);
  if (assigned) return { x: assigned.x, y: assigned.y };
  let best = null;
  for (const t of townsPlaced) {
    if (t.pass) continue;
    const d = Math.hypot(x - t.x, y - t.y);
    if (d < MERGE_M && (!best || d < best.d)) best = { t, d };
  }
  return best ? { x: best.t.x, y: best.t.y } : { x, y };
}

const dayDots = pts
  .map((d) => {
    const at = placeOnTown(d.x, d.y, d.n);
    const point = mapPoint(at.x, at.y);
    return `<circle id="dot-${d.n}" class="daydot${d.walked ? "" : " restdot"}${d.sleeve ? " hasrec" : ""}" cx="${point.x}" cy="${point.y}" r="${d.sleeve ? 3.2 : 2.2}" data-day="${d.n}"/>`;
  })
  .join("\n    ");

const townMarks = townsPlaced
  .map((t) => {
    const point = mapPoint(t.x, t.y, t.alt);
    const X = point.x;
    const Y = point.y;
    const anchor = t.anchor === "start" ? "start" : t.anchor === "end" ? "end" : "middle";
    return `<g class="town${t.pass ? " pass" : ""}" id="town-${t.name.toLowerCase().replace(/[^a-z]+/g, "-")}">
${t.pass ? "" : `      <circle cx="${X}" cy="${Y}" r="5" class="townhalo"/>\n`}
      <circle cx="${X}" cy="${Y}" r="2" class="towndot"/>
      <text x="${X + (t.dx || 0)}" y="${Y + (t.dy || 0)}" text-anchor="${anchor}" class="townlabel">${t.name}</text>
    </g>`;
  })
  .join("\n    ");

const startAlt = altAt(start[0], start[1]);
const startPoint = mapPoint(start[0], start[1], startAlt);

const atlasSvg = `
<svg id="atlas" viewBox="0 0 ${VBW} ${VBH}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <linearGradient id="terrain-front-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6D5135"/>
      <stop offset=".3" stop-color="#4B3525"/>
      <stop offset=".64" stop-color="#302118"/>
      <stop offset="1" stop-color="#17110D"/>
    </linearGradient>
    <linearGradient id="terrain-side-gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4D3828"/>
      <stop offset="1" stop-color="#19120E"/>
    </linearGradient>
    <filter id="terrain-grain-filter" x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency=".027 .11" numOctaves="2" seed="23" result="noise"/>
      <feColorMatrix in="noise" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .34 0" result="grain"/>
      <feComposite in="grain" in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="terrain-shadow-filter" x="-25%" y="-25%" width="150%" height="170%">
      <feGaussianBlur stdDeviation="11"/>
    </filter>
  </defs>
  <g id="camera">
    <g id="terrain-mesh">${terrainCells.join("\n      ")}</g>
    <path id="terrain-risers" d="${terrainRisers.join("")}"/>
    <g id="terrain-blocks">${terrainBlocks}</g>
    <g id="water">
      ${lakePaths}
      ${riverPaths}
    </g>
    <g id="rings">${ringPaths}</g>
    <g id="relief">${contourPaths}</g>
    <g id="mountains">${mountainMarks}</g>
    <g id="landmarks">${landmarkMarks}</g>
    <path id="gps" d="${trackPath}" fill="none" stroke="#EFE6D4" stroke-opacity=".14" stroke-width="1" vector-effect="non-scaling-stroke"/>
    ${segs.join("\n    ")}
    ${dayDots}
    ${townMarks}
    <g id="walker-g" transform="translate(${startPoint.x},${startPoint.y})">
      <ellipse id="walker-shadow" cx="0" cy="1.1" rx="5.2" ry="1.7"/>
      <circle id="walker-pin" cx="0" cy="0" r="2.3"/>
    </g>
  </g>
</svg>`;

// ----------------------------------------------------------------- timeline
// Scroll scenes, in order: walk legs day by day, a held plate at each border,
// and held quotes at the beats. Rest points pass quickly and silently.
const PX_PER_KM = 9;
const scenes = [];
scenes.push({ t: "start", len: 620 });
scenes.push({ t: "enter", country: "France", len: 760 });
scenes.push({ t: "walk", day: 1, len: Math.max(180, Math.round((pts[0].km || 30) * PX_PER_KM)) });
for (let i = 1; i < pts.length; i++) {
  const d = pts[i];
  const prev = pts[i - 1];
  if (d.country !== prev.country) {
    scenes.push({ t: "enter", country: d.country, len: 760 });
  }
  const walkLen = d.walked ? Math.max(180, Math.round((d.km || 30) * PX_PER_KM)) : 36;
  scenes.push({ t: "walk", day: d.n, len: walkLen });
  if (BEATS[d.n]) scenes.push({ t: "beat", day: d.n, len: 720 });
}
scenes.push({ t: "end", len: 900 });
let acc = 0;
for (const s of scenes) {
  s.at = acc;
  acc += s.len;
}
const TIMELINE_TOTAL = acc;

// ----------------------------------------------------------- data for the JS
const jsDays = pts.map((d) => {
  const at = placeOnTown(d.x, d.y, d.n);
  const altitude = altAt(at.x, at.y);
  const point = mapPoint(at.x, at.y, altitude);
  return {
    n: d.n,
    t: d.title,
    date: d.date,
    km: d.km || 0,
    min: d.movingMin || 0,
    elev: d.elevM || 0,
    alt: Math.round(altitude),
    w: d.walked ? 1 : 0,
    c: d.country,
    x: point.x,
    y: point.y,
    s: d.sleeve || null,
    j: JOURNAL[d.n] || null,
  };
});
const rawWalkKm = jsDays.reduce((sum, d) => sum + (d.w ? d.km : 0), 0);
const distanceScale = rawWalkKm > 0 ? data.facts.km / rawWalkKm : 1;
let cum = 0;
let cumElev = 0;
let cumMin = 0;
let footDays = 0;
for (const d of jsDays) {
  if (d.w) {
    cum += d.km * distanceScale;
    cumElev += d.elev;
    cumMin += d.min;
    footDays += 1;
  }
  d.cum = +cum.toFixed(1);
  d.cumElev = cumElev;
  d.cumMin = cumMin;
  d.footDays = footDays;
}
const countryDistances = data.countries.map((country) => ({
  name: country.name,
  color: country.color,
  km: jsDays
    .filter((day) => day.c === country.name && day.w)
    .reduce((sum, day) => sum + day.km * distanceScale, 0),
}));
let countryDistanceAt = 0;
const routeGradient = countryDistances
  .map((country) => {
    const from = (countryDistanceAt / data.facts.km) * 100;
    countryDistanceAt += country.km;
    const to = (countryDistanceAt / data.facts.km) * 100;
    return `${country.color} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
  })
  .join(",");

// The collecting rail and final wall follow the same journey clock as the
// walker. Places inherit the nearest numbered day along the GPS trace; albums
// are unique records, collected on the first day they appear.
const places = townsPlaced.map((town) => {
  const nearestDay = dayPositions.reduce(
    (best, day) => (Math.abs(day.s - town.s) < Math.abs(best.s - town.s) ? day : best),
    dayPositions[0]
  );
  return {
    name: town.name,
    day: town.start ? 0 : town.day || nearestDay.day,
    country: nearestDay.country,
    pass: town.pass ? 1 : 0,
  };
});
const albumKeys = new Set();
const albums = [];
for (const day of jsDays) {
  if (!day.s) continue;
  const key = `${day.s.artist}\u0000${day.s.album}`;
  if (albumKeys.has(key)) continue;
  albumKeys.add(key);
  albums.push({
    day: day.n,
    title: day.t,
    artist: day.s.artist,
    album: day.s.album,
    slug: day.s.slug,
    country: day.c,
  });
}
// Photographs from the road: public/trek/photos/manifest.json, written by the
// curation step — [{ day, src, w, h }] with files sitting alongside it.
const photosManifestPath = path.join(root, "public/trek/photos/manifest.json");
const photos = fs.existsSync(photosManifestPath)
  ? JSON.parse(fs.readFileSync(photosManifestPath, "utf8"))
  : [];

const jsData = {
  days: jsDays,
  colors: COUNTRY_COLOR,
  total: data.facts.km,
  stats: {
    days: data.facts.walked,
    ascent: cumElev,
    minutes: cumMin,
    countries: data.facts.countries,
  },
  scenes,
  timeline: TIMELINE_TOTAL,
  beats: BEATS,
  vb: [VBW, VBH],
  start: [startPoint.x, startPoint.y],
  startAlt: Math.round(startAlt),
  walkPaths,
  photos,
  places,
  albums,
};

// ------------------------------------------------------------------- helpers
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const wallPlacesHtml = places
  .map(
    (place) =>
      `<li style="--w:${COUNTRY_COLOR[place.country]}"><span>${esc(place.name)}</span></li>`
  )
  .join("\n      ");
const wallAlbumsHtml = albums
  .map(
    (album) => `
      <article class="album-card" style="--w:${COUNTRY_COLOR[album.country]}">
        <button class="album-open" data-day="${album.day}" aria-haspopup="dialog" aria-label="${esc(
          `${album.artist} — ${album.album}`
        )}">
          <img src="covers/${album.slug}-thumb.webp" alt="" width="240" height="240" loading="lazy" decoding="async">
        </button>
        <p class="album-day">day ${String(album.day).padStart(2, "0")}</p>
        <p class="album-name"><b>${esc(album.artist)}</b><span>${esc(album.album)}</span></p>
      </article>`
  )
  .join("\n");

// -------------------------------------------------- country entry plates
const ordinals = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
const actsMeta = [];
for (const day of data.days) {
  const last = actsMeta[actsMeta.length - 1];
  if (!last || last.name !== day.country) {
    actsMeta.push({ name: day.country, days: [] });
  }
  actsMeta[actsMeta.length - 1].days.push(day);
}
const platesHtml = actsMeta
  .map((act, i) => {
    const km = Math.round(act.days.reduce((s, d) => s + (d.walked ? d.km || 0 : 0), 0));
    return `
  <div class="plate" id="plate-${act.name.toLowerCase()}" style="--c:${COUNTRY_COLOR[act.name]}">
    <img src="grounds/${act.name.toLowerCase()}.webp" alt="" width="640" height="640" loading="lazy" decoding="async">
    <div class="plate-text">
      <p class="plate-count">the ${ordinals[i]} country</p>
      <h2 class="plate-name">${act.name}</h2>
      <p class="plate-facts">${km} km on foot</p>
    </div>
  </div>`;
  })
  .join("\n");

// -------------------------------------------------------- noscript fallback
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso) => {
  if (!iso) return null;
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
const noscriptHtml = data.days
  .map((d) => {
    const bits = [
      `Day ${d.n}`,
      d.title || "—",
      d.date ? shortDate(d.date) : null,
      d.walked ? `${(d.km || 0).toFixed(1)} km` : "rest",
      d.sleeve ? `${d.sleeve.artist} — ${d.sleeve.album}` : null,
    ].filter(Boolean);
    return `<li>${esc(bits.join(" · "))}</li>`;
  })
  .join("\n      ");

// ------------------------------------------------------------------- render
let html = fs.readFileSync(templatePath, "utf8");
const fill = (token, value) => {
  if (!html.includes(token)) throw new Error(`template is missing ${token}`);
  html = html.split(token).join(value);
};
fill("<!--__ATLAS__-->", atlasSvg);
fill("<!--__PLATES__-->", platesHtml);
fill("<!--__NOSCRIPT_DAYS__-->", noscriptHtml);
fill("<!--__WALL_PLACES__-->", wallPlacesHtml);
fill("<!--__WALL_ALBUMS__-->", wallAlbumsHtml);
fill("__WALL_PLACE_COUNT__", places.length);
fill("__WALL_ALBUM_COUNT__", albums.length);
fill("__WALL_ASCENT__", Math.round(cumElev).toLocaleString("en-GB"));
fill("__WALL_HOURS__", Math.round(cumMin / 60).toLocaleString("en-GB"));
fill("__ROUTE_GRADIENT__", routeGradient);
fill("__DATA_JSON__", JSON.stringify(jsData));

fs.writeFileSync(dataPath, JSON.stringify(data, null, 1) + "\n");
fs.writeFileSync(outPath, html);

const townReport = townsPlaced
  .map((t) => `${t.name} ${(t.snapM / 1000).toFixed(1)}km`)
  .join(", ");
console.log(
  `built public/trek/index.html — ${pts.length} days, timeline ${TIMELINE_TOTAL}px, ${(html.length / 1024).toFixed(0)}K, route ${route.length} pts (${townsPlaced.length} cities)${grid ? ", elevation on" : ""}`
);
console.log(`cities on the line: ${townReport}`);
}
