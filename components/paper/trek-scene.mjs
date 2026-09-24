/*
 * Paints one frame of the Trek film onto a 2D canvas, in the reference
 * film's manner: cream paper by day and hatched navy by night, a dashed
 * construction arc for the sun, distant ridges running ahead in parallax,
 * the real ground height as a pencil line over hatched soil, trees that turn
 * with the season, signposts at borders, and a small walker who pitches a
 * tent each night. Everything is derived from the film track, so a frame
 * depends only on time.
 */
import { WALK, heightAt, trainAt, leafColour, hash } from "./trek-film.mjs";

const INK = "#2a2420";
const GUIDE = "rgba(127, 149, 199, 0.8)";
const TOP = 2500;

let hatches = null;
function hatchPatterns(context) {
  if (hatches) return hatches;
  const make = (colour, gap, width, angle) => {
    const tile = document.createElement("canvas");
    tile.width = tile.height = gap * 4;
    const t = tile.getContext("2d");
    t.strokeStyle = colour;
    t.lineWidth = width;
    t.beginPath();
    for (let x = -tile.width; x < tile.width * 2; x += gap) {
      t.moveTo(x, 0);
      t.lineTo(x + tile.height * Math.tan(angle), tile.height);
    }
    t.stroke();
    return context.createPattern(tile, "repeat");
  };
  hatches = {
    soil: make("rgba(58, 36, 22, 0.28)", 5, 1, 0.6),
    ridge: make("rgba(84, 98, 140, 0.22)", 4, 1, -0.5),
    night: make("rgba(255, 255, 255, 0.07)", 3, 1, 0.9),
    sun: make("rgba(214, 120, 40, 0.55)", 3, 1.2, 0.6)
  };
  return hatches;
}

const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// 0 at night, 1 in full daylight, with dawn and dusk between.
export function lightAt(within) {
  if (within < 0.07) return clamp01(within / 0.07) * 0.9 + 0.1;
  if (within < WALK - 0.08) return 1;
  if (within < WALK + 0.06) return 1 - clamp01((within - (WALK - 0.08)) / 0.14);
  return 0;
}

function countryAt(film, distance) {
  for (const day of film.days) if (distance <= day.end) return day.country;
  return film.days.at(-1).country;
}

export function borders(film) {
  const list = [];
  film.days.forEach((day, index) => {
    if (index && day.country !== film.days[index - 1].country) list.push({ at: day.start, name: day.country });
  });
  return list;
}

export function drawScene(context, { width, height, film, state, stride, sleeping, borderList }) {
  const W = width;
  const H = height;
  const patterns = hatchPatterns(context);
  const kmPx = W / 42;
  const walkerX = W * 0.36;
  const baseY = H * 0.86;
  const lift = H * 0.44;
  const groundY = (h) => baseY - (Math.min(h, TOP) / TOP) * lift;
  const at = (x) => state.distance + ((x - walkerX) / kmPx) * 1000;
  const light = lightAt(state.within);
  const night = 1 - light;
  const season = clamp01(state.t / film.days.length);
  const leaf = leafColour(season);

  // Sky: the paper, warming at dusk and going to hatched navy at night.
  context.fillStyle = "#f3ecdf";
  context.fillRect(0, 0, W, H);
  const dusk = state.within > WALK - 0.12 && state.within < WALK + 0.1 ? 1 - Math.abs(state.within - (WALK - 0.01)) / 0.11 : 0;
  if (dusk > 0) {
    const glow = context.createLinearGradient(0, 0, 0, H);
    glow.addColorStop(0, `rgba(240, 190, 150, ${0.15 * dusk})`);
    glow.addColorStop(0.7, `rgba(238, 160, 110, ${0.45 * dusk})`);
    context.fillStyle = glow;
    context.fillRect(0, 0, W, H);
  }
  if (night > 0) {
    context.fillStyle = `rgba(43, 53, 112, ${0.92 * night})`;
    context.fillRect(0, 0, W, H);
    context.fillStyle = patterns.night;
    context.globalAlpha = night;
    context.fillRect(0, 0, W, H);
    context.globalAlpha = 1;
  }

  // The film's broad diagonal bands, by day only.
  if (light > 0) {
    context.save();
    context.globalAlpha = 0.05 * light;
    context.fillStyle = "#b99a68";
    for (let x = -H; x < W + H; x += 220) {
      context.beginPath();
      context.moveTo(x, H);
      context.lineTo(x + 110, H);
      context.lineTo(x + 110 + H * 0.9, 0);
      context.lineTo(x + H * 0.9, 0);
      context.fill();
    }
    context.restore();
  }

  // Sun on its dashed arc, or the moon and stars.
  const cx = W * 0.5;
  const cy = H * 0.7;
  const rx = W * 0.42;
  const ry = H * 0.56;
  if (state.within < WALK + 0.06) {
    context.save();
    context.setLineDash([4, 6]);
    context.strokeStyle = GUIDE;
    context.globalAlpha = 0.45 * light;
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
    context.stroke();
    context.restore();
    const angle = Math.PI + Math.PI * clamp01(state.within / (WALK + 0.04));
    const sx = cx + Math.cos(angle) * rx;
    const sy = cy + Math.sin(angle) * ry;
    const r = H * 0.045;
    context.save();
    context.globalAlpha = Math.max(0.2, light);
    context.strokeStyle = INK;
    context.lineWidth = 1.2;
    context.lineCap = "round";
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + state.t;
      context.beginPath();
      context.moveTo(sx + Math.cos(a) * r * 1.35, sy + Math.sin(a) * r * 1.35);
      context.lineTo(sx + Math.cos(a) * r * 1.75, sy + Math.sin(a) * r * 1.75);
      context.stroke();
    }
    context.beginPath();
    context.arc(sx, sy, r, 0, Math.PI * 2);
    context.fillStyle = "#f6c04f";
    context.fill();
    context.fillStyle = patterns.sun;
    context.fill();
    context.stroke();
    context.restore();
  }
  if (night > 0.05) {
    context.save();
    context.globalAlpha = night;
    context.fillStyle = "#f3ead2";
    for (let i = 0; i < 46; i += 1) {
      const x = hash(i * 7 + 1) * W;
      const y = hash(i * 13 + 5) * H * 0.55;
      const s = 0.8 + hash(i * 3 + 2) * 1.6;
      context.fillRect(x, y, s, s);
    }
    const mx = W * 0.78;
    const my = H * 0.18;
    const mr = H * 0.05;
    context.beginPath();
    context.arc(mx, my, mr, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(43, 53, 112, 0.95)";
    context.beginPath();
    context.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.86, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // Distant ridges run ahead of the walker, so mountains appear before they arrive.
  const far = (x) => state.distance + ((x - walkerX) / kmPx) * 1000 * 2.6 + 18000;
  context.beginPath();
  context.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) {
    const h = heightAt(film, far(x));
    const y = H * 0.7 - (Math.min(h, TOP) / TOP) * H * 0.4 - 10 - Math.sin(x * 0.013 + state.distance / 40000) * 6;
    context.lineTo(x, y);
  }
  context.lineTo(W, H);
  context.closePath();
  context.fillStyle = night > 0.5 ? "#39437c" : "#d3d6e1";
  context.fill();
  context.fillStyle = patterns.ridge;
  context.fill();

  // Snow on the high tops.
  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  for (let x = 0; x <= W; x += 8) {
    const h = heightAt(film, far(x));
    if (h < 1700) continue;
    const y = H * 0.7 - (Math.min(h, TOP) / TOP) * H * 0.4 - 10 - Math.sin(x * 0.013 + state.distance / 40000) * 6;
    context.fillRect(x - 3, y, 7, Math.max(2, (h - 1700) / 180));
  }
  context.restore();

  // The ground: real height along the path, pencil line over hatched soil.
  const ground = [];
  for (let x = -8; x <= W + 8; x += 6) {
    const d = at(x);
    const h = heightAt(film, Math.max(0, Math.min(film.total, d)));
    ground.push([x, groundY(h)]);
  }
  context.beginPath();
  context.moveTo(ground[0][0], H);
  ground.forEach(([x, y]) => context.lineTo(x, y));
  context.lineTo(ground.at(-1)[0], H);
  context.closePath();
  context.fillStyle = night > 0.5 ? "#4b3526" : "#8a5d3d";
  context.fill();
  context.fillStyle = patterns.soil;
  context.fill();
  // Speckles, as in the film's soil.
  context.fillStyle = "rgba(60, 38, 24, 0.35)";
  const first = Math.floor(at(0) / 400);
  const last = Math.ceil(at(W) / 400);
  for (let k = first; k <= last; k += 1) {
    const x = walkerX + ((k * 400 - state.distance) / 1000) * kmPx;
    const gy = groundY(heightAt(film, Math.max(0, Math.min(film.total, k * 400))));
    const depth = 10 + hash(k) * (H - gy - 12);
    context.beginPath();
    context.ellipse(x, gy + depth, 1.6 + hash(k + 9) * 2.4, 1.2 + hash(k + 3) * 1.6, 0, 0, Math.PI * 2);
    context.fill();
  }
  // The green of the surface, then the pencil line on top.
  context.beginPath();
  ground.forEach(([x, y], index) => (index ? context.lineTo(x, y + 3) : context.moveTo(x, y + 3)));
  context.strokeStyle = night > 0.5 ? "#44613c" : "#7aa35f";
  context.lineWidth = 6;
  context.stroke();
  context.beginPath();
  ground.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
  context.strokeStyle = INK;
  context.lineWidth = 1.6;
  context.stroke();
  // Grass ticks.
  context.lineWidth = 1;
  context.beginPath();
  const tickFirst = Math.floor(at(0) / 90);
  const tickLast = Math.ceil(at(W) / 90);
  for (let k = tickFirst; k <= tickLast; k += 1) {
    if (hash(k * 5) > 0.55) continue;
    const x = walkerX + ((k * 90 - state.distance) / 1000) * kmPx;
    const gy = groundY(heightAt(film, Math.max(0, Math.min(film.total, k * 90))));
    const lean = (hash(k) - 0.5) * 4;
    context.moveTo(x, gy);
    context.lineTo(x + lean, gy - 4 - hash(k + 1) * 4);
  }
  context.stroke();

  // Scenery, placed by kilometre so it never shifts between visits.
  const propFirst = Math.floor(at(-60) / 1000);
  const propLast = Math.ceil(at(W + 60) / 1000);
  for (let k = propFirst; k <= propLast; k += 1) {
    if (k < 1 || k * 1000 > film.total - 1000) continue;
    const roll = hash(k * 31 + 7);
    const country = countryAt(film, k * 1000);
    const x = walkerX + ((k * 1000 + hash(k) * 600 - state.distance) / 1000) * kmPx;
    const gy = groundY(heightAt(film, k * 1000));
    drawProp(context, { x, y: gy, H, roll, country, leaf, season, night, k });
  }

  // Signposts where the walk crosses into a new country.
  for (const border of borderList) {
    const x = walkerX + ((border.at - state.distance) / 1000) * kmPx;
    if (x < -120 || x > W + 120) continue;
    const gy = groundY(heightAt(film, border.at));
    drawSign(context, x, gy, H, border.name, night);
  }

  // Paris and Sofia at either end of the line.
  const paris = walkerX + ((0 - state.distance) / 1000) * kmPx;
  if (paris > -200 && paris < W + 200) drawParis(context, paris - H * 0.1, groundY(heightAt(film, 0)), H, night);
  const sofia = walkerX + ((film.total - state.distance) / 1000) * kmPx;
  if (sofia > -200 && sofia < W + 200) drawSofia(context, sofia + H * 0.12, groundY(heightAt(film, film.total)), H, night);

  // The walker, a tent at night, or the train.
  const wy = groundY(heightAt(film, state.distance));
  const train = trainAt(film, state.distance);
  if (train) drawTrain(context, walkerX, wy, H, night);
  else if (sleeping) drawTent(context, walkerX, wy, H, state.t);
  else drawWalker(context, walkerX, wy, H, stride, state.walking && state.day.end > state.day.start);
}

function tree(context, x, y, size, colour, kind, bare) {
  context.lineWidth = 1.2;
  context.strokeStyle = INK;
  if (kind === "poplar") {
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x, y - size * 0.35);
    context.stroke();
    if (!bare) {
      context.beginPath();
      context.ellipse(x, y - size * 0.72, size * 0.16, size * 0.46, 0, 0, Math.PI * 2);
      context.fillStyle = colour;
      context.fill();
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(x, y - size * 0.3);
      context.lineTo(x, y - size);
      context.moveTo(x, y - size * 0.6);
      context.lineTo(x - size * 0.12, y - size * 0.9);
      context.moveTo(x, y - size * 0.55);
      context.lineTo(x + size * 0.1, y - size * 0.85);
      context.stroke();
    }
    return;
  }
  if (kind === "fir") {
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x, y - size * 0.2);
    context.stroke();
    context.beginPath();
    context.moveTo(x - size * 0.28, y - size * 0.18);
    context.lineTo(x, y - size * 1.05);
    context.lineTo(x + size * 0.28, y - size * 0.18);
    context.closePath();
    context.fillStyle = "#3f6b4a";
    context.fill();
    context.stroke();
    return;
  }
  // Broadleaf: a trunk and a rounded crown, thinning as autumn goes on.
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x, y - size * 0.45);
  context.stroke();
  if (bare) {
    context.beginPath();
    context.moveTo(x, y - size * 0.4);
    context.lineTo(x - size * 0.2, y - size * 0.75);
    context.moveTo(x, y - size * 0.45);
    context.lineTo(x + size * 0.22, y - size * 0.8);
    context.moveTo(x, y - size * 0.45);
    context.lineTo(x, y - size * 0.85);
    context.stroke();
    return;
  }
  context.beginPath();
  context.arc(x - size * 0.12, y - size * 0.62, size * 0.24, 0, Math.PI * 2);
  context.arc(x + size * 0.14, y - size * 0.66, size * 0.22, 0, Math.PI * 2);
  context.arc(x, y - size * 0.82, size * 0.24, 0, Math.PI * 2);
  context.fillStyle = colour;
  context.fill();
  context.stroke();
}

function drawProp(context, { x, y, H, roll, country, leaf, season, night, k }) {
  const size = H * (0.07 + hash(k * 3) * 0.06);
  const bare = season > 0.84 && hash(k * 17) < (season - 0.84) * 6;
  context.save();
  if (night > 0.5) context.globalAlpha = 0.65;
  const houses = { France: 0.93, Germany: 0.94, Austria: 0.95, Slovenia: 0.95, Croatia: 0.93, Serbia: 0.92, Bulgaria: 0.95 };
  if (roll > (houses[country] ?? 0.94)) drawHouse(context, x, y, H * 0.07, k);
  else if (country === "France" && roll < 0.36) tree(context, x, y, size * 1.2, leaf, "poplar", bare);
  else if ((country === "Austria" || country === "Slovenia") && roll < 0.55) tree(context, x, y, size, leaf, "fir", false);
  else if (country === "Germany" && roll < 0.3) tree(context, x, y, size, leaf, "fir", false);
  else if ((country === "Croatia" || country === "Serbia") && roll < 0.18) drawVines(context, x, y, H, leaf, bare);
  else if (roll < 0.42) tree(context, x, y, size, leaf, "broad", bare);
  context.restore();
}

function drawHouse(context, x, y, s, k) {
  context.lineWidth = 1.2;
  context.strokeStyle = INK;
  context.fillStyle = "#f7efe0";
  context.fillRect(x - s * 0.5, y - s * 0.8, s, s * 0.8);
  context.strokeRect(x - s * 0.5, y - s * 0.8, s, s * 0.8);
  context.beginPath();
  context.moveTo(x - s * 0.62, y - s * 0.8);
  context.lineTo(x, y - s * 1.35);
  context.lineTo(x + s * 0.62, y - s * 0.8);
  context.closePath();
  context.fillStyle = hash(k * 11) > 0.5 ? "#c0503a" : "#a8452f";
  context.fill();
  context.stroke();
  context.fillStyle = INK;
  context.fillRect(x - s * 0.12, y - s * 0.34, s * 0.24, s * 0.34);
}

function drawVines(context, x, y, H, leaf, bare) {
  const s = H * 0.035;
  context.lineWidth = 1.1;
  context.strokeStyle = INK;
  for (let i = 0; i < 4; i += 1) {
    const px = x + i * s * 0.9;
    context.beginPath();
    context.moveTo(px, y);
    context.lineTo(px, y - s);
    context.stroke();
    if (!bare) {
      context.beginPath();
      context.arc(px, y - s * 0.95, s * 0.36, 0, Math.PI * 2);
      context.fillStyle = leaf;
      context.fill();
    }
  }
}

function drawSign(context, x, y, H, name, night) {
  const s = H * 0.1;
  context.save();
  context.lineWidth = 1.4;
  context.strokeStyle = INK;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x, y - s * 1.2);
  context.stroke();
  context.font = `600 ${Math.round(H * 0.036)}px Fraunces, Georgia, serif`;
  const w = context.measureText(name).width + 18;
  context.beginPath();
  context.moveTo(x - 4, y - s * 1.2);
  context.lineTo(x - 4 + w, y - s * 1.2);
  context.lineTo(x + 6 + w, y - s * 0.98);
  context.lineTo(x - 4 + w, y - s * 0.76);
  context.lineTo(x - 4, y - s * 0.76);
  context.closePath();
  context.fillStyle = night > 0.5 ? "#e9dcc2" : "#fbf6ec";
  context.fill();
  context.stroke();
  context.fillStyle = INK;
  context.textBaseline = "middle";
  context.fillText(name, x + 5, y - s * 0.98);
  context.restore();
}

function drawParis(context, x, y, H, night) {
  const s = H * 0.34;
  context.save();
  context.globalAlpha = night > 0.5 ? 0.8 : 1;
  context.strokeStyle = INK;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(x - s * 0.22, y);
  context.quadraticCurveTo(x - s * 0.04, y - s * 0.45, x - s * 0.02, y - s);
  context.moveTo(x + s * 0.22, y);
  context.quadraticCurveTo(x + s * 0.04, y - s * 0.45, x + s * 0.02, y - s);
  context.moveTo(x - s * 0.14, y - s * 0.28);
  context.lineTo(x + s * 0.14, y - s * 0.28);
  context.moveTo(x - s * 0.07, y - s * 0.56);
  context.lineTo(x + s * 0.07, y - s * 0.56);
  context.moveTo(x, y - s);
  context.lineTo(x, y - s * 1.1);
  context.stroke();
  context.beginPath();
  context.arc(x, y, s * 0.12, Math.PI, 0);
  context.stroke();
  context.restore();
}

function drawSofia(context, x, y, H, night) {
  const s = H * 0.22;
  context.save();
  context.globalAlpha = night > 0.5 ? 0.85 : 1;
  context.strokeStyle = INK;
  context.lineWidth = 1.4;
  context.fillStyle = "#f7efe0";
  context.fillRect(x - s * 0.55, y - s * 0.55, s * 1.1, s * 0.55);
  context.strokeRect(x - s * 0.55, y - s * 0.55, s * 1.1, s * 0.55);
  const dome = (dx, r, top) => {
    context.beginPath();
    context.arc(x + dx, y - s * top, r, Math.PI, 0);
    context.fillStyle = "#c9a54a";
    context.fill();
    context.stroke();
  };
  dome(-s * 0.32, s * 0.14, 0.55);
  dome(s * 0.32, s * 0.14, 0.55);
  context.fillStyle = "#f7efe0";
  context.fillRect(x - s * 0.18, y - s * 0.9, s * 0.36, s * 0.35);
  context.strokeRect(x - s * 0.18, y - s * 0.9, s * 0.36, s * 0.35);
  dome(0, s * 0.2, 0.9);
  context.beginPath();
  context.moveTo(x, y - s * 1.1);
  context.lineTo(x, y - s * 1.28);
  context.moveTo(x - s * 0.05, y - s * 1.2);
  context.lineTo(x + s * 0.05, y - s * 1.2);
  context.stroke();
  context.restore();
}

function drawWalker(context, x, y, H, stride, moving) {
  const s = H * 0.12;
  const swing = moving ? Math.sin(stride) * 0.55 : 0;
  const bob = moving ? Math.abs(Math.cos(stride)) * s * 0.03 : 0;
  context.save();
  context.translate(x, y - bob);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = INK;
  // Shadow.
  context.fillStyle = "rgba(42, 36, 32, 0.18)";
  context.beginPath();
  context.ellipse(0, bob + 1, s * 0.3, s * 0.05, 0, 0, Math.PI * 2);
  context.fill();
  // Legs.
  context.lineWidth = s * 0.09;
  const leg = (angle) => {
    context.beginPath();
    context.moveTo(0, -s * 0.42);
    context.lineTo(Math.sin(angle) * s * 0.34, -s * 0.42 + Math.cos(angle) * s * 0.42);
    context.stroke();
  };
  leg(swing);
  leg(-swing);
  // Backpack, body, arm, head.
  context.fillStyle = "#f76a2b";
  context.lineWidth = 1.3;
  context.beginPath();
  context.roundRect(-s * 0.36, -s * 0.86, s * 0.26, s * 0.4, s * 0.06);
  context.fill();
  context.stroke();
  context.fillStyle = "#3a2f28";
  context.beginPath();
  context.roundRect(-s * 0.14, -s * 0.9, s * 0.26, s * 0.5, s * 0.1);
  context.fill();
  context.lineWidth = s * 0.08;
  context.beginPath();
  context.moveTo(0, -s * 0.78);
  context.lineTo(Math.sin(-swing) * s * 0.26, -s * 0.78 + Math.cos(swing) * s * 0.32);
  context.stroke();
  context.fillStyle = "#e8c9a0";
  context.lineWidth = 1.3;
  context.beginPath();
  context.arc(s * 0.02, -s * 1.02, s * 0.13, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  // A walking pole in the leading hand.
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(Math.sin(-swing) * s * 0.26, -s * 0.46 + Math.cos(swing) * s * 0.02);
  context.lineTo(Math.sin(-swing) * s * 0.26 + s * 0.12, 0);
  context.stroke();
  context.restore();
}

function drawTent(context, x, y, H, t) {
  const s = H * 0.13;
  context.save();
  context.translate(x, y);
  context.strokeStyle = INK;
  context.lineWidth = 1.4;
  context.lineJoin = "round";
  context.fillStyle = "#f76a2b";
  context.beginPath();
  context.moveTo(-s * 0.55, 0);
  context.lineTo(0, -s * 0.72);
  context.lineTo(s * 0.55, 0);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#c24e1c";
  context.beginPath();
  context.moveTo(-s * 0.12, 0);
  context.lineTo(0, -s * 0.46);
  context.lineTo(s * 0.12, 0);
  context.closePath();
  context.fill();
  context.stroke();
  // Sleep, drifting up.
  context.font = `600 ${Math.round(s * 0.28)}px Fraunces, Georgia, serif`;
  context.fillStyle = "#f3ead2";
  const drift = (t * 3) % 1;
  context.globalAlpha = 1 - drift;
  context.fillText("z", s * 0.4, -s * (0.8 + drift * 0.5));
  context.globalAlpha = 1 - ((drift + 0.5) % 1);
  context.fillText("z", s * 0.62, -s * (0.8 + ((drift + 0.5) % 1) * 0.5));
  context.restore();
}

function drawTrain(context, x, y, H, night) {
  const s = H * 0.09;
  context.save();
  context.translate(x, y);
  context.strokeStyle = INK;
  context.lineWidth = 1.3;
  context.setLineDash([6, 4]);
  context.beginPath();
  context.moveTo(-s * 6, 2);
  context.lineTo(s * 6, 2);
  context.stroke();
  context.setLineDash([]);
  const car = (dx, colour) => {
    context.fillStyle = colour;
    context.beginPath();
    context.roundRect(dx - s, -s * 1.1, s * 2, s * 0.95, s * 0.16);
    context.fill();
    context.stroke();
    context.fillStyle = night > 0.5 ? "#f6c04f" : "#fbf6ec";
    for (let i = 0; i < 3; i += 1) {
      context.fillRect(dx - s * 0.78 + i * s * 0.56, -s * 0.95, s * 0.36, s * 0.3);
      context.strokeRect(dx - s * 0.78 + i * s * 0.56, -s * 0.95, s * 0.36, s * 0.3);
    }
    context.fillStyle = INK;
    context.beginPath();
    context.arc(dx - s * 0.55, -s * 0.12, s * 0.14, 0, Math.PI * 2);
    context.arc(dx + s * 0.55, -s * 0.12, s * 0.14, 0, Math.PI * 2);
    context.fill();
  };
  car(-s * 1.1, "#2e6fd8");
  car(s * 1.1, "#f76a2b");
  context.restore();
}
