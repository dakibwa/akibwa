/*
 * The Trek film's clock, as pure functions over public/trek-film.json.
 *
 * Time is measured in days: t = 0 is the morning Dan left Paris and t = 67 the
 * arrival in Sofia. Each day walks for the first WALK of its span (eased, so
 * mornings start and evenings end gently) and spends the rest at night. The
 * path position D is metres along the drawn route; kilometres walked and
 * metres climbed come from the film track, which already follows the Trek
 * page's own counting.
 */

export const WALK = 0.76;

export function unpackFilm(packet) {
  const days = packet.days.map(([start, end, date, country, walked, title, song], index) => ({
    n: index + 1,
    start,
    end,
    date,
    country,
    walked: Boolean(walked),
    title,
    song: song ? { rank: song[0], artist: song[1] } : null
  }));
  // Undated days (the arrival) take the day after the last dated one.
  days.forEach((day, index) => {
    if (!day.date && index) {
      const previous = new Date(`${days[index - 1].date}T12:00:00Z`);
      previous.setUTCDate(previous.getUTCDate() + 1);
      day.date = previous.toISOString().slice(0, 10);
    }
  });
  return {
    ...packet,
    days,
    trains: packet.trains.map(([start, end, day]) => ({ start, end, day })),
    chapters: packet.chapters.map(([from, to, title, place, text]) => ({ from, to, title, place, text })),
    moments: packet.moments.map(([day, at, kind, title, text]) => ({ day, at, kind, title, text })),
    photos: packet.photos.map(([day, src, taken, at]) => ({ day, src, taken, at }))
  };
}

const smooth = (t) => t * t * (3 - 2 * t);

// Where the walk is at time t.
export function stateAt(film, t) {
  const count = film.days.length;
  const clamped = Math.max(0, Math.min(count, t));
  const index = Math.min(count - 1, Math.floor(clamped));
  const day = film.days[index];
  const within = clamped >= count ? 1 : clamped - index;
  const walking = within < WALK;
  const progress = walking ? smooth(within / WALK) : 1;
  const distance = day.start + (day.end - day.start) * progress;
  return { t: clamped, day, index, within, walking, progress, distance, ...measuresAt(film, distance) };
}

// Sampled values at a path distance: ground height, km walked, metres climbed.
export function measuresAt(film, distance) {
  const position = Math.max(0, Math.min(film.total, distance)) / film.step;
  const low = Math.min(film.ground.length - 1, Math.floor(position));
  const high = Math.min(film.ground.length - 1, low + 1);
  const t = position - low;
  const mix = (series) => series[low] + (series[high] - series[low]) * t;
  return { height: mix(film.ground), km: mix(film.walked) / 10, climbed: mix(film.climbed) };
}

export const heightAt = (film, distance) => measuresAt(film, distance).height;

export function trainAt(film, distance) {
  return film.trains.find((train) => distance > train.start && distance < train.end) ?? null;
}

// Autumn, from the first morning (24 September) to the last (28 November).
export function seasonAt(film, t) {
  return Math.max(0, Math.min(1, t / film.days.length));
}

export function leafColour(season) {
  const stops = [
    [0, [94, 156, 78]],
    [0.3, [132, 158, 70]],
    [0.5, [214, 160, 58]],
    [0.72, [190, 98, 46]],
    [1, [150, 92, 60]]
  ];
  let a = stops[0];
  let b = stops.at(-1);
  for (let i = 1; i < stops.length; i += 1) {
    if (season <= stops[i][0]) {
      a = stops[i - 1];
      b = stops[i];
      break;
    }
  }
  const k = (season - a[0]) / (b[0] - a[0] || 1);
  const rgb = a[1].map((value, channel) => Math.round(value + (b[1][channel] - value) * k));
  return `rgb(${rgb.join(",")})`;
}

// Days and dates in words.
export function dateLabel(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// A small deterministic hash for scenery, so every visit draws the same land.
export function hash(value) {
  let x = Math.imul(value ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
