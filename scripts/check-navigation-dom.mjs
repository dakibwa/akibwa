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
    identity: "I’m " + document.querySelector(".concept-identity .hero-name-value")?.textContent.trim(),
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
    projects: [...document.querySelectorAll(".concept-project-card")].map((item) => ({
      text: item.innerText.replace(/\\s+/g, " ").trim(),
      href: item.getAttribute("href"),
      rect: rect(item),
      imageComplete: item.querySelector("img")?.complete,
      imageWidth: item.querySelector("img")?.naturalWidth,
      currentSrc: item.querySelector("img")?.currentSrc
    })),
    freelance: {
      text: document.querySelector(".concept-freelance")?.innerText.replace(/\\s+/g, " ").trim(),
      rect: rect(document.querySelector(".concept-freelance")),
      butterflyImages: [...document.images].filter((image) => /butterfly/i.test(image.currentSrc)).length
    },
    career: [...document.querySelectorAll(".concept-career-stop")].map((item) => ({
      name: item.querySelector(".concept-career-name strong")?.textContent.trim(),
      role: item.querySelector(".concept-career-name > span")?.textContent.trim(),
      labels: [...item.querySelectorAll(".concept-career-label")].map((label) => label.textContent.trim()),
      details: [...item.querySelectorAll(".concept-career-copy > span:last-child")]
        .map((detail) => detail.textContent.trim())
    })),
    filters: [...document.querySelectorAll(".deck-legend .rail-word")].map((button) => ({
      text: button.textContent.trim(),
      pressed: button.getAttribute("aria-pressed"),
      display: getComputedStyle(button).display
    })),
    cards: cards.length,
    visible: visible.length,
    visibleKeys: [...new Set(visible.map((card) => card.dataset.key))],
    visibleCounts: Object.fromEntries(
      [...new Set(visible.map((card) => card.dataset.key))]
        .map((key) => [key, visible.filter((card) => card.dataset.key === key).length])
    ),
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
  return {
    count: stops.length,
    complete: stops.every((stop) => {
      const labels = [...stop.querySelectorAll(".concept-career-label")].map((item) => item.textContent.trim());
      const details = [...stop.querySelectorAll(".concept-career-copy > span:last-child")];
      return Boolean(stop.querySelector(".concept-career-name strong")?.textContent.trim()) &&
        Boolean(stop.querySelector(".concept-career-name > span")?.textContent.trim()) &&
        labels.join(" / ") === "What I did / Mission" &&
        details.length === 2 && details.every((item) => item.textContent.trim() && item.getClientRects().length > 0);
    }),
    firstName: stops[0]?.querySelector(".concept-career-name strong")?.textContent.trim(),
    lastName: stops.at(-1)?.querySelector(".concept-career-name strong")?.textContent.trim(),
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
  check(/^I’m (Daniel|Akibwa)$/.test(state.identity), `the public identity is concise [${state.identity}]`);
  check(state.lede === "Building in the age of AI.", `the proposition stays concise [${state.lede}]`);
  check(
    state.nav.map((item) => `${item.text}:${item.href}`).join(" / ") ===
      "Projects:#projects / Career:#career / Taste Library:#taste",
    `three direct section links render in order [${state.nav.map((item) => item.text).join(" / ")}]`
  );
  check(
    state.heroLayout.lede.left >= state.heroLayout.identity.right + 24,
    `the proposition uses the right-hand hero column [${state.heroLayout.identity.right.toFixed(1)}px → ${state.heroLayout.lede.left.toFixed(1)}px]`
  );
  check(
    Math.abs(
      (state.heroLayout.nav.left + state.heroLayout.nav.width / 2) -
      (state.heroLayout.lede.left + state.heroLayout.lede.width / 2)
    ) <= 1,
    "the menu is centred directly below the proposition"
  );
  check(
    state.heroLayout.nav.top >= state.heroLayout.lede.bottom + 16,
    `the proposition keeps a clean gap above its menu [${(state.heroLayout.nav.top - state.heroLayout.lede.bottom).toFixed(1)}px]`
  );
  check(
    state.heroLayout.hero.height <= 250,
    `the wide masthead uses its width instead of empty height [${state.heroLayout.hero.height.toFixed(1)}px]`
  );
  check(
    state.projects.map((item) => item.href).join(" / ") === "/features/ / /portugal/",
    `the two project cards link directly [${state.projects.map((item) => item.href).join(" / ")}]`
  );
  check(
    state.projects[0].text.startsWith("features ") &&
      state.projects[1].text.startsWith("Português com a Inês "),
    `Features and Português com a Inês get the lead [${state.projects.map((item) => item.text).join(" / ")}]`
  );
  check(
    Math.abs(state.projects[0].rect.top - state.projects[1].rect.top) <= 1 &&
      Math.abs(state.projects[0].rect.width - state.projects[1].rect.width) <= 1 &&
      Math.abs(state.projects[0].rect.height - state.projects[1].rect.height) <= 1,
    `the two project cards have equal visual weight [${state.projects.map((item) => `${item.rect.width.toFixed(1)}×${item.rect.height.toFixed(1)}`).join(" / ")}]`
  );
  check(
    state.projects.every((item) => item.imageComplete && item.imageWidth >= 900 && /conceptProject/.test(item.currentSrc)),
    "both featured projects load their responsive artwork"
  );
  check(
    state.freelance.text.includes("I design and build websites, booking systems and practical AI tools") &&
      state.freelance.text.endsWith("CLIENT WORK INCLUDES Butterfly Rose"),
    `the freelance offer carries the small Butterfly Rose proof point [${state.freelance.text}]`
  );
  check(state.freelance.butterflyImages === 0, "Butterfly Rose no longer gets a featured image");
  check(
    state.career.length === 8 && state.career[0].name === "Freelance" && state.career.at(-1).name === "Lloyds Banking Group",
    `the complete career sequence remains intact [${state.career.length} stops]`
  );
  check(
    state.career.every((item) => item.role && item.labels.join(" / ") === "What I did / Mission" && item.details.every(Boolean)),
    "every career stop keeps title, contribution and mission visible"
  );
  check(
    state.filters.map((item) => item.text).join(" / ") ===
      "Highlights / Music / Films / Games / TV",
    `five taste filters render in order [${state.filters.map((item) => item.text).join(" / ")}]`
  );
  check(
    state.filters.filter((item) => item.pressed === "true").map((item) => item.text).join() === "Highlights",
    "Highlights is the sole initial filter"
  );
  check(state.cards === 41, `the opening edit stays finite [${state.cards} cards]`);
  check(
    [...state.visibleKeys].sort().join(" / ") === "films / games / music / tv" &&
      state.visibleCounts.music === 11 &&
      ["films", "games", "tv"].every((key) => state.visibleCounts[key] === 10),
    `the opening edit is balanced across four sections [${JSON.stringify(state.visibleCounts)}]`
  );
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

const checkCareerTimeline = async () => {
  section("career detail stays visible");
  await setDesktop(1100, 760);
  await goto("/");
  let state = await careerState();
  check(state.count === 8, `eight career stops remain visible [${state.count}]`);
  check(state.complete, "every desktop stop visibly contains title, contribution and mission");
  check(
    state.firstName === "Freelance" && state.lastName === "Lloyds Banking Group",
    `career order runs from Freelance to Lloyds [${state.firstName} → ${state.lastName}]`
  );
  check(state.overflow <= 1, `the desktop timeline has no horizontal overflow [${state.overflow}px]`);

  await setMobile();
  await goto("/");
  state = await careerState();
  check(state.complete, "every phone stop keeps the same visible career detail");
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
  check(state.cards > 200, `Music reveals its complete shelf [${state.cards} cards]`);
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
    state.filters.filter((item) => item.pressed === "true").map((item) => item.text).join() === "Highlights",
    "Highlights is restored without a second interaction mode"
  );
  check(state.cards === 41 && state.visible === 41, "the balanced Highlights edit returns immediately");
};

const checkMobile = async () => {
  section("compact mobile wall at 390px");
  await setMobile();
  await goto("/");
  const initial = await pageState();
  check(initial.overflow <= 1, `the editorial opening fits the phone [${initial.overflow}px overflow]`);
  check(
    Math.abs(initial.heroLayout.identity.left - initial.heroLayout.lede.left) <= 1 &&
      Math.abs(
        (initial.heroLayout.nav.left + initial.heroLayout.nav.width / 2) -
        (initial.heroLayout.lede.left + initial.heroLayout.lede.width / 2)
      ) <= 1,
    "the phone hero keeps the menu centred beneath its left-aligned proposition"
  );
  check(
    initial.heroLayout.lede.top > initial.heroLayout.identity.bottom &&
      initial.heroLayout.nav.top > initial.heroLayout.lede.bottom,
    "the phone keeps identity, proposition and menu in reading order"
  );
  check(
    initial.projects.length === 2 &&
      initial.projects[1].rect.top >= initial.projects[0].rect.bottom + 16 &&
      initial.projects.every((item) => item.rect.width >= 350 && item.rect.width <= 360),
    `the two featured projects stack at full phone width [${initial.projects.map((item) => item.rect.width.toFixed(1)).join(" / ")}px]`
  );
  check(
    initial.freelance.rect.top >= initial.projects[1].rect.bottom + 24 &&
      initial.freelance.text.endsWith("CLIENT WORK INCLUDES Butterfly Rose"),
    "the freelance offer follows the projects with Butterfly Rose kept secondary"
  );
  check(initial.freelance.butterflyImages === 0, "the phone does not promote Butterfly Rose with an image");
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
      ".hero-name",
      ".hero-name-value"
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
