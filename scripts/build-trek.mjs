#!/usr/bin/env node
// Build /trek — the 2019 walk, Paris to Sofia, travelled through the map.
//
// The page is one full-screen atlas. Scroll walks the line: the camera
// follows the GPS day points, towns arrive and pass, each country opens with
// its Imagine ground, and records, photographs and journal entries surface at
// their walked days. Rest points remain on the line but pass silently.
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
const journalPath = path.join(root, "data/trek-journal.json");
const templatePath = path.join(root, "scripts/trek-page-template.html");
const outPath = path.join(root, "public/trek/index.html");

const argIdx = process.argv.indexOf("--distances");
const distancesPath = argIdx > -1 ? process.argv[argIdx + 1] : null;

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const covers = JSON.parse(fs.readFileSync(coversPath, "utf8"));
const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
const JOURNAL = journal.days || {};
const photosManifestPath = path.join(root, "public/trek/photos/manifest.json");
const photos = fs.existsSync(photosManifestPath)
  ? JSON.parse(fs.readFileSync(photosManifestPath, "utf8"))
  : [];
const walkedDays = data.days.filter((day) => day.walked).map((day) => day.n);
const photoDisplayDay = (day) => {
  if (walkedDays.includes(day)) return day;
  return walkedDays.find((walkedDay) => walkedDay > day) || walkedDays[walkedDays.length - 1];
};
const storyPhotos = photos.map((photo) => ({ ...photo, displayDay: photoDisplayDay(photo.day) }));
const photosByDay = storyPhotos.reduce((byDay, photo) => {
  (byDay[photo.displayDay] || (byDay[photo.displayDay] = [])).push(photo);
  return byDay;
}, {});

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
// The atlas keeps a gentle oblique perspective. Geographic north/south is
// foreshortened into the floor and real elevation lifts the terrain, but the
// scale stays shallow enough for the relief to feel embedded in the map.
const FLOOR_TILT = 0.66;
// The paper atlas keeps geography readable and lets the separate cut-paper
// mountains carry the drama. A small lift still lets the walker rise through
// the Alps without bending the route into a perspective illustration.
const RELIEF_SCALE = 0.014;
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

const TERRAIN_PAPER = [
  ["#D7CEAA", "#C9C19C", "#BBB58F"],
  ["#A5A47C", "#95966F", "#858A66"],
  ["#747C5D", "#657052", "#59654B"],
  ["#4E5B45", "#414E3D", "#354239"],
];

function terrainCellColor(points, facet = 0) {
  const altitude = points.reduce((sum, point) => sum + point.alt, 0) / points.length;
  const eastSlope = (points[1].alt + points[2].alt - points[0].alt - points[3].alt) / 1150;
  const southSlope = (points[2].alt + points[3].alt - points[0].alt - points[1].alt) / 1150;
  const normalLength = Math.hypot(eastSlope, southSlope, 1);
  const nx = -eastSlope / normalLength;
  const ny = -southSlope / normalLength;
  const nz = 1 / normalLength;
  const light = Math.max(-1, Math.min(1, nx * -0.48 + ny * -0.62 + nz * 0.62));
  const band = altitude < 240 ? 0 : altitude < 520 ? 1 : altitude < 980 ? 2 : 3;
  const shade = Math.max(0, Math.min(2, Math.round(1 - light * .8 + facet)));
  return TERRAIN_PAPER[band][shade];
}

const terrainBuckets = new Map();
const addTerrainFacet = (bucket, color, points) => {
  const d = `M${points.map((point) => `${point.x},${point.y}`).join("L")}Z`;
  bucket.set(color, (bucket.get(color) || "") + d);
};
const terrainGridPoint = (row, column) => {
  const lon = grid.west + (column * (grid.east - grid.west)) / (grid.cols - 1);
  const lat = grid.north - (row * (grid.north - grid.south)) / (grid.rows - 1);
  const altitude = grid.elev[row * grid.cols + column] || 0;
  const [x, y] = mercProj({ lon, lat });
  return { ...groundPoint(x, y), alt: altitude };
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
      addTerrainFacet(terrainBuckets, terrainCellColor(points, -.18), [points[0], points[1], points[2]]);
      addTerrainFacet(terrainBuckets, terrainCellColor(points, .18), [points[0], points[2], points[3]]);
    }
  }
}
const terrainCells = Array.from(terrainBuckets, ([color, d]) =>
  `<path class="terrain-cell" d="${d}" fill="${color}" stroke="${color}"/>`
);

const ringPath = (ring) => {
  const points = ring.map(([x, y]) => {
    const point = groundPoint(x, y);
    return `${point.x} ${point.y}`;
  });
  return points.length ? `M${points.join("L")}Z` : "";
};
const landShape = (data.countryRings || [])
  .flatMap((country) => country.rings.map(ringPath))
  .join("");

// Real elevation becomes a field of deliberately graphic paper peaks rather
// than a conventional shaded-relief texture. The placement and scale are
// deterministic and derived from the cached terrain grid.
const PEAK_PAPER = {
  low: ["#7B8160", "#677050", "#525F47"],
  mid: ["#59654B", "#46543F", "#354238"],
  high: ["#495344", "#354139", "#27322F"],
  dusk: ["#706B6B", "#5E5862", "#484653"],
};
const peakHash = (row, column) => ((row + 11) * 73856093) ^ ((column + 17) * 19349663);
const paperPeaks = [];
if (grid) {
  for (let row = 1; row < grid.rows - 1; row += 2) {
    for (let column = 1; column < grid.cols - 1; column += 2) {
      const altitude = (
        (grid.elev[row * grid.cols + column] || 0) +
        (grid.elev[(row - 1) * grid.cols + column] || 0) +
        (grid.elev[(row + 1) * grid.cols + column] || 0)
      ) / 3;
      const hash = Math.abs(peakHash(row, column));
      if (altitude < 230 || (altitude < 430 && hash % 4 !== 0)) continue;
      const lonStep = (grid.east - grid.west) / (grid.cols - 1);
      const latStep = (grid.north - grid.south) / (grid.rows - 1);
      const lon = grid.west + (column * lonStep) + (((hash % 17) - 8) / 34) * lonStep;
      const lat = grid.north - (row * latStep) + ((((hash >> 5) % 13) - 6) / 30) * latStep;
      const [x, y] = mercProj({ lon, lat });
      const base = groundPoint(x, y);
      const width = Math.max(84, Math.min(246, 72 + altitude * .058));
      const height = Math.max(25, Math.min(80, 20 + altitude * .019));
      const peakX = base.x + (((hash >> 9) % 15) - 7) * width * .012;
      const peakY = base.y - height;
      const left = base.x - width * .56;
      const right = base.x + width * .56;
      const centre = base.x + width * .04;
      const leftShoulder = peakX - width * (.16 + (hash % 5) * .012);
      const rightShoulder = peakX + width * (.18 + ((hash >> 4) % 5) * .012);
      const palette = hash % 13 === 0 && altitude > 520
        ? PEAK_PAPER.dusk
        : altitude > 1350
          ? PEAK_PAPER.high
          : altitude > 620
            ? PEAK_PAPER.mid
            : PEAK_PAPER.low;
      const snow = altitude > 1750
        ? `\n          <path class="paper-snow" d="M${peakX},${peakY} L${peakX - width * .13},${peakY + height * .23} L${peakX - width * .03},${peakY + height * .2} L${peakX + width * .07},${peakY + height * .28} L${peakX + width * .16},${peakY + height * .22}Z"/>`
        : "";
      paperPeaks.push({
        y: base.y,
        svg: `<g class="paper-peak" data-alt="${Math.round(altitude)}">
          <path class="peak-back" fill="${palette[1]}" d="M${left},${base.y} L${leftShoulder},${peakY + height * .34} L${peakX},${peakY} L${rightShoulder},${peakY + height * .38} L${right},${base.y}Z"/>
          <path class="peak-light" fill="${palette[0]}" d="M${left},${base.y} L${leftShoulder},${peakY + height * .34} L${peakX},${peakY} L${centre},${base.y}Z"/>
          <path class="peak-shade" fill="${palette[2]}" d="M${peakX},${peakY} L${rightShoulder},${peakY + height * .38} L${right},${base.y} L${centre},${base.y}Z"/>${snow}
        </g>`,
      });
    }
  }
}
paperPeaks.sort((a, b) => a.y - b.y);
const mountainRanges = paperPeaks.map((peak) => peak.svg).join("\n      ");

// The cut-paper silhouette is real route-country geography. Quiet seams keep
// the seven-country structure legible without reverting to a road-map look.
const countryBoundaries = (data.countryRings || [])
  .map((country) => {
    const d = country.rings
      .map(ringPath)
      .join("");
    return `<path class="country-boundary" data-country="${country.name.toLowerCase()}" style="--country:${country.color}" d="${d}"/>`;
  })
  .join("\n      ");

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
const routeAheadSegs = [];
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
  const routeAttrs = `d="${pathD}" fill="none" stroke="${COUNTRY_COLOR[d.country]}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;
  routeAheadSegs.push(`<path ${routeAttrs} class="route-ahead-seg"/>`);
  segs.push(`<path id="seg-${d.n}" ${routeAttrs} class="seg"/>`);
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
    return `<circle id="dot-${d.n}" class="daydot${d.walked ? "" : " restdot"}${d.sleeve ? " hasrec" : ""}" cx="${point.x}" cy="${point.y}" r="${d.sleeve ? 1.8 : 1.15}" data-day="${d.n}"/>`;
  })
  .join("\n    ");

const townMarks = townsPlaced
  .map((t) => {
    const point = mapPoint(t.x, t.y, t.alt);
    const X = point.x;
    const Y = point.y;
    const anchor = t.anchor === "start" ? "start" : t.anchor === "end" ? "end" : "middle";
    return `<g class="town${t.pass ? " pass" : ""}" id="town-${t.name.toLowerCase().replace(/[^a-z]+/g, "-")}">
${t.pass ? "" : `      <circle cx="${X}" cy="${Y}" r="3.15" class="townhalo"/>\n`}
      <circle cx="${X}" cy="${Y}" r="1.05" class="towndot"/>
      <text x="${X + (t.dx || 0)}" y="${Y + (t.dy || 0)}" text-anchor="${anchor}" class="townlabel">${t.name}</text>
    </g>`;
  })
  .join("\n    ");

const startAlt = altAt(start[0], start[1]);
const startPoint = mapPoint(start[0], start[1], startAlt);

const atlasSvg = `
<svg id="atlas" viewBox="0 0 ${VBW} ${VBH}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <filter id="paper-grain-filter" x="-3%" y="-3%" width="106%" height="106%">
      <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="29" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values=".25 0 0 0 .63  0 .24 0 0 .59  0 0 .2 0 .48  0 0 0 .16 0" result="grain"/>
      <feBlend in="SourceGraphic" in2="grain" mode="multiply"/>
    </filter>
    <filter id="land-shadow-filter" x="-8%" y="-8%" width="116%" height="124%">
      <feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#080A09" flood-opacity=".48"/>
    </filter>
    <clipPath id="land-clip"><path d="${landShape}"/></clipPath>
    <pattern id="contour-pattern" width="210" height="176" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="#D5CBAE" stroke-opacity=".075" stroke-width="1.1">
        <path d="M-18 88C18 34 72 25 111 61s69 41 117-4"/>
        <path d="M-23 102C20 48 70 43 105 76s76 43 132-5"/>
        <path d="M-28 117C20 64 68 60 100 91s81 44 146-7"/>
        <path d="M35 159C54 124 101 116 128 143s52 28 84 5"/>
      </g>
    </pattern>
    <mask id="route-progress-mask" maskUnits="userSpaceOnUse" x="-100" y="-100" width="${VBW + 200}" height="${VBH + 200}">
      <path id="route-progress-mask-path" d="${trackPath}" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 99999"/>
    </mask>
  </defs>
  <g id="camera">
    <rect class="sea-contours" x="-900" y="-900" width="${VBW + 1800}" height="${VBH + 1800}" fill="url(#contour-pattern)"/>
    <path class="land-shadow" d="${landShape}" filter="url(#land-shadow-filter)"/>
    <path class="land-paper" d="${landShape}" filter="url(#paper-grain-filter)"/>
    <g clip-path="url(#land-clip)">
      <g id="terrain-mesh">${terrainCells.join("\n      ")}</g>
      <g id="mountain-ranges">${mountainRanges}</g>
      <rect class="land-grain" x="-120" y="-120" width="${VBW + 240}" height="${VBH + 240}" filter="url(#paper-grain-filter)"/>
    </g>
    <g id="country-boundaries">${countryBoundaries}</g>
    <g id="water">
      ${lakePaths}
      ${riverPaths}
    </g>
    <path id="route-base" d="${trackPath}" fill="none" stroke="#171B19" stroke-opacity=".62" stroke-width="10.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <g id="route-ahead">${routeAheadSegs.join("\n      ")}</g>
    <g id="route-travelled" mask="url(#route-progress-mask)">${segs.join("\n      ")}</g>
    ${dayDots}
    <g id="route-now" transform="translate(${startPoint.x} ${startPoint.y})">
      <ellipse class="walker-shadow" cx="0" cy="3.5" rx="8" ry="2.8"/>
      <g class="walker-figure" transform="translate(0 -4)">
        <circle class="walker-head" cx="0" cy="-8.7" r="2.5"/>
        <path class="walker-pack" d="M-5 -6.6h4.2v8.4h-4.8z"/>
        <path class="walker-body" d="M-.9 -6.4L3.1-3.1 1.5 3.7-2.8 3.3-3-2.4Z"/>
        <path class="walker-limbs" d="M-1.8 2.5L-4.2 9M1.1 2.8L4.1 8.7M1.4-3L5.2.3M5.2.3L6.4 8.8"/>
      </g>
    </g>
    ${townMarks}
  </g>
</svg>`;

// ----------------------------------------------------------------- timeline
// Scroll scenes, in order: walk legs day by day and a held plate at each border.
// Photo-rich and journal-rich days get enough length for their complete story;
// rest points pass quickly and silently.
const PX_PER_KM = 9;
function walkSceneLength(d) {
  if (!d.walked) return 36;
  const base = Math.max(180, Math.round((d.km || 30) * PX_PER_KM));
  const photoCount = (photosByDay[d.n] || []).length;
  const journalCount = (JOURNAL[d.n] || []).length;
  const photoLength = photoCount > 3 ? 260 + (photoCount - 3) * 70 : 0;
  return Math.max(base, photoLength, journalCount * 360);
}
const scenes = [];
scenes.push({ t: "start", len: 620 });
scenes.push({ t: "enter", country: "France", len: 760 });
scenes.push({ t: "walk", day: 1, len: walkSceneLength(pts[0]) });
for (let i = 1; i < pts.length; i++) {
  const d = pts[i];
  const prev = pts[i - 1];
  if (d.country !== prev.country) {
    scenes.push({ t: "enter", country: d.country, len: 760 });
  }
  scenes.push({ t: "walk", day: d.n, len: walkSceneLength(d) });
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
    j: JOURNAL[d.n] || [],
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

// The collecting rail follows the same journey clock as the route. Places
// inherit the nearest numbered day along the GPS trace; albums are unique
// records, collected on the first day they appear.
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
    km: +((town.s / Math.max(1, gpsVerts[gpsVerts.length - 1].s)) * data.facts.km).toFixed(1),
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
  vb: [VBW, VBH],
  start: [startPoint.x, startPoint.y],
  startAlt: Math.round(startAlt),
  walkPaths,
  photos: storyPhotos,
  places,
  albums,
};

// ------------------------------------------------------------------- helpers
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
fill("__WALL_PLACE_COUNT__", places.length);
fill("__WALL_ALBUM_COUNT__", albums.length);
fill("__ROUTE_GRADIENT__", routeGradient);
fill("__DATA_JSON__", JSON.stringify(jsData));

fs.writeFileSync(dataPath, JSON.stringify(data, null, 1) + "\n");
fs.writeFileSync(outPath, html);

const townReport = townsPlaced
  .map((t) => `${t.name} ${(t.snapM / 1000).toFixed(1)}km`)
  .join(", ");
console.log(
  `built public/trek/index.html — ${pts.length} days, ${Object.values(JOURNAL).flat().length} journal excerpts, ${storyPhotos.length} photographs, timeline ${TIMELINE_TOTAL}px, ${(html.length / 1024).toFixed(0)}K, route ${route.length} pts (${townsPlaced.length} cities)${grid ? ", elevation on" : ""}`
);
console.log(`cities on the line: ${townReport}`);
}
