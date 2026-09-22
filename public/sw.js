/*
 * Repeat-visit cache. The host revalidates artwork on every request, so this
 * serves images and fonts from cache and refreshes them in the background.
 * Hashed Next.js chunks are cached first-hit forever (their names change when
 * content changes). HTML is never touched, so new deploys always reach
 * returning visitors.
 */
/* Bump the version whenever committed artwork is replaced in place — same
   URLs, new pixels — or removed. Activation purges the old cache, so returning
   visitors get the new art on their next load instead of one visit behind.
   v3: the album archive, wall and old project artwork were deleted. */
const CACHE_NAME = "akibwa-static-v3";

/* Other apps share this origin and own their own caching. */
const FOREIGN_PATHS = ["/features/", "/onebagger/"];

const IMMUTABLE_PATH = "/_next/static/";
const ASSET_EXTENSIONS = /\.(?:webp|avif|jpg|jpeg|png|gif|svg|ico|woff2?)$/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (FOREIGN_PATHS.some((path) => url.pathname.startsWith(path))) return;
  if (request.mode === "navigate" || request.destination === "document") return;

  if (url.pathname.startsWith(IMMUTABLE_PATH)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (ASSET_EXTENSIONS.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
