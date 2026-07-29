/* Navigation DOM regression check.
 *
 * Drives the built static export (out/) in headless Chrome over the DevTools
 * protocol with real mouse and keyboard input, and asserts the navigation
 * contract holds in the rendered page: bar containment, active-route state,
 * hover reveal/hide, rapid-sweep recovery, keyboard focus, click transitions,
 * mobile leakage, and reduced motion.
 *
 * Usage: npm run build && npm run check:navigation:dom
 * Optional: CHROME_BIN=/path/to/chrome, CHECK_NAV_URL=https://... to run
 * against a deployed origin instead of out/.
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

/* ---------- static server for out/ ---------- */

const mime = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".ico": "image/x-icon", ".txt": "text/plain",
  ".xml": "application/xml", ".woff2": "font/woff2"
};

const startServer = () => new Promise((resolve) => {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const candidates = [
      join(outDir, path),
      join(outDir, path, "index.html"),
      join(outDir, `${path.replace(/\/$/, "")}.html`)
    ];
    for (const file of candidates) {
      if (existsSync(file) && !file.endsWith("/") && !file.endsWith("out")) {
        try {
          const body = readFileSync(file);
          res.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
          res.end(body);
          return;
        } catch {
          /* directory hit; try next candidate */
        }
      }
    }
    res.writeHead(404);
    res.end("not found");
  });
  server.listen(0, "127.0.0.1", () => resolve(server));
});

/* ---------- minimal CDP client ---------- */

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
      /* keep looking */
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
  const onData = (chunk) => {
    stderr += chunk;
    const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
    if (match) {
      proc.stderr.off("data", onData);
      resolve({ proc, port: Number(match[1]) });
    }
  };
  proc.stderr.on("data", onData);
  proc.on("exit", () => reject(new Error(`Chrome exited before DevTools was ready:\n${stderr}`)));
  setTimeout(() => reject(new Error("Chrome DevTools endpoint did not appear within 15s")), 15000);
});

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = [];
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
      } else if (message.method) {
        this.eventWaiters = this.eventWaiters.filter((waiter) => {
          if (waiter.method !== message.method) return true;
          waiter.resolve(message.params);
          return false;
        });
      }
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
      this.eventWaiters.push({ method, resolve: (params) => { clearTimeout(timer); resolve(params); } });
    });
  }
}

/* ---------- page helpers ---------- */

let cdp;
let origin;

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true
  });
  if (exceptionDetails) {
    throw new Error(`page evaluation failed: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ""}`);
  }
  return result.value;
};

const goto = async (path) => {
  const loaded = cdp.waitFor("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: `${origin}${path}` });
  await loaded;
  await sleep(350); /* hydration + initial transitions */
};

const setDesktop = (width = 1440) => cdp.send("Emulation.setDeviceMetricsOverride", {
  width, height: 900, deviceScaleFactor: 1, mobile: false
});
const setMobile = () => cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true
});

const mouseMove = (x, y) => cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
const mouseClick = async (x, y) => {
  await mouseMove(x, y);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
};
const pressTab = async () => {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
};

/* Snapshot every desktop nav link and its bar. */
const navState = () => evaluate(`
  [...document.querySelectorAll(".nav-desktop .nav-link")].map((link) => {
    const bar = link.querySelector(".nav-link__bar");
    const linkRect = link.getBoundingClientRect();
    const barRect = bar ? bar.getBoundingClientRect() : null;
    const barStyle = bar ? getComputedStyle(bar) : null;
    return {
      href: (link.getAttribute("href") || "").replace(/\\/$/, ""),
      active: link.classList.contains("active"),
      focusVisible: link.matches(":focus-visible"),
      link: { left: linkRect.left, right: linkRect.right, top: linkRect.top, width: linkRect.width },
      bar: bar ? {
        left: barRect.left, right: barRect.right, top: barRect.top,
        width: barRect.width, height: barRect.height,
        opacity: Number(barStyle.opacity),
        transitionDuration: barStyle.transitionDuration
      } : null
    };
  })
`);

const pollUntil = async (probe, predicate, timeoutMs = 1200) => {
  const deadline = Date.now() + timeoutMs;
  let last;
  do {
    last = await probe();
    if (predicate(last)) return last;
    await sleep(60);
  } while (Date.now() < deadline);
  return last;
};

const strandedClasses = () => evaluate(
  `document.querySelectorAll(".site-header .is-hovering, .site-header .is-pressing").length`
);

const visibleBars = (state) => state.filter((item) => item.bar && item.bar.opacity > 0.01);

/* ---------- test sections ---------- */

const routes = [
  { path: "/projects/", href: "/projects" },
  { path: "/professional/", href: "/professional" },
  { path: "/about/", href: "/about" },
  { path: "/contact/", href: "/contact" }
];

const checkContainmentAndActive = async (width) => {
  section(`containment + active state at ${width}px`);
  await setDesktop(width);
  for (const route of routes) {
    await goto(route.path);
    const state = await navState();
    check(state.length === 4, `${route.path}: renders 4 desktop links`);
    const active = state.filter((item) => item.active);
    check(active.length === 1 && active[0].href === route.href,
      `${route.path}: exactly one active link and it is ${route.href}`);
    for (const item of state) {
      if (!item.bar) {
        check(false, `${route.path}: ${item.href} has a bar element`);
        continue;
      }
      const contained = Math.abs(item.bar.left - item.link.left) <= 1.5
        && Math.abs(item.bar.right - item.link.right) <= 1.5
        && Math.abs(item.bar.height - 6) <= 0.5
        && item.bar.top > item.link.top
        && item.bar.top - item.link.top < 20;
      check(contained, `${route.path}: ${item.href} bar sits inside its own link (` +
        `dx ${Math.abs(item.bar.left - item.link.left).toFixed(1)}/${Math.abs(item.bar.right - item.link.right).toFixed(1)}, h ${item.bar.height})`);
      check(item.bar.width < item.link.width + 3, `${route.path}: ${item.href} bar is not wider than its link`);
      const shouldShow = item.active;
      check(shouldShow ? item.bar.opacity > 0.99 : item.bar.opacity < 0.01,
        `${route.path}: ${item.href} bar ${shouldShow ? "visible (active)" : "hidden"} [opacity ${item.bar.opacity}]`);
    }
  }
};

const linkCenter = (item) => ({
  x: (item.link.left + item.link.right) / 2,
  y: item.link.top + 30
});

const checkHover = async () => {
  section("hover reveal and hide (on /about/)");
  await setDesktop();
  await goto("/about/");
  let state = await navState();
  const projects = state.find((item) => item.href === "/projects");
  const target = linkCenter(projects);

  await mouseMove(target.x, target.y);
  state = await pollUntil(navState, (s) => s.find((i) => i.href === "/projects").bar.opacity > 0.99);
  check(state.find((i) => i.href === "/projects").bar.opacity > 0.99, "hovering Projects reveals its bar");
  check(state.find((i) => i.href === "/about").bar.opacity > 0.99, "active About bar stays visible during hover");
  check(visibleBars(state).length === 2, "only the active and hovered bars are visible");

  await mouseMove(720, 500);
  state = await pollUntil(navState, (s) => s.find((i) => i.href === "/projects").bar.opacity < 0.01);
  check(state.find((i) => i.href === "/projects").bar.opacity < 0.01, "leaving Projects hides its bar completely");
  check(state.find((i) => i.href === "/about").bar.opacity > 0.99, "active About bar survives pointer exit");

  /* interrupt: enter then leave mid-transition */
  await mouseMove(target.x, target.y);
  await sleep(60);
  await mouseMove(720, 500);
  state = await pollUntil(navState, (s) => visibleBars(s).length === 1);
  check(visibleBars(state).length === 1 && visibleBars(state)[0].href === "/about",
    "interrupted hover settles back to only the active bar");
};

const checkRapidSweep = async () => {
  section("rapid sweep (on /professional/)");
  await setDesktop();
  await goto("/professional/");
  const state = await navState();
  const first = state[0];
  const last = state[state.length - 1];
  const y = first.link.top + 30;
  const from = first.link.left - 25;
  const to = last.link.right + 25;

  for (let pass = 0; pass < 6; pass++) {
    const [start, end] = pass % 2 === 0 ? [from, to] : [to, from];
    for (let step = 0; step <= 12; step++) {
      await mouseMove(start + ((end - start) * step) / 12, y);
    }
  }
  await mouseMove(720, 500);
  const settled = await pollUntil(navState, (s) => visibleBars(s).length === 1, 1500);
  const visible = visibleBars(settled);
  check(visible.length === 1 && visible[0].href === "/professional",
    `after 6 fast sweeps only the active bar remains [visible: ${visible.map((v) => v.href).join(", ")}]`);
  check((await strandedClasses()) === 0, "no is-hovering/is-pressing classes stranded in the header");
};

const checkKeyboardFocus = async () => {
  section("keyboard focus (on /projects/)");
  await setDesktop();
  await goto("/projects/");
  let focusedNav = null;
  for (let presses = 0; presses < 20 && !focusedNav; presses++) {
    await pressTab();
    const state = await navState();
    focusedNav = state.find((item) => item.focusVisible && !item.active) ?? null;
  }
  check(Boolean(focusedNav), "tabbing reaches an inactive desktop nav link with :focus-visible");
  if (focusedNav) {
    const state = await pollUntil(navState,
      (s) => s.find((i) => i.href === focusedNav.href).bar.opacity > 0.99);
    check(state.find((i) => i.href === focusedNav.href).bar.opacity > 0.99,
      `keyboard focus reveals the ${focusedNav.href} bar`);
    check(state.find((i) => i.href === "/projects").bar.opacity > 0.99,
      "active bar stays visible while a sibling is focused");
  }
};

const checkClickTransition = async () => {
  section("click transition /about/ → /contact/");
  await setDesktop();
  await goto("/about/");
  const state = await navState();
  const contact = state.find((item) => item.href === "/contact");
  const target = linkCenter(contact);
  await mouseClick(target.x, target.y);
  const landed = await pollUntil(
    () => evaluate("location.pathname"),
    (pathname) => pathname.startsWith("/contact"),
    4000
  );
  check(String(landed).startsWith("/contact"), `click navigates to /contact/ [pathname ${landed}]`);
  let after = await pollUntil(navState, (s) => {
    const item = s.find((i) => i.href === "/contact");
    return item && item.active && item.bar.opacity > 0.99;
  }, 3000);
  check(after.find((i) => i.href === "/contact")?.active === true, "Contact link becomes active");
  check(after.find((i) => i.href === "/contact")?.bar.opacity > 0.99, "Contact bar visible after click with no gap");

  await mouseMove(720, 500);
  after = await pollUntil(navState, (s) => visibleBars(s).length === 1, 1500);
  const visible = visibleBars(after);
  check(visible.length === 1 && visible[0].href === "/contact",
    "after pointer exit only the new active bar remains");
  check((await strandedClasses()) === 0, "no interaction classes stranded after the click");
};

const checkMobile = async () => {
  section("mobile leakage at 390px");
  await setMobile();
  await goto("/projects/");
  const desktopHidden = await evaluate(
    `getComputedStyle(document.querySelector(".nav-desktop")).display`
  );
  check(desktopHidden === "none", "desktop navigation is display:none");
  const barRects = await evaluate(
    `[...document.querySelectorAll(".nav-link__bar")].filter((bar) => bar.getClientRects().length > 0).length`
  );
  check(barRects === 0, "no desktop patterned bar renders a box at mobile width");
  const footerVisible = await evaluate(`(() => {
    const footer = document.querySelector(".page-footer");
    if (!footer) return false;
    const style = getComputedStyle(footer);
    return style.display !== "none" && footer.getClientRects().length > 0;
  })()`);
  check(footerVisible, "shared footer is visible on mobile");

  await evaluate(`document.querySelector(".nav-mobile-toggle").click()`);
  const opened = await pollUntil(
    () => evaluate(`document.querySelector(".nav-mobile").classList.contains("is-open")`),
    (open) => open === true
  );
  check(opened === true, "menu opens");
  const openBarRects = await evaluate(
    `[...document.querySelectorAll(".nav-link__bar")].filter((bar) => bar.getClientRects().length > 0).length`
  );
  check(openBarRects === 0, "desktop bars stay absent while the menu is open");

  await evaluate(`[...document.querySelectorAll(".nav-mobile .nav-link")].find((a) => (a.getAttribute("href") || "").replace(/\\/$/, "") === "/about").click()`);
  const landed = await pollUntil(
    () => evaluate("location.pathname"),
    (pathname) => pathname.startsWith("/about"),
    4000
  );
  check(String(landed).startsWith("/about"), "tapping a row navigates immediately");
  const closed = await pollUntil(
    () => evaluate(`document.querySelector(".nav-mobile").classList.contains("is-open")`),
    (open) => open === false,
    1500
  );
  check(closed === false, "menu closes with the navigation, not on a delayed timer");
};

const checkReducedMotion = async () => {
  section("reduced motion");
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });
  await setDesktop();
  await goto("/about/");
  const state = await navState();
  const about = state.find((item) => item.href === "/about");
  check(about.bar.opacity > 0.99, "active bar still visible under reduced motion");
  const zeroed = state.every((item) => item.bar.transitionDuration.split(",").every((part) => parseFloat(part) === 0));
  check(zeroed, `bar transition durations are zero [${about.bar.transitionDuration}]`);
  const inactiveHidden = state.filter((item) => !item.active).every((item) => item.bar.opacity < 0.01);
  check(inactiveHidden, "inactive bars remain hidden under reduced motion");
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "" }] });
};

/* ---------- run ---------- */

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
    console.error("\nNavigation DOM check timed out after 180s.");
    process.exit(1);
  }, 180000);
  watchdog.unref();

  let server = null;
  if (externalOrigin) {
    origin = externalOrigin.replace(/\/$/, "");
  } else {
    server = await startServer();
    origin = `http://127.0.0.1:${server.address().port}`;
  }
  process.stdout.write(`Checking navigation against ${origin}\n`);

  const profileDir = mkdtempSync(join(tmpdir(), "nav-check-"));
  const { proc, port } = await launchChrome(chromeBin, profileDir);

  try {
    let pageTarget = null;
    for (let attempt = 0; attempt < 20 && !pageTarget; attempt++) {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      pageTarget = targets.find((target) => target.type === "page") ?? null;
      if (!pageTarget) await sleep(150);
    }
    if (!pageTarget) throw new Error("no page target exposed by Chrome");
    cdp = await Cdp.connect(pageTarget.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    await checkContainmentAndActive(1440);
    await checkContainmentAndActive(1024);
    await checkHover();
    await checkRapidSweep();
    await checkKeyboardFocus();
    await checkClickTransition();
    await checkMobile();
    await checkReducedMotion();
  } finally {
    try { proc.kill(); } catch { /* already gone */ }
    server?.close();
    try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* best effort */ }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} navigation check(s) failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log("\nNavigation DOM checks passed.");
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
