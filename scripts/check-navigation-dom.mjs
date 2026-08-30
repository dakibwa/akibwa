/* Rendered regression check for Akibwa's unified visual index.
 *
 * Usage: npm run build && npm run check:navigation:dom
 * Optional: CHECK_NAV_URL=https://akibwa.com to exercise the deployed site.
 */

import { spawn, execSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../out", import.meta.url));
const externalOrigin = process.env.CHECK_NAV_URL || null;
const failures = [];
let currentSection = "setup";

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
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".avif": "image/avif", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon",
  ".txt": "text/plain", ".xml": "application/xml", ".woff2": "font/woff2"
};

const startServer = () => new Promise((resolve) => {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://local").pathname);
    const candidates = [
      join(outDir, path),
      join(outDir, path, "index.html"),
      join(outDir, `${path.replace(/\/$/, "")}.html`)
    ];
    for (const file of candidates) {
      if (!existsSync(file) || file.endsWith("/") || file.endsWith("out")) continue;
      try {
        const body = readFileSync(file);
        res.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
        res.end(body);
        return;
      } catch {
        /* Directory candidate; try the next form. */
      }
    }
    res.writeHead(404);
    res.end("not found");
  });
  server.listen(0, "127.0.0.1", () => resolve(server));
});

const findChrome = () => {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  ];
  for (const path of candidates) if (existsSync(path)) return path;
  for (const name of ["google-chrome", "chromium", "chromium-browser"]) {
    try {
      return execSync(`command -v ${name}`, { encoding: "utf8" }).trim();
    } catch {
      /* Keep looking. */
    }
  }
  return null;
};

const launchChrome = (chromeBin, profileDir) => new Promise((resolve, reject) => {
  const proc = spawn(chromeBin, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1440,900",
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  const timer = setTimeout(
    () => reject(new Error("Chrome DevTools endpoint did not appear within 15s")),
    15000
  );
  const onData = (chunk) => {
    stderr += chunk;
    const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
    if (!match) return;
    clearTimeout(timer);
    proc.stderr.off("data", onData);
    resolve({ proc, port: Number(match[1]) });
  };
  proc.stderr.on("data", onData);
  proc.on("exit", () => {
    clearTimeout(timer);
    reject(new Error(`Chrome exited before DevTools was ready:\n${stderr}`));
  });
});

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = [];
    ws.addEventListener("message", (event) => {
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
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", () => reject(new Error(`WebSocket failed: ${url}`)), { once: true });
    });
    return new Cdp(ws);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
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

let cdp;
let origin;

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (exceptionDetails) {
    throw new Error(`page evaluation failed: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ""}`);
  }
  return result.value;
};

const goto = async (path = "/") => {
  const loaded = cdp.waitFor("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: `${origin}${path}` });
  await loaded;
  await sleep(300);
};

const setDesktop = (width = 1440, height = 900) => cdp.send("Emulation.setDeviceMetricsOverride", {
  width, height, deviceScaleFactor: 1, mobile: false
});
const setMobile = () => cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true
});
const mouseMove = (x, y) => cdp.send("Input.dispatchMouseEvent", {
  type: "mouseMoved", x, y
});
const pressEscape = async () => {
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27
  });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27
  });
};
const pollUntil = async (probe, predicate, timeoutMs = 1200) => {
  const deadline = Date.now() + timeoutMs;
  let last;
  do {
    last = await probe();
    if (predicate(last)) return last;
    await sleep(40);
  } while (Date.now() < deadline);
  return last;
};

const pageState = () => evaluate(`(() => {
  const cards = [...document.querySelectorAll(".deck .card")];
  const headline = document.querySelector(".hero-sentence");
  const readableHeadline = headline?.cloneNode(true);
  readableHeadline?.querySelectorAll(".hero-name-sizer").forEach((node) => node.remove());
  const visible = cards.filter((card) => {
    const style = getComputedStyle(card);
    return style.display !== "none" && card.getClientRects().length > 0;
  });
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  return {
    headline: readableHeadline?.textContent.trim().replace(/\\s+/g, " "),
    name: document.querySelector(".hero-name-value")?.textContent.trim(),
    nameTag: document.querySelector(".hero-name")?.tagName,
    nameFocusable: document.querySelector(".hero-name")?.tabIndex >= 0,
    filters: [...document.querySelectorAll(".deck-legend .rail-word")].map((button) => ({
      text: button.textContent.trim(),
      pressed: button.getAttribute("aria-pressed"),
      display: getComputedStyle(button).display
    })),
    cards: cards.length,
    visible: visible.length,
    visibleKeys: [...new Set(visible.map((card) => card.dataset.key))],
    links: document.querySelectorAll("a.card").length,
    passive: document.querySelectorAll("div.card[role=img]").length,
    cardButtons: document.querySelectorAll("button.card").length,
    hasSpotlight: Boolean(document.querySelector(".spotlight")),
    sampleStandard: rect(visible.find((card) => !card.classList.contains("card--small"))),
    sampleSmall: rect(visible.find((card) => card.classList.contains("card--small"))),
    squareFailures: visible.slice(0, 100).filter((card) => {
      const r = card.getBoundingClientRect();
      return Math.abs(r.width - r.height) > 1.5;
    }).length,
    inViewport: visible.filter((card) => {
      const r = card.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    }).length,
    footerSignoff: document.querySelector(".page-footer-signoff strong")?.textContent.trim(),
    footerLocation: document.querySelector(".footer-location")?.textContent.trim(),
    footerLinks: [...document.querySelectorAll(".page-footer-details a")]
      .map((item) => item.textContent.trim()).join(" / "),
    footerAccents: [
      document.querySelector(".footer-location"),
      ...document.querySelectorAll(".page-footer-details a")
    ].map((item) => item?.style.getPropertyValue("--handle-accent").trim()).join(" / "),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    hash: location.hash
  };
})()`);

const selectFilter = async (name) => {
  await evaluate(`(() => {
    const button = [...document.querySelectorAll(".deck-legend .rail-word")]
      .find((item) => item.textContent.trim() === ${JSON.stringify(name)});
    if (!button) throw new Error("missing filter: " + ${JSON.stringify(name)});
    button.click();
  })()`);
  await sleep(80);
};

const checkDesktop = async () => {
  section("desktop structure and semantics");
  await setDesktop();
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }]
  });
  await goto("/");
  const state = await pageState();
  check(
    state.headline === "I’m Daniel — this is what I’ve made, done and loved.",
    `fixed headline starts with Daniel [${state.headline}]`
  );
  check(state.nameTag === "SPAN", "the cycling name is display text, not a button or link");
  check(state.nameFocusable === false, "the cycling name does not enter the tab order");
  check(
    state.filters.map((item) => item.text).join(" / ") ===
      "Everything / Projects / Career / Music / Films / Games / TV",
    `seven plain filters render in order [${state.filters.map((item) => item.text).join(" / ")}]`
  );
  check(
    state.filters.filter((item) => item.pressed === "true").map((item) => item.text).join() === "Everything",
    "Everything is the sole initial filter"
  );
  check(state.cards > 300, `the full visual archive renders [${state.cards} cards]`);
  check(state.links > 0, `genuine destinations render as links [${state.links}]`);
  check(state.passive > state.links, `taste and career cards remain passive visual objects [${state.passive}]`);
  check(state.cardButtons === 0, "no wall card renders as a button");
  check(state.hasSpotlight === false, "no modal viewer exists");
  check(state.squareFailures === 0, "the sampled cards are square");
  check(state.sampleStandard.width > state.sampleSmall.width * 1.9, "standard cards are exactly the larger of two scales");
  check(state.sampleStandard.width < state.sampleSmall.width * 2.2, "the two scales share one grid unit");
  check(state.inViewport >= 30, `the first screen stays dense [${state.inViewport} cards]`);
  check(state.footerSignoff === "Fewer things done by hand.", `footer restores its sign-off [${state.footerSignoff}]`);
  check(state.footerLocation === "Manchester", `footer keeps Manchester [${state.footerLocation}]`);
  check(state.footerLinks === "dakibwa / dakibwa / Email", `footer keeps its three routes [${state.footerLinks}]`);
  check(
    state.footerAccents === "#c05212 / #0f1114 / #d63a7a / #2f88ff",
    `footer restores its colour accents [${state.footerAccents}]`
  );
  check(state.overflow <= 1, `the page has no horizontal overflow [${state.overflow}px]`);

  const cycledName = await pollUntil(
    () => evaluate(`document.querySelector(".hero-name-value")?.textContent.trim()`),
    (name) => name === "Akibwa",
    3800
  );
  check(cycledName === "Akibwa", `the one identity flourish cycles to Akibwa [${cycledName}]`);
  const cycledState = await pageState();
  check(
    cycledState.headline === "I’m Akibwa — this is what I’ve made, done and loved.",
    `the proposition stays fixed while the name changes [${cycledState.headline}]`
  );

  const linkSemantics = await evaluate(`[...document.querySelectorAll("a.card")].every((card) =>
    Boolean(card.getAttribute("href")) &&
    Boolean(card.getAttribute("aria-label")) &&
    Boolean(card.querySelector(".card-label"))
  )`);
  check(linkSemantics, "every interactive card has a destination, name, and visible-label element");
};

const checkLinkHover = async () => {
  section("restrained link feedback");
  await setDesktop();
  await goto("/");
  const before = await evaluate(`(() => {
    const card = document.querySelector("a.card");
    const r = card.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      opacity: Number(getComputedStyle(card.querySelector(".card-label")).opacity)
    };
  })()`);
  check(before.opacity === 0, "linked-card label starts quiet on desktop");
  await mouseMove(before.x, before.y);
  const hovered = await pollUntil(
    () => evaluate(`(() => {
      const card = document.querySelector("a.card");
      return {
        opacity: Number(getComputedStyle(card.querySelector(".card-label")).opacity),
        transform: getComputedStyle(card).transform,
        shadow: getComputedStyle(card).boxShadow
      };
    })()`),
    (value) => value.opacity > 0.99
  );
  check(hovered.opacity > 0.99, "hover reveals the linked card title");
  check(hovered.transform === "none", "hover does not tilt, lift, or scale the card");
  check(hovered.shadow === "none", "hover does not add a theatrical shadow");
  await mouseMove(1200, 40);
  const settled = await pollUntil(
    () => evaluate(`Number(getComputedStyle(document.querySelector("a.card .card-label")).opacity)`),
    (opacity) => opacity < 0.01
  );
  check(settled < 0.01, "the label leaves cleanly after hover");
};

const checkFilters = async () => {
  section("plain instant filtering");
  await setDesktop();
  await goto("/");
  await selectFilter("Music");
  let state = await pageState();
  check(state.hash === "#music", `Music owns the shareable hash [${state.hash}]`);
  check(state.visibleKeys.length === 1 && state.visibleKeys[0] === "music", "Music shows only music cards");
  check(
    state.filters.every((item) => item.display !== "none"),
    "all filter words remain visible while a filter is active"
  );
  check(
    state.filters.filter((item) => item.pressed === "true").map((item) => item.text).join() === "Music",
    "Music is the sole pressed word"
  );

  await selectFilter("Projects");
  state = await pageState();
  check(state.hash === "#projects", `Projects owns the merged hash [${state.hash}]`);
  check(
    state.visibleKeys.every((key) => key === "sites" || key === "life"),
    `Projects merges project and life cards [${state.visibleKeys.join(", ")}]`
  );
  check(state.visibleKeys.includes("life"), "the former Life cards are present inside Projects");

  await pressEscape();
  await sleep(80);
  state = await pageState();
  check(state.hash === "", "Escape returns to the unfiltered wall");
  check(
    state.filters.filter((item) => item.pressed === "true").map((item) => item.text).join() === "Everything",
    "Everything is restored without a second interaction mode"
  );
  check(state.visible === state.cards, "all cards return immediately");
};

const checkMobile = async () => {
  section("compact mobile wall at 390px");
  await setMobile();
  await goto("/");
  const state = await pageState();
  check(state.squareFailures === 0, "mobile cards preserve square artwork");
  check(
    state.sampleStandard.width >= 92 && state.sampleStandard.width <= 104,
    `standard cards stay compact [${state.sampleStandard.width.toFixed(1)}px]`
  );
  check(
    state.sampleSmall.width >= 44 && state.sampleSmall.width <= 51,
    `small cards retain useful resolution [${state.sampleSmall.width.toFixed(1)}px]`
  );
  check(state.inViewport >= 24, `at least 24 cards fit in the first mobile screen [${state.inViewport}]`);
  check(state.overflow <= 1, `mobile has no horizontal overflow [${state.overflow}px]`);

  const touch = await evaluate(`(() => {
    const label = document.querySelector("a.card .card-label");
    const nav = document.querySelector(".deck-legend");
    const footer = document.querySelector(".page-footer").getBoundingClientRect();
    const panel = document.querySelector(".page-footer-panel").getBoundingClientRect();
    const signoff = document.querySelector(".page-footer-signoff").getBoundingClientRect();
    const meta = document.querySelector(".page-footer-meta").getBoundingClientRect();
    return {
      labelOpacity: Number(getComputedStyle(label).opacity),
      navHeight: nav.getBoundingClientRect().height,
      footerInside: footer.left >= 0 && footer.right <= innerWidth + 1 &&
        panel.left >= 0 && panel.right <= innerWidth + 1 &&
        meta.left >= 0 && meta.right <= innerWidth + 1,
      footerStacked: signoff.bottom <= meta.top + 1
    };
  })()`);
  check(touch.labelOpacity > 0.99, "linked titles are permanently legible without hover");
  check(touch.navHeight < 40, `the plain word menu stays compact [${touch.navHeight.toFixed(1)}px]`);
  check(touch.footerInside, "the restored footer stays inside the mobile frame");
  check(touch.footerStacked, "the footer sign-off stacks above its mobile contact row");
};

const checkReducedMotion = async () => {
  section("reduced motion");
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });
  await setDesktop();
  await goto("/");
  const durations = await evaluate(`(() => {
    const label = document.querySelector("a.card .card-label");
    const card = document.querySelector("a.card");
    return [getComputedStyle(label).transitionDuration, getComputedStyle(card).transitionDuration];
  })()`);
  check(
    durations.every((value) => value.split(",").every((part) => parseFloat(part) === 0)),
    `index transitions are zero [${durations.join(" / ")}]`
  );
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "" }]
  });
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
  process.stdout.write(`Checking Akibwa index against ${origin}\n`);

  const profileDir = mkdtempSync(join(tmpdir(), "akibwa-index-check-"));
  const { proc, port } = await launchChrome(chromeBin, profileDir);

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

    await checkDesktop();
    await checkLinkHover();
    await checkFilters();
    await checkMobile();
    await checkReducedMotion();
  } finally {
    try { proc.kill(); } catch { /* Already gone. */ }
    server?.close();
    try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* Best effort. */ }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} index check(s) failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log("\nAkibwa index DOM checks passed.");
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
