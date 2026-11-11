// The sea, moving. Every sleeve is drawn each frame from a packed sheet:
// small and dim in the sea, full size where it spells the name, and swollen
// under the pointer, where a lens parts the sleeves round it to make room.

(() => {
  const canvas = document.getElementById("sea");
  const ctx = canvas.getContext("2d");
  const caption = document.getElementById("caption");
  const [capTitle, capArtist, capCount] = caption.children;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tiles = SEA.tiles.map(([title, artist, album, size, count, more, slot], n) => ({ n, title, artist, album: Boolean(album), size, count, more, slot }));
  const order = tiles.map((_, n) => n);
  const sheets = { small: [], large: [] };
  let W = 0;
  let H = 0;
  let dpr = 1;
  let L = null;
  let lensTable = null;
  let born = 0;
  let shown = -1;
  const pointer = { x: 0, y: 0, on: false, touch: false };
  const lens = { x: 0, y: 0, s: 0 };

  const load = (file) =>
    new Promise((done) => {
      const img = new Image();
      img.onload = () => done(img);
      img.onerror = () => done(null);
      img.src = file;
    });

  // The lens: how much bigger things are at each distance from the pointer, and
  // where each distance moves to. What swells in the middle is paid for by a
  // slight shrinking over a wide ring, so nothing is ever crushed.
  function makeLens(pitch) {
    const reach = pitch * 13;
    const core = pitch * 0.9;
    const most = 3.2;
    const from = core * 1.2;
    const dip = ((most - 1) * core * Math.sqrt(Math.PI)) / (reach - from);
    const steps = 420;
    const grow = new Float32Array(steps + 1);
    const move = new Float32Array(steps + 1);
    let sum = 0;
    for (let k = 0; k <= steps; k += 1) {
      const r = (k / steps) * reach;
      const hill = (most - 1) * Math.exp(-((r / core) ** 2));
      const hollow = r > from ? dip * Math.sin((Math.PI * (r - from)) / (reach - from)) ** 2 : 0;
      grow[k] = 1 + hill - hollow;
      if (k) sum += ((grow[k] + grow[k - 1]) / 2) * (reach / steps);
      move[k] = sum;
    }
    // Close the last hair of error so the edge of the lens does not jump.
    const fix = reach / sum;
    for (let k = 0; k <= steps; k += 1) move[k] *= fix;
    return { reach, core, steps, grow, move };
  }

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    L = layoutSea(tiles.length, W, H, SEA.named);
    lensTable = makeLens(L.pitch);
    if (!pointer.on) {
      lens.x = W / 2;
      lens.y = H / 2;
    }
  }

  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : 1 - (1 - t) ** 3);
  const mix = (a, b, t) => a + (b - a) * t;
  const state = tiles.map(() => ({ x: 0, y: 0, s: 0, a: 1 }));
  let last = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const t = still ? 0 : now / 1000;
    const rise = still ? 1 : ease((now - born) / 2200);
    lens.s += ((pointer.on ? 1 : 0) - lens.s) * Math.min(1, dt * (pointer.on ? 10 : 5));
    if (lens.s < 0.002) lens.s = 0;
    const follow = still ? 1 : Math.min(1, dt * 18);
    lens.x += (pointer.x - lens.x) * follow;
    lens.y += (pointer.y - lens.y) * follow;
    const { pitch, cells } = L;
    const { reach, core, steps, grow, move } = lensTable;
    let nearest = -1;
    let nearestD = Infinity;
    for (let n = 0; n < cells.length; n += 1) {
      const cell = cells[n];
      const tile = tiles[n];
      let x = cell.x;
      let y = cell.y;
      // At rest: the name full and bright, the sea small and dim, sized a little by how much it is played.
      let u = mix(0.6, cell.name ? 0.95 : 0.38 + 0.28 * tile.size, rise);
      let a = mix(0.6, cell.name ? 1 : 0.42, rise);
      if (!still) {
        // Two swells cross the sea; the name rides them but keeps its size.
        const one = Math.sin(x * 0.0105 + y * 0.004 - t * 0.85);
        const two = Math.sin(x * 0.006 - y * 0.013 + t * 0.6);
        y += pitch * 0.13 * one;
        u *= 1 + (cell.name ? 0.018 : 0.11) * two;
        if (!cell.name) a += 0.07 * one;
      }
      if (lens.s > 0) {
        const dx = x - lens.x;
        const dy = y - lens.y;
        const r = Math.hypot(dx, dy);
        if (r < reach) {
          const at = (r / reach) * steps;
          const k = Math.min(steps - 1, Math.floor(at));
          const f = at - k;
          const moved = move[k] + (move[k + 1] - move[k]) * f;
          const bigger = grow[k] + (grow[k + 1] - grow[k]) * f;
          const pull = r > 0.001 ? mix(1, moved / r, lens.s) : 1;
          x = lens.x + dx * pull;
          y = lens.y + dy * pull;
          // Close to the pointer a sleeve fills its place, whatever size it had.
          const close = Math.exp(-((r / (core * 2.1)) ** 2)) * lens.s;
          // Where the lens makes room it swells the sleeve; where it takes room the sleeve keeps its size unless its place has become too small for it.
          const room = mix(1, bigger, lens.s);
          u = room >= 1 ? mix(u, 0.97, close) * room : Math.min(u, 0.97 * room);
          a = mix(a, 1, Math.min(1, close * 1.6));
        }
        const d = Math.hypot(cell.x - lens.x, cell.y - lens.y);
        if (d < nearestD) {
          nearestD = d;
          nearest = n;
        }
      }
      const st = state[n];
      st.x = x;
      st.y = y;
      st.s = pitch * u;
      st.a = Math.max(0.05, Math.min(1, a));
    }
    order.sort((p, q) => state[p].s - state[q].s);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingQuality = "high";
    for (const n of order) {
      if (n >= cells.length) continue;
      const st = state[n];
      const big = st.s * dpr > SEA.small.side * 1.15;
      const pack = big ? SEA.large : SEA.small;
      const where = tiles[n].slot;
      const page = Math.floor(where / (pack.per * pack.per));
      let img = (big ? sheets.large : sheets.small)[page];
      let use = pack;
      let slot = where - page * pack.per * pack.per;
      if (!img) {
        use = SEA.small;
        const p2 = Math.floor(where / (use.per * use.per));
        img = sheets.small[p2];
        slot = where - p2 * use.per * use.per;
        if (!img) continue;
      }
      ctx.globalAlpha = st.a;
      ctx.drawImage(img, (slot % use.per) * use.side, Math.floor(slot / use.per) * use.side, use.side, use.side, st.x - st.s / 2, st.y - st.s / 2, st.s, st.s);
    }
    ctx.globalAlpha = 1;
    // Say what is under the pointer.
    const want = lens.s > 0.5 && nearestD < pitch * 0.8 ? nearest : -1;
    if (want !== shown) {
      shown = want;
      if (want < 0) caption.classList.remove("on");
      else {
        const tile = tiles[want];
        capTitle.textContent = tile.title;
        capArtist.textContent = tile.artist;
        capCount.textContent = tile.album ? `${tile.count} hours` : `played ${tile.count} times${tile.more ? `, with ${tile.more} more from the same record` : ""}`;
        caption.classList.add("on");
      }
    }
    if (shown >= 0) {
      const st = state[shown];
      const wide = caption.offsetWidth;
      const tall = caption.offsetHeight;
      let cx = st.x + st.s / 2 + 12;
      if (cx + wide > W - 12) cx = st.x - st.s / 2 - 12 - wide;
      const cy = Math.max(12, Math.min(H - tall - 12, st.y - tall / 2));
      caption.style.transform = `translate(${Math.round(Math.max(12, cx))}px, ${Math.round(cy)}px)`;
    }
    requestAnimationFrame(frame);
  }

  const point = (event) => {
    const box = canvas.getBoundingClientRect();
    pointer.x = event.clientX - box.left;
    pointer.y = event.clientY - box.top;
  };
  let letGo = 0;
  canvas.addEventListener("pointermove", (event) => {
    point(event);
    pointer.on = true;
    clearTimeout(letGo);
  });
  canvas.addEventListener("pointerdown", (event) => {
    point(event);
    pointer.on = true;
    pointer.touch = event.pointerType !== "mouse";
    clearTimeout(letGo);
    if (pointer.touch) {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // A finger that has already lifted cannot be held; the lens still follows the next touch.
      }
    }
  });
  const rest = (after) => {
    clearTimeout(letGo);
    letGo = setTimeout(() => (pointer.on = false), after);
  };
  canvas.addEventListener("pointerup", () => pointer.touch && rest(1400));
  canvas.addEventListener("pointercancel", () => rest(0));
  canvas.addEventListener("pointerleave", (event) => event.pointerType === "mouse" && rest(0));
  // Arrow keys walk the lens from sleeve to sleeve.
  canvas.addEventListener("keydown", (event) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (event.key === "Escape") return rest(0);
    if (!step) return;
    event.preventDefault();
    if (!pointer.on) {
      pointer.x = W / 2;
      pointer.y = H / 2;
    }
    pointer.on = true;
    clearTimeout(letGo);
    pointer.x = Math.max(L.x0 + L.pitch / 2, Math.min(L.x0 + (L.cols - 0.5) * L.pitch, pointer.x + step[0] * L.pitch));
    pointer.y = Math.max(L.y0 + L.pitch / 2, Math.min(L.y0 + (L.rows - 0.5) * L.pitch, pointer.y + step[1] * L.pitch));
  });
  canvas.addEventListener("blur", () => rest(0));
  window.addEventListener("resize", resize);

  resize();
  Promise.all(SEA.small.files.map(load)).then((list) => {
    sheets.small = list;
    born = performance.now() + 250;
    requestAnimationFrame(frame);
    // The sharper sheets come after, for sleeves brought up close.
    SEA.large.files.forEach((file, k) => load(file).then((img) => (sheets.large[k] = img)));
  });
})();
