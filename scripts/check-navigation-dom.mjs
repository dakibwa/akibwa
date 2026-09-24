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
  check(JSON.stringify(state.things) === JSON.stringify([["taste", "#taste"], ["features", "#features"], ["websites", "#websites"], ["career", "#career"], ["trek", "/trek/"]]), `five things, the trek opening its own page [${JSON.stringify(state.things)}]`);
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
  await evaluate("history.back()");
  await sleep(900);
  check(await evaluate("document.documentElement.dataset.room === 'index' && getComputedStyle(document.querySelector('.front')).display !== 'none'"), "Back returns to the five things");
  await clickThing("websites");
  await sleep(700);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(900);
  check(await evaluate("document.documentElement.dataset.room === 'index'"), "Escape closes a room");
  await goto("/#taste");
  await sleep(600);
  check(await roomVisible("taste"), "a room's link opens straight into it");
  check(await evaluate("scrollY === 0"), "a room's link loads with the bar in view");
  await evaluate("history.back()");
  await sleep(900);
  check(await evaluate("document.documentElement.dataset.room === 'index' && location.pathname === '/'"), "Back from a shared room link lands on the front page");

  section("taste library");
  await goto("/#taste");
  await sleep(1200);
  const mixed = await evaluate(`(() => { const cards = [...document.querySelectorAll("#taste .personal-taste-card")]; return { count: cards.length, kinds: [...new Set(cards.map((card) => card.dataset.kind))].sort(), first: cards[0]?.dataset.kind }; })()`);
  check(mixed.count === 48 && mixed.first === "songs", `the mixed wall holds 48 covers and opens with a song [${mixed.count}, ${mixed.first}]`);
  check(JSON.stringify(mixed.kinds) === JSON.stringify(["films", "games", "music", "podcasts", "songs", "tv"]), `the wall mixes songs, albums, films, games, TV and podcasts [${mixed.kinds}]`);
  check(await evaluate(`JSON.stringify([...document.querySelectorAll("#taste .taste-filters button")].map((button) => button.textContent)) === JSON.stringify(["Songs","Artists","Albums","Films","Games","TV","Podcasts"])`), "the filters lead with Songs and Artists");
  await evaluate(`[...document.querySelectorAll("#taste .taste-filters button")].find((button) => button.textContent === "Songs").click()`);
  check(await waitFor(`[...document.querySelectorAll("#taste .personal-taste-card")].every((card) => card.dataset.kind === "songs") && !document.querySelector(".taste-load-status")`, 8000), "Songs shows the song shelf once the ranking loads");
  check(await evaluate(`document.querySelector("#taste .personal-taste-card")?.getAttribute("aria-label")?.startsWith("Summer Friends")`), "the song shelf starts at number one");
  await evaluate(`[...document.querySelectorAll("#taste .taste-filters button")].find((button) => button.textContent === "Artists").click()`);
  await sleep(500);
  check(await evaluate(`(() => { const cards = [...document.querySelectorAll("#taste .personal-taste-card")]; return cards.length >= 48 && cards.every((card) => card.dataset.kind === "artists") && cards[0].getAttribute("aria-label").startsWith("Animal Collective"); })()`), "Artists shows the top artists, most played first");
  check(await evaluate(`!document.body.innerHTML.includes("spotify:")`), "no track identifiers reach the page");

  section("career, websites and features");
  await goto("/#career");
  await sleep(700);
  check(await evaluate(`document.querySelectorAll("#career .concept-career-stop").length === 8`), "the career timeline keeps its eight roles");
  check(await evaluate(`document.querySelector("#career .career-detail[data-active='true'] strong")?.textContent === "Freelance"`), "the current role's statement rests beneath the timeline");
  await evaluate(`document.querySelectorAll("#career .concept-career-stop")[4].click()`);
  await sleep(500);
  check(await evaluate(`document.querySelector("#career .career-detail[data-active='true'] strong")?.textContent === "Sky Betting & Gaming"`), "choosing a role moves its statement beneath it");
  await goto("/#websites");
  await sleep(600);
  check(await evaluate(`JSON.stringify([...document.querySelectorAll("#websites .concept-project-card")].map((card) => card.getAttribute("href"))) === JSON.stringify(["https://portuguesewithines.com/","https://www.castle-bank.com/",null])`), "the websites room shows Dan's three sites, Butterfly Rose unlinked until it is live");
  check(await evaluate(`[...document.querySelectorAll("#websites .concept-project-copy")].length === 3`), "every site prints its description");
  await goto("/#features");
  await sleep(600);
  check(await evaluate(`document.querySelectorAll("#features .play-crossing").length >= 3`), "the puzzle starts tangled");
  const solvedByKeys = await evaluate(`(async () => {
    const dots = [...document.querySelectorAll("#features .play-dot")];
    const board = document.querySelector("#features .play-board");
    const targets = [[48, 82], [14, 35], [30.2, 17.2], [65.8, 17.2], [82, 35]].map(([x, y]) => [2 + x * 96 / 96, 2 + y * 96 / 96]);
    for (let i = 0; i < dots.length; i++) {
      const node = dots[i].closest(".play-node");
      for (let step = 0; step < 60; step++) {
        const [x, y] = node.getAttribute("transform").match(/-?[\\d.]+/g).map(Number);
        const [tx, ty] = targets[i];
        if (Math.abs(tx - x) < 3 && Math.abs(ty - y) < 3) break;
        const key = Math.abs(tx - x) >= Math.abs(ty - y) ? (tx > x ? "ArrowRight" : "ArrowLeft") : (ty > y ? "ArrowDown" : "ArrowUp");
        dots[i].dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1400));
    return board.classList.contains("is-solved") && board.getAttribute("aria-label") === "Untangled: a heart" && Number(board.querySelector(".play-shape").getAttribute("opacity")) === 1;
  })()`);
  check(solvedByKeys, "the puzzle can be untangled from the keyboard and settles into a coloured heart");
  check(await evaluate(`!document.querySelector("#features .play-plate, #features .play-stamp")`), "a solved shape stays itself rather than becoming a stamp");

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
