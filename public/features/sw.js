/* ---- the game's page, kept for the next visit ---- (18 Nov 2026)

   features.games sends its page with no ETag or Last-Modified (Cloudflare's
   static assets leave both off HTML), so a browser cannot ask whether the
   page has changed and downloads all of it again on every visit: about
   290 KB, a second and a half for a phone on a slow mobile connection.

   This worker keeps the last page it was given and asks the site's
   build.txt instead, the 17-byte name of the page the site serves now
   (tools/build-stamp.mjs):

   - the same name: the kept page, with nothing downloaded;
   - another name: the page from the network, kept once its bytes hash to
     that name, so a half-finished deploy or an altered copy is never kept;
   - no connection: the kept page, so the game opens offline and plays the
     boards it already downloaded;
   - a slow build name or page: the kept page after PATIENCE, and the same
     download carries on, so the next visit opens the validated new page;
   - any other answer (a missing or strange build.txt, an error): the
     network, as if there were no worker.

   A page given the kept copy can ask which build it is (keptBuild in
   index.html), so a tab opened on an older copy still swaps for the new one.

   It answers only the page's own address, with any query. Every other
   request (the account service, build.txt itself, the side pages, Stripe)
   goes to the network untouched. index.html registers it on features.games
   alone (keepPageForNextVisit).

   To retire it, publish in its place a worker whose activate deletes the
   STORE cache and calls self.registration.unregister(): each browser takes
   it on its next visit. */

const STORE = 'features-page-v1';
const ROOT = new URL('./', self.location.href).href;
const STAMP = new URL('build.txt', ROOT).href;
// the name of the kept page's bytes rides in a header of the kept copy
const KEPT = 'x-features-build';
const PATIENCE = 2500;
const FETCH_LIMIT = 60000;
let pageOrder = 0, lastKeptOrder = 0, cacheWrite = Promise.resolve();

self.addEventListener('install', event => {
  self.skipWaiting();
  /* where the browser routes requests itself (Chrome's static routing), all
     but a visit to a page go straight to the network without waking this
     worker, so the account service never waits on it starting; elsewhere
     the fetch handler below lets them pass */
  const route = rules => { try { return Promise.resolve(event.addRoutes(rules)) } catch (error) { return Promise.reject(error) } };
  if (typeof event.addRoutes === 'function') event.waitUntil(
    route([{ condition: { not: { requestMode: 'navigate' } }, source: 'network' }])
      .catch(() => route([{ condition: { urlPattern: new URLPattern({ pathname: '/features/*' }) }, source: 'network' }]))
      .catch(() => {}));
  event.waitUntil(keepFirstPage().catch(() => {}));
});

async function keepFirstPage() {
  const order = ++pageOrder;
  const name = await siteName();
  if (!/^[0-9a-f]{16}$/.test(name)) return;
  const kept = await (await caches.open(STORE)).match(ROOT);
  if (kept?.headers.get(KEPT) === name) return;
  const fromBrowser = async url => {
    const cached = await fetch(url, { cache: 'only-if-cached', mode: 'same-origin', redirect: 'error' }).catch(() => null);
    return keep(cached, name, order);
  };
  if (await fromBrowser(ROOT)) return;
  // A shared link can leave just its query URL in the HTTP cache. Try one
  // recent game window. Its query is never sent or used as a storage key.
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }).catch(() => []);
  const linked = windows.slice(0, 4).find(client => client.url.startsWith(ROOT + '?'));
  if (linked && await fromBrowser(linked.url)) return;
  const fresh = await fetch(ROOT, { cache: 'no-store', credentials: 'omit', redirect: 'error' });
  await keep(fresh, name, order);
}

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('features-page-') && k !== STORE).map(k => caches.delete(k))))
    .catch(() => {}));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.mode !== 'navigate' || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname !== new URL(ROOT).pathname) return;
  event.respondWith(page(event).catch(() => fetch(request)));
});

async function page(event) {
  const request = event.request, order = ++pageOrder;
  let kept = null;
  try { kept = await (await caches.open(STORE)).match(ROOT) } catch {}
  const mine = kept && kept.headers.get(KEPT);
  // the kept page, noting which build it is for the page to ask (below)
  const keptPage = () => { remember(event.resultingClientId, mine); return kept };
  const incoming = (async () => {
    let name;
    if (kept) {
      name = await siteName();
      if (name === mine || name === 'offline') return null;
      try { return await downloadPage(request, name ?? undefined, order) }
      catch { return null }
    }
    const response = await fetch(request);
    event.waitUntil(keep(response.clone(), undefined, order).catch(() => {}));
    return { response };
  })();
  if (!kept) return (await incoming).response;
  /* One deadline covers the build name and the whole document. Keep
     that same request alive after falling back, including its cache write. */
  event.waitUntil(incoming.catch(() => {}));
  let timer;
  try {
    const delivered = await Promise.race([incoming, new Promise(resolve => {
      timer = setTimeout(resolve, PATIENCE, null);
    })]);
    if (!delivered) return keptPage();
    if (delivered.build) remember(event.resultingClientId, delivered.build);
    return delivered.response;
  } finally { clearTimeout(timer) }
}

/* Read the whole document before offering it over a playable copy, so
   headers alone cannot open a blank game. Each navigation keeps its own
   request and response. Bound a stalled download so it can be retried. */
async function downloadPage(request, name, order) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), FETCH_LIMIT);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.status >= 500) { response.body?.cancel().catch(() => {}); return null }
    const body = await response.clone().arrayBuffer();
    const build = await keep(response, name, order, body).catch(() => null);
    // WebKit can finish a broken stream with short bytes instead of an
    // error. A claimed game update that fails its hash is still a failed download.
    if (name && build === false) return null;
    return { response, build };
  } finally { clearTimeout(timer) }
}

/* which verified build each page was given, by the page's client id. A kept
   copy or a download another release overtook can be older than build.txt.
   The page takes its first answer from build.txt as its own build
   (checkFresh in index.html), so that older tab would never learn it is
   behind and never swap. The page asks here first
   (keptBuild). Kept in memory alone: a worker stopped since remembers
   nothing, and the page then goes by build.txt, as it does with no worker. */
const served = new Map();
function remember(client, name) {
  if (!client || !name) return;
  served.set(client, name);
  if (served.size > 32) served.delete(served.keys().next().value);
}
self.addEventListener('message', event => {
  if (event.data !== 'features-build?' || !event.ports || !event.ports[0]) return;
  event.ports[0].postMessage((event.source && served.get(event.source.id)) || null);
});

/* the site's name for the page it serves now: sixteen hex digits, 'offline'
   when no answer could come at all, or null for an answer that names nothing */
async function siteName() {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), FETCH_LIMIT);
  try {
    const response = await fetch(STAMP + '?sw=' + Date.now().toString(36), { cache: 'no-store', credentials: 'omit', signal: controller.signal });
    if (!response.ok) { response.body?.cancel().catch(() => {}); return null }
    const text = (await response.text()).trim();
    return /^[0-9a-f]{16}$/.test(text) ? text : null;
  } catch { return 'offline' }
  finally { clearTimeout(timer) }
}

async function keep(response, name, order, downloaded) {
  if (!response || response.status !== 200 || response.type !== 'basic' || response.redirected) return;
  if (!/^text\/html/i.test(response.headers.get('content-type') || '')) return;
  const body = downloaded ?? await response.arrayBuffer();
  if (name === undefined) name = await siteName();
  if (!/^[0-9a-f]{16}$/.test(name || '')) return;
  if (await bytesName(body) !== name) return false;
  const headers = new Headers(response.headers);
  // the body is kept decoded, so it must not claim an encoding or a length
  headers.delete('content-encoding'); headers.delete('content-length');
  headers.set(KEPT, name);
  // A tab whose older download finishes last must not roll another tab's
  // completed update back. Serialize writes as well as comparing their order.
  cacheWrite = cacheWrite.catch(() => {}).then(async () => {
    if (order < lastKeptOrder) return;
    await (await caches.open(STORE)).put(ROOT, new Response(body, { status: 200, statusText: 'OK', headers }));
    lastKeptOrder = order;
  });
  // A storage refusal still leaves a complete, verified page to open.
  await cacheWrite.catch(() => {});
  return name;
}

// tools/build-stamp.mjs: the first sixteen hex digits of the bytes' SHA-256
async function bytesName(body) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', body));
  return [...digest.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}
