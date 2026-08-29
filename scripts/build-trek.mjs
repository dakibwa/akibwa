#!/usr/bin/env node
// Build /trek — the 2019 walk, Paris to Sofia, travelled through the map.
//
// The page is one full-screen atlas. Scroll walks the line: the camera
// follows a walker along the GPS day points, towns arrive and pass, each
// country opens with its Imagine ground, records and journal beats surface
// at their days, and day 39 — the day Strava holds nothing — goes dark.
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
// Short excerpts from the 2019 journal (A Generous Slice), surfaced at their days.
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
  33: {
    label: "the first sign",
    quote:
      "Out here I'm living on the bare minimum and I often think what am I missing… human interaction is essential for me to feel energised and keep the motivation flowing.",
  },
  48: {
    label: "steadied",
    quote:
      "After a flurry of anxiety following losing my purse with cards and cash in, I've calmed myself and back to a still state.",
  },
  49: {
    label: "the furthest day",
    quote:
      "Today I have set a new personal record, not for speed but instead for the furthest I've ever travelled on foot. My ankles feel shot but surprisingly the rest of my body feels full of vigor.",
  },
  64: {
    label: "the purpose",
    quote:
      "We all should have a purpose in our lives. If someone asks you why you get up in the morning you should be able to quip a single sentence — for me that is to encourage others to find what makes them happy and pursue it.",
  },
  67: {
    label: "the decision",
    quote:
      "Problems melt away when the heart rate is jacked up… yet it's more than likely the problems will return when I get on the road. I'll sit with this for at least another day.",
  },
};
const GAP39 =
  "The build up of fatigue, anxiety and loneliness all came to a tipping point. After dragging my feet along a main road for hours with cars speeding past me, I began to think why am I doing this?";

// -------------------------------------------------------------------- towns
// Staging posts. These are the anchors: the line visits each city, and the
// GPS fills the journey between them. Coordinates are Web Mercator (same
// CRS as the Strava tracks). Paris is the walk start at Charles de Gaulle,
// not the city centre.
// Labels only for places the GPS actually went through — not nearby cities
// the walk passed. Paris stays at the CDG start, not Notre-Dame.
const TOWNS = [
  { name: "Paris", lon: 2.55, lat: 49.01, dx: -10, dy: -12, anchor: "end", start: true },
  { name: "Reims", lon: 4.03, lat: 49.26, dx: 0, dy: -14 },
  { name: "Nancy", lon: 6.18, lat: 48.69, dx: 0, dy: 22 },
  { name: "Saverne", lon: 7.36, lat: 48.74, dx: 0, dy: -14 },
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
  const cols = 32;
  const rows = 20;
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

const altAt = (x, y) => {
  if (!grid) return 0;
  const { lon, lat } = unproj(x, y);
  return sampleGrid(grid, lon, lat);
};

const gpsVerts = flattenTracks(data.tracks);
// Pull the line through a town centre only if the walk actually got that close.
const THROUGH_M = 8000;
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
  if (!t.pass && snap.d > THROUGH_M) continue;
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
      .map((ring) => "M" + ring.map(([x, y]) => `${sx(x)} ${sy(y)}`).join("L") + "Z")
      .join("");
    return `<path d="${d}" fill="${c.color}" fill-opacity=".05" stroke="${c.color}" stroke-opacity=".28" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;
  })
  .join("\n    ");

const trackPath = "M" + route.map((p) => `${sx(p.x)} ${sy(p.y)}`).join("L");

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
  const i1 = Math.max(routeAt, nearestRouteIdx(d.x, d.y, routeAt));
  let slice = route.slice(routeAt, i1 + 1);
  if (slice.length < 2) {
    const a = route[routeAt] || route[0];
    const b = route[i1] || a;
    slice = [a, b];
  }
  routeAt = i1;
  walkPaths[d.n] = slice.map((p) => ({
    x: sx(p.x),
    y: sy(p.y),
    alt: Math.round(altAt(p.x, p.y)),
  }));
  const pathD = "M" + slice.map((p) => `${sx(p.x)} ${sy(p.y)}`).join("L");
  segs.push(
    `<path id="seg-${d.n}" d="${pathD}" fill="none" stroke="${COUNTRY_COLOR[d.country]}" stroke-width="2.6" vector-effect="non-scaling-stroke" ${d.walked ? "" : 'stroke-dasharray="3 6"'} class="seg"/>`
  );
}

function placeOnTown(x, y) {
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
    const at = placeOnTown(d.x, d.y);
    return `<circle id="dot-${d.n}" class="daydot${d.walked ? "" : " restdot"}${d.sleeve ? " hasrec" : ""}" cx="${sx(at.x)}" cy="${sy(at.y)}" r="${d.sleeve ? 3.2 : 2.2}" data-day="${d.n}"/>`;
  })
  .join("\n    ");

const townMarks = townsPlaced
  .map((t) => {
    const X = sx(t.x);
    const Y = sy(t.y);
    const anchor = t.anchor === "start" ? "start" : t.anchor === "end" ? "end" : "middle";
    return `<g class="town${t.pass ? " pass" : ""}" id="town-${t.name.toLowerCase().replace(/[^a-z]+/g, "-")}">
      <circle cx="${X}" cy="${Y}" r="2" class="towndot"/>
      <text x="${X + (t.dx || 0)}" y="${Y + (t.dy || 0)}" text-anchor="${anchor}" class="townlabel">${t.name}</text>
    </g>`;
  })
  .join("\n    ");

const startAlt = altAt(start[0], start[1]);

const atlasSvg = `
<svg id="atlas" viewBox="0 0 ${VBW} ${VBH}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <g id="camera">
    <g id="rings">${ringPaths}</g>
    <path id="gps" d="${trackPath}" fill="none" stroke="#EFE6D4" stroke-opacity=".14" stroke-width="1" vector-effect="non-scaling-stroke"/>
    ${segs.join("\n    ")}
    ${dayDots}
    ${townMarks}
    <g id="walker-g" transform="translate(${sx(pts[0].x)},${sy(pts[0].y)})">
      <ellipse id="walker-shadow" cx="0" cy="1.1" rx="5.2" ry="1.7"/>
      <circle id="walker-pin" cx="0" cy="0" r="2.3"/>
    </g>
  </g>
</svg>`;

// ----------------------------------------------------------------- timeline
// Scroll scenes, in order: walk legs day by day, a held plate at each border,
// held quotes at the beats, and the long dark for day 39.
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
  if (d.n === 39) {
    scenes.push({ t: "gap", day: 39, len: 1150 });
    continue;
  }
  const walkLen = d.walked ? Math.max(180, Math.round((d.km || 30) * PX_PER_KM)) : 150;
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
  const at = placeOnTown(d.x, d.y);
  return {
    n: d.n,
    t: d.title,
    date: d.date,
    km: d.km || 0,
    min: d.movingMin || 0,
    elev: d.elevM || 0,
    alt: Math.round(altAt(at.x, at.y)),
    w: d.walked ? 1 : 0,
    c: d.country,
    x: sx(at.x),
    y: sy(at.y),
    s: d.sleeve || null,
  };
});
let cum = 0;
for (const d of jsDays) {
  if (d.w) cum += d.km;
  d.cum = +cum.toFixed(1);
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
  scenes,
  timeline: TIMELINE_TOTAL,
  beats: BEATS,
  gap39: GAP39,
  vb: [VBW, VBH],
  start: [sx(start[0]), sy(start[1])],
  startAlt: Math.round(startAlt),
  walkPaths,
  photos,
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
    const walked = act.days.filter((d) => d.walked).length;
    const rest = act.days.length - walked;
    return `
  <div class="plate" id="plate-${act.name.toLowerCase()}" style="--c:${COUNTRY_COLOR[act.name]}">
    <img src="grounds/${act.name.toLowerCase()}.webp" alt="" width="640" height="640" loading="lazy" decoding="async">
    <div class="plate-text">
      <p class="plate-count">the ${ordinals[i]} country</p>
      <h2 class="plate-name">${act.name}</h2>
      <p class="plate-facts">${km} km · ${walked} days walked${rest ? ` · ${rest} rest` : ""}</p>
    </div>
  </div>`;
  })
  .join("\n");

// -------------------------------------------------------------------- shelf
const seenSlug = new Set();
const shelfDays = data.days.filter(
  (d) => d.sleeve && !seenSlug.has(d.sleeve.slug) && seenSlug.add(d.sleeve.slug)
);
const shelfHtml = shelfDays
  .map(
    (d) =>
      `<li><button data-day="${d.n}" style="--sc:${COUNTRY_COLOR[d.country]}" aria-haspopup="dialog" aria-label="${esc(d.sleeve.artist)} — ${esc(d.sleeve.album)}, day ${d.n}"><img src="covers/${d.sleeve.slug}-thumb.webp" alt="" width="160" height="160" loading="lazy" decoding="async"></button></li>`
  )
  .join("\n    ");

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
fill("<!--__SHELF__-->", shelfHtml);
fill("<!--__NOSCRIPT_DAYS__-->", noscriptHtml);
fill("__DATA_JSON__", JSON.stringify(jsData));

fs.writeFileSync(dataPath, JSON.stringify(data, null, 1) + "\n");
fs.writeFileSync(outPath, html);

const townReport = townsPlaced
  .map((t) => `${t.name} ${(t.snapM / 1000).toFixed(1)}km`)
  .join(", ");
console.log(
  `built public/trek/index.html — ${pts.length} days, ${shelfDays.length} records, timeline ${TIMELINE_TOTAL}px, ${(html.length / 1024).toFixed(0)}K, route ${route.length} pts (${townsPlaced.length} cities)${grid ? ", elevation on" : ""}`
);
console.log(`cities on the line: ${townReport}`);
}
