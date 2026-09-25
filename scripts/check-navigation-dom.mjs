/* Rendered regression check for Akibwa's paper homepage and, with
 * CHECK_TREK_ONLY=1, the standalone Trek.
 *
 * Usage: npm run build && npm run check:navigation:dom
 * Optional: CHECK_NAV_URL=https://akibwa.com npm run check:navigation:dom
 */

import { execSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { checkTrekPaths } from "./check-trek-paths-dom.mjs";

const outDir = fileURLToPath(new URL("../out", import.meta.url));
const externalOrigin = process.env.CHECK_NAV_URL || null;
const failures = [];
let currentSection = "setup";
let cdp;
let origin;

const section = (name) => {
  currentSection = name;
  process.stdout.write(`\n■ ${name}\n`);
};

const check = (ok, message) => {
  process.stdout.write(`  ${ok ? "ok" : "FAIL"} ${message}\n`);
  if (!ok) failures.push(`${currentSection}: ${message}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const capture = async (name) => {
  if (!process.env.CHECK_NAV_CAPTURE_DIR) return;
  mkdirSync(process.env.CHECK_NAV_CAPTURE_DIR, { recursive: true });
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(process.env.CHECK_NAV_CAPTURE_DIR, `${name}.png`), Buffer.from(data, "base64"));
};

const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".woff2": "font/woff2"
};

const startServer = () =>
  new Promise((resolve) => {
    const server = createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
      const candidates = [
        join(outDir, pathname),
        join(outDir, pathname, "index.html"),
        join(outDir, `${pathname.replace(/\/$/, "")}.html`)
      ];
      for (const file of candidates) {
        if (!existsSync(file) || file.endsWith("/") || file.endsWith("out")) continue;
        try {
          const body = readFileSync(file);
          response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
          response.end(body);
          return;
        } catch {
          /* Directory candidate; try the next form. */
        }
      }
      response.writeHead(404);
      response.end("not found");
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

const findChrome = () => {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const path of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  ]) {
    if (existsSync(path)) return path;
  }
  for (const name of ["google-chrome", "chromium", "chromium-browser"]) {
    try {
      return execSync(`command -v ${name}`, { encoding: "utf8" }).trim();
    } catch {
      /* Keep looking. */
    }
  }
  return null;
};

const launchChrome = (chromeBin, profileDir) =>
  new Promise((resolve, reject) => {
    const processHandle = spawn(
      chromeBin,
      [
        "--headless=new",
        "--remote-debugging-port=0",
        `--user-data-dir=${profileDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        ...(process.env.CHECK_TREK_ONLY ? process.env.CHECK_TREK_HARDWARE_GPU === "1" ? [] : ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] : ["--disable-gpu"]),
        "--hide-scrollbars",
        "--window-size=1440,900",
        "about:blank"
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) reject(new Error("Chrome DevTools endpoint did not appear within 15s"));
    }, 15000);
    const onData = (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (!match || settled) return;
      settled = true;
      clearTimeout(timer);
      processHandle.stderr.off("data", onData);
      resolve({ processHandle, port: Number(match[1]) });
    };
    processHandle.stderr.on("data", onData);
    processHandle.on("exit", () => {
      clearTimeout(timer);
      if (!settled) reject(new Error(`Chrome exited before DevTools was ready:\n${stderr}`));
    });
  });

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = [];
    this.events = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
        return;
      }
      if (!message.method) return;
      this.events.push(message);
      this.waiters = this.waiters.filter((waiter) => {
        if (waiter.method !== message.method) return true;
        waiter.resolve(message.params);
        return false;
      });
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error(`WebSocket failed: ${url}`)), { once: true });
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  waitFor(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), timeoutMs);
      this.waiters.push({
        method,
        resolve: (params) => {
          clearTimeout(timer);
          resolve(params);
        }
      });
    });
  }
}

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (exceptionDetails) {
    throw new Error(
      `page evaluation failed: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ""}`
    );
  }
  return result.value;
};

const goto = async (path = "/") => {
  const loaded = cdp.waitFor("Page.loadEventFired");
  const url = `${origin}${path}`;
  const navigation = await cdp.send("Page.navigate", { url });
  if (!navigation.loaderId) {
    // A hash-only change stays within the document. Let it commit before
    // reloading, or the reload lands on the previous entry and strands a
    // forward entry that later breaks history.back().
    for (let attempt = 0; attempt < 50; attempt++) {
      const { currentIndex, entries } = await cdp.send("Page.getNavigationHistory");
      if (entries[currentIndex]?.url === url) break;
      await sleep(20);
    }
    await cdp.send("Page.reload");
  }
  await loaded;
  await sleep(300);
};

const setDesktop = async (width = 1440, height = 900) => {
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });
};

const setMobile = async () => {
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
};

const frontState = () =>
  evaluate(`(() => {
    const forbiddenIdentity = String.fromCharCode(68, 97, 110, 105, 101, 108, 32, 65, 116, 107, 105, 110, 115, 111, 110);
    const links = [...document.querySelectorAll("a[href]")].map((link) => link.href);
    return {
      room: document.documentElement.dataset.room,
      frontVisible: getComputedStyle(document.querySelector(".front")).display !== "none",
      things: [...document.querySelectorAll(".thing")].map((thing) => [thing.querySelector(".thing-label").textContent, thing.getAttribute("href")]),
      heading: document.querySelector("h1")?.textContent ?? "",
      lede: document.querySelector(".front-lede")?.textContent ?? "",
      hasPersonalIdentity: document.body.innerText.includes(forbiddenIdentity),
      socialLinks: [...new Set(links.filter((href) => /(?:linkedin|instagram|x)\\.com/.test(href)))],
      directEmailLinks: links.filter((href) => href.startsWith("mailto:")),
      contactLabels: [...document.querySelectorAll(".bar .contact a, .bar .contact button")].map((item) => item.getAttribute("aria-label")),
      googlebot: document.querySelector('meta[name="googlebot"]')?.content ?? "",
      overflow: document.documentElement.scrollWidth - innerWidth
    };
  })()`);

const roomVisible = (id) => evaluate(`(() => {
  const room = document.getElementById(${JSON.stringify(id)});
  return Boolean(room) && getComputedStyle(room).display !== "none" && getComputedStyle(document.querySelector(".front")).display === "none";
})()`);

const clickThing = (label) => evaluate(`[...document.querySelectorAll(".thing")].find((thing) => thing.querySelector(".thing-label").textContent === ${JSON.stringify(label)}).click()`);

const waitFor = async (expression, timeout = 6000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(100);
  }
  return false;
};

const checkPublicLanding = async () => {
  section("front page and public boundary");
  await setDesktop();
  await goto("/");
  let state = await frontState();
  const ax = await cdp.send("Accessibility.getFullAXTree");
  const mainHeading = ax.nodes.find((node) => node.role?.value === "heading" && node.properties?.some((property) => property.name === "level" && property.value.value === 1));
  check(mainHeading?.name?.value?.startsWith("I’m Daniel. Online as Akibwa."), `the h1 has a meaningful computed accessible name [${mainHeading?.name?.value}]`);
  check(state.room === "index" && state.frontVisible, "the front page opens on the five things");
  check(JSON.stringify(state.things) === JSON.stringify([["music", "#music"], ["features", "#features"], ["websites", "#websites"], ["career", "#career"], ["trek", "#trek"]]), `five things, all opening in place [${JSON.stringify(state.things)}]`);
  check(state.lede === "Building in the age of AI.", "the front page keeps Dan's proposition");
  check(!state.hasPersonalIdentity, "the page does not contain the personal full name");
  check(state.socialLinks.length === 2 && state.socialLinks.every((href) => href.includes("/dakibwa")), "only the two approved social profiles are linked");
  check(state.directEmailLinks.length === 0 && state.contactLabels.includes("Email Akibwa"), "contact is available without publishing the address in HTML");
  check(JSON.stringify(state.contactLabels) === JSON.stringify(["Instagram — @dakibwa", "X — @dakibwa", "Email Akibwa"]), "the bar keeps three distinct contact controls");
  check(state.googlebot.includes("noimageindex") && state.googlebot.includes("max-snippet:120"), `Google receives the restricted preview policy [${state.googlebot}]`);
  check(await evaluate(`getComputedStyle(document.body).userSelect === "none"`), "the page's text is not selectable");
  check(await evaluate(`!document.documentElement.dataset.sky && getComputedStyle(document.querySelector(".sky-wheel")).transform === "none"`), "the sky opens on the sun beside Daniel");
  check(await waitFor(`document.querySelector(".name")?.dataset.name === "akibwa"`, 6500), "the name changes from Daniel to Akibwa on the original timing");
  check(await evaluate(`document.documentElement.dataset.sky === "night"`), "Akibwa brings the moon");
  await sleep(1700);
  check(await evaluate(`getComputedStyle(document.querySelector(".sky-wheel")).transform.startsWith("matrix(-1")`), "the sky wheel has turned half round to the moon");

  for (const width of [320, 390, 560, 800, 1024, 1440, 1920]) {
    await setDesktop(width, width < 700 ? 844 : 900);
    await sleep(250);
    state = await frontState();
    check(state.overflow <= 1, `the front page stays inside ${width}px [${state.overflow}px]`);
  }
  await setDesktop();

  section("rooms and history");
  await goto("/");
  await clickThing("career");
  await sleep(900);
  check(await roomVisible("career"), "choosing career opens its room in place");
  check(await evaluate("location.hash === '#career'"), "an open room carries its hash");
  check(await evaluate("document.activeElement?.id === 'room-career'"), "focus moves to the room heading");
  check(await evaluate(`(() => { const tab = document.querySelector(".bar-tab")?.getBoundingClientRect(); const link = document.querySelector('.bar-rooms [aria-current="page"]')?.getBoundingClientRect(); return Boolean(tab && link) && Math.abs(tab.left - link.left) < 2 && Math.abs(tab.width - link.width) < 2 && link.width > 0; })()`), "the room on show sits on the bar's ink tab");
  await evaluate("history.back()");
  await sleep(900);
  check(await evaluate("document.documentElement.dataset.room === 'index' && getComputedStyle(document.querySelector('.front')).display !== 'none'"), "Back returns to the five things");
  await clickThing("websites");
  await sleep(700);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(900);
  check(await evaluate("document.documentElement.dataset.room === 'index'"), "Escape closes a room");
  await goto("/#music");
  await sleep(600);
  check(await roomVisible("music"), "a room's link opens straight into it");
  check(await evaluate("scrollY === 0"), "a room's link loads with the bar in view");
  await evaluate("history.back()");
  await sleep(900);
  check(await evaluate("document.documentElement.dataset.room === 'index' && location.pathname === '/'"), "Back from a shared room link lands on the front page");

  section("music");
  await goto("/#music");
  await sleep(1400);
  const albums = await evaluate(`(() => {
    const map = document.querySelector("#music .music-map.is-albums");
    const tiles = [...map.querySelectorAll(".music-tile")];
    const box = (tile) => tile.getBoundingClientRect();
    const area = (tile) => box(tile).width * box(tile).height;
    const frame = map.getBoundingClientRect();
    const roomy = tiles.filter((tile) => Math.min(box(tile).width, box(tile).height) >= 58);
    return {
      count: tiles.length,
      first: area(tiles[0]),
      last: area(tiles.at(-1)),
      covered: tiles.reduce((sum, tile) => sum + (box(tile).width + 4) * (box(tile).height + 4), 0) / ((frame.width + 4) * (frame.height + 4)),
      square: tiles.every((tile) => Math.abs(box(tile).width - box(tile).height) < 0.5),
      hours: roomy.length > 40 && roomy.every((tile) => /\\d+ (h|min)$/.test(tile.querySelector(".music-hours")?.textContent ?? "")),
      lead: tiles[0].querySelector(".music-face").getAttribute("aria-label"),
      large: tiles[0].querySelector("img").srcset.includes("-large.webp"),
      words: [...document.querySelectorAll("#music p")].filter((p) => !p.closest("dialog")).map((p) => p.textContent).join(""),
      head: Boolean(document.querySelector("#music .room-head"))
    };
  })()`);
  check(albums.count === 100, `the albums map holds the top 100 [${albums.count}]`);
  check(albums.first > albums.last * 8, `sleeves are sized by hours listened [${Math.round(albums.first)}px² to ${Math.round(albums.last)}px²]`);
  check(albums.covered > 0.97 && albums.square, `the sleeves are square and leave no holes [${albums.covered.toFixed(3)} covered]`);
  check(albums.lead?.startsWith("Music for Psychedelic Therapy"), `the map starts with the most listened [${albums.lead}]`);
  check(albums.hours, "every sleeve with room for it carries its hours listened");
  check(albums.large, "sleeves drawn large offer the high-resolution rung");
  check(albums.words === "" && !albums.head, `the room explains nothing it need not [${albums.words}]`);
  await evaluate(`[...document.querySelectorAll("#music .music-switch button")].find((button) => button.textContent === "songs").click()`);
  await sleep(700);
  check(await waitFor(`document.querySelectorAll("#music .is-songs .music-tile").length === 1000`, 8000), "the switch shows all thousand songs at once");
  check(await evaluate(`document.querySelector("#music .is-songs .music-face")?.getAttribute("aria-label")?.startsWith("Thursday Afternoon") && !document.querySelector("#music .music-more button")`), "songs start with the most listened, with no button for more");
  const small = await evaluate(`(() => { const tile = [...document.querySelectorAll("#music .is-songs .music-tile")].at(-1); const face = tile.querySelector(".music-face"); face.focus(); return new Promise((done) => setTimeout(() => done({ before: tile.offsetWidth, after: face.getBoundingClientRect().width }), 400)); })()`);
  check(small.before >= 14 && small.after >= 120, `the smallest sleeve is still visible and grows when chosen [${Math.round(small.before)}px to ${Math.round(small.after)}px]`);
  await evaluate(`[...document.querySelectorAll("#music .music-switch button")].find((button) => button.textContent === "albums").click()`);
  await sleep(700);
  await evaluate(`document.querySelectorAll("#music .is-albums .music-face")[1].click()`);
  check(await waitFor(`Boolean(document.querySelector("#music dialog.music-tracks[open] .music-track-list li"))`, 8000), "an album opens its track list once the file loads");
  check(await evaluate(`document.querySelector("#music-tracks-title")?.textContent === "Graceland" && [...document.querySelectorAll(".music-track-list li")].length > 5`), "the track list shows the album's songs with plays and hours");
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(500);
  check(await evaluate(`!document.querySelector("dialog.music-tracks[open]") && document.documentElement.dataset.room === "music"`), "Escape closes the track list and leaves the room open");
  check(await evaluate(`!document.body.innerHTML.includes("spotify:")`), "no track identifiers reach the page");
  for (const width of [360, 820]) {
    await setDesktop(width, 844);
    await sleep(500);
    const fit = await evaluate(`(() => { const map = document.querySelector("#music .music-map").getBoundingClientRect(); const wide = [...document.querySelectorAll("body *")].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).map((element) => element.tagName + "." + String(element.className).split(" ")[0]).slice(0, 3); return { ok: document.documentElement.scrollWidth <= innerWidth + 1 && map.right <= innerWidth, wide, right: Math.round(map.right) }; })()`);
    check(fit.ok, `the music map fits ${width}px [${fit.right}px ${fit.wide.join(", ")}]`);
  }
  await setDesktop();

  section("mascot");
  await goto("/");
  check(await evaluate(`document.documentElement.dataset.skyHost === "mascot" && document.querySelector(".mascot").classList.contains("is-in-sky")`), "the mascot starts in the sky's window");
  await sleep(4600);
  check(await evaluate(`!document.documentElement.dataset.skyHost && getComputedStyle(document.querySelector(".sky-sun")).opacity === "1"`), "it leaps out and the window shows its sky");
  const mascot = await evaluate(`(() => { const el = document.querySelector(".mascot"); const box = el.getBoundingClientRect(); return { placed: el.classList.contains("is-placed"), x: box.left + box.width / 2, y: box.top + box.height / 2, w: box.width }; })()`);
  check(mascot.placed && mascot.w > 40, "the mascot is on the front page");
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: mascot.x, y: mascot.y, button: "left", clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: mascot.x - 120, y: mascot.y - 40, button: "left" });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: mascot.x - 240, y: mascot.y - 60, button: "left" });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: mascot.x - 240, y: mascot.y - 60, button: "left", clickCount: 1 });
  await sleep(400);
  check(await evaluate(`(() => { const box = document.querySelector(".mascot").getBoundingClientRect(); return Math.abs(box.left + box.width / 2 - ${mascot.x - 240}) < 12; })()`), "the mascot can be picked up and set down elsewhere");

  section("career, websites and features");
  await goto("/#career");
  await sleep(2600);
  const cards = await evaluate(`(() => {
    const cards = [...document.querySelectorAll("#career .career-card")];
    const columns = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left)));
    return { count: cards.length, first: cards[0]?.querySelector(".career-name")?.textContent, columns: columns.size, statements: cards.every((card) => card.querySelector(".career-statement")?.textContent), years: cards.every((card) => /\\d{4}|Now/.test(card.querySelector(".career-role")?.textContent ?? "")) };
  })()`);
  check(cards.count === 8 && cards.first === "Freelance", `career keeps its eight roles, the current first [${cards.count}, ${cards.first}]`);
  check(cards.columns === 3 && cards.statements && cards.years, `every role is a card with its years and statement, three to a row [${cards.columns}]`);
  await setDesktop(390, 844);
  await sleep(600);
  check(await evaluate(`new Set([...document.querySelectorAll("#career .career-card")].map((card) => Math.round(card.getBoundingClientRect().left))).size === 1 && document.documentElement.scrollWidth <= innerWidth + 1`), "on a phone the cards stack");
  await setDesktop();
  await goto("/#websites");
  await sleep(600);
  check(await evaluate(`JSON.stringify([...document.querySelectorAll("#websites .concept-project-card")].map((card) => card.getAttribute("href"))) === JSON.stringify(["https://portuguesewithines.com/","https://www.castle-bank.com/",null])`), "the websites room shows Dan's three sites, Butterfly Rose unlinked until it is live");
  check(await evaluate(`[...document.querySelectorAll("#websites .concept-project-copy")].every((copy) => copy.textContent.trim().split(/\\s+/).length <= 8)`), "every site says what it is in eight words or fewer");
  await goto("/#trek");
  await sleep(1200);
  check(await evaluate(`(() => { const frame = document.querySelector("#trek iframe.room-frame"); return Boolean(frame) && new URL(frame.src).pathname === "/trek/" && frame.getBoundingClientRect().height > innerHeight * 0.6; })()`), "the trek opens in place, its journey filling the room");
  check(await waitFor(`document.querySelector("#trek iframe")?.contentDocument?.documentElement.classList.contains("is-embedded")`, 8000), "the framed trek hides its own way home");
  await goto("/#features");
  await sleep(1200);
  check(await evaluate(`(() => { const frame = document.querySelector("#features iframe.room-frame"); return Boolean(frame) && new URL(frame.src).pathname === "/features/" && !new URL(frame.src).search && frame.getBoundingClientRect().height > innerHeight * 0.6; })()`), "features opens the game in place, filling the room");

  section("without JavaScript");
  await cdp.send("Emulation.setScriptExecutionDisabled", { value: true });
  await goto("/#career");
  await sleep(400);
  check(await evaluate("true").catch(() => true), "pages load with scripts disabled");
  await cdp.send("Emulation.setScriptExecutionDisabled", { value: false });
  // Script execution is disabled for page scripts only, so read the layout through CDP.
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#career" });
  const box = await cdp.send("DOM.getBoxModel", { nodeId }).catch(() => null);
  check(Boolean(box), "a room's link still opens the room through :target");
  await goto("/");

  section("reduced motion");
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await goto("/");
  await sleep(4200);
  check(await evaluate(`document.querySelector(".name")?.dataset.name === "daniel" && !document.documentElement.dataset.sky`), "reduced motion keeps Daniel and the sun without the change");
  check(await evaluate(`getComputedStyle(document.querySelector(".thing .t-paper")).opacity === "1"`), "reduced motion shows the five things at once");
  await cdp.send("Emulation.setEmulatedMedia", { features: [] });

  section("console");
  const errors = cdp.events.filter((event) => event.method === "Runtime.exceptionThrown" || (event.method === "Runtime.consoleAPICalled" && event.params.type === "error"));
  check(errors.length === 0, `no page errors [${errors.map((event) => event.params.exceptionDetails?.text ?? event.params.args?.[0]?.value).join(" | ")}]`);
};

const main = async () => {
  if (!externalOrigin && !existsSync(join(outDir, "index.html"))) {
    console.error("out/index.html not found — run `npm run build` first.");
    process.exit(2);
  }
  const chromeBin = findChrome();
  if (!chromeBin) {
    console.error("No Chrome/Chromium found. Set CHROME_BIN to a browser binary.");
    process.exit(2);
  }

  const timeoutMs = process.env.CHECK_TREK_ONLY ? 240000 : 180000;
  const watchdog = setTimeout(() => {
    console.error(`\nNavigation DOM check timed out after ${timeoutMs / 1000}s.`);
    process.exit(1);
  }, timeoutMs);
  watchdog.unref();

  let server = null;
  if (externalOrigin) {
    origin = externalOrigin.replace(/\/$/, "");
  } else {
    server = await startServer();
    origin = `http://127.0.0.1:${server.address().port}`;
  }
  process.stdout.write(`Checking Akibwa public boundary against ${origin}\n`);

  const profileDir = mkdtempSync(join(tmpdir(), "akibwa-public-check-"));
  const { processHandle, port } = await launchChrome(chromeBin, profileDir);

  try {
    let pageTarget = null;
    for (let attempt = 0; attempt < 20 && !pageTarget; attempt += 1) {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      pageTarget = targets.find((target) => target.type === "page") ?? null;
      if (!pageTarget) await sleep(150);
    }
    if (!pageTarget) throw new Error("no page target exposed by Chrome");
    cdp = await Cdp.connect(pageTarget.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    // Native focus events are suppressed while the headless page is inactive.
    await cdp.send("Page.bringToFront");
    if (process.env.CHECK_TREK_ONLY) await checkTrekPaths({cdp,evaluate,goto,setDesktop,sleep,check,section,capture});
    else await checkPublicLanding();
  } finally {
    cdp?.socket.close();
    try {
      if (processHandle.exitCode === null && processHandle.signalCode === null) {
        await new Promise((resolve) => {
          const force = setTimeout(() => {
            processHandle.kill('SIGKILL');
            resolve();
          }, 1500);
          processHandle.once('exit', () => { clearTimeout(force); resolve(); });
          processHandle.kill();
        });
      }
    } catch {
      /* Already gone. */
    }
    processHandle.stderr?.destroy();
    processHandle.unref();
    server?.close();
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      /* Best effort. */
    }
    clearTimeout(watchdog);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} public-boundary check(s) failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log("\nAkibwa public-boundary DOM checks passed.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
