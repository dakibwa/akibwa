import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { waitForHostedExport } from "./hosting-readiness.mjs";
import { assertRobotsBytes } from "./hosting-robots.mjs";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const origin = new URL(process.argv[2] || process.env.CHECK_HOST_URL || "http://localhost:8787");
const preview = origin.hostname.endsWith(".workers.dev");
const hash = (body) => createHash("sha256").update(body).digest("hex");
const headers = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "SAMEORIGIN",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  "cross-origin-opener-policy": "same-origin-allow-popups",
  "access-control-allow-origin": null,
};

async function request(path, options = {}) {
  return fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(15000), ...options });
}

function checkRevalidation(response, path) {
  const policy = response.headers.get("cache-control") || "";
  assert.match(policy, /(?:^|,)\s*max-age=0(?:,|$)/, `${path} must revalidate before reuse`);
  assert.match(policy, /(?:^|,)\s*must-revalidate(?:,|$)/, `${path} must not serve stale bytes`);
  assert.doesNotMatch(policy, /immutable/, `${path} must remain replaceable`);
}

// .assetsignore leaves the game's old /features/ copy out of this upload; it is
// features-site's own export and is checked by check-features-hosting.mjs.
async function inventory(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && relative(root, path) === "features") continue;
    if (entry.isDirectory()) files.push(...await inventory(path));
    else files.push({ path: relative(root, path), bytes: (await stat(path)).size });
  }
  return files;
}

const files = await inventory(root);
assert.ok(files.length <= 20000, "export exceeds the Workers Free asset count");
assert.ok(files.every((file) => file.bytes <= 25 * 1024 * 1024), "export contains an asset larger than 25 MiB");

const homepage = await readFile(join(root, "index.html"));
const readyHome = await waitForHostedExport(origin, hash(homepage));
const homeResponse = readyHome.response;
assert.equal(homeResponse.status, 200, "the shelf must remain available");
assert.match(homeResponse.headers.get("content-type") || "", /text\/html/, "homepage MIME type");
checkRevalidation(homeResponse, "/");
assert.equal(hash(readyHome.body), hash(homepage), "the homepage must serve the exact exported HTML");
for (const [name, value] of Object.entries(headers)) assert.equal(homeResponse.headers.get(name), value, `/ ${name}`);
if (preview) assert.equal(homeResponse.headers.get("x-robots-tag"), "noindex", "preview must not be indexed");

const retired = [
  "/trek", "/trek/", "/trek/route-detail.json", "/albums/", "/projects/cover-collision/", "/personal/",
  "/about/", "/contact", "/offer/", "/professional/", "/systems/", "/work/", "/concept/",
  "/onebagger/", "/probe/", "/portugal", "/portugal/", "/meditator/", "/features", "/features/",
  "/features/legal.html", "/features/api/health", "/features/api/me", "/life-map/", "/hosting-check-missing-page/"
];
await Promise.all(retired.map(async (path) => {
  const response = await request(path);
  assert.equal(response.status, 404, `${path} must return 404`);
  assert.equal(response.headers.get("location"), null, `${path} must have no redirect`);
  assert.match(response.headers.get("content-type") || "", /text\/html/, `${path} must serve an HTML error page`);
  assert.match(await response.text(), /Nothing here/, `${path} must use the site's 404 page`);
}));

const canonical = await fetch("https://www.akibwa.com/favicon.svg?hosting-check=canonical", {
  redirect: "manual", signal: AbortSignal.timeout(15000),
});
assert.equal(canonical.status, 301, "www must permanently redirect to the apex");
assert.equal(canonical.headers.get("location"), "https://akibwa.com/favicon.svg?hosting-check=canonical",
  "www redirect must preserve the path and query string");

const samples = [
  files.find((file) => file.path.startsWith("_next/static/") && file.path.endsWith(".css"))?.path,
  files.find((file) => file.path.startsWith("_next/static/") && file.path.endsWith(".js"))?.path,
  files.find((file) => file.path.startsWith("album-art/") && file.path.endsWith(".avif"))?.path,
  "favicon.svg", "favicon.ico", "apple-touch-icon.png", "meditator/sw.js", "sw.js", "robots.txt", "sitemap.xml",
];
for (const path of samples) {
  assert.ok(path, "representative generated asset exists");
  const expected = await readFile(join(root, path));
  // Cloudflare may prepend its managed robots block; that path keeps its
  // dedicated validator. Every exact-byte asset waits for its own version.
  const ready = path === "robots.txt" ? null : await waitForHostedExport(origin, hash(expected), {path: `/${path}`});
  const response = ready?.response || await request(`/${path}`);
  assert.equal(response.status, 200, `${path} must remain available`);
  const actual = ready?.body || Buffer.from(await response.arrayBuffer());
  if (path === "robots.txt") assertRobotsBytes(actual, expected, { managed: origin.origin === "https://akibwa.com" });
  else assert.equal(hash(actual), hash(expected), `${path} bytes`);
  if (path.startsWith("_next/static/")) assert.match(response.headers.get("cache-control") || "", /max-age=31536000.*immutable/, "fingerprinted assets are immutable");
  else checkRevalidation(response, path);
}

const health = await fetch("https://features.games/features/api/health", { signal: AbortSignal.timeout(15000) });
assert.equal(health.status, 200, "production Features API remains available");
assert.match(health.headers.get("cache-control") || "", /no-store/, "API responses must not enter the static cache");
assert.equal((await health.json()).ok, true, "production Features API health");

console.log(`hosting checks passed: homepage, ${samples.length} assets, ${retired.length} missing paths, canonical host and production game API; ${files.length} uploaded files`);
