/*
 * The living page: paints the valley for this screen and this hour, flies the
 * albums over it, and answers a finger or a pointer. The picture is a canvas;
 * every word and control is ordinary HTML laid over it.
 */

import { paintValley } from "./paint.mjs";
import { buildPalette, ditherTo } from "./dither.mjs";
import { layoutThings, drawThings, KINDS } from "./things.mjs";

const DATA = window.VALLEY;
const $ = (id) => document.getElementById(id);
const world = $("world");
const canvas = $("land");
const ctx = canvas.getContext("2d");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

const albums = DATA.albums.map((a, rank) => ({ ...a, rank })).sort((a, b) => b.weight - a.weight);
const byId = new Map(albums.map((a) => [a.id, a]));
const hoursOf = (minutes) => (minutes >= 90 ? `${Math.round(minutes / 60)} hours` : minutes >= 60 ? "1 hour" : `${Math.round(minutes)} minutes`);

// The hours the button steps through; "now" follows the clock.
const STEPS = [
  { id: "now", label: "now" },
  { id: "golden", label: "golden hour", at: 19.3 },
  { id: "night", label: "night", at: 23.5 },
  { id: "dawn", label: "dawn", at: 6.3 },
  { id: "noon", label: "noon", at: 13 }
];
let hour = 0;
const clock = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};

// The sleeves, from one sheet of covers.
const atlas = new Image();
const tiny = document.createElement("canvas");
const tinyCtx = tiny.getContext("2d", { willReadFrequently: true });
const mid = document.createElement("canvas");
const midCtx = mid.getContext("2d");
const sleeves = new Map();
function sleeve(id, s) {
  const key = `${id}:${s}`;
  if (sleeves.has(key)) return sleeves.get(key);
  const album = byId.get(id);
  if (!album || !atlas.complete || !atlas.naturalWidth) return null;
  const { cell, cols } = DATA.atlas;
  const sx = (album.cover % cols) * cell;
  const sy = Math.floor(album.cover / cols) * cell;
  // Shrink in two steps, which keeps small covers clean.
  const half = Math.min(cell, s * 3);
  mid.width = half;
  mid.height = half;
  midCtx.imageSmoothingQuality = "high";
  midCtx.drawImage(atlas, sx, sy, cell, cell, 0, 0, half, half);
  tiny.width = s;
  tiny.height = s;
  tinyCtx.imageSmoothingQuality = "high";
  tinyCtx.drawImage(mid, 0, 0, half, half, 0, 0, s, s);
  const px = tinyCtx.getImageData(0, 0, s, s).data;
  const out = new Uint8Array(s * s * 3);
  for (let i = 0; i < s * s; i += 1) {
    out[i * 3] = px[i * 4];
    out[i * 3 + 1] = px[i * 4 + 1];
    out[i * 3 + 2] = px[i * 4 + 2];
  }
  sleeves.set(key, out);
  return out;
}
const coverStyle = (album, size) => {
  const { cols, rows } = DATA.atlas;
  return `background-image:url(${DATA.atlas.src});background-size:${cols * size}px ${rows * size}px;background-position:-${(album.cover % cols) * size}px -${Math.floor(album.cover / cols) * size}px;width:${size}px;height:${size}px`;
};

let W = 0;
let H = 0;
let scale = 3;
let view = null;
let base = null;
let layout = null;
let picture = null;
let placed = [];
let over = null;
let opened = null;
let raf = 0;
let painting = 0;

function measure() {
  const box = world.getBoundingClientRect();
  scale = box.width >= 1500 ? 4 : box.width >= 720 ? 3 : 2;
  W = Math.max(140, Math.ceil(box.width / scale));
  H = Math.max(140, Math.ceil(box.height / scale));
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}

function paint() {
  const turn = (painting += 1);
  world.classList.add("is-painting");
  // Let the screen show that it is working before the heavy part.
  setTimeout(() => {
    if (turn !== painting) return;
    measure();
    const tall = Math.min(1, Math.max(0, (H / W - 0.7) / 1.2));
    const H0 = STEPS[hour];
    view = paintValley({ W, H, seed: DATA.seed, time: H0.at ?? clock(), fov: 60 - 10 * tall, horizon: 0.37 - 0.02 * tall, eye: 54 + 81 * tall });
    base = ditherTo(view.img, W, H, buildPalette(view.img, W, H, 32), 0.06).rgba;
    const sizes = makeTags();
    layout = layoutThings(view, albums, {
      perKind: tall > 0.5 ? 5 : 7,
      smallest: Math.round(9 - tall),
      largest: Math.round(22 - 3 * tall),
      pixel: scale,
      tagSize: (A) => sizes.get(A.kind)
    });
    picture = ctx.createImageData(W, H);
    // Words over the sky read dark by day and light by night.
    let lum = 0;
    let count = 0;
    for (let y = 2; y < Math.min(H, Math.round(H * 0.18)); y += 3) {
      for (let x = Math.round(W * 0.25); x < W * 0.75; x += 3) {
        const p = (y * W + x) * 3;
        lum += 0.3 * view.img[p] + 0.59 * view.img[p + 1] + 0.11 * view.img[p + 2];
        count += 1;
      }
    }
    world.classList.toggle("is-dark", lum / count < 0.5);
    placeTags();
    world.classList.remove("is-painting");
    world.classList.add("is-painted");
    if (!raf) raf = requestAnimationFrame(tick);
    else draw(performance.now());
  }, 40);
}

let last = 0;
function draw(now) {
  if (!base) return;
  const t = now / 1000;
  picture.data.set(base);
  const still = reduced.matches;
  placed = drawThings(picture.data, W, H, layout, sleeve, {
    night: view.A.night,
    sway: still ? null : (item, i) => [Math.round(Math.sin(t * 0.8 + i * 1.7) * 0.8), Math.round(Math.sin(t * 0.6 + i * 2.3) * 1.2)]
  });
  // Stars come and go a little.
  if (!still && view.stars.length) {
    for (let n = 0; n < view.stars.length; n += 1) {
      const star = view.stars[n];
      const wink = Math.sin(t * (1.1 + (n % 7) * 0.23) + n);
      if (wink > -0.55) continue;
      const p = (star.y * W + star.x) * 4;
      picture.data[p] *= 0.55;
      picture.data[p + 1] *= 0.55;
      picture.data[p + 2] *= 0.62;
    }
  }
  // A ring round the sleeve under the pointer.
  if (over) {
    const item = placed.find((it) => it.id === over);
    if (item) {
      for (let i = -2; i <= item.s + 1; i += 1) {
        for (const [x, y] of [[item.x + i, item.y - 2], [item.x + i, item.y + item.s + 1], [item.x - 2, item.y + i], [item.x + item.s + 1, item.y + i]]) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const p = (y * W + x) * 4;
          picture.data[p] = 246;
          picture.data[p + 1] = 239;
          picture.data[p + 2] = 226;
        }
      }
    }
  }
  ctx.putImageData(picture, 0, 0);
}
function tick(now) {
  raf = requestAnimationFrame(tick);
  if (now - last < 70 || document.hidden) return;
  last = now;
  draw(now);
}

// A tag tied where each bunch is tethered, naming its kind of music. The
// tags are made first so the picture can be laid out round their real sizes.
function makeTags() {
  const host = $("tags");
  host.textContent = "";
  const sizes = new Map();
  for (const K of KINDS) {
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "tag";
    tag.dataset.kind = K.id;
    tag.innerHTML = `<span class="tag-face">${K.label} <span class="tag-count">${albums.filter((a) => a.kind === K.id).length}</span></span>`;
    tag.setAttribute("aria-pressed", String(opened === K.id));
    tag.addEventListener("click", () => open(K.id));
    host.append(tag);
    sizes.set(K.id, { w: tag.offsetWidth / scale, h: 32 / scale });
  }
  return sizes;
}
function placeTags() {
  for (const A of layout.anchors) {
    const tag = document.querySelector(`.tag[data-kind="${A.kind}"]`);
    if (!tag) continue;
    tag.style.left = `${A.tx * scale}px`;
    tag.style.top = `${A.ty * scale + (A.th * scale - 44) / 2}px`;
  }
}

// A kind's own list: every album of that kind, most listened first.
function open(kindId) {
  const K = KINDS.find((k) => k.id === kindId);
  const mine = albums.filter((a) => a.kind === kindId).sort((a, b) => b.minutes - a.minutes);
  const total = mine.reduce((sum, a) => sum + a.minutes, 0);
  opened = kindId;
  $("sheet-title").textContent = K.label;
  $("sheet-sum").textContent = `${mine.length} albums, ${Math.round(total / 60).toLocaleString("en-GB")} hours, over ${K.place}`;
  const list = $("sheet-list");
  list.textContent = "";
  for (const album of mine) {
    const row = document.createElement("li");
    row.className = "row";
    row.innerHTML = `<span class="cover" style="${coverStyle(album, 50)}"></span><span class="row-words"><span class="row-title"></span><span class="row-artist"></span></span><span class="row-hours"></span>`;
    row.querySelector(".row-title").textContent = album.title;
    row.querySelector(".row-artist").textContent = album.artist;
    row.querySelector(".row-hours").textContent = hoursOf(album.minutes);
    list.append(row);
  }
  $("sheet").hidden = false;
  world.classList.add("is-open");
  document.querySelectorAll(".tag").forEach((tag) => tag.setAttribute("aria-pressed", String(tag.dataset.kind === kindId)));
  $("sheet").dataset.from = kindId;
  $("sheet-close").focus({ preventScroll: true });
  list.scrollTop = 0;
  hideCard();
}
function close() {
  if (!opened) return;
  const back = document.querySelector(`.tag[data-kind="${opened}"]`);
  opened = null;
  $("sheet").hidden = true;
  world.classList.remove("is-open");
  document.querySelectorAll(".tag").forEach((tag) => tag.setAttribute("aria-pressed", "false"));
  back?.focus({ preventScroll: true });
}
$("sheet-close").addEventListener("click", close);
addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    close();
    hideCard();
  }
});

// The card for the sleeve under the pointer or the finger.
function itemAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const x = (clientX - box.left) / scale;
  const y = (clientY - box.top) / scale;
  for (let i = placed.length - 1; i >= 0; i -= 1) {
    const it = placed[i];
    if (x >= it.x - 1.5 && x <= it.x + it.s + 1.5 && y >= it.y - 1.5 && y <= it.y + it.s + 1.5) return it;
  }
  return null;
}
function showCard(item) {
  const album = byId.get(item.id);
  const card = $("card");
  over = item.id;
  $("card-cover").setAttribute("style", coverStyle(album, 96));
  $("card-title").textContent = album.title;
  $("card-artist").textContent = album.artist;
  $("card-hours").textContent = hoursOf(album.minutes);
  card.hidden = false;
  const box = world.getBoundingClientRect();
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  const cx = (item.x + item.s / 2) * scale;
  const above = item.y * scale - h - 12;
  card.style.left = `${Math.min(box.width - w - 16, Math.max(16, cx - w / 2))}px`;
  card.style.top = `${above > 12 ? above : Math.min(box.height - h - 12, (item.y + item.s) * scale + 12)}px`;
  canvas.style.cursor = "pointer";
}
function hideCard() {
  over = null;
  $("card").hidden = true;
  canvas.style.cursor = "";
}
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return;
  const item = itemAt(event.clientX, event.clientY);
  if (item) showCard(item);
  else hideCard();
});
canvas.addEventListener("pointerleave", (event) => {
  if (event.pointerType === "mouse") hideCard();
});
canvas.addEventListener("click", (event) => {
  const item = itemAt(event.clientX, event.clientY);
  if (item) showCard(item);
  else hideCard();
});

// The hour button steps through the day.
function showHour() {
  const H0 = STEPS[hour];
  $("hour-label").textContent = H0.label;
  $("hour").setAttribute("aria-label", `Time of day: ${H0.label}. Change it`);
}
$("hour").addEventListener("click", () => {
  hour = (hour + 1) % STEPS.length;
  showHour();
  hideCard();
  paint();
});

let resizing = 0;
addEventListener("resize", () => {
  clearTimeout(resizing);
  resizing = setTimeout(() => {
    hideCard();
    paint();
  }, 260);
});
// While it follows the clock, repaint now and then so the light keeps up.
setInterval(() => {
  if (STEPS[hour].id === "now" && !document.hidden) paint();
}, 6 * 60 * 1000);

showHour();
atlas.onload = () => {
  sleeves.clear();
};
atlas.src = DATA.atlas.src;
(atlas.decode ? atlas.decode().catch(() => {}) : Promise.resolve()).then(paint);
