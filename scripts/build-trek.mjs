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
// The staging posts, projected from lon/lat into the life-map plane using two
// solid anchors: the route's first GPS point (the Charles de Gaulle perimeter)
// and day 67 (central Sofia).
const TOWNS = [
  { name: "Paris", lon: 2.55, lat: 49.01, dx: -10, dy: -12, anchor: "end" },
  { name: "Reims", lon: 4.03, lat: 49.26, dx: 0, dy: -14 },
  { name: "Nancy", lon: 6.18, lat: 48.69, dx: 0, dy: 22 },
  { name: "Strasbourg", lon: 7.75, lat: 48.58, dx: 0, dy: -14 },
  { name: "Stuttgart", lon: 9.18, lat: 48.78, dx: 0, dy: -14 },
  { name: "Augsburg", lon: 10.9, lat: 48.37, dx: 0, dy: -14 },
  { name: "Munich", lon: 11.58, lat: 48.14, dx: 12, dy: -10, anchor: "start" },
  { name: "Salzburg", lon: 13.05, lat: 47.8, dx: 12, dy: -8, anchor: "start" },
  { name: "the Tauern", lon: 13.15, lat: 47.15, dx: 14, dy: 4, anchor: "start", pass: true },
  { name: "Klagenfurt", lon: 14.31, lat: 46.62, dx: 0, dy: 22 },
  { name: "Maribor", lon: 15.65, lat: 46.55, dx: 0, dy: -14 },
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

const COUNTRY_COLOR = Object.fromEntries(data.countries.map((c) => [c.name, c.color]));

const ringPaths = data.countryRings
  .map((c) => {
    const d = c.rings
      .map((ring) => "M" + ring.map(([x, y]) => `${sx(x)} ${sy(y)}`).join("L") + "Z")
      .join("");
    return `<path d="${d}" fill="${c.color}" fill-opacity=".045" stroke="${c.color}" stroke-opacity=".22" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;
  })
  .join("\n    ");

const trackPath = data.tracks
  .map((t) => "M" + t.map(([x, y]) => `${sx(x)} ${sy(y)}`).join("L"))
  .join(" ");

// Per-day segments of the walked line, lit as the walker passes.
const segs = [];
for (let i = 1; i < pts.length; i++) {
  const a = pts[i - 1];
  const b = pts[i];
  segs.push(
    `<line id="seg-${b.n}" x1="${sx(a.x)}" y1="${sy(a.y)}" x2="${sx(b.x)}" y2="${sy(b.y)}" stroke="${COUNTRY_COLOR[b.country]}" stroke-width="2.6" vector-effect="non-scaling-stroke" ${b.walked ? "" : 'stroke-dasharray="3 6"'} class="seg"/>`
  );
}

const dayDots = pts
  .map(
    (d) =>
      `<circle id="dot-${d.n}" class="daydot${d.walked ? "" : " restdot"}${d.sleeve ? " hasrec" : ""}" cx="${sx(d.x)}" cy="${sy(d.y)}" r="${d.sleeve ? 3.2 : 2.2}" data-day="${d.n}"/>`
  )
  .join("\n    ");

const townMarks = TOWNS.map((t) => {
  const [px, py] = proj(t);
  const X = sx(px);
  const Y = sy(py);
  const anchor = t.anchor === "start" ? "start" : t.anchor === "end" ? "end" : "middle";
  return `<g class="town${t.pass ? " pass" : ""}" id="town-${t.name.toLowerCase().replace(/[^a-z]+/g, "-")}">
      <circle cx="${X}" cy="${Y}" r="2" class="towndot"/>
      <text x="${X + (t.dx || 0)}" y="${Y + (t.dy || 0)}" text-anchor="${anchor}" class="townlabel">${t.name}</text>
    </g>`;
}).join("\n    ");

const atlasSvg = `
<svg id="atlas" viewBox="0 0 ${VBW} ${VBH}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <g id="camera">
    <g id="rings">${ringPaths}</g>
    <path id="gps" d="${trackPath}" fill="none" stroke="#EFE6D4" stroke-opacity=".14" stroke-width="1" vector-effect="non-scaling-stroke"/>
    ${segs.join("\n    ")}
    ${dayDots}
    ${townMarks}
    <circle id="walker" cx="${sx(pts[0].x)}" cy="${sy(pts[0].y)}" r="4"/>
    <circle id="walker-halo" cx="${sx(pts[0].x)}" cy="${sy(pts[0].y)}" r="10"/>
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
const jsDays = pts.map((d) => ({
  n: d.n,
  t: d.title,
  date: d.date,
  km: d.km || 0,
  min: d.movingMin || 0,
  elev: d.elevM || 0,
  w: d.walked ? 1 : 0,
  c: d.country,
  x: sx(d.x),
  y: sy(d.y),
  s: d.sleeve || null,
}));
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

// Sanity: report how far each town label sits from the nearest day point.
let worst = 0;
for (const t of TOWNS) {
  const [px, py] = proj(t);
  let best = Infinity;
  for (const d of pts) best = Math.min(best, Math.hypot(d.x - px, d.y - py));
  worst = Math.max(worst, best);
}
console.log(
  `built public/trek/index.html — ${pts.length} days, ${shelfDays.length} records, timeline ${TIMELINE_TOTAL}px, ${(html.length / 1024).toFixed(0)}K (worst town offset ${(worst / 108000 * 92).toFixed(0)} km)`
);
