/*
 * The homepage Trek room's film track, built only from the Trek's existing
 * public data: the elevation profile along the drawn path, the recorded route
 * order, the reconstructed walking links and two train links, the 67 days,
 * the approved chapters and moments, and the photograph manifest.
 *
 *   node scripts/build-trek-film.mjs           write public/trek-film.json
 *   node scripts/build-trek-film.mjs --check   fail if it is out of date
 *
 * Distances follow the drawn path (recorded pieces plus connections). Walked
 * kilometres and metres climbed follow the Trek page's own method: recorded
 * daily totals plus the estimated walking links, never the trains. Photograph
 * positions within a day are spread in capture order; their exact places are
 * not recorded publicly.
 */
import { readFileSync, writeFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const profile = read("public/trek/elevation-profile.json");
const route = read("public/trek/route-detail.json");
const links = read("public/trek/route-links.json");
const { days, facts } = read("data/trek-days.json");
const story = read("public/trek/moments.json");
const photos = read("public/trek/photos/manifest.json");
const ranking = read("public/music-ranking.json");

const STEP = 1000;
const fail = (message) => {
  throw new Error(`Trek film: ${message}`);
};

const recorded = profile.pieces.filter((piece) => piece.kind === "recorded");
const connections = profile.pieces.filter((piece) => piece.kind === "connection");
const features = [...route.features].sort(
  (a, b) => a.properties.day - b.properties.day || a.properties.recording - b.properties.recording || a.properties.part - b.properties.part
);
if (recorded.length !== features.length) fail(`${recorded.length} recorded pieces for ${features.length} recordings`);
if (connections.length !== links.features.length) fail(`${connections.length} connections for ${links.features.length} links`);
profile.pieces.forEach((piece, index) => {
  if (piece.kind !== (index % 2 ? "connection" : "recorded")) fail("pieces must alternate recorded and connection");
});

const km = (day) => days[day - 1].km ?? 0;
const dayEnd = new Array(days.length + 1).fill(null);
dayEnd[0] = 0;
const recordedShare = days.map(() => []); // [start, end] spans of recorded path per day

recorded.forEach((piece, index) => {
  const { day, throughDay = day } = features[index].properties;
  if (throughDay > day) {
    // One recording shared by several days: divide it by their distances.
    const span = [];
    for (let d = day; d <= throughDay; d += 1) span.push(d);
    const total = span.reduce((sum, d) => sum + km(d), 0) || span.length;
    let start = piece.start;
    span.forEach((d) => {
      const end = start + (piece.end - piece.start) * ((km(d) || total / span.length) / total);
      recordedShare[d - 1].push([start, end]);
      dayEnd[d] = Math.max(dayEnd[d] ?? 0, end);
      start = end;
    });
  } else {
    recordedShare[day - 1].push([piece.start, piece.end]);
    dayEnd[day] = Math.max(dayEnd[day] ?? 0, piece.end);
  }
});

// Days without their own recording share the connection that spans them.
connections.forEach((piece, index) => {
  const { fromDay, day } = links.features[index].properties;
  const between = [];
  for (let d = fromDay + 1; d < day; d += 1) between.push(d);
  between.forEach((d, position) => {
    dayEnd[d] = piece.start + ((piece.end - piece.start) * (position + 1)) / between.length;
  });
});
for (let d = 1; d <= days.length; d += 1) dayEnd[d] = Math.max(dayEnd[d] ?? dayEnd[d - 1], dayEnd[d - 1]);
const dayStart = (d) => dayEnd[d - 1];
const dayOf = (distance) => {
  for (let d = 1; d <= days.length; d += 1) if (distance <= dayEnd[d] + 0.5) return d;
  return days.length;
};

// Ground height anywhere along the path.
const heights = profile.pieces.flatMap((piece) => piece.samples);
const heightAt = (distance) => {
  let low = 0;
  let high = heights.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (heights[middle][0] <= distance) low = middle;
    else high = middle;
  }
  const [d0, h0] = heights[low];
  const [d1, h1] = heights[high];
  return h0 + (h1 - h0) * Math.min(1, Math.max(0, (distance - d0) / (d1 - d0 || 1)));
};

// The reconstructed walks, measured exactly as the Trek page measures them
// (public/trek/journey-route.js), so the totals agree.
const metres = (a, b) => 111195 * Math.hypot((b[0] - a[0]) * Math.cos(((a[1] + b[1]) * Math.PI) / 360), b[1] - a[1]);
let walkedBefore = 0;
let climbedBefore = 0;
const walks = [];
const trains = [];
connections.forEach((piece, index) => {
  const link = links.features[index];
  if (link.properties.mode === "train") {
    trains.push({ start: piece.start, end: piece.end, day: link.properties.day });
    return;
  }
  const coordinates = link.geometry.coordinates;
  let length = 0;
  for (let i = 1; i < coordinates.length; i += 1) length += metres(coordinates[i - 1], coordinates[i]);
  const climbs = [[piece.start, 0]];
  let climb = 0;
  for (let i = 1; i < piece.samples.length; i += 1) {
    climb += Math.max(0, piece.samples[i][1] - piece.samples[i - 1][1]);
    climbs.push([piece.samples[i][0], climb]);
  }
  walks.push({ start: piece.start, end: piece.end, km: length / 1000, climbs, beforeKm: walkedBefore, beforeClimb: climbedBefore });
  walkedBefore += length / 1000;
  climbedBefore += climb;
});
const estimatedAt = (distance) => {
  for (const walk of walks) {
    if (distance >= walk.end) continue;
    if (distance <= walk.start) return [walk.beforeKm, walk.beforeClimb];
    const t = (distance - walk.start) / (walk.end - walk.start || 1);
    let climb = 0;
    for (const [at, value] of walk.climbs) if (at <= distance) climb = value;
    return [walk.beforeKm + walk.km * t, walk.beforeClimb + climb];
  }
  return [walkedBefore, climbedBefore];
};

const cumulative = [0];
const cumulativeClimb = [0];
days.forEach((day, index) => {
  cumulative.push(cumulative[index] + (day.km ?? 0));
  cumulativeClimb.push(cumulativeClimb[index] + (day.elevM ?? 0));
});
const recordedAt = (distance) => {
  const d = dayOf(distance);
  const spans = recordedShare[d - 1];
  const total = spans.reduce((sum, [a, b]) => sum + (b - a), 0);
  const covered = spans.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(b, distance) - a), 0);
  const share = total ? covered / total : distance >= dayEnd[d] ? 1 : 0;
  return [
    cumulative[d - 1] + (days[d - 1].km ?? 0) * share,
    cumulativeClimb[d - 1] + (days[d - 1].elevM ?? 0) * share
  ];
};

const total = profile.total;
// The last sample sits exactly at the end of the path.
const samples = Math.ceil(total / STEP) + 1;
const ground = [];
const walked = [];
const climbed = [];
for (let index = 0; index < samples; index += 1) {
  const distance = Math.min(total, index * STEP);
  const [recordedKm, recordedClimb] = recordedAt(distance);
  const [estimatedKm, estimatedClimb] = estimatedAt(distance);
  ground.push(Math.round(heightAt(distance)));
  walked.push(Math.round((recordedKm + estimatedKm) * 10));
  climbed.push(Math.round(recordedClimb + estimatedClimb));
}

// Titles are the day's song; mark the ones that are also in the top 1,000.
const fold = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const songRank = new Map();
ranking.songs.forEach(([title, artist], index) => {
  const key = fold(title.replace(/\s+-\s+.*$/, "").replace(/\s*\(.*?\)\s*/g, " "));
  if (!songRank.has(key)) songRank.set(key, [index + 1, ranking.names[artist]]);
});

const photosByDay = new Map();
for (const photo of photos) {
  if (!photosByDay.has(photo.day)) photosByDay.set(photo.day, []);
  photosByDay.get(photo.day).push(photo);
}
const photoTrack = [];
for (const [day, list] of [...photosByDay.entries()].sort((a, b) => a[0] - b[0])) {
  list.sort((a, b) => a.taken.localeCompare(b.taken));
  list.forEach((photo, index) => {
    const at = dayStart(day) + ((dayEnd[day] - dayStart(day)) * (index + 0.5)) / list.length;
    photoTrack.push([day, photo.src, photo.taken, Math.round(at)]);
  });
}

const film = {
  version: 1,
  from: facts.from,
  to: facts.to,
  total,
  step: STEP,
  ground,
  walked,
  climbed,
  trains: trains.map(({ start, end, day }) => [Math.round(start), Math.round(end), day]),
  days: days.map((day, index) => {
    const n = index + 1;
    const title = day.title ? day.title.replace(/^\((.*)\)$/, "$1") : null;
    return [
      Math.round(dayStart(n)),
      Math.round(dayEnd[n]),
      day.date,
      day.country,
      day.walked ? 1 : 0,
      title,
      // [rank, artist] when a song of that title is in the top 1,000.
      title ? songRank.get(fold(title)) ?? null : null
    ];
  }),
  chapters: story.chapters.map((chapter) => [chapter.from, chapter.to, chapter.title, chapter.place, chapter.text]),
  moments: story.moments.map((moment) => [
    moment.day,
    Math.round(dayStart(moment.day) + (dayEnd[moment.day] - dayStart(moment.day)) * moment.at),
    moment.kind,
    moment.title,
    moment.text
  ]),
  photos: photoTrack
};

const text = JSON.stringify(film) + "\n";
const target = new URL("../public/trek-film.json", import.meta.url);
if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    /* missing */
  }
  if (current !== text) fail("public/trek-film.json is out of date; run node scripts/build-trek-film.mjs");
  console.log("Trek film track current.");
} else {
  writeFileSync(target, text);
  const last = film.days.length;
  console.log(
    `trek-film: ${samples} samples, ${last} days, ${film.photos.length} photographs, ` +
      `${(walked.at(-1) / 10).toLocaleString("en-GB")} km walked, ${climbed.at(-1).toLocaleString("en-GB")} m climbed, ` +
      `songs in the top 1,000: ${film.days.filter((day) => day[6]).map((day) => `${day[5]} (${day[6][0]}, ${day[6][1]})`).join(", ")}`
  );
}
