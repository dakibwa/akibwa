// Minimal offline shell. Network-first for navigations so room state is always
// live; cache is only a fallback when offline. Realtime traffic (/api) is never
// cached.
// Bump on any change to the cached shell (index.html, manifest, icons) so the
// activate handler evicts the previous caches instead of serving them.
const VERSION = "2026-07-29-robustness-v9";
const CACHE = `meditator-shell-${VERSION}`;
const ASSET_CACHE = `meditator-assets-${VERSION}`;
const CACHE_PREFIX = "meditator-";
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
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        SHELL.map(async (path) => {
          const response = await fetch(path, { cache: "reload" });
          if (response.ok) await cache.put(path, response);
        }),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) => k.startsWith(CACHE_PREFIX) && k !== CACHE && k !== ASSET_CACHE,
            )
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

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "reload" })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(prefixed("/"), copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((m) => m ?? caches.match(prefixed("/"))),
        ),
    );
    return;
  }

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
      .catch(() =>
        caches.match(request).then((m) => m ?? caches.match(prefixed("/"))),
      ),
  );
});
