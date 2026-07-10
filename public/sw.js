/*
 * Repeat-visit cache for GitHub Pages, which serves everything with a
 * 10-minute TTL. Hashed Next.js chunks are cached first-hit forever
 * (their names change when content changes); images and fonts are served
 * from cache and refreshed in the background. HTML is never touched, so
 * new deploys always reach returning visitors.
 */
const CACHE_NAME = "akibwa-static-v1";

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
  if (request.mode === "navigate" || request.destination === "document") return;

  if (url.pathname.startsWith(IMMUTABLE_PATH)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (ASSET_EXTENSIONS.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
