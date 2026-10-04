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
const CACHE_NAME = "akibwa-static-v4";
const CACHE_PREFIX = "akibwa-static-";

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
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME).catch(() => null);
  const cached = await cache?.match(request).catch(() => null);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache?.put(request, response.clone()).catch(() => {});
  return response;
}

function staleWhileRevalidate(request) {
  const opened = caches.open(CACHE_NAME).catch(() => null);
  const cached = opened.then((cache) => cache?.match(request).catch(() => null));
  const refresh = fetch(request)
    .then(async (response) => {
      const cache = await opened;
      if (response.ok) await cache?.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(async (error) => {
      const previous = await cached;
      if (previous) return previous;
      throw error;
    });

  return {
    response: cached.then((previous) => previous || refresh),
    refreshed: refresh.then(() => {}, () => {})
  };
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
    const task = staleWhileRevalidate(request);
    event.respondWith(task.response);
    // Keep the worker alive until the network refresh AND cache write finish,
    // even when the cached response has already reached the page.
    event.waitUntil(task.refreshed);
  }
});
