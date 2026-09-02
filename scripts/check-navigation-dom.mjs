/* Rendered regression check for Akibwa's public, brand-led homepage.
 *
 * Usage: npm run build && npm run check:navigation:dom
 * Optional: CHECK_NAV_URL=https://akibwa.com npm run check:navigation:dom
 */

import { execSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

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
        "--disable-gpu",
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
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
        return;
      }
      if (!message.method) return;
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
  await cdp.send("Page.navigate", { url: `${origin}${path}` });
  await loaded;
  await sleep(300);
};

const setDesktop = (width = 1440, height = 900) =>
  cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });

const setMobile = () =>
  cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

const publicLandingState = () =>
  evaluate(`(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    };
    const forbiddenIdentity = String.fromCharCode(68, 97, 110, 105, 101, 108, 32, 65, 116, 107, 105, 110, 115, 111, 110);
    const bodyText = document.body.innerText;
    const links = [...document.querySelectorAll("a[href]")].map((link) => link.href);
    const capabilityList = document.querySelector(".concept-capability-list");
    const projectRail = document.querySelector(".concept-project-swipe");
    const projectStops = [...document.querySelectorAll(".concept-project-stop")];
    return {
      identity: document.querySelector(".concept-identity")?.textContent.trim(),
      lede: document.querySelector(".concept-lede")?.textContent.trim(),
      projectCount: document.querySelectorAll(".concept-project-card").length,
      capabilityCount: document.querySelectorAll(".concept-capability-list > li").length,
      capabilityColumns: getComputedStyle(capabilityList).gridTemplateColumns.split(" ").length,
      hasPersonalIdentity: bodyText.includes(forbiddenIdentity),
      hasCareer: [...document.querySelectorAll("h1, h2, h3")].some((heading) => heading.textContent.trim() === "Career"),
      hasTasteLibrary: bodyText.includes("Taste Library"),
      socialLinks: links.filter((href) => /(?:linkedin|instagram|x)\\.com/.test(href)),
      directEmailLinks: links.filter((href) => href.startsWith("mailto:")),
      emailButtonCount: document.querySelectorAll('button[aria-label="Email Akibwa"]').length,
      googlebot: document.querySelector('meta[name="googlebot"]')?.content ?? "",
      overflow: document.documentElement.scrollWidth - innerWidth,
      hero: rect(".concept-hero"),
      capabilities: rect(".concept-capabilities"),
      projects: {
        railWidth: projectRail.clientWidth,
        railScrollWidth: projectRail.scrollWidth,
        widths: projectStops.map((stop) => stop.getBoundingClientRect().width),
        tops: projectStops.map((stop) => stop.getBoundingClientRect().top),
        first: rect(".concept-project-stop"),
        copyFits: projectStops.every((stop) => {
          const copy = stop.querySelector(".concept-project-popover p");
          return copy.scrollWidth <= copy.clientWidth + 1;
        })
      }
    };
  })()`);

const checkPublicLanding = async () => {
  section("public identity boundary");
  await setDesktop();
  await goto("/");
  let state = await publicLandingState();
  check(state.identity === "Akibwa", `the masthead exposes only Akibwa [${state.identity}]`);
  check(state.lede === "Building in the age of AI.", "the public proposition is concise");
  check(state.projectCount === 3, `the homepage shows three current projects [${state.projectCount}]`);
  check(state.capabilityCount === 3, `the homepage shows three broad capabilities [${state.capabilityCount}]`);
  check(state.capabilityColumns === 3, `capabilities form a three-column desktop composition [${state.capabilityColumns}]`);
  check(!state.hasPersonalIdentity, "the indexed page does not contain the personal full name");
  check(!state.hasCareer && !state.hasTasteLibrary, "career and taste archives stay off the indexed page");
  check(state.socialLinks.length === 0, "the indexed page has no personal social links");
  check(
    state.directEmailLinks.length === 0 && state.emailButtonCount === 1,
    "contact is available without publishing the address in HTML"
  );
  check(
    state.googlebot.includes("noimageindex") && state.googlebot.includes("max-snippet:120"),
    `Google receives the restricted preview policy [${state.googlebot}]`
  );
  check(state.overflow <= 1, `the desktop page stays inside the viewport [${state.overflow}px]`);
  check(
    state.hero && state.capabilities && state.capabilities.top > state.hero.bottom,
    "the editorial chapters remain in reading order"
  );

  section("mobile public boundary");
  await setMobile();
  await goto("/");
  state = await publicLandingState();
  check(state.identity === "Akibwa", "the mobile masthead remains brand-only");
  check(state.capabilityColumns === 1, `capabilities become one mobile column [${state.capabilityColumns}]`);
  check(state.overflow <= 1, `the mobile page stays inside the viewport [${state.overflow}px]`);
  check(
    state.projects.widths.every((width) => width >= state.projects.railWidth * 0.8 && width <= state.projects.railWidth * 0.9) &&
      state.projects.tops.every((top) => Math.abs(top - state.projects.tops[0]) <= 1) &&
      state.projects.railScrollWidth > state.projects.railWidth * 2,
    `projects form one comfortably sized swipe rail [${state.projects.widths.map((width) => width.toFixed(1)).join(" / ")}px]`
  );
  check(
    state.projects.first.left >= 0 && state.projects.first.right <= 390 && state.projects.copyFits,
    "the first mobile project and every description fit without text clipping"
  );
  check(
    state.directEmailLinks.length === 0 && state.socialLinks.length === 0,
    "mobile HTML carries no direct personal contact links"
  );

  section("detailed routes");
  await setDesktop();
  await goto("/trek/");
  const trekRobots = await evaluate(
    'document.querySelector(\'meta[name="robots"]\')?.content ?? ""'
  );
  check(
    trekRobots.includes("noindex") && trekRobots.includes("noimageindex"),
    `Trek is excluded from search and image indexes [${trekRobots}]`
  );
  const lifeMapResponse = await fetch(`${origin}/life-map/`, { redirect: "manual" });
  check(lifeMapResponse.status === 404, `Life in Maps no longer ships [HTTP ${lifeMapResponse.status}]`);
  await goto("/features/?from=akibwa");
  const featureState = await evaluate(`(() => ({
    identity: document.querySelector(".akibwa-project-banner__identity")?.textContent.trim(),
    overflow: document.documentElement.scrollWidth - innerWidth
  }))()`);
  check(featureState.identity === "Akibwa", `Features project view is brand-only [${featureState.identity}]`);
  check(featureState.overflow <= 1, `Features stays inside the viewport [${featureState.overflow}px]`);

  section("reduced motion");
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });
  await goto("/");
  const capabilityTransition = await evaluate(
    'getComputedStyle(document.querySelector(".concept-capability-list li")).transitionDuration'
  );
  check(
    capabilityTransition.split(",").every((part) => parseFloat(part) === 0),
    `capability motion is disabled [${capabilityTransition}]`
  );
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

  const watchdog = setTimeout(() => {
    console.error("\nNavigation DOM check timed out after 120s.");
    process.exit(1);
  }, 120000);
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
    await checkPublicLanding();
  } finally {
    try {
      processHandle.kill();
    } catch {
      /* Already gone. */
    }
    server?.close();
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      /* Best effort. */
    }
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
