// Minimal offline shell. Network-first for navigations so room state is always
// live; cache is only a fallback when offline. Realtime traffic (/api) is never
// cached.
const CACHE = "meditator-shell-v2";
const ASSET_CACHE = "meditator-assets-v1";
const CANONICAL_BASE = "/meditator";
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const BASE = SCOPE_PATH === "/" ? "" : SCOPE_PATH;
const prefixed = (path) => `${BASE}${path}`;
const canonical = (path) => `${CANONICAL_BASE}${path}`;
const SHELL = [
  prefixed("/"),
  prefixed("/icon.svg"),
  prefixed("/manifest.webmanifest"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const isApi =
    url.pathname.startsWith(prefixed("/api/")) ||
    url.pathname.startsWith(canonical("/api/")) ||
    url.pathname.startsWith("/api/");
  if (request.method !== "GET" || isApi) return;

  const isAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith(prefixed("/assets/")) ||
      url.pathname.startsWith(canonical("/assets/")) ||
      url.pathname.startsWith("/assets/"));
  if (isAsset) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (request.mode === "navigate") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(prefixed("/"), copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((m) => m ?? caches.match(prefixed("/"))),
      ),
  );
});
