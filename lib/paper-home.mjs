/*
 * Build-time shaping for the paper homepage.
 *
 * Pure functions: app/page.jsx feeds them the committed public data during the
 * static export, and scripts/check-navigation-contract.mjs exercises them in
 * Node. Only their small results reach the browser — never the full listening
 * catalogue or the detailed Trek route.
 */

const round = (value, places = 1) => Number(value.toFixed(places));

/* ---------------------------------------------------------------- music -- */

// The first songs and artists of the public ranking, printed into the page so
// the Music room reads before the full record (public/music-ranking.json)
// loads, and without JavaScript.
export function musicPreview(packet, size = 10) {
  const { names } = packet;
  return {
    asOf: packet.asOf,
    asOfLabel: new Date(`${packet.asOf}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    songs: packet.songs.slice(0, size).map(([title, artist, plays], index) => ({ rank: index + 1, title, artist: names[artist], plays })),
    artists: packet.artists.slice(0, size).map(([name, plays], index) => ({ rank: index + 1, name: names[name], plays }))
  };
}

/* --------------------------------------------------------------- career -- */

export const CAREER_VIEW = { width: 1000, height: 430 };
const CAREER_FROM = 2016;
const CAREER_TO = 2027.2;
const careerX = (year) => 64 + ((year - CAREER_FROM) / (CAREER_TO - CAREER_FROM)) * 872;
const careerY = (level) => 350 - level * 262;
const LOOP_RADIUS = 23;

// "2016 — 2017", "2020", "2024 — present" and "Now" become a span in years.
export function roleSpan(span, now) {
  const years = (span.match(/\d{4}/g) ?? []).map(Number);
  const current = /present|now/i.test(span);
  const start = years[0] ?? now;
  const end = current ? now : (years[1] ?? years[0]) + 1;
  return { start, end, current, middle: current && !years.length ? now : (start + end) / 2 };
}

/*
 * The career as one flight path: time runs left to right and the line climbs
 * steadily from the first role to the current one. The hands-on labouring
 * roles are loops in the line — detours, not dips. Each role's segment is kept
 * separately so the client can measure how far along the path a role sits.
 */
export function careerTrajectory(career, { now = 2026.7, trekYear = 2019.85 } = {}) {
  const chronological = [...career].reverse();
  const spans = chronological.map((job) => roleSpan(job.span, now));
  const last = chronological.length - 1;
  const roles = chronological.map((job, index) => {
    const span = spans[index];
    return {
      name: job.name,
      role: job.role,
      span: job.span.replace(/ — /g, "–"),
      statement: job.statement,
      emphasis: job.emphasis ?? [],
      logo: job.logo,
      accent: job.accent,
      current: span.current,
      loop: /labourer/i.test(job.role),
      x: round(careerX(span.middle)),
      y: round(careerY(0.05 + (0.9 * index) / last))
    };
  });

  // Catmull–Rom tangents, levelled at loops so the curl leaves and rejoins
  // the line horizontally.
  const tangent = (index) => {
    const before = roles[Math.max(0, index - 1)];
    const after = roles[Math.min(last, index + 1)];
    const scale = index === 0 || index === last ? 1 : 0.5;
    const dx = (after.x - before.x) * scale;
    const dy = roles[index].loop ? 0 : (after.y - before.y) * scale;
    return [dx, dy];
  };
  const loop = ({ x, y }) =>
    `A${LOOP_RADIUS} ${LOOP_RADIUS} 0 0 0 ${x} ${round(y - 2 * LOOP_RADIUS)}A${LOOP_RADIUS} ${LOOP_RADIUS} 0 0 0 ${x} ${y}`;
  const segments = roles.map((role, index) => {
    if (index === 0) return `M${role.x} ${role.y}`;
    const previous = roles[index - 1];
    const [ax, ay] = tangent(index - 1);
    const [bx, by] = tangent(index);
    const curve = `C${round(previous.x + ax / 3)} ${round(previous.y + ay / 3)} ${round(role.x - bx / 3)} ${round(role.y - by / 3)} ${role.x} ${role.y}`;
    return role.loop ? curve + loop(role) : curve;
  });

  // The walk to Sofia sits on the line between the two roles either side of it.
  const afterTrek = spans.findIndex((span) => span.start >= Math.ceil(trekYear));
  const [left, right] = [roles[afterTrek - 1], roles[afterTrek]];
  const share = (careerX(trekYear) - left.x) / (right.x - left.x);
  const years = [];
  for (let year = CAREER_FROM; year <= Math.floor(now); year += 1) years.push({ year, x: round(careerX(year)) });

  return {
    view: CAREER_VIEW,
    roles,
    segments,
    years,
    trek: { x: round(careerX(trekYear)), y: round(left.y + (right.y - left.y) * share), after: afterTrek - 1 }
  };
}

/* ----------------------------------------------------------------- trek -- */

const EARTH = 6378137;
// Web Mercator with north up, matching data/trek-days.json and trek-atlas.json.
const mercator = ([lon, lat]) => [
  (EARTH * lon * Math.PI) / 180,
  -EARTH * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
];

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, lastIndex] = stack.pop();
    const [ax, ay] = points[first];
    const [bx, by] = points[lastIndex];
    const length = Math.hypot(bx - ax, by - ay) || 1;
    let farthest = -1;
    let distance = tolerance;
    for (let index = first + 1; index < lastIndex; index += 1) {
      const [px, py] = points[index];
      const offset = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / length;
      if (offset > distance) {
        distance = offset;
        farthest = index;
      }
    }
    if (farthest > 0) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, lastIndex]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

// Closed rings have no baseline of their own: split each at its farthest
// point from the start and simplify the two halves.
function simplifyRing(ring, tolerance) {
  const open = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring;
  let far = 0;
  let farthest = -1;
  open.forEach(([x, y], index) => {
    const distance = Math.hypot(x - open[0][0], y - open[0][1]);
    if (distance > farthest) [farthest, far] = [distance, index];
  });
  const first = simplify(open.slice(0, far + 1), tolerance);
  const second = simplify([...open.slice(far), open[0]], tolerance);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

const pathOf = (points, close = false) =>
  points.map(([x, y], index) => `${index ? "L" : "M"}${round(x)} ${round(y)}`).join("") + (close ? "Z" : "");

// One photograph per country, chosen from the public Trek set: landscapes and
// signs only, no people.
export const TREK_PHOTOS = {
  France: "d02-05.webp",
  Germany: "d22-03.webp",
  Austria: "d28-09.webp",
  Slovenia: "d36-03.webp",
  Croatia: "d38-03.webp",
  Serbia: "d52-06.webp",
  Bulgaria: "d65-04.webp"
};

/*
 * A pencil sketch of the walk: the recorded route simplified to the page's
 * scale, the Natural Earth outlines it crosses, and where each numbered day
 * ended as a share of the drawn line. Coordinates are page units, not degrees.
 */
export function trekSketch({ days, atlas, route, photos, facts }, { width = 1000 } = {}) {
  const parts = [...route.features]
    .sort((a, b) => a.properties.day - b.properties.day || a.properties.recording - b.properties.recording || a.properties.part - b.properties.part)
    .map((feature) => feature.geometry.coordinates.map(mercator));
  const all = parts.flat();
  const xs = all.map(([x]) => x);
  const ys = all.map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const padX = (maxX - minX) * 0.05;
  const padTop = (maxY - minY) * 0.16;
  const padBottom = (maxY - minY) * 0.12;
  const originX = minX - padX;
  const originY = minY - padTop;
  const scale = width / (maxX - minX + 2 * padX);
  const height = round((maxY - minY + padTop + padBottom) * scale);
  const local = ([x, y]) => [(x - originX) * scale, (y - originY) * scale];

  // Recorded stretches are drawn solid; the joins between recordings (the
  // two train rides and unrecorded gaps) are drawn dashed.
  const walked = parts.map((part) => simplify(part.map(local), 0.45));
  const joins = [];
  for (let index = 1; index < walked.length; index += 1) {
    const [from, to] = [walked[index - 1].at(-1), walked[index][0]];
    if (Math.hypot(to[0] - from[0], to[1] - from[1]) > 0.8) joins.push([from, to]);
  }

  // Progress along the drawn line, gaps included, so the pen and the walker
  // move together.
  const line = [];
  walked.forEach((part) => line.push(...part));
  const lengths = [0];
  for (let index = 1; index < line.length; index += 1) {
    lengths.push(lengths[index - 1] + Math.hypot(line[index][0] - line[index - 1][0], line[index][1] - line[index - 1][1]));
  }
  const total = lengths.at(-1);
  let cursor = 0;
  const dayMarks = days.map((day) => {
    const [x, y] = local([day.x, day.y]);
    let best = cursor;
    let bestDistance = Infinity;
    for (let index = cursor; index < line.length; index += 1) {
      const distance = Math.hypot(line[index][0] - x, line[index][1] - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    cursor = best;
    return { n: day.n, date: day.date, country: day.country, walked: Boolean(day.walked), progress: round(lengths[best] / total, 4) };
  });

  const view = [0, 0, width, height];
  const inView = (ring) => ring.some(([x, y]) => x > -40 && x < width + 40 && y > -40 && y < height + 40);
  const countries = atlas.countries
    .map((country) => ({
      name: country.name,
      d: country.rings
        .map((ring) => ring.map(local))
        .filter(inView)
        .map((ring) => simplifyRing(ring, 0.9))
        .filter((ring) => ring.length > 3)
        .map((ring) => pathOf(ring, true))
        .join("")
    }))
    .filter((country) => country.d);

  // Country names sit beside the stretch of route walked through them.
  const labels = [];
  for (const name of Object.keys(TREK_PHOTOS)) {
    const marks = dayMarks.filter((mark) => mark.country === name);
    if (!marks.length) continue;
    const middle = marks[Math.floor(marks.length / 2)].progress * total;
    const index = lengths.findIndex((length) => length >= middle);
    labels.push({ name, x: round(line[index][0]), y: round(line[index][1]) });
  }

  const byFile = new Map(photos.map((photo) => [photo.src, photo]));
  return {
    view,
    total: round(total),
    route: walked.map((part) => pathOf(part)).join(""),
    line: pathOf(line),
    joins: joins.map(([from, to]) => pathOf([from, to])).join(""),
    countries,
    labels,
    start: { name: facts.from, x: round(line[0][0]), y: round(line[0][1]) },
    end: { name: facts.to, x: round(line.at(-1)[0]), y: round(line.at(-1)[1]) },
    days: dayMarks,
    photos: Object.entries(TREK_PHOTOS).map(([country, src]) => ({
      country,
      src: `/trek/photos/${src}`,
      day: byFile.get(src)?.day ?? null,
      width: byFile.get(src)?.w ?? 480,
      height: byFile.get(src)?.h ?? 360,
      alt: byFile.get(src)?.alt ?? `Photograph from the walk through ${country}`
    })),
    facts: { from: facts.from, to: facts.to, start: facts.start, end: facts.end, days: days.length, countries: facts.countries }
  };
}
