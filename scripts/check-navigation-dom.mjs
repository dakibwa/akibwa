/* Rendered regression check for Akibwa's editorial homepage and taste index.
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
const clickAt = async (x, y) => {
  await mouseMove(x, y);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed", x, y, button: "left", clickCount: 1
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x, y, button: "left", clickCount: 1
  });
};
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
  const visible = cards.filter((card) => {
    const style = getComputedStyle(card);
    return style.display !== "none" && card.getClientRects().length > 0;
  });
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  return {
    identity: document.querySelector(".concept-identity")?.textContent.trim().replace(/\\s+/g, " "),
    lede: document.querySelector(".concept-lede")?.textContent.trim(),
    nav: [...document.querySelectorAll(".concept-nav a")].map((link) => ({
      text: link.textContent.trim(),
      href: link.getAttribute("href")
    })),
    heroLayout: {
      hero: rect(document.querySelector(".concept-hero")),
      identity: rect(document.querySelector(".concept-identity")),
      copy: rect(document.querySelector(".concept-hero-copy")),
      lede: rect(document.querySelector(".concept-lede")),
      nav: rect(document.querySelector(".concept-nav"))
    },
    leadLayout: {
      feature: rect(document.querySelector(".concept-feature")),
      clients: rect(document.querySelector(".concept-freelance"))
    },
    featureHref: document.querySelector(".concept-feature")?.getAttribute("href"),
    clients: [...document.querySelectorAll(".concept-client-project strong")]
      .map((item) => item.textContent.trim()),
    clientText: document.querySelector("#now")?.innerText.replace(/\\s+/g, " ").trim(),
    clientButtons: [...document.querySelectorAll(".concept-client-project")].map((item) => ({
      tag: item.tagName,
      popup: item.getAttribute("aria-haspopup"),
      href: item.getAttribute("href"),
      images: item.querySelectorAll("img").length
    })),
    career: [...document.querySelectorAll(".concept-career-stop")]
      .map((item) => item.getAttribute("aria-label")),
    careerDetailsHidden: [...document.querySelectorAll(".concept-career-popover")]
      .every((item) => Number(getComputedStyle(item).opacity) === 0),
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

const careerState = () => evaluate(`(() => {
  const stops = [...document.querySelectorAll(".concept-career-stop")];
  const haloRadius = 12;
  const clearances = stops.map((stop) => {
    const time = stop.querySelector(".concept-career-time").getBoundingClientRect();
    const node = stop.querySelector(".concept-career-node").getBoundingClientRect();
    const card = stop.querySelector(".concept-career-card").getBoundingClientRect();
    const center = node.top + node.height / 2;
    return {
      above: (center - haloRadius) - time.bottom,
      below: card.top - (center + haloRadius)
    };
  });
  const first = stops[0];
  return {
    count: stops.length,
    focused: first === document.activeElement,
    popoverOpacity: Number(getComputedStyle(first.querySelector(".concept-career-popover")).opacity),
    minAbove: Math.min(...clearances.map((item) => item.above)),
    minBelow: Math.min(...clearances.map((item) => item.below)),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
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
  check(state.identity === "I’m Akibwa", `the public identity is concise [${state.identity}]`);
  check(state.lede === "Building in the age of AI.", `the proposition stays concise [${state.lede}]`);
  check(
    state.nav.map((item) => `${item.text}:${item.href}`).join(" / ") ===
      "Now:#now / Work:#work / Career:#career / Taste:#taste",
    `four direct section links render in order [${state.nav.map((item) => item.text).join(" / ")}]`
  );
  check(
    state.heroLayout.lede.left >= state.heroLayout.identity.right + 24,
    `the proposition uses the right-hand hero column [${state.heroLayout.identity.right.toFixed(1)}px → ${state.heroLayout.lede.left.toFixed(1)}px]`
  );
  check(
    Math.abs(state.heroLayout.nav.left - state.heroLayout.lede.left) <= 1,
    "the menu stays aligned directly below the proposition"
  );
  check(
    state.heroLayout.nav.top >= state.heroLayout.lede.bottom + 16,
    `the proposition keeps a clean gap above its menu [${(state.heroLayout.nav.top - state.heroLayout.lede.bottom).toFixed(1)}px]`
  );
  check(
    state.heroLayout.hero.height <= 250,
    `the wide masthead uses its width instead of empty height [${state.heroLayout.hero.height.toFixed(1)}px]`
  );
  check(state.featureHref === "/features/", `Features links directly to the game [${state.featureHref}]`);
  check(
    state.leadLayout.feature.width <= state.leadLayout.clients.width * 0.9,
    `Features stays visibly smaller than the client column [${state.leadLayout.feature.width.toFixed(1)}px / ${state.leadLayout.clients.width.toFixed(1)}px]`
  );
  check(
    state.clients.join(" / ") === "Butterfly Rose / Português com a Inês",
    `the two client projects lead [${state.clients.join(" / ")}]`
  );
  check(!/\bLIVE\b/.test(state.clientText), `client previews do not print a Live label [${state.clientText}]`);
  check(!/booking system/i.test(state.clientText), "Butterfly Rose no longer claims a booking system");
  check(!/butterflyrosehairsalon|portuguesewithines/i.test(state.clientText), "client URLs stay out of the visible index");
  check(state.career.length === 7, `the complete career sequence renders [${state.career.length} stops]`);
  check(state.careerDetailsHidden, "career descriptions stay quiet until hover or focus");
  check(
    state.filters.map((item) => item.text).join(" / ") ===
      "Everything / Music / Films / Games / TV",
    `five taste filters render in order [${state.filters.map((item) => item.text).join(" / ")}]`
  );
  check(
    state.filters.filter((item) => item.pressed === "true").map((item) => item.text).join() === "Everything",
    "Everything is the sole initial filter"
  );
  check(state.cards > 250, `the full taste archive renders [${state.cards} cards]`);
  check(state.links === 0, "taste cards remain visual objects rather than false destinations");
  check(state.passive === state.cards, `every taste card is a labelled visual object [${state.passive}]`);
  check(state.cardButtons === 0, "no wall card renders as a button");
  check(state.hasSpotlight === false, "no modal viewer exists");
  check(state.squareFailures === 0, "the sampled cards are square");
  check(state.sampleStandard.width > state.sampleSmall.width * 1.9, "standard cards are exactly the larger of two scales");
  check(state.sampleStandard.width < state.sampleSmall.width * 2.2, "the two scales share one grid unit");
  check(state.footerSignoff === "Fewer things done by hand.", `footer restores its sign-off [${state.footerSignoff}]`);
  check(state.footerLocation === "Manchester", `footer keeps Manchester [${state.footerLocation}]`);
  check(state.footerLinks === "dakibwa / dakibwa / Email", `footer keeps its three routes [${state.footerLinks}]`);
  check(
    state.footerAccents === "#c05212 / #0f1114 / #d63a7a / #2f88ff",
    `footer restores its colour accents [${state.footerAccents}]`
  );
  check(state.overflow <= 1, `the page has no horizontal overflow [${state.overflow}px]`);

  check(
    state.clientButtons.every((item) => item.tag === "BUTTON" && item.popup === "dialog" && item.href === null && item.images === 1),
    "each client is a visual preview button rather than an immediate external link"
  );
};

const checkLinkHover = async () => {
  section("restrained link feedback");
  await setDesktop();
  await goto("/");
  const before = await evaluate(`(() => {
    const link = document.querySelector(".concept-feature");
    link.scrollIntoView({ block: "center" });
    const r = link.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      arrow: getComputedStyle(link.querySelector(".concept-arrow")).transform,
      transform: getComputedStyle(link).transform,
      shadow: getComputedStyle(link).boxShadow
    };
  })()`);
  check(before.arrow === "none", "the Features arrow starts still");
  await mouseMove(before.x, before.y);
  const hovered = await pollUntil(
    () => evaluate(`(() => {
      const link = document.querySelector(".concept-feature");
      return {
        arrow: getComputedStyle(link.querySelector(".concept-arrow")).transform,
        transform: getComputedStyle(link).transform,
        shadow: getComputedStyle(link).boxShadow
      };
    })()`),
    (value) => value.arrow !== "none"
  );
  check(hovered.arrow !== "none", "hover gives the direct link one small directional response");
  check(hovered.transform === "none", "hover does not tilt, lift, or scale the feature");
  check(hovered.shadow === "none", "hover does not add a theatrical shadow");
  await mouseMove(1200, 40);
  const settled = await pollUntil(
    () => evaluate(`getComputedStyle(document.querySelector(".concept-feature .concept-arrow")).transform`),
    (transform) => transform === "none"
  );
  check(settled === "none", "the arrow settles cleanly after hover");
};

const checkHeroBreakpoint = async () => {
  section("balanced hero breakpoint");
  await setDesktop(820, 720);
  await goto("/");
  let state = await pageState();
  check(
    state.heroLayout.lede.left >= state.heroLayout.identity.right + 24,
    "the two-column masthead still fits just above its breakpoint"
  );
  check(state.heroLayout.identity.height < 80, "the compact two-column identity remains on one line");
  check(state.overflow <= 1, `the compact two-column masthead has no overflow [${state.overflow}px]`);

  await setDesktop(800, 720);
  await goto("/");
  state = await pageState();
  check(
    Math.abs(state.heroLayout.identity.left - state.heroLayout.lede.left) <= 1,
    "the masthead switches cleanly to one column at 800px"
  );
  check(
    state.heroLayout.lede.top > state.heroLayout.identity.bottom,
    "the stacked proposition follows the identity without overlap"
  );
  check(state.overflow <= 1, `the stacked breakpoint has no overflow [${state.overflow}px]`);
};

const checkClientPreviews = async () => {
  section("in-page client previews");
  await setDesktop();
  await goto("/");

  await evaluate(`document.querySelectorAll(".concept-client-project")[0].click()`);
  const first = await pollUntil(
    () => evaluate(`(() => {
      const dialog = document.querySelector(".concept-client-dialog");
      if (!dialog?.open) return { open: false };
      const box = dialog.getBoundingClientRect();
      return {
        open: true,
        title: dialog.querySelector("#concept-client-preview-title")?.textContent.trim(),
        imageAlt: dialog.querySelector(".concept-client-preview-screen img")?.getAttribute("alt"),
        linkText: dialog.querySelector(".concept-client-preview-foot a")?.textContent.trim().replace(/\\s+/g, " "),
        linkHref: dialog.querySelector(".concept-client-preview-foot a")?.getAttribute("href"),
        linkTarget: dialog.querySelector(".concept-client-preview-foot a")?.getAttribute("target"),
        visibleText: dialog.innerText.replace(/\\s+/g, " ").trim(),
        insideViewport: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
      };
    })()`),
    (value) => value.open
  );
  check(first.open, "the Butterfly Rose preview opens without navigation");
  check(first.title === "Butterfly Rose", `the first preview is Butterfly Rose [${first.title}]`);
  check(first.imageAlt === "Butterfly Rose homepage preview", "the first website still has useful alternative text");
  check(first.linkText == null && first.linkHref == null && first.linkTarget == null, "the unpublished redesign does not lead to the salon's older site");
  check(!/butterflyrosehairsalon\.co\.uk/i.test(first.visibleText), "the preview does not print the Butterfly Rose URL");
  check(first.insideViewport, "the desktop preview stays inside the viewport");

  await pressEscape();
  const closed = await pollUntil(
    () => evaluate(`(() => {
      const dialog = document.querySelector(".concept-client-dialog");
      return !dialog.open && !dialog.querySelector("#concept-client-preview-title");
    })()`),
    Boolean
  );
  check(closed, "Escape closes and clears the temporary preview");

  await evaluate(`document.querySelectorAll(".concept-client-project")[1].click()`);
  const second = await pollUntil(
    () => evaluate(`(() => {
      const dialog = document.querySelector(".concept-client-dialog[open]");
      const link = dialog?.querySelector(".concept-client-preview-foot a");
      return {
        title: dialog?.querySelector("#concept-client-preview-title")?.textContent.trim() ?? "",
        linkText: link?.textContent.trim().replace(/\\s+/g, " "),
        linkHref: link?.getAttribute("href"),
        linkTarget: link?.getAttribute("target")
      };
    })()`),
    (value) => value.title === "Português com a Inês"
  );
  check(second.title === "Português com a Inês", "the second client opens in the same preview treatment");
  check(second.linkText === "Open full site ↗", `the published destination is plainly labelled [${second.linkText}]`);
  check(second.linkHref === "https://portuguesewithines.com/", "the published Portuguese site remains reachable by choice");
  check(second.linkTarget === "_blank", "the optional published site opens separately from Akibwa");
  await pressEscape();
};

const checkCareerTimeline = async () => {
  section("career detail and dot clearance");
  await setDesktop(1100, 760);
  await goto("/");
  let point = await evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const first = document.querySelector(".concept-career-stop");
    first.scrollIntoView({ block: "center" });
    const rect = first.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(point.x, point.y);
  let state = await pollUntil(careerState, (value) => value.popoverOpacity > 0.99);
  check(state.count === 7, `seven career stops remain visible [${state.count}]`);
  check(state.focused, "a career stop can receive keyboard focus");
  check(state.popoverOpacity > 0.99, `focus reveals the career description [${state.popoverOpacity}]`);
  check(state.minAbove >= 5.5, `the halo clears every date [${state.minAbove.toFixed(1)}px]`);
  check(state.minBelow >= 5.5, `the halo clears every logo card [${state.minBelow.toFixed(1)}px]`);
  check(state.overflow <= 1, `the desktop timeline has no horizontal overflow [${state.overflow}px]`);

  await setMobile();
  await goto("/");
  point = await evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const first = document.querySelector(".concept-career-stop");
    first.scrollIntoView({ block: "center" });
    const rect = first.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(point.x, point.y);
  state = await pollUntil(careerState, (value) => value.popoverOpacity > 0.99);
  check(state.focused, "the phone timeline retains keyboard focus semantics");
  check(state.popoverOpacity > 0.99, `the phone timeline reveals the same concise detail [${state.popoverOpacity}]`);
  check(state.minAbove >= 5.5, `the phone halo clears every date [${state.minAbove.toFixed(1)}px]`);
  check(state.minBelow >= 5.5, `the phone halo clears every logo card [${state.minBelow.toFixed(1)}px]`);
  check(state.overflow <= 1, `the phone timeline has no horizontal overflow [${state.overflow}px]`);
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
  const initial = await pageState();
  check(initial.overflow <= 1, `the editorial opening fits the phone [${initial.overflow}px overflow]`);
  check(
    Math.abs(initial.heroLayout.identity.left - initial.heroLayout.lede.left) <= 1 &&
      Math.abs(initial.heroLayout.lede.left - initial.heroLayout.nav.left) <= 1,
    "the phone hero returns to one clean left-aligned column"
  );
  check(
    initial.heroLayout.lede.top > initial.heroLayout.identity.bottom &&
      initial.heroLayout.nav.top > initial.heroLayout.lede.bottom,
    "the phone keeps identity, proposition and menu in reading order"
  );
  check(
    initial.leadLayout.feature.width <= initial.leadLayout.clients.width * 0.95,
    `Features leaves a little mobile breathing room [${initial.leadLayout.feature.width.toFixed(1)}px / ${initial.leadLayout.clients.width.toFixed(1)}px]`
  );
  const clientLayout = await evaluate(`(() => {
    const cards = [...document.querySelectorAll(".concept-client-project")]
      .map((item) => item.getBoundingClientRect())
      .map((rect) => ({ left: rect.left, top: rect.top, width: rect.width }));
    return { cards };
  })()`);
  check(
    clientLayout.cards.length === 2 &&
      Math.abs(clientLayout.cards[0].top - clientLayout.cards[1].top) <= 1 &&
      clientLayout.cards.every((card) => card.width >= 150 && card.width <= 175),
    `the two visual clients stay compact and side by side [${clientLayout.cards.map((card) => card.width.toFixed(1)).join(" / ")}px]`
  );
  await evaluate(`document.querySelector(".concept-client-project").click()`);
  const mobilePreview = await pollUntil(
    () => evaluate(`(() => {
      const dialog = document.querySelector(".concept-client-dialog");
      if (!dialog?.open) return { open: false };
      const rect = dialog.getBoundingClientRect();
      return {
        open: true,
        inside: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
        overflow: dialog.scrollWidth - dialog.clientWidth
      };
    })()`),
    (value) => value.open
  );
  check(mobilePreview.inside, "the temporary website preview fits the phone viewport");
  check(mobilePreview.overflow <= 1, `the temporary website preview has no phone overflow [${mobilePreview.overflow}px]`);
  await pressEscape();
  await evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector("#taste").scrollIntoView({ block: "start" });
  })()`);
  await sleep(100);
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
    const nav = document.querySelector(".deck-legend");
    const footer = document.querySelector(".page-footer").getBoundingClientRect();
    const panel = document.querySelector(".page-footer-panel").getBoundingClientRect();
    const signoff = document.querySelector(".page-footer-signoff").getBoundingClientRect();
    const meta = document.querySelector(".page-footer-meta").getBoundingClientRect();
    return {
      navHeight: nav.getBoundingClientRect().height,
      footerInside: footer.left >= 0 && footer.right <= innerWidth + 1 &&
        panel.left >= 0 && panel.right <= innerWidth + 1 &&
        meta.left >= 0 && meta.right <= innerWidth + 1,
      footerStacked: signoff.bottom <= meta.top + 1
    };
  })()`);
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
    const selectors = [
      ".concept-arrow",
      ".concept-client-expand",
      ".concept-career-node",
      ".concept-career-popover"
    ];
    return selectors.map((selector) => getComputedStyle(document.querySelector(selector)).transitionDuration);
  })()`);
  check(
    durations.every((value) => value.split(",").every((part) => parseFloat(part) === 0)),
    `editorial transitions are zero [${durations.join(" / ")}]`
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
    await checkHeroBreakpoint();
    await checkLinkHover();
    await checkClientPreviews();
    await checkCareerTimeline();
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
