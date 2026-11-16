/* Rendered regression check for Akibwa's one page, the music shelf, and, with
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
import { unpackRanking } from "../components/paper/music-ranking.mjs";
import { mergeShelf } from "../components/paper/music-shelf.mjs";

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

const pageState = () =>
  evaluate(`(() => {
    const forbiddenIdentity = String.fromCharCode(68, 97, 110, 105, 101, 108, 32, 65, 116, 107, 105, 110, 115, 111, 110);
    const links = [...document.querySelectorAll("a[href]")].map((link) => link.href);
    return {
      heading: document.querySelector("h1")?.textContent ?? "",
      tiles: document.querySelectorAll(".music-page .music-tile").length,
      retired: [...document.querySelectorAll("#trek, #career, #websites, .front, .things, .mascot, .night-switch, .bar-rooms, .contact")].length,
      hasPersonalIdentity: document.body.innerText.includes(forbiddenIdentity),
      links: links.length,
      directEmailLinks: links.filter((href) => href.startsWith("mailto:")),
      googlebot: document.querySelector('meta[name="googlebot"]')?.content ?? "",
      overflow: document.documentElement.scrollWidth - innerWidth
    };
  })()`);

const waitFor = async (expression, timeout = 6000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(100);
  }
  return false;
};

const checkPublicLanding = async () => {
  // One record for every top album and every other sleeve or song (mergeShelf).
  const published = unpackRanking(JSON.parse(readFileSync(new URL("../public/music-ranking.json", import.meta.url), "utf8")));
  const RECORDS = mergeShelf(published.albums, published.songs).length;
  // Dan, 16 November 2026: akibwa.com is one page, the music shelf.
  section("the page and public boundary");
  await setDesktop();
  await goto("/");
  await sleep(800);
  let state = await pageState();
  const ax = await cdp.send("Accessibility.getFullAXTree");
  const mainHeading = ax.nodes.find((node) => node.role?.value === "heading" && node.properties?.some((property) => property.name === "level" && property.value.value === 1));
  check(mainHeading?.name?.value === "Akibwa: the music I play most", `the h1 names the page for readers [${mainHeading?.name?.value}]`);
  check(state.tiles === RECORDS, `the page is the shelf of every record [${state.tiles} of ${RECORDS}]`);
  check(state.retired === 0, "the front page, its rooms and its bar are gone");
  check(state.links === 0 && state.directEmailLinks.length === 0, `the shelf links nowhere until a sheet opens [${state.links}]`);
  check(!state.hasPersonalIdentity, "the page does not contain the personal full name");
  check(state.googlebot.includes("noimageindex") && state.googlebot.includes("max-snippet:120"), `Google receives the restricted preview policy [${state.googlebot}]`);
  check(await evaluate(`getComputedStyle(document.body).userSelect === "none"`), "the page's text is not selectable");
  for (const width of [320, 390, 560, 800, 1024, 1440, 1920]) {
    await setDesktop(width, width < 700 ? 844 : 900);
    await sleep(900);
    state = await pageState();
    check(state.overflow <= 1, `the page stays inside ${width}px [${state.overflow}px]`);
  }
  await setDesktop();

  section("old links");
  await goto("/#trek");
  check(await waitFor(`location.pathname === "/trek/"`, 6000), "an old #trek link reaches the trek's own page");
  for (const hash of ["career", "music"]) {
    await goto(`/#${hash}`);
    check(await waitFor(`location.pathname === "/" && location.hash === "" && document.querySelectorAll(".music-page .music-tile").length === ${RECORDS}`), `an old #${hash} link lands on the shelf`);
  }

  section("music");
  await goto("/");
  await sleep(1400);
  const albums = await evaluate(`(() => {
    const map = document.querySelector(".music-page .music-map");
    const tiles = [...map.querySelectorAll(".music-tile")];
    const box = (tile) => tile.getBoundingClientRect();
    const area = (tile) => box(tile).width * box(tile).height;
    const frame = map.getBoundingClientRect();
    return {
      count: tiles.length,
      first: area(tiles[0]),
      last: area(tiles.at(-1)),
      bounded: tiles.every((tile) => Math.abs(box(tile).width - box(tile).height) < 0.5 && box(tile).width >= 44 && box(tile).width <= frame.width / 2 + 1),
      inside: tiles.every((tile) => box(tile).left >= frame.left - 1 && box(tile).right <= frame.right + 1),
      lead: tiles[0].querySelector(".music-face").getAttribute("aria-label"),
      large: tiles[0].querySelector("img").srcset.includes("-large.webp"),
      words: [...document.querySelectorAll(".music-page p")].filter((p) => !p.closest("dialog")).map((p) => p.textContent).join(""),
      head: Boolean(document.querySelector(".music-page .room-head"))
    };
  })()`);
  check(albums.count === RECORDS, `the shelf holds every record, albums and songs merged [${albums.count}]`);
  check(await evaluate(`[...document.querySelectorAll(".music-page .music-face")].some((face) => face.getAttribute("aria-label").startsWith("Hey World!, King Krule"))`), "a record loved for one song is on the shelf (King Krule's Hey World!)");
  check(albums.first > albums.last * 6, `sleeves are sized by hours listened [${Math.round(albums.first)}px² to ${Math.round(albums.last)}px²]`);
  check(albums.bounded && albums.inside, "the sleeves are square, between the floor and the cap, and on the shelf");
  check(albums.lead?.startsWith("Music for Psychedelic Therapy"), `the map starts with the most listened [${albums.lead}]`);
  // Dan, 16 November 2026: everything to know is in the bar above the shelf.
  const pointed = await evaluate(`(() => { const face = [...document.querySelectorAll(".music-page .music-face")].find((button) => button.getAttribute("aria-label").startsWith("Graceland")); face.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" })); return new Promise((done) => setTimeout(() => done(document.querySelector(".music-page .music-now")?.textContent ?? ""), 200)); })()`);
  check(/^Graceland.*\d+ h listened/.test(pointed), `pointing at a sleeve names it and its hours in the bar [${pointed}]`);
  for (const [order, heading] of [["kind", "ambient"], ["year", "2026"], ["a–z", "A"]]) {
    await evaluate(`[...document.querySelectorAll(".music-page .music-order button")].find((button) => button.textContent === ${JSON.stringify(order)}).click()`);
    check(await waitFor(`(() => { const heads = [...document.querySelectorAll(".music-page .music-group-head")].map((head) => head.firstElementChild.textContent); return heads.includes(${JSON.stringify(heading)}) && document.querySelectorAll(".music-page .music-tile").length === ${RECORDS}; })()`, 4000), `the ${order} order sorts every record under its headings`);
  }
  await evaluate(`[...document.querySelectorAll(".music-page .music-order button")].find((button) => button.textContent === "hours").click()`);
  check(await waitFor(`!document.querySelector(".music-page .music-group-head") && document.querySelector(".music-page .music-face")?.getAttribute("aria-label").startsWith("Music for Psychedelic Therapy")`, 4000), "the hours order puts the shelf back, most listened first");
  check(albums.large, "sleeves drawn large offer the high-resolution rung");
  check(albums.words === "" && !albums.head, `the shelf explains nothing it need not [${albums.words}]`);
  // The search knows who plays with whom, and eras.
  await evaluate(`document.querySelector(".music-page .music-search input").focus()`);
  await cdp.send("Input.insertText", { text: "panda bear" });
  check(await waitFor(`(() => { const faces = [...document.querySelectorAll(".music-page .music-face")].map((face) => face.getAttribute("aria-label")); return faces.length > 1 && faces.length < 60 && faces.some((label) => label.includes("Animal Collective")); })()`, 8000), "searching Panda Bear also finds Animal Collective");
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(600);
  check(await evaluate(`document.querySelectorAll(".music-page .music-tile").length === ${RECORDS}`), "Escape clears the search");
  const smallest = await evaluate(`Math.min(...[...document.querySelectorAll(".music-page .music-tile")].map((tile) => tile.offsetWidth))`);
  check(smallest >= 44, `the smallest square is big enough to see [${smallest}px]`);
  const graceland = `[...document.querySelectorAll(".music-page .music-face")].find((button) => button.getAttribute("aria-label").startsWith("Graceland"))`;
  await evaluate(`${graceland}.click()`);
  check(await waitFor(`Boolean(document.querySelector(".music-page dialog.music-tracks[open] .music-track-list li"))`, 8000), "an album opens its track list once the file loads");
  check(await evaluate(`document.querySelector("#music-tracks-title")?.textContent === "Graceland" && [...document.querySelectorAll(".music-track-list li")].length > 5`), "the track list shows the album's songs with plays and hours");
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(500);
  check(await evaluate(`!document.querySelector("dialog.music-tracks[open]")`), "Escape closes the track list");
  check(await evaluate(`document.activeElement?.classList.contains("music-face") && document.activeElement?.getAttribute("aria-label").startsWith("Graceland")`), "closing a sheet returns keyboard focus to its album");
  check(await evaluate(`!document.body.innerHTML.includes("spotify:")`), "no track identifiers reach the page");
  await evaluate(`${graceland}.click()`);
  await waitFor(`Boolean(document.querySelector("dialog:modal"))`);
  await goto("/");
  check(await evaluate(`!document.querySelector("dialog:modal")`), "loading the page again does not reopen the previous sheet");
  for (const width of [320, 360, 401, 414, 479, 480, 600, 720, 820]) {
    await setDesktop(width, 844);
    await sleep(500);
    const fit = await evaluate(`(() => { const map = document.querySelector(".music-page .music-map").getBoundingClientRect(); const wide = [...document.querySelectorAll("body *")].filter((element) => element.getBoundingClientRect().right > innerWidth + 1).map((element) => element.tagName + "." + String(element.className).split(" ")[0]).slice(0, 3); return { ok: document.documentElement.scrollWidth <= innerWidth + 1 && map.right <= innerWidth, wide, right: Math.round(map.right) }; })()`);
    check(fit.ok, `the music map fits ${width}px [${fit.right}px ${fit.wide.join(", ")}]`);
  }
  await setDesktop();

  section("music loading recovery");
  await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*music-ranking.json", requestStage: "Request" }] });
  let paused = cdp.waitFor("Fetch.requestPaused");
  let navigation = goto("/");
  let request = await paused;
  await cdp.send("Fetch.fulfillRequest", { requestId: request.requestId, responseCode: 503, body: Buffer.from("unavailable").toString("base64") });
  await navigation;
  check(await waitFor(`Boolean(document.querySelector(".music-page .music-more button"))`), "a failed ranking preserves the seed and offers recovery");
  await evaluate(`document.querySelector(".music-page .music-face").click()`);
  check(await waitFor(`Boolean(document.querySelector("dialog[open] .music-tracks-note button"))`), "a failed track list can be retried from inside its modal");
  paused = cdp.waitFor("Fetch.requestPaused");
  await evaluate(`document.querySelector("dialog .music-tracks-note button").click()`);
  request = await paused;
  await cdp.send("Fetch.continueRequest", { requestId: request.requestId });
  await cdp.send("Fetch.disable");
  check(await waitFor(`Boolean(document.querySelector("dialog[open] .music-track-list li"))`, 8000), "retrying fills the same open sheet with its tracks");

  await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*music-ranking.json", requestStage: "Request" }] });
  paused = cdp.waitFor("Fetch.requestPaused");
  navigation = goto("/");
  request = await paused;
  await cdp.send("Fetch.fulfillRequest", {
    requestId: request.requestId,
    responseCode: 200,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }],
    body: Buffer.from(JSON.stringify({ schemaVersion: 2, names: [], songs: [], albums: [] })).toString("base64")
  });
  await navigation;
  check(await waitFor(`document.querySelectorAll(".music-page .music-tile").length === ${RECORDS} && Boolean(document.querySelector(".music-page .music-more button"))`), "an empty successful response cannot erase the shelf");
  await cdp.send("Fetch.disable");

  section("without JavaScript");
  await setDesktop(320, 568);
  await cdp.send("Emulation.setScriptExecutionDisabled", { value: true });
  await goto("/");
  await cdp.send("Emulation.setScriptExecutionDisabled", { value: false });
  check(await evaluate(`document.querySelectorAll(".music-page .music-tile").length === ${RECORDS}`), "the shelf is there without JavaScript");
  check(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "the shelf fits a 320px phone without JavaScript");
  await setDesktop();

  section("reduced motion");
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await goto("/");
  await sleep(800);
  await evaluate(`[...document.querySelectorAll(".music-page .music-order button")].find((button) => button.textContent === "kind").click()`);
  await sleep(300);
  check(await evaluate(`document.querySelectorAll(".music-page .music-group-head").length > 0 && !document.getAnimations().some((animation) => animation.playState === "running" && animation.effect?.target?.classList?.contains("music-tile"))`), "under reduced motion an order sorts the shelf without gliding");
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
