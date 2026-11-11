/*
 * The scrolling story: one pinned picture of the valley for each stretch of
 * the listening years, with that stretch's covers flying over it and its
 * most played songs beside it. Pictures are painted off the main thread as
 * each scene comes near, so scrolling never waits.
 */

const DATA = window.STORY;
const story = document.getElementById("story");
const byId = new Map(DATA.albums.map((a) => [a.id, a]));
const hoursOf = (minutes) => (minutes >= 90 ? `${Math.round(minutes / 60).toLocaleString("en-GB")} hours` : minutes >= 60 ? "1 hour" : `${Math.round(minutes)} minutes`);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

// The painter, on its own thread.
const worker = new Worker(URL.createObjectURL(new Blob([window.STORY_ENGINE], { type: "text/javascript" })));
const waiting = new Map();
let asked = 0;
const ask = (message) =>
  new Promise((resolve) => {
    asked += 1;
    waiting.set(asked, resolve);
    worker.postMessage({ ...message, id: asked });
  });
worker.onmessage = (event) => {
  const done = waiting.get(event.data.id);
  waiting.delete(event.data.id);
  if (done) done(event.data);
};

const scenes = [];
function addScene(cls, views) {
  const section = el("section", `scene ${cls}`);
  const stage = el("div", "stage");
  const canvas = el("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const strings = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  strings.setAttribute("class", "strings");
  strings.setAttribute("aria-hidden", "true");
  const kites = el("div", "kites");
  const ui = el("div", "ui");
  stage.append(canvas, strings, kites, ui);
  section.append(stage);
  story.append(section);
  const S = { el: section, stage, canvas, strings, kites, ui, views, key: "", busy: false, again: false, things: null, keep: [] };
  scenes.push(S);
  return S;
}

// The opening: the whole valley, and whose it is.
{
  const S = addScene("scene-open", DATA.open);
  const name = el("header", "name");
  name.innerHTML = "<h1>I’m <span>Akibwa</span></h1><p>This is what I listen to.</p>";
  S.ui.append(name, el("p", "cue", "Ten years of it, from 2016"));
  S.keep = [name];
}

// One scene for each stretch of years.
for (const chapter of DATA.chapters) {
  const S = addScene("chapter", { wide: chapter.wide, tall: chapter.tall });
  S.el.dataset.id = chapter.id;
  const words = el("header", "words");
  words.append(el("h2", "year", chapter.years), el("p", "kind", `${chapter.label}, over ${chapter.place}`), el("p", "fact", chapter.fact));
  const songs = el("section", "songs");
  songs.setAttribute("aria-label", `Most played songs, ${chapter.years}`);
  songs.append(el("h3", "", "Most played songs"));
  const list = el("ol");
  for (const song of chapter.songs) {
    const row = el("li", "song");
    const art = song.art ? el("img", "song-art") : el("span", "song-art");
    if (song.art) {
      art.src = song.art;
      art.alt = "";
      art.loading = "lazy";
      art.decoding = "async";
    }
    const text = el("span", "song-words");
    text.append(el("span", "song-title", song.title), el("span", "song-artist", song.artist));
    row.append(art, text, el("span", "song-plays", `${song.plays} plays`));
    list.append(row);
  }
  songs.append(list);
  S.ui.append(words, songs);
  S.keep = [words, songs];
  S.things = ({ scale, tall, keepOut }) => ({
    albums: chapter.albums.map((a, rank) => ({ id: a.id, kind: chapter.kind, weight: a.weight, rank })),
    opts: {
      only: [chapter.kind],
      perKind: tall ? 6 : 7,
      smallest: Math.round((tall ? 60 : 92) / scale),
      largest: Math.round((tall ? 146 : 204) / scale),
      gap: Math.round(9 / scale) + 1,
      pixel: scale,
      tags: false,
      keepOut
    }
  });
  S.art = new Map(chapter.albums.map((a) => [a.id, a]));
}

// The night: every kind at once, and the two records that never stop.
{
  const S = addScene("scene-night", DATA.night);
  const words = el("header", "words");
  words.append(el("h2", "year", "Tonight"), el("p", "kind", "all of it, after dark"), el("p", "fact", "My 150 most played albums and 1,000 most played songs."));
  const nights = el("section", "songs nights");
  nights.append(el("h3", "", "And two records that never stop"));
  for (const night of DATA.nights) {
    const row = el("div", "night-row");
    const img = el("img");
    img.src = night.src;
    if (night.src2) img.srcset = `${night.src} 300w, ${night.src2} 600w`;
    img.sizes = "58px";
    img.alt = "";
    img.loading = "lazy";
    const text = el("span", "song-words");
    text.append(el("span", "song-title", night.title), el("span", "song-artist", `${night.artist}, since ${night.since}`));
    row.append(img, text, el("span", "song-plays", hoursOf(night.minutes)));
    nights.append(row);
  }
  const links = el("nav", "links");
  links.setAttribute("aria-label", "Elsewhere");
  links.innerHTML = '<a href="https://www.instagram.com/dakibwa/">Instagram</a><a href="https://x.com/dakibwa">X</a>';
  nights.append(links);
  const tags = el("div", "tags");
  S.ui.append(words, tags, nights);
  S.keep = [words, nights];
  S.tags = tags;
  S.things = ({ scale, tall, keepOut }) => {
    tags.textContent = "";
    const sizes = {};
    for (const K of DATA.kinds) {
      const tag = el("button", "tag");
      tag.type = "button";
      tag.dataset.kind = K.id;
      tag.innerHTML = `<span class="tag-face">${K.label} <span class="tag-count">${DATA.albums.filter((a) => a.kind === K.id).length}</span></span>`;
      tag.addEventListener("click", () => openKind(K.id));
      tags.append(tag);
      sizes[K.id] = { w: tag.offsetWidth / scale, h: 32 / scale };
    }
    return {
      albums: DATA.albums.map((a, rank) => ({ id: a.id, kind: a.kind, weight: a.weight, rank })).sort((a, b) => b.weight - a.weight),
      opts: { perKind: tall ? 3 : 5, smallest: Math.round((tall ? 38 : 46) / scale), largest: Math.round((tall ? 66 : 88) / scale), gap: Math.round(5 / scale) + 1, pixel: scale, tagSizes: sizes, keepOut }
    };
  };
  S.art = new Map(DATA.albums.map((a) => [a.id, { ...a, src: a.art }]));
}

// Paint a scene for the screen it is on.
async function paint(S) {
  if (S.busy) {
    S.again = true;
    return;
  }
  const box = S.stage.getBoundingClientRect();
  if (box.width < 40 || box.height < 40) return;
  const scale = box.width >= 1500 ? 4 : box.width >= 720 ? 3 : 2;
  const W = Math.max(140, Math.ceil(box.width / scale));
  const H = Math.max(140, Math.ceil(box.height / scale));
  const key = `${W}x${H}`;
  if (S.key === key) return;
  S.busy = true;
  const tall = H / W > 1.15;
  // Room kept clear for the words and lists, in picture pixels.
  const keepOut = S.keep.map((node) => {
    const r = node.getBoundingClientRect();
    return [(r.left - box.left) / scale - 2, (r.top - box.top) / scale - 2, (r.right - box.left) / scale + 2, (r.bottom - box.top) / scale + 2];
  });
  const things = S.things ? S.things({ scale, tall, keepOut }) : null;
  const out = await ask({ W, H, seed: DATA.seed, view: tall ? S.views.tall : S.views.wide, things, words: keepOut[0] });
  S.canvas.width = W;
  S.canvas.height = H;
  S.canvas.style.width = `${W * scale}px`;
  S.canvas.style.height = `${H * scale}px`;
  S.canvas.getContext("2d").putImageData(new ImageData(out.rgba, W, H), 0, 0);
  S.el.classList.toggle("is-dark", out.light < 0.52);
  S.el.classList.toggle("is-night", out.night > 0.5);
  if (out.layout) fly(S, out.layout, scale);
  S.key = key;
  S.busy = false;
  S.el.classList.add("is-painted");
  if (S.again) {
    S.again = false;
    paint(S);
  }
}

// Put the covers and their strings where the layout says.
function fly(S, layout, scale) {
  S.kites.textContent = "";
  S.strings.textContent = "";
  const order = layout.items.slice().sort((a, b) => b.s - a.s);
  order.forEach((item, index) => {
    const album = S.art.get(item.id);
    if (!album || !album.src) return;
    const size = item.s * scale;
    const kite = el("button", "kite");
    kite.type = "button";
    kite.style.cssText = `left:${item.x * scale}px;top:${item.y * scale}px;width:${size}px;height:${size}px;--i:${index}`;
    const full = byId.get(item.id);
    kite.setAttribute("aria-label", `${full.title} by ${full.artist}, ${hoursOf(full.minutes)}`);
    kite.dataset.id = item.id;
    const sway = el("span", "kite-sway");
    const img = el("img");
    img.src = album.src;
    if (album.src2) img.srcset = `${album.src} 300w, ${album.src2} 600w`;
    img.sizes = `${Math.round(size)}px`;
    img.alt = "";
    img.decoding = "async";
    sway.append(img);
    kite.append(sway);
    S.kites.append(kite);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", (item.x + item.s / 2) * scale);
    line.setAttribute("y1", (item.y + item.s) * scale);
    line.setAttribute("x2", item.ax * scale);
    line.setAttribute("y2", item.ay * scale);
    S.strings.append(line);
  });
  if (S.tags) {
    for (const A of layout.anchors) {
      const tag = S.tags.querySelector(`[data-kind="${A.kind}"]`);
      if (!tag) continue;
      tag.style.left = `${A.tx * scale}px`;
      tag.style.top = `${A.ty * scale + (A.th * scale - 44) / 2}px`;
    }
  }
}

// Paint scenes as they come near; mark the one being read.
const near = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) if (entry.isIntersecting) paint(scenes.find((S) => S.el === entry.target));
  },
  { rootMargin: "140% 0px" }
);
scenes.forEach((S) => near.observe(S.el));
let ticking = false;
function mark() {
  ticking = false;
  const vh = innerHeight;
  for (const S of scenes) {
    const r = S.el.getBoundingClientRect();
    S.el.classList.toggle("is-here", r.top < vh * 0.42 && r.bottom > vh * 0.58);
  }
}
addEventListener("scroll", () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(mark);
  }
  hideCard();
}, { passive: true });
let resizing = 0;
addEventListener("resize", () => {
  clearTimeout(resizing);
  resizing = setTimeout(() => {
    for (const S of scenes) {
      const r = S.el.getBoundingClientRect();
      if (S.key && r.bottom > -innerHeight * 1.5 && r.top < innerHeight * 2.5) paint(S);
      else S.key = "";
    }
    mark();
  }, 280);
});
mark();

// The card for one cover.
const card = document.getElementById("card");
function showCard(kite) {
  const album = byId.get(kite.dataset.id);
  const img = kite.querySelector("img");
  document.getElementById("card-cover").src = img.currentSrc || img.src;
  document.getElementById("card-title").textContent = album.title;
  document.getElementById("card-artist").textContent = album.artist;
  document.getElementById("card-hours").textContent = hoursOf(album.minutes);
  card.hidden = false;
  const r = kite.getBoundingClientRect();
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  const above = r.top - h - 12;
  card.style.left = `${Math.min(innerWidth - w - 16, Math.max(16, r.left + r.width / 2 - w / 2))}px`;
  card.style.top = `${above > 10 ? above : Math.min(innerHeight - h - 10, r.bottom + 12)}px`;
}
function hideCard() {
  card.hidden = true;
}
story.addEventListener("pointerover", (event) => {
  const kite = event.target.closest?.(".kite");
  if (kite && event.pointerType === "mouse") showCard(kite);
});
story.addEventListener("pointerout", (event) => {
  if (event.target.closest?.(".kite") && event.pointerType === "mouse") hideCard();
});
story.addEventListener("click", (event) => {
  const kite = event.target.closest?.(".kite");
  if (kite) showCard(kite);
  else hideCard();
});
story.addEventListener("focusin", (event) => {
  const kite = event.target.closest?.(".kite");
  if (kite && kite.matches(":focus-visible")) showCard(kite);
});

// A kind's whole list, from the night.
const sheet = document.getElementById("sheet");
let opened = null;
const coverStyle = (album, size) => {
  const { cols, rows, src } = DATA.atlas;
  return `background-image:url(${src});background-size:${cols * size}px ${rows * size}px;background-position:-${(album.cover % cols) * size}px -${Math.floor(album.cover / cols) * size}px;width:${size}px;height:${size}px`;
};
function openKind(kindId) {
  const K = DATA.kinds.find((k) => k.id === kindId);
  const mine = DATA.albums.filter((a) => a.kind === kindId).sort((a, b) => b.minutes - a.minutes);
  const total = mine.reduce((sum, a) => sum + a.minutes, 0);
  opened = kindId;
  document.getElementById("sheet-title").textContent = K.label;
  document.getElementById("sheet-sum").textContent = `${mine.length} albums, ${Math.round(total / 60).toLocaleString("en-GB")} hours, over ${K.place}`;
  const list = document.getElementById("sheet-list");
  list.textContent = "";
  for (const album of mine) {
    const row = el("li", "row");
    const cover = el("span", "cover");
    cover.setAttribute("style", coverStyle(album, 50));
    const text = el("span", "row-words");
    text.append(el("span", "row-title", album.title), el("span", "row-artist", album.artist));
    row.append(cover, text, el("span", "row-hours", hoursOf(album.minutes)));
    list.append(row);
  }
  sheet.hidden = false;
  list.scrollTop = 0;
  hideCard();
  document.getElementById("sheet-close").focus({ preventScroll: true });
}
function closeKind() {
  if (!opened) return;
  const back = document.querySelector(`.tag[data-kind="${opened}"]`);
  opened = null;
  sheet.hidden = true;
  if (back) back.focus({ preventScroll: true });
}
document.getElementById("sheet-close").addEventListener("click", closeKind);
addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeKind();
    hideCard();
  }
});
