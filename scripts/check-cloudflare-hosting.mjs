import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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

async function inventory(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await inventory(path));
    else files.push({ path: relative(root, path), bytes: (await stat(path)).size });
  }
  return files;
}

const files = await inventory(root);
assert.ok(files.length <= 20000, "export exceeds the Workers Free asset count");
assert.ok(files.every((file) => file.bytes <= 25 * 1024 * 1024), "export contains an asset larger than 25 MiB");

const pages = ["", "albums", "features", "trek", "probe", "meditator", "portugal", "offer", "personal", "projects"];
for (const page of pages) {
  const path = page ? `/${page}/` : "/";
  const response = await request(path);
  assert.equal(response.status, 200, `${path} must remain available`);
  assert.match(response.headers.get("content-type") || "", /text\/html/, `${path} MIME type`);
  checkRevalidation(response, path);
  assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(await readFile(join(root, page, "index.html"))), `${path} must serve the exact exported HTML`);
  for (const [name, value] of Object.entries(headers)) assert.equal(response.headers.get(name), value, `${path} ${name}`);
  if (preview) assert.equal(response.headers.get("x-robots-tag"), "noindex", "preview must not be indexed");
}

const features = await readFile(join(root, "features/index.html"), "utf8");
assert.match(features, /<meta name="features-native-bridge" content="2">/, "keep the native-compatible game");
const policy = features.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] || "";
assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/, "published game must keep its hardened script policy");
for (const [, script] of features.matchAll(/<script(?![^>]*\ssrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)) {
  assert.ok(policy.includes(`'sha256-${createHash("sha256").update(script).digest("base64")}'`), "each game script must match its CSP hash");
}

const gameRedirect = await request("/features");
assert.equal(gameRedirect.status, 301, "keep the established game redirect");
assert.equal(new URL(gameRedirect.headers.get("location"), origin).pathname, "/features/");
const gameAlias = await request("/features/index.html", { redirect: "follow" });
assert.equal(gameAlias.status, 200, "existing index.html links must still reach the game");
assert.equal(hash(Buffer.from(await gameAlias.arrayBuffer())), hash(features));

for (const path of ["/life-map/", "/hosting-check-missing-page/"]) {
  const response = await request(path);
  assert.equal(response.status, 404, `${path} must not fall back to the homepage`);
  assert.match(response.headers.get("content-type") || "", /text\/html/, "use the exported 404 page");
}

const samples = [
  files.find((file) => file.path.startsWith("_next/static/") && file.path.endsWith(".css"))?.path,
  files.find((file) => file.path.startsWith("_next/static/") && file.path.endsWith(".js"))?.path,
  files.find((file) => file.path.startsWith("_img/") && file.path.endsWith(".avif"))?.path,
  "features/manifest.webmanifest", "features/icon-192.png", "trek/route-detail.json", "meditator/sw.js", "sw.js", "robots.txt", "sitemap.xml",
];
for (const path of samples) {
  assert.ok(path, "representative generated asset exists");
  const response = await request(`/${path}`);
  assert.equal(response.status, 200, `${path} must remain available`);
  assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(await readFile(join(root, path))), `${path} bytes`);
  if (path.startsWith("_next/static/")) assert.match(response.headers.get("cache-control") || "", /max-age=31536000.*immutable/, "fingerprinted assets are immutable");
  else checkRevalidation(response, path);
}

// A workers.dev preview has no production zone route and must not become a
// second authenticated API origin. The existing production route is checked
// directly; its account/database/provider configuration belongs to Features.
if (preview || origin.hostname === "localhost") {
  assert.equal((await request("/features/api/health")).status, 404, "preview must not proxy production sessions");
}
const health = await fetch("https://akibwa.com/features/api/health", { signal: AbortSignal.timeout(15000) });
assert.equal(health.status, 200, "production Features API remains available");
assert.match(health.headers.get("cache-control") || "", /no-store/, "API responses must not enter the static cache");
assert.equal((await health.json()).ok, true, "production Features API health");

console.log(`hosting checks passed: ${pages.length} pages, ${samples.length} assets, real 404s, redirects, CSP and production API; ${files.length} exported files; Features SHA256 ${hash(features)}`);
