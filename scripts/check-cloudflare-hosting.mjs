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

const pages = ["", "trek", "meditator"];
for (const page of pages) {
  const path = page ? `/${page}/` : "/";
  const expected = await readFile(join(root, page, "index.html"));
  const ready = await waitForHostedExport(origin, hash(expected), { path });
  const response = ready.response;
  assert.equal(response.status, 200, `${path} must remain available`);
  assert.match(response.headers.get("content-type") || "", /text\/html/, `${path} MIME type`);
  checkRevalidation(response, path);
  assert.equal(hash(ready.body), hash(expected), `${path} must serve the exact exported HTML`);
  for (const [name, value] of Object.entries(headers)) assert.equal(response.headers.get(name), value, `${path} ${name}`);
  if (preview) assert.equal(response.headers.get("x-robots-tag"), "noindex", "preview must not be indexed");
}

// The game's old address was retired on 12 November 2026: every path under
// /features moves to the same path on features.games, with its query string.
const moved = "?hosting-check=moved";
for (const [path, target] of [
  ["/features", "https://features.games/"],
  ["/features/", "https://features.games/"],
  ["/features/legal.html", "https://features.games/legal.html"],
]) {
  const response = await request(path + moved);
  assert.equal(response.status, 301, `${path} must permanently redirect to features.games`);
  assert.equal(response.headers.get("location"), target + moved, `${path} redirect target`);
}
// Retired pages are deleted; their old links redirect at the edge.
for (const [path, target] of [
  ["/albums/", "/"], ["/projects/cover-collision/", "/"], ["/personal/", "/"], ["/about/", "/"],
  ["/probe/", "https://features.games/"], ["/portugal/", "https://portuguesewithines.com/"],
]) {
  const response = await request(path);
  assert.equal(response.status, 301, `${path} must permanently redirect`);
  assert.equal(new URL(response.headers.get("location"), origin).href, new URL(target, origin).href, `${path} redirect target`);
}

const canonical = await fetch("https://www.akibwa.com/trek/?hosting-check=canonical", {
  redirect: "manual", signal: AbortSignal.timeout(15000),
});
assert.equal(canonical.status, 301, "www must permanently redirect to the apex");
assert.equal(canonical.headers.get("location"), "https://akibwa.com/trek/?hosting-check=canonical",
  "www redirect must preserve the path and query string");

for (const path of ["/life-map/", "/hosting-check-missing-page/"]) {
  const response = await request(path);
  assert.equal(response.status, 404, `${path} must not fall back to the homepage`);
  assert.match(response.headers.get("content-type") || "", /text\/html/, "use the exported 404 page");
}

const samples = [
  files.find((file) => file.path.startsWith("_next/static/") && file.path.endsWith(".css"))?.path,
  files.find((file) => file.path.startsWith("_next/static/") && file.path.endsWith(".js"))?.path,
  files.find((file) => file.path.startsWith("_img/") && file.path.endsWith(".avif"))?.path,
  "trek/route-detail.json", "meditator/sw.js", "sw.js", "robots.txt", "sitemap.xml",
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

// Features owns its API at features.games. The static site never answers for
// it: on a workers.dev preview its old path is only the redirect above.
if (preview || origin.hostname === "localhost") {
  assert.equal((await request("/features/api/health")).status, 301, "preview must not proxy production sessions");
}
const health = await fetch("https://features.games/features/api/health", { signal: AbortSignal.timeout(15000) });
assert.equal(health.status, 200, "production Features API remains available");
assert.match(health.headers.get("cache-control") || "", /no-store/, "API responses must not enter the static cache");
assert.equal((await health.json()).ok, true, "production Features API health");

console.log(`hosting checks passed: ${pages.length} pages, ${samples.length} assets, real 404s, retired-page and features.games redirects, production API; ${files.length} uploaded files`);
