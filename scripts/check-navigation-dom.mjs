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
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  const contentRect = (el) => {
    if (!el) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    return rect(range);
  };
  const wall = document.querySelector(".taste-wall");
  const legend = document.querySelector(".deck-legend");
  const railItems = [...document.querySelectorAll(".taste-rail-item")];
  const railRect = wall?.getBoundingClientRect();
  const railItemRects = railItems.map((item) => item.getBoundingClientRect());
  const cardWidths = visible.map((card) => card.getBoundingClientRect().width);
  const cardShapes = [...new Set(visible.map((card) => {
    const r = card.getBoundingClientRect();
    if (r.width > r.height * 1.35) return "wide";
    if (r.height > r.width * 1.35) return "tall";
    return "square";
  }))];
  return {
    identity: "I’m " + document.querySelector(".concept-identity .hero-name-value")?.textContent.trim(),
    lede: document.querySelector(".concept-lede")?.textContent.trim(),
    navCount: document.querySelectorAll(".concept-nav").length,
    heroLayout: {
      hero: rect(document.querySelector(".concept-hero")),
      identity: rect(document.querySelector(".concept-identity")),
      identityText: contentRect(document.querySelector(".concept-identity")),
      copy: rect(document.querySelector(".concept-hero-copy")),
      lede: rect(document.querySelector(".concept-lede")),
      ledeText: contentRect(document.querySelector(".concept-lede")),
      handles: rect(document.querySelector(".concept-hero-footer")),
      firstHandle: rect(document.querySelector(".concept-hero-footer a"))
    },
    chapterHeadings: [...document.querySelectorAll(".concept-projects-head h2, .concept-career-head h2, .concept-archive-head h2")]
      .map((heading) => ({
        text: heading.textContent.trim(),
        rect: rect(heading),
        style: (() => {
          const style = getComputedStyle(heading);
          return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing].join("/");
        })()
      })),
    projects: [...document.querySelectorAll(".concept-project-card")].map((item) => ({
      text: item.innerText.replace(/\\s+/g, " ").trim(),
      href: item.getAttribute("href"),
      tagName: item.tagName,
      controls: item.getAttribute("aria-controls"),
      expanded: item.getAttribute("aria-expanded"),
      rect: rect(item),
      imageRect: rect(item.querySelector("img")),
      footRect: rect(item.querySelector(".concept-project-foot")),
      labelRect: rect(item.querySelector(".concept-project-label")),
      titleRect: rect(item.querySelector(".concept-project-foot strong")),
      subtitleRect: rect(item.querySelector(".concept-project-label > span")),
      titleStyle: (() => {
        const style = getComputedStyle(item.querySelector(".concept-project-foot strong"));
        return [style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing].join("/");
      })(),
      subtitleStyle: (() => {
        const style = getComputedStyle(item.querySelector(".concept-project-label > span"));
        return [style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing].join("/");
      })(),
      hasArrow: Boolean(item.querySelector(".concept-arrow")),
      imageComplete: item.querySelector("img")?.complete,
      imageWidth: item.querySelector("img")?.naturalWidth,
      currentSrc: item.querySelector("img")?.currentSrc
    })),
    projectDetail: (() => {
      const shell = document.querySelector(".concept-project-detail-shell");
      const action = shell?.querySelector(".concept-project-open");
      return {
        rect: rect(shell),
        opacity: shell ? Number(getComputedStyle(shell).opacity) : -1,
        hidden: shell?.getAttribute("aria-hidden"),
        title: shell?.querySelector("h3")?.textContent.trim() ?? null,
        action: action?.textContent.replace(/\\s+/g, " ").trim() ?? null,
        actionHref: action?.getAttribute("href") ?? null
      };
    })(),
    standaloneFreelance: Boolean(document.querySelector(".concept-freelance")),
    careerSection: rect(document.querySelector(".concept-career-section")),
    career: [...document.querySelectorAll(".concept-career-stop")].map((item) => ({
      name: item.querySelector(".concept-career-popover > strong")?.textContent.trim(),
      role: item.querySelector(".concept-career-popover > span")?.textContent.trim(),
      statement: item.querySelector(".concept-career-statement")?.textContent.trim(),
      emphasis: [...item.querySelectorAll(".concept-career-statement strong")]
        .map((term) => term.textContent.trim()),
      hidden: Number(getComputedStyle(item.querySelector(".concept-career-popover")).opacity) === 0
    })),
    filters: [...document.querySelectorAll(".deck-legend .rail-word")].map((button) => ({
      text: button.textContent.trim(),
      pressed: button.getAttribute("aria-pressed"),
      display: getComputedStyle(button).display
    })),
    filterToWallGap: wall && legend
      ? wall.getBoundingClientRect().top - legend.getBoundingClientRect().bottom
      : -1,
    cards: cards.length,
    visible: visible.length,
    hasFinale: Boolean(document.querySelector(".taste-finale")),
    visibleKeys: [...new Set(visible.map((card) => card.dataset.key))],
    visibleCounts: Object.fromEntries(
      [...new Set(visible.map((card) => card.dataset.key))]
        .map((key) => [key, visible.filter((card) => card.dataset.key === key).length])
    ),
    links: document.querySelectorAll("a.card").length,
    passive: document.querySelectorAll("div.card[role=img]").length,
    cardButtons: document.querySelectorAll("button.card").length,
    namedCardButtons: [...document.querySelectorAll("button.card")]
      .filter((button) => Boolean(button.getAttribute("aria-label")?.trim())).length,
    hasSpotlight: Boolean(document.querySelector(".spotlight")),
    sampleStandard: visible.some((card) => !card.classList.contains("card--small"))
      ? rect(visible.find((card) => !card.classList.contains("card--small"))) : null,
    sampleSmall: visible.some((card) => card.classList.contains("card--small"))
      ? rect(visible.find((card) => card.classList.contains("card--small"))) : null,
    cardShapes,
    rail: rect(wall),
    railItemCount: railItems.length,
    railClientWidth: wall?.clientWidth ?? 0,
    railScrollWidth: wall?.scrollWidth ?? 0,
    railScrollLeft: wall?.scrollLeft ?? 0,
    railOverflowX: wall ? getComputedStyle(wall).overflowX : null,
    railSnap: wall ? getComputedStyle(wall).scrollSnapType : null,
    railOneRow: railItemRects.every((item) => Math.abs(item.top - railItemRects[0].top) <= 1),
    railSquares: railItemRects.every((item) => Math.abs(item.width - item.height) <= 1),
    railVisibleItems: railRect ? railItemRects.filter((item) =>
      item.right > railRect.left && item.left < railRect.right
    ).length : 0,
    artDirectedCards: visible.filter((card) => card.querySelector(".taste-visual__scene")).length,
    originalPrints: visible.filter((card) => card.querySelector(".taste-visual__original")).length,
    artFillFailures: visible.filter((card) => {
      const scene = card.querySelector(".taste-visual__scene");
      if (!scene) return false;
      const cardRect = card.getBoundingClientRect();
      const sceneRect = scene.getBoundingClientRect();
      const art = scene.querySelector("img");
      return !art || getComputedStyle(art).objectFit !== "cover" ||
        Math.abs(cardRect.left - sceneRect.left) > 1 ||
        Math.abs(cardRect.right - sceneRect.right) > 1 ||
        Math.abs(cardRect.top - sceneRect.top) > 1 ||
        Math.abs(cardRect.bottom - sceneRect.bottom) > 1;
    }).length,
    detailFailures: visible.filter((card) => {
      const info = card.querySelector(".card-info");
      return !info?.querySelector("strong")?.textContent.trim() ||
        !info?.querySelector(":scope > span")?.textContent.trim();
    }).length,
    focusableDetails: visible.filter((card) => card.tabIndex === 0).length,
    playDetails: visible.filter((card) =>
      card.dataset.key === "music" && /plays on Last\\.fm$/.test(card.querySelector(".card-info small")?.textContent.trim() ?? "")
    ).length,
    minCardWidth: cardWidths.length ? Math.min(...cardWidths) : 0,
    maxCardWidth: cardWidths.length ? Math.max(...cardWidths) : 0,
    inViewport: visible.filter((card) => {
      const r = card.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    }).length,
    footerSignoff: document.querySelector(".page-footer-signoff strong")?.textContent.trim(),
    footerLocation: document.querySelector(".footer-location")?.textContent.trim(),
    footerLinks: [...document.querySelectorAll(".page-footer-details a")]
      .map((item) => item.textContent.trim()).join(" / "),
    footerAccents: [...document.querySelectorAll(".page-footer-details a")]
      .map((item) => item.style.getPropertyValue("--handle-accent").trim()).join(" / "),
    footerCount: document.querySelectorAll(".page-footer").length,
    footerInHero: Boolean(document.querySelector(".concept-hero > .concept-hero-copy > .concept-hero-footer")),
    footerAfterTaste: Boolean(document.querySelector(".concept-archive .page-footer")),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    hash: location.hash
  };
})()`);

const trekProjectState = () => evaluate(`(() => {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  const banner = document.querySelector(".akibwa-project-banner");
  const rule = getComputedStyle(banner, "::after");
  return {
    visible: getComputedStyle(banner).display !== "none",
    names: [...banner.querySelectorAll(".akibwa-project-banner__name")].map((item) => item.textContent.trim()),
    nameAnimations: [...banner.querySelectorAll(".akibwa-project-banner__name")].map((item) => getComputedStyle(item).animationName),
    lede: banner.querySelector(".akibwa-project-banner__lede")?.textContent.trim(),
    ledeDisplay: getComputedStyle(banner.querySelector(".akibwa-project-banner__lede")).display,
    position: getComputedStyle(banner).position,
    nav: [...banner.querySelectorAll(".akibwa-project-banner__nav a")].map((item) => ({
      text: item.textContent.trim(), href: item.href
    })),
    ruleHeight: parseFloat(rule.height),
    ruleWidth: parseFloat(rule.width),
    ruleColor: rule.backgroundColor,
    banner: rect(banner),
    masthead: rect(document.querySelector(".masthead")),
    statbar: rect(document.querySelector(".statbar")),
    stage: rect(document.querySelector(".stage")),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})()`);

const featuresProjectState = () => evaluate(`(() => {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  const banner = document.querySelector(".akibwa-project-banner");
  const veil = document.querySelector("#introveil");
  veil.classList.add("show");
  const panel = veil.querySelector(":scope > *");
  return {
    visible: getComputedStyle(banner).display !== "none",
    banner: rect(banner),
    veil: rect(veil),
    panel: rect(panel),
    hud: rect(document.querySelector(".hud")),
    panelMaxHeight: getComputedStyle(panel).maxHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})()`);

const careerState = () => evaluate(`(() => {
  const stops = [...document.querySelectorAll(".concept-career-stop")];
  const cards = stops.map((stop) => stop.querySelector(".concept-career-card").getBoundingClientRect());
  const sectionElement = document.querySelector(".concept-career-section");
  const section = sectionElement.getBoundingClientRect();
  const sectionStyle = getComputedStyle(sectionElement);
  const haloRadius = 12;
  const clearances = stops.map((stop, index) => {
    const node = stop.querySelector(".concept-career-node").getBoundingClientRect();
    const card = cards[index];
    const center = node.top + node.height / 2;
    return {
      below: card.top - (center + haloRadius)
    };
  });
  const first = stops[0];
  const popovers = stops.map((stop) => stop.querySelector(".concept-career-popover").getBoundingClientRect());
  const cardBorders = stops.map((stop) =>
    getComputedStyle(stop.querySelector(".concept-career-card")).borderTopColor
  );
  const cardBackgrounds = stops.map((stop) =>
    getComputedStyle(stop.querySelector(".concept-career-card")).backgroundColor
  );
  return {
    count: stops.length,
    complete: stops.every((stop) => {
      const statement = stop.querySelector(".concept-career-statement")?.textContent.trim();
      const emphasis = [...stop.querySelectorAll(".concept-career-statement strong")];
      return Boolean(stop.querySelector(".concept-career-popover > strong")?.textContent.trim()) &&
        Boolean(stop.querySelector(".concept-career-popover > span")?.textContent.trim()) &&
        /^(Built|Led|Assisted|Analysed) /.test(statement) && statement.includes(" to ") &&
        emphasis.length >= 2 && emphasis.every((item) => item.textContent.trim());
    }),
    concise: stops.every((stop) => {
      const statement = stop.querySelector(".concept-career-statement")?.textContent.trim();
      return statement?.length <= 100;
    }),
    focused: first === document.activeElement,
    focusedName: stops.find((stop) => stop === document.activeElement)
      ?.querySelector(".concept-career-popover strong")?.textContent.trim() ?? null,
    focusMatch: first.matches(":focus"),
    focusWithinMatch: first.matches(":focus-within"),
    zIndex: getComputedStyle(first).zIndex,
    popoverOpacity: Number(getComputedStyle(first.querySelector(".concept-career-popover")).opacity),
    visibleNames: stops
      .filter((stop) => Number(getComputedStyle(stop.querySelector(".concept-career-popover")).opacity) > 0.99)
      .map((stop) => stop.querySelector(".concept-career-popover strong")?.textContent.trim()),
    restingDates: document.querySelectorAll(".concept-career-time").length,
    popoverDateRanges: stops.map((stop) => stop.querySelector(".concept-career-popover > span")?.textContent.trim()),
    cardBorders,
    cardBackgrounds,
    distinctCardBorders: new Set(cardBorders).size,
    distinctCardBackgrounds: new Set(cardBackgrounds).size,
    firstName: first?.querySelector(".concept-career-popover strong")?.textContent.trim(),
    lastName: stops.at(-1)?.querySelector(".concept-career-popover strong")?.textContent.trim(),
    minBelow: Math.min(...clearances.map((item) => item.below)),
    tasteTop: document.querySelector(".concept-archive").getBoundingClientRect().top,
    sectionPaddingBottom: parseFloat(sectionStyle.paddingBottom),
    sectionTransitionProperty: sectionStyle.transitionProperty,
    sectionTransitionDuration: sectionStyle.transitionDuration,
    sectionTransitionTiming: sectionStyle.transitionTimingFunction,
    sectionAfterCards: section.bottom - Math.max(...cards.map((card) => card.bottom)),
    popoversContained: popovers.every((item) => item.left >= -0.5 && item.right <= innerWidth + 0.5),
    activePopoversContainedBySection: popovers.every((item, index) =>
      Number(getComputedStyle(stops[index].querySelector(".concept-career-popover")).opacity) < 0.99 ||
        item.bottom <= section.bottom + 0.5
    ),
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
  check(state.navCount === 0, `the hero does not repeat chapter links [${state.navCount}]`);
  check(
    state.heroLayout.lede.left >= state.heroLayout.identity.right + 24,
    `the proposition uses the right-hand hero column [${state.heroLayout.identity.right.toFixed(1)}px → ${state.heroLayout.lede.left.toFixed(1)}px]`
  );
  check(
    Math.abs(state.heroLayout.firstHandle.left - state.heroLayout.lede.left) <= 1,
    "the handles share the proposition's left edge"
  );
  check(
    state.heroLayout.handles.top >= state.heroLayout.lede.bottom + 10 &&
      state.heroLayout.handles.top <= state.heroLayout.lede.bottom + 28,
    `the proposition keeps a compact gap above its handles [${(state.heroLayout.handles.top - state.heroLayout.lede.bottom).toFixed(1)}px]`
  );
  check(
    state.heroLayout.hero.height <= 265,
    `the wide masthead uses its width instead of empty height [${state.heroLayout.hero.height.toFixed(1)}px]`
  );
  check(
    state.chapterHeadings.map((item) => item.text).join(" / ") === "Projects / Career / Taste Library" &&
      state.chapterHeadings.every((item) => item.style === state.chapterHeadings[0].style),
    `Projects, Career and Taste use one chapter-heading system [${state.chapterHeadings.map((item) => item.text).join(" / ")}]`
  );
  check(
    state.projects.every((item) =>
      item.tagName === "BUTTON" && item.controls === "project-detail" && item.expanded === "false"
    ),
    "the three project cards are accessible disclosure controls at rest"
  );
  check(
    state.projects[0].text.startsWith("features ") &&
      state.projects[1].text.startsWith("Português com a Inês ") &&
      state.projects[2].text.startsWith("The Trek "),
    `Features, Português com a Inês and The Trek render in order [${state.projects.map((item) => item.text).join(" / ")}]`
  );
  check(
    Math.abs(state.projects[0].rect.top - state.projects[1].rect.top) <= 1 &&
      Math.abs(state.projects[0].rect.top - state.projects[2].rect.top) <= 1 &&
      Math.abs(state.projects[0].rect.width - state.projects[1].rect.width) <= 1 &&
      Math.abs(state.projects[1].rect.width - state.projects[2].rect.width) <= 1 &&
      Math.abs(state.projects[0].rect.bottom - state.projects[1].rect.bottom) <= 1 &&
      Math.abs(state.projects[1].rect.bottom - state.projects[2].rect.bottom) <= 1,
    `the wide project edit is one balanced row [${state.projects.map((item) => `${item.rect.width.toFixed(1)}×${item.rect.height.toFixed(1)}`).join(" / ")}]`
  );
  check(
    state.projects.every((item) =>
      item.imageRect.width / item.imageRect.height >= 1.85 &&
      item.imageRect.width / item.imageRect.height <= 1.95 &&
      Math.abs(item.imageRect.bottom - item.footRect.top) <= 1
    ),
    "every project keeps its landscape artwork above the caption"
  );
  check(
    state.projects.every((item) =>
      Math.abs(item.footRect.left - item.rect.left) <= 1 &&
      Math.abs(item.footRect.right - item.rect.right) <= 1 &&
      Math.abs(item.footRect.bottom - item.rect.bottom) <= 1 &&
      item.footRect.height <= 60
    ),
    `all project captions close as full-width bottom rails [${state.projects.map((item) => item.footRect.height.toFixed(1)).join(" / ")}px]`
  );
  check(
    state.projects.every((item) => item.titleStyle === state.projects[0].titleStyle) &&
      state.projects.every((item) => item.subtitleStyle === state.projects[0].subtitleStyle),
    "all project captions share the same title and subtitle typography"
  );
  check(
    state.projects.every((item) =>
      item.titleRect.left - item.footRect.left <= 16 &&
      item.footRect.right - item.subtitleRect.right <= 16 &&
      item.titleRect.right + 8 <= item.subtitleRect.left &&
      item.titleRect.top >= item.footRect.top &&
      item.titleRect.bottom <= item.footRect.bottom &&
      item.subtitleRect.top >= item.footRect.top &&
      item.subtitleRect.bottom <= item.footRect.bottom
    ),
    "every caption uses both ends of its rail without overlap or clipping"
  );
  check(
    state.projects.every((item) => !item.hasArrow) &&
      state.projects.every((item) => !/(play today|visit site|explore)/i.test(item.text)),
    "project cards rely on their caption rails rather than arrow or CTA controls"
  );
  check(
    state.projects.every((item) =>
      item.imageComplete && item.imageWidth >= item.imageRect.width && /conceptProject/.test(item.currentSrc)
    ),
    `all three featured projects load sufficient responsive artwork [${state.projects.map((item) => `${item.imageWidth}px source / ${item.imageRect.width.toFixed(1)}px render`).join(" / ")}]`
  );
  check(!state.standaloneFreelance, "Freelance does not render as a separate Projects row");
  check(
    state.career.length === 8 && state.career[0].name === "Freelance" && state.career.at(-1).name === "Lloyds Banking Group",
    `the complete career sequence remains intact [${state.career.length} stops]`
  );
  check(
    state.career[0].statement === "Built client websites for Butterfly Rose and Português com a Inês to support their businesses.",
    `both named client projects live within the Freelance offer [${state.career[0].statement}]`
  );
  check(
    state.career.every((item) =>
      item.role && /^(Built|Led|Assisted|Analysed) /.test(item.statement) &&
        item.statement.includes(" to ") && item.emphasis.length >= 2 && item.hidden
    ),
    "every career stop keeps one verb-led, selectively bolded action-to-purpose sentence inside the compact interaction"
  );
  check(
    state.filters.map((item) => item.text).join(" / ") ===
      "Highlights / Music / Films / Games / TV / Podcasts",
    `six taste filters render in order [${state.filters.map((item) => item.text).join(" / ")}]`
  );
  check(
    state.filters.filter((item) => item.pressed === "true").map((item) => item.text).join() === "Highlights",
    "Highlights is the sole initial filter"
  );
  check(
    state.filterToWallGap >= 10 && state.filterToWallGap <= 18,
    `the Taste filters sit directly above the rail [${state.filterToWallGap.toFixed(1)}px]`
  );
  check(state.cards === 48, `the opening edit stays finite [${state.cards} cards]`);
  check(
    !state.hasFinale,
    "Taste ends with the complete rail rather than a separate closing shelf"
  );
  check(
    [...state.visibleKeys].sort().join(" / ") === "films / games / music / podcasts / tv" &&
      state.visibleCounts.music === 11 &&
      ["films", "games", "tv"].every((key) => state.visibleCounts[key] === 10) &&
      state.visibleCounts.podcasts === 7,
    `the opening edit is balanced across five sections [${JSON.stringify(state.visibleCounts)}]`
  );
  check(state.links === 0, "taste cards remain visual objects rather than false destinations");
  check(state.passive === 0, "Taste no longer uses passive pseudo-controls");
  check(
    state.cardButtons === state.cards && state.namedCardButtons === state.cards,
    `every Taste cover is a named disclosure button [${state.namedCardButtons}/${state.cardButtons}]`
  );
  check(state.hasSpotlight === false, "no modal viewer exists");
  check(
    state.cardShapes.join() === "square",
    `the Taste list uses one calm square-cover scale [${state.cardShapes.join(" / ")}]`
  );
  check(
    state.railItemCount === state.cards && state.railOneRow && state.railSquares,
    `all ${state.railItemCount} Taste covers form one square row`
  );
  check(
    state.railOverflowX === "auto" && ["inline", "inline proximity"].includes(state.railSnap) &&
      state.railScrollWidth > state.railClientWidth * 3,
    `Taste is a native horizontally scrollable list [${state.railClientWidth} / ${state.railScrollWidth}px; ${state.railSnap}]`
  );
  check(
    state.railVisibleItems >= 8 && state.railVisibleItems <= 12,
    `the desktop rail shows a useful edit while hinting at more [${state.railVisibleItems} covers]`
  );
  check(state.artDirectedCards === 30, `all visible film, game and TV cards use editorial art [${state.artDirectedCards}]`);
  check(
    state.originalPrints === 0,
    `no inset poster boxes interrupt the editorial artwork [${state.originalPrints}]`
  );
  check(state.artFillFailures === 0, `every editorial scene fills its whole card [${state.artFillFailures} failures]`);
  check(state.detailFailures === 0, "every Taste card has title followed by creator detail");
  check(state.focusableDetails === state.cards, "every Taste detail can also be reached by keyboard focus");
  check(state.playDetails > 0, `Last.fm play counts appear where they exist [${state.playDetails} visible]`);
  check(state.footerSignoff == null, "the footer sign-off is removed");
  check(state.footerLocation == null, "the footer location is removed");
  check(state.footerLinks === "dakibwa / dakibwa / Email", `the hero keeps its three routes [${state.footerLinks}]`);
  check(
    state.footerAccents === "#0f1114 / #d63a7a / #2f88ff",
    `the hero keeps the handle colour accents [${state.footerAccents}]`
  );
  check(
    state.footerCount === 1 && state.footerInHero && !state.footerAfterTaste,
    `the handles appear once beneath the proposition [${state.footerCount} group]`
  );
  check(state.overflow <= 1, `the page has no horizontal overflow [${state.overflow}px]`);
};

const checkLinkHover = async () => {
  section("project reveal and explicit open action");
  await setDesktop();
  await goto("/");
  const before = await evaluate(`(() => {
    const link = document.querySelector(".concept-feature");
    link.scrollIntoView({ block: "center" });
    const r = link.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      footBackground: getComputedStyle(link.querySelector(".concept-project-foot")).backgroundColor,
      footColor: getComputedStyle(link.querySelector(".concept-project-foot")).color,
      footTransition: getComputedStyle(link.querySelector(".concept-project-foot")).transitionDuration,
      transform: getComputedStyle(link).transform,
      shadow: getComputedStyle(link).boxShadow,
      careerTop: document.querySelector(".concept-career-section").getBoundingClientRect().top,
      detailOpacity: Number(getComputedStyle(document.querySelector(".concept-project-detail-shell")).opacity)
    };
  })()`);
  check(parseFloat(before.footTransition) === 0, "the Features caption rail has no animated transition");
  await mouseMove(before.x, before.y);
  const hovered = await pollUntil(
    () => evaluate(`(() => {
      const link = document.querySelector(".concept-feature");
      return {
        footBackground: getComputedStyle(link.querySelector(".concept-project-foot")).backgroundColor,
        footColor: getComputedStyle(link.querySelector(".concept-project-foot")).color,
        footTransition: getComputedStyle(link.querySelector(".concept-project-foot")).transitionDuration,
        transform: getComputedStyle(link).transform,
        shadow: getComputedStyle(link).boxShadow,
        careerTop: document.querySelector(".concept-career-section").getBoundingClientRect().top,
        detailOpacity: Number(getComputedStyle(document.querySelector(".concept-project-detail-shell")).opacity),
        detailTitle: document.querySelector(".concept-project-detail h3")?.textContent.trim(),
        action: document.querySelector(".concept-project-open")?.textContent.replace(/\\s+/g, " ").trim(),
        actionHref: document.querySelector(".concept-project-open")?.getAttribute("href")
      };
    })()`),
    (value) => value.footBackground !== before.footBackground && value.detailOpacity > 0.99
  );
  check(
    hovered.footBackground !== before.footBackground &&
      hovered.footColor === before.footColor &&
      parseFloat(hovered.footTransition) === 0,
    "hover adds a subtle caption tint without changing its text"
  );
  check(hovered.transform === "none", "hover does not tilt, lift, or scale the feature");
  check(hovered.shadow === "none", "hover does not add a theatrical shadow");
  check(
    hovered.detailTitle === "features" && hovered.action === "Open features↗" &&
      hovered.actionHref === "/features/?from=akibwa",
    `hover previews Features with its explicit open action [${hovered.detailTitle} / ${hovered.action}]`
  );
  check(
    hovered.careerTop > before.careerTop + 60,
    `the project reveal moves the rose Career rule down [${before.careerTop.toFixed(1)} → ${hovered.careerTop.toFixed(1)}px]`
  );

  await clickAt(before.x, before.y);
  await mouseMove(1200, 40);
  let locked = await pollUntil(
    () => evaluate(`(() => ({
      expanded: document.querySelector(".concept-feature").getAttribute("aria-expanded"),
      opacity: Number(getComputedStyle(document.querySelector(".concept-project-detail-shell")).opacity),
      title: document.querySelector(".concept-project-detail h3")?.textContent.trim()
    }))()`),
    (value) => value.expanded === "true" && value.opacity > 0.99
  );
  check(locked.title === "features", "click locks the Features detail after the pointer leaves");

  const projects = [
    [".concept-portuguese", "Português com a Inês", "Open Português com a Inês↗", "https://portuguesewithines.com/?from=akibwa"],
    [".concept-trek", "The Trek", "Open The Trek↗", "/trek/?from=akibwa"]
  ];
  for (const [selector, title, action, href] of projects) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    locked = await pollUntil(
      () => evaluate(`(() => ({
        title: document.querySelector(".concept-project-detail h3")?.textContent.trim(),
        action: document.querySelector(".concept-project-open")?.textContent.replace(/\\s+/g, " ").trim(),
        href: document.querySelector(".concept-project-open")?.getAttribute("href")
      }))()`),
      (value) => value.title === title
    );
    check(
      locked.title === title && locked.action === action && locked.href === href,
      `${title} reveals the correct open action without navigating`
    );
  }

  await pressEscape();
  const settled = await pollUntil(
    () => evaluate(`Number(getComputedStyle(document.querySelector(".concept-project-detail-shell")).opacity)`),
    (opacity) => opacity === 0
  );
  check(settled === 0, "Escape clears the locked project detail");
};

const checkTasteDetails = async () => {
  section("Taste title, creator and Last.fm detail");
  await setDesktop();
  await goto("/");
  const before = await evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const playCount = document.querySelector('.taste-wall .card[data-key="music"] .card-info small');
    const card = playCount?.closest(".card");
    if (!card) throw new Error("missing music card with Last.fm plays");
    card.scrollIntoView({ block: "center" });
    const info = card.querySelector(".card-info");
    const rect = card.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      title: info.querySelector("strong")?.textContent.trim(),
      creator: info.querySelector(":scope > span")?.textContent.trim(),
      plays: info.querySelector("small")?.textContent.trim(),
      opacity: Number(getComputedStyle(info).opacity),
      transform: getComputedStyle(card).transform,
      shadow: getComputedStyle(card).boxShadow
    };
  })()`);
  check(before.title && before.creator, `detail reads title then creator [${before.title} / ${before.creator}]`);
  check(/^\d[\d,]* plays on Last\.fm$/.test(before.plays), `music includes the verified Last.fm count [${before.plays}]`);
  check(before.opacity === 0, "Taste detail stays quiet at rest");
  await mouseMove(before.x, before.y);
  const hovered = await pollUntil(
    () => evaluate(`(() => {
      const card = document.querySelector('.taste-wall .card[data-key="music"] .card-info small').closest(".card");
      return {
        opacity: Number(getComputedStyle(card.querySelector(".card-info")).opacity),
        transform: getComputedStyle(card).transform,
        shadow: getComputedStyle(card).boxShadow,
        panelOpacity: Number(getComputedStyle(document.querySelector(".taste-detail-shell")).opacity),
        panelTitle: document.querySelector(".taste-detail > strong")?.textContent.trim(),
        panelCreator: document.querySelector(".taste-detail > span:not(.taste-detail-kind)")?.textContent.trim(),
        panelMeta: document.querySelector(".taste-detail small")?.textContent.trim()
      };
    })()`),
    (value) => value.opacity > 0.99 && value.panelOpacity > 0.99
  );
  check(hovered.opacity > 0.99, "hover reveals the Taste detail");
  check(hovered.transform === "none" && hovered.shadow === "none", "Taste hover adds no lift, scale or shadow");
  check(
    hovered.panelTitle === before.title && hovered.panelCreator === before.creator && hovered.panelMeta === before.plays,
    "the blue panel repeats the selected cover's title, creator and available play count"
  );

  await clickAt(before.x, before.y);
  await mouseMove(1200, 40);
  const lockedTaste = await pollUntil(
    () => evaluate(`(() => ({
      expanded: document.querySelector('.taste-wall .card[data-key="music"].is-selected')?.getAttribute("aria-expanded"),
      opacity: Number(getComputedStyle(document.querySelector(".taste-detail-shell")).opacity)
    }))()`),
    (value) => value.expanded === "true" && value.opacity > 0.99
  );
  check(lockedTaste.expanded === "true", "click locks a Taste detail after the pointer leaves");
  await pressEscape();
  const closedTaste = await pollUntil(
    () => evaluate(`Number(getComputedStyle(document.querySelector(".taste-detail-shell")).opacity)`),
    (opacity) => opacity === 0
  );
  check(closedTaste === 0, "Escape clears the locked Taste detail");

  await evaluate(`document.querySelector('.taste-wall .card[data-key="music"] .card-info small').closest(".card").focus()`);
  const focusedOpacity = await evaluate(`Number(getComputedStyle(document.activeElement.querySelector(".card-info")).opacity)`);
  check(focusedOpacity > 0.99, "keyboard focus reveals the same Taste detail");
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
  check(
    Math.abs(state.heroLayout.firstHandle.left - state.heroLayout.lede.left) <= 1,
    "the handles remain aligned beneath the proposition above the breakpoint"
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
  check(
    Math.abs(state.heroLayout.firstHandle.left - state.heroLayout.lede.left) <= 1 &&
      state.heroLayout.handles.top > state.heroLayout.lede.bottom,
    "the stacked handles follow the proposition on its left edge"
  );
  check(state.overflow <= 1, `the stacked breakpoint has no overflow [${state.overflow}px]`);
};

const checkProjectBreakpoint = async () => {
  section("project composition breakpoint");
  await setDesktop(1051, 900);
  await goto("/");
  let state = await pageState();
  check(
    Math.abs(state.projects[0].rect.top - state.projects[1].rect.top) <= 1 &&
      Math.abs(state.projects[1].rect.top - state.projects[2].rect.top) <= 1 &&
      Math.abs(state.projects[0].rect.width - state.projects[1].rect.width) <= 1 &&
      Math.abs(state.projects[1].rect.width - state.projects[2].rect.width) <= 1,
    "the balanced three-card row holds through its wide breakpoint"
  );
  check(state.overflow <= 1, `the compact project block has no overflow [${state.overflow}px]`);

  await setDesktop(1050, 900);
  await goto("/");
  state = await pageState();
  check(
    state.projects[1].rect.top >= state.projects[0].rect.bottom + 13 &&
      Math.abs(state.projects[1].rect.top - state.projects[2].rect.top) <= 1 &&
      state.projects[1].rect.right < state.projects[2].rect.left &&
      Math.abs(state.projects[0].rect.width - (state.projects[1].rect.width + state.projects[2].rect.width + (state.projects[2].rect.left - state.projects[1].rect.right))) <= 2,
    "Features takes a full tablet row above two equal supporting cards"
  );
  check(state.overflow <= 1, `the intermediate project layout has no overflow [${state.overflow}px]`);
};

const checkProjectView = async () => {
  section("selected project view");
  await setDesktop();
  await goto("/trek/");
  let state = await trekProjectState();
  check(!state.visible, "a direct Trek visit remains standalone");

  await goto("/trek/?from=akibwa");
  state = await trekProjectState();
  check(state.visible, "the Trek page shows Akibwa's masthead when selected from Projects");
  check(state.names.join(" / ") === "Daniel / Akibwa", `the selected-project identity keeps both flick states [${state.names.join(" / ")}]`);
  check(
    state.nameAnimations.every((name) => name !== "none"),
    `both selected-project names keep the homepage flick [${state.nameAnimations.join(" / ")}]`
  );
  check(state.lede === "Building in the age of AI.", `the project masthead keeps the exact proposition [${state.lede}]`);
  check(state.position === "sticky", `the selected-project masthead remains pinned [${state.position}]`);
  check(
    state.nav.map((item) => `${item.text}:${item.href}`).join(" / ") ===
      "Home:https://akibwa.com/ / Projects:https://akibwa.com/#projects / Career:https://akibwa.com/#career / Taste Library:https://akibwa.com/#taste",
    `the project masthead keeps Home and the three homepage routes [${state.nav.map((item) => item.text).join(" / ")}]`
  );
  check(
    state.ruleHeight === 4 && Math.abs(state.ruleWidth - state.banner.width) <= 1 && state.ruleColor !== "rgba(0, 0, 0, 0)",
    `the green boundary spans the whole selected-project masthead [${state.ruleWidth.toFixed(1)}×${state.ruleHeight.toFixed(1)}px]`
  );
  check(
    Math.abs(state.banner.bottom - state.masthead.top) <= 1 &&
      Math.abs(state.masthead.bottom - state.statbar.top) <= 1,
    "the Trek chrome begins cleanly below the green portfolio boundary"
  );
  check(
    Math.abs(state.stage.top - state.banner.bottom) <= 1,
    "the real project canvas starts immediately below the portfolio masthead"
  );
  check(state.overflow <= 1, `the desktop project view has no horizontal overflow [${state.overflow}px]`);

  await setMobile();
  await goto("/trek/?from=akibwa");
  state = await trekProjectState();
  check(state.visible && state.banner.height <= 134, `the phone masthead stays compact [${state.banner.height.toFixed(1)}px]`);
  check(
    state.nav.map((item) => item.text).join(" / ") === "Home / Projects / Career / Taste Library",
    "the phone project view keeps the complete homepage navigation"
  );
  check(state.overflow <= 1, `the phone project view has no horizontal overflow [${state.overflow}px]`);

  await setDesktop(872, 525);
  await goto("/trek/?from=akibwa");
  state = await trekProjectState();
  check(
    state.visible && state.banner.height <= 60 && state.ledeDisplay !== "none" &&
      state.lede === "Building in the age of AI.",
    `the short landscape masthead keeps the proposition without growing tall [${state.banner.height.toFixed(1)}px, ${state.ledeDisplay}]`
  );
  check(state.overflow <= 1, `the landscape project view has no horizontal overflow [${state.overflow}px]`);

  await goto("/features/?from=akibwa");
  await sleep(280);
  let features = await featuresProjectState();
  check(features.visible, "Features shows the same Akibwa masthead when selected from Projects");
  check(
    Math.abs(features.veil.top - features.banner.bottom) <= 1,
    `the Features menu layer begins below the banner [${features.veil.top.toFixed(1)} / ${features.banner.bottom.toFixed(1)}px]`
  );
  check(
    features.panel.top >= features.banner.bottom && features.panel.bottom <= 525.5,
    `the complete Features menu fits inside the landscape screen [${features.panel.top.toFixed(1)}–${features.panel.bottom.toFixed(1)}px]`
  );
  check(features.hud.bottom <= 525.5, `the game canvas fits the remaining landscape screen [${features.hud.bottom.toFixed(1)}px]`);
  check(features.overflow <= 1, `the landscape Features view has no horizontal overflow [${features.overflow}px]`);

  await setMobile();
  await goto("/features/?from=akibwa");
  await sleep(280);
  features = await featuresProjectState();
  check(
    Math.abs(features.veil.top - features.banner.bottom) <= 1 &&
      features.panel.top >= features.banner.bottom && features.panel.bottom <= 844.5,
    `the complete Features menu fits below the phone masthead [${features.banner.bottom.toFixed(1)}–${features.panel.bottom.toFixed(1)}px]`
  );
  check(features.hud.bottom <= 844.5, `the game canvas fits the remaining phone screen [${features.hud.bottom.toFixed(1)}px]`);
  check(features.overflow <= 1, `the phone Features view has no horizontal overflow [${features.overflow}px]`);
};

const checkCareerTimeline = async () => {
  section("compact career detail, hover dates and dot clearance");
  await setDesktop(1100, 760);
  await goto("/");
  let state = await careerState();
  check(state.count === 8, `eight career stops remain visible [${state.count}]`);
  check(state.complete, "every stop contains a title and one selectively bolded action-to-purpose sentence");
  check(state.concise, "every combined career sentence stays within the short-copy limit");
  check(
    state.firstName === "Freelance" && state.lastName === "Lloyds Banking Group",
    `career order runs from Freelance to Lloyds [${state.firstName} → ${state.lastName}]`
  );
  check(state.restingDates === 0, `career dates stay out of the resting highlight [${state.restingDates}]`);
  check(
    state.popoverDateRanges.every((text) => / · (Now|\d{4}( — (present|\d{4}))?)$/.test(text)),
    `every hover synopsis retains its full date [${state.popoverDateRanges.join(" / ")}]`
  );
  check(
    state.distinctCardBorders === state.count,
    `every resting logo card carries its own darker company-colour border [${state.cardBorders.join(" / ")}]`
  );
  check(
    state.distinctCardBackgrounds === state.count,
    `every resting logo card carries its own quiet company-colour surface [${state.cardBackgrounds.join(" / ")}]`
  );
  check(state.popoverOpacity === 0, "career detail is hidden at rest");
  check(
    state.sectionAfterCards >= 48 && state.sectionAfterCards <= 60,
    `Career closes with a compact resting margin [${state.sectionAfterCards.toFixed(1)}px]`
  );
  check(
    state.sectionTransitionProperty.includes("padding-bottom") &&
      parseFloat(state.sectionTransitionDuration) >= 0.3 &&
      state.sectionTransitionTiming.includes("0.22"),
    `Career owns a deliberate layout transition [${state.sectionTransitionDuration}; ${state.sectionTransitionTiming}]`
  );
  let points = await evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const stops = [...document.querySelectorAll(".concept-career-stop")];
    const first = stops[0];
    first.scrollIntoView({ block: "center" });
    const boxes = stops.slice(0, 2).map((stop) => stop.getBoundingClientRect());
    return {
      stops: boxes.map((rect) => ({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      })),
      gap: {
        x: (boxes[0].right + boxes[1].left) / 2,
        y: boxes[0].top + boxes[0].height / 2
      }
    };
  })()`);
  state = await careerState();
  const restingTasteTop = state.tasteTop;
  const restingSpace = state.sectionAfterCards;
  await mouseMove(points.stops[1].x, points.stops[1].y);
  await sleep(90);
  const moving = await careerState();
  await sleep(430);
  state = await careerState();
  check(
    moving.tasteTop > restingTasteTop + 4 && moving.tasteTop < state.tasteTop - 4,
    `the blue Taste rule moves through an intermediate position [${restingTasteTop.toFixed(1)} → ${moving.tasteTop.toFixed(1)} → ${state.tasteTop.toFixed(1)}px]`
  );
  check(
    state.sectionAfterCards >= 138 && state.tasteTop >= restingTasteTop + 75,
    `Career smoothly creates the full reveal space [${restingSpace.toFixed(1)} → ${state.sectionAfterCards.toFixed(1)}px]`
  );
  check(
    state.visibleNames.join() === "National Wealth Fund",
    `hover opens one role at rest [${state.visibleNames.join() || "none"}]`
  );
  await mouseMove(points.gap.x, points.gap.y);
  await sleep(120);
  const gapState = await careerState();
  check(
    gapState.sectionAfterCards >= 138 && Math.abs(gapState.tasteTop - state.tasteTop) <= 1,
    "the blue rule stays settled while the pointer crosses between career marks"
  );
  await mouseMove(0, 0);
  await pollUntil(
    careerState,
    (value) => value.visibleNames.length === 0 && value.sectionAfterCards <= restingSpace + 1
  );
  await clickAt(points.stops[0].x, points.stops[0].y);
  state = await pollUntil(
    careerState,
    (value) => value.popoverOpacity > 0.99 && value.sectionAfterCards >= 138
  );
  check(state.focused, "a career stop can receive keyboard focus");
  check(
    state.popoverOpacity > 0.99,
    `focus reveals the concise career detail [opacity ${state.popoverOpacity}; focus ${state.focusMatch}; within ${state.focusWithinMatch}; z ${state.zIndex}]`
  );
  check(state.minBelow >= 5.5, `the halo clears every logo card [${state.minBelow.toFixed(1)}px]`);
  check(state.popoversContained, "every desktop career popover stays inside the viewport");
  check(state.activePopoversContainedBySection, "an open desktop detail makes room before Taste");
  check(state.overflow <= 1, `the desktop timeline has no horizontal overflow [${state.overflow}px]`);
  await mouseMove(points.stops[1].x, points.stops[1].y);
  await sleep(140);
  state = await careerState();
  check(
    state.focusedName === "Freelance" && state.visibleNames.join() === "Freelance",
    `focus suppresses competing hover detail [focus ${state.focusedName}; open ${state.visibleNames.join() || "none"}]`
  );
  await clickAt(points.stops[1].x, points.stops[1].y);
  state = await pollUntil(
    careerState,
    (value) => value.focusedName === "National Wealth Fund" && value.visibleNames.join() === "National Wealth Fund"
  );
  check(
    state.visibleNames.join() === "National Wealth Fund",
    `click switches the single open role [${state.visibleNames.join() || "none"}]`
  );

  await setMobile();
  await goto("/");
  state = await careerState();
  check(state.complete && state.concise, "the phone timeline keeps the same short combined detail");
  check(state.restingDates === 0, "phone career dates also stay inside the synopsis");
  check(
    state.popoverDateRanges.every((text) => / · (Now|\d{4}( — (present|\d{4}))?)$/.test(text)),
    "phone hover and focus detail keeps every full date"
  );
  check(state.popoverOpacity === 0, "phone career detail is hidden at rest");
  check(
    state.sectionAfterCards >= 40 && state.sectionAfterCards <= 52,
    `phone Career keeps only a compact resting margin [${state.sectionAfterCards.toFixed(1)}px]`
  );
  const point = await evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const first = document.querySelector(".concept-career-stop");
    first.scrollIntoView({ block: "center" });
    const rect = first.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await clickAt(point.x, point.y);
  state = await pollUntil(
    careerState,
    (value) => value.popoverOpacity > 0.99 && value.sectionAfterCards >= 138
  );
  check(state.focused, "the phone timeline retains focus semantics");
  check(
    state.popoverOpacity > 0.99,
    `the phone timeline reveals the concise detail [opacity ${state.popoverOpacity}; focus ${state.focusMatch}; within ${state.focusWithinMatch}; z ${state.zIndex}]`
  );
  check(state.minBelow >= 5.5, `the phone halo clears every logo card [${state.minBelow.toFixed(1)}px]`);
  check(state.popoversContained, "every phone career popover stays inside the viewport");
  check(state.activePopoversContainedBySection, "an open phone detail makes room before Taste");
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
  check(
    state.railItemCount === state.cards && state.railOneRow && state.railSquares &&
      state.railScrollWidth > state.railClientWidth,
    `the complete Music archive remains one swipeable row [${state.railItemCount} covers]`
  );

  await evaluate(`document.querySelector(".taste-wall").scrollLeft = 520`);
  await sleep(80);
  state = await pageState();
  check(state.railScrollLeft > 100, `the desktop rail moves horizontally [${state.railScrollLeft.toFixed(1)}px]`);

  await pressEscape();
  await sleep(80);
  state = await pageState();
  check(state.hash === "", "Escape returns to the unfiltered wall");
  check(
    state.filters.filter((item) => item.pressed === "true").map((item) => item.text).join() === "Highlights",
    "Highlights is restored without a second interaction mode"
  );
  check(state.cards === 48 && state.visible === 48, "the balanced Highlights edit returns immediately");
  check(state.railScrollLeft <= 1, `changing the filter returns the rail to its start [${state.railScrollLeft.toFixed(1)}px]`);

  await selectFilter("Podcasts");
  state = await pageState();
  check(state.hash === "#podcasts", `Podcasts owns the shareable hash [${state.hash}]`);
  check(
    state.visibleKeys.join() === "podcasts" && state.cards === 7 && state.visible === 7,
    `Podcasts shows the seven verified shows [${state.cards} cards]`
  );
  check(state.railItemCount === 7 && state.railOneRow && state.railSquares, "the seven podcasts remain one compact square list");

  await pressEscape();
  await sleep(80);
};

const checkMobile = async () => {
  section("compact mobile wall at 390px");
  await setMobile();
  await goto("/");
  const initial = await pageState();
  check(initial.overflow <= 1, `the editorial opening fits the phone [${initial.overflow}px overflow]`);
  check(
    Math.abs(initial.heroLayout.identity.left - initial.heroLayout.lede.left) <= 1 &&
      Math.abs(initial.heroLayout.lede.left - initial.heroLayout.firstHandle.left) <= 1,
    "the phone identity, proposition and handles share one left edge"
  );
  check(
    initial.heroLayout.identityText.width >= initial.heroLayout.hero.width * 0.9 &&
      initial.heroLayout.ledeText.width >= initial.heroLayout.hero.width * 0.9,
    `the two mobile masthead lines use the full row [${initial.heroLayout.identityText.width.toFixed(1)} / ${initial.heroLayout.ledeText.width.toFixed(1)}px of ${initial.heroLayout.hero.width.toFixed(1)}px]`
  );
  check(
    initial.heroLayout.lede.top > initial.heroLayout.identity.bottom &&
      initial.heroLayout.handles.top > initial.heroLayout.lede.bottom,
    "the phone keeps identity, proposition and handles in reading order"
  );
  check(
    initial.projects.length === 3 &&
      initial.projects[1].rect.top >= initial.projects[0].rect.bottom + 13 &&
      initial.projects[2].rect.top >= initial.projects[1].rect.bottom + 13 &&
      initial.projects.every((item) => Math.abs(item.rect.width - initial.projects[0].rect.width) <= 1) &&
      Math.abs(initial.projects[0].rect.left - initial.projects[1].rect.left) <= 1 &&
      Math.abs(initial.projects[1].rect.left - initial.projects[2].rect.left) <= 1,
    `all three phone projects fill the shared content width [${initial.projects.map((item) => item.rect.width.toFixed(1)).join(" / ")}px]`
  );
  check(
    initial.projects.every((item) => item.titleRect.right + 8 <= item.subtitleRect.left) &&
      initial.projects.every((item) => item.titleRect.left - item.footRect.left <= 12) &&
      initial.projects.every((item) => item.footRect.right - item.subtitleRect.right <= 12) &&
      initial.projects.every((item) => item.titleRect.top >= item.footRect.top && item.titleRect.bottom <= item.footRect.bottom) &&
      initial.projects.every((item) => item.subtitleRect.top >= item.footRect.top && item.subtitleRect.bottom <= item.footRect.bottom),
    "every phone caption uses the full rail without overlap or clipping"
  );
  check(
    !initial.standaloneFreelance && initial.careerSection.top >= initial.projects[2].rect.bottom + 40,
    "the phone flows directly from the three Projects cards into Career"
  );
  const projectImageProtection = await evaluate(`(() => {
    const card = document.querySelector(".concept-feature");
    const image = card.querySelector("img");
    const rect = image.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const style = getComputedStyle(image);
    return {
      pointerEvents: style.pointerEvents,
      draggable: image.draggable,
      enclosingLinkOwnsTap: hit === card || card.contains(hit)
    };
  })()`);
  check(
    projectImageProtection.pointerEvents === "none" && !projectImageProtection.draggable,
    "project artwork cannot become a mobile image callout or drag target"
  );
  check(projectImageProtection.enclosingLinkOwnsTap, "the project link still owns taps on its artwork");
  await evaluate(`(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector("#taste").scrollIntoView({ block: "start" });
  })()`);
  await sleep(100);
  const state = await pageState();
  check(
    state.cardShapes.join() === "square" && state.railOneRow && state.railSquares,
    `mobile keeps one calm row of square covers [${state.cardShapes.join(" / ")}]`
  );
  check(
    state.minCardWidth >= 100 && state.maxCardWidth - state.minCardWidth <= 1,
    `mobile keeps the rail comfortably tappable and consistent [${state.minCardWidth.toFixed(1)}–${state.maxCardWidth.toFixed(1)}px]`
  );
  check(
    state.railVisibleItems >= 3 && state.railVisibleItems <= 5 &&
      state.railScrollWidth > state.railClientWidth * 8,
    `the phone shows a useful slice with the archive continuing sideways [${state.railVisibleItems} covers]`
  );
  check(state.overflow <= 1, `mobile has no horizontal overflow [${state.overflow}px]`);

  const tasteImageProtection = await evaluate(`(() => {
    const image = document.querySelector(".concept-archive-wall img");
    const card = image.closest(".card");
    const rect = image.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const allImages = [...document.images];
    return {
      allProtected: allImages.every((item) =>
        getComputedStyle(item).pointerEvents === "none" && !item.draggable
      ),
      cardOwnsTap: hit === card || card.contains(hit)
    };
  })()`);
  check(tasteImageProtection.allProtected, "every mobile image opts out of native callouts and dragging");
  check(tasteImageProtection.cardOwnsTap, "Taste cards still own taps on their artwork");

  await evaluate(`document.querySelector(".taste-wall").scrollLeft = document.querySelector(".taste-wall").scrollWidth`);
  await sleep(100);
  const scrolled = await pageState();
  check(
    scrolled.railScrollLeft > scrolled.railClientWidth,
    `the phone rail accepts horizontal swipe-equivalent scrolling [${scrolled.railScrollLeft.toFixed(1)}px]`
  );
  check(scrolled.overflow <= 1, `the internal rail does not widen the page [${scrolled.overflow}px]`);

  const touch = await evaluate(`(() => {
    const nav = document.querySelector(".deck-legend");
    const footer = document.querySelector(".page-footer").getBoundingClientRect();
    const panel = document.querySelector(".page-footer-panel").getBoundingClientRect();
    const meta = document.querySelector(".page-footer-meta").getBoundingClientRect();
    const handles = [...document.querySelectorAll(".page-footer-details a")]
      .map((item) => item.getBoundingClientRect());
    return {
      navHeight: nav.getBoundingClientRect().height,
      footerInside: footer.left >= 0 && footer.right <= innerWidth + 1 &&
        panel.left >= 0 && panel.right <= innerWidth + 1 &&
        meta.left >= 0 && meta.right <= innerWidth + 1,
      handleCount: handles.length,
      handlesOneRow: handles.every((item) => Math.abs(item.top - handles[0].top) <= 1)
    };
  })()`);
  check(touch.navHeight < 40, `the plain word menu stays compact [${touch.navHeight.toFixed(1)}px]`);
  check(
    state.filterToWallGap >= 8 && state.filterToWallGap <= 12,
    `the phone filters sit directly above the rail [${state.filterToWallGap.toFixed(1)}px]`
  );
  check(touch.footerInside, "the hero handles stay inside the mobile frame");
  check(touch.handleCount === 3 && touch.handlesOneRow, "the three hero handles share one quiet mobile row");
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
      ".concept-project-foot",
      ".concept-project-detail-shell",
      ".taste-detail-shell",
      ".hero-name",
      ".hero-name-value",
      ".concept-career-section"
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
    await checkProjectBreakpoint();
    await checkProjectView();
    await checkLinkHover();
    await checkTasteDetails();
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
