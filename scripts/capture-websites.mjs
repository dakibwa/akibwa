/*
 * Screenshots for the homepage's Websites room.
 *
 * Each live site is opened in headless Chrome at 1280×800. Single-screen sites
 * are captured as that first screen (slot `websiteScreen`); long pages marked
 * `tall` are captured from the top to 2000px (slot `websiteLong`), the frame
 * the room pans through on hover. Originals are saved losslessly under
 * public/project-art/websites/; rerun `npm run images:generate` afterwards.
 *
 *   node scripts/capture-websites.mjs            capture every site
 *   node scripts/capture-websites.mjs top-250
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { websites } from "../data/websites.mjs";

const WIDTH = 1280;
const VIEWPORT = 800;
const TALL = 2000;
const outDir = fileURLToPath(new URL("../public/project-art/websites/", import.meta.url));
const only = process.argv.slice(2);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chromeBin = process.env.CHROME_BIN ?? [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
].find(existsSync) ?? execSync("command -v google-chrome || command -v chromium", { encoding: "utf8" }).trim();

const profile = mkdtempSync(join(tmpdir(), "akibwa-capture-"));
const chrome = spawn(chromeBin, [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader",
  `--window-size=${WIDTH},${VIEWPORT}`, "about:blank"
], { stdio: ["ignore", "ignore", "pipe"] });

const port = await new Promise((resolve, reject) => {
  let log = "";
  chrome.stderr.on("data", (chunk) => {
    log += chunk;
    const match = log.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
    if (match) resolve(Number(match[1]));
  });
  chrome.on("exit", () => reject(new Error(`Chrome exited early:\n${log}`)));
});

const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let nextId = 1;
const pending = new Map();
const listeners = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  } else if (message.method) {
    for (const listener of listeners) listener(message);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const loaded = () => new Promise((resolve) => {
  const listener = (message) => {
    if (message.method !== "Page.loadEventFired") return;
    listeners.splice(listeners.indexOf(listener), 1);
    resolve();
  };
  listeners.push(listener);
});

try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: VIEWPORT, deviceScaleFactor: 1, mobile: false });
  mkdirSync(outDir, { recursive: true });
  for (const site of websites) {
    if (only.length && !only.includes(site.id)) continue;
    if (site.art) {
      console.log(`skip ${site.id}: uses its approved illustration`);
      continue;
    }
    const done = loaded();
    await send("Page.navigate", { url: site.capture ?? site.href });
    await Promise.race([done, sleep(20000)]);
    // Let entrance animations, fonts and lazy images settle.
    await sleep(site.settle ?? 3500);
    await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
    const { data } = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: Boolean(site.tall),
      clip: { x: 0, y: 0, width: WIDTH, height: site.tall ? TALL : VIEWPORT, scale: 1 }
    });
    const file = join(outDir, `${site.id}.webp`);
    await sharp(Buffer.from(data, "base64")).webp({ lossless: true, effort: 6 }).toFile(file);
    console.log(`captured ${site.id} → ${file}`);
  }
} finally {
  socket.close();
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
// Chrome's pipes can hold the event loop open after it is killed.
process.exit(0);
