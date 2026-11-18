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
   - a slow answer: the kept page after PATIENCE, and the answer is still
     taken when it comes, so the next visit opens the new page;
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
  // the first visit's page usually still stands in the browser's own cache:
  // keeping it now opens the second visit without a download
  event.waitUntil(fetch(ROOT, { cache: 'only-if-cached', mode: 'same-origin' })
    .then(response => keep(response)).catch(() => {}));
});

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
  const request = event.request;
  let kept = null;
  try { kept = await (await caches.open(STORE)).match(ROOT) } catch {}
  const mine = kept && kept.headers.get(KEPT);
  // the kept page, noting which build it is for the page to ask (below)
  const keptPage = () => { remember(event.resultingClientId, mine); return kept };
  if (kept) {
    const asked = siteName();
    const name = await Promise.race([asked, new Promise(r => setTimeout(r, PATIENCE, 'slow'))]);
    if (name === mine || name === 'offline') return keptPage();
    if (name === 'slow') {
      event.waitUntil(asked.then(late => late !== mine && /^[0-9a-f]{16}$/.test(late)
        ? fetch(ROOT, { cache: 'no-store' }).then(response => keep(response, late)) : null).catch(() => {}));
      return keptPage();
    }
  }
  let response;
  try { response = await fetch(request) }
  catch (error) { if (kept) return keptPage(); throw error }
  // the site itself failing is no reason to show an error page over a kept game
  if (kept && response.status >= 500) return keptPage();
  event.waitUntil(keep(response.clone()).catch(() => {}));
  return response;
}

/* which build each page was given from the kept copy, by the page's client id.
   That copy is older than the one build.txt names when the site was slow or
   out of reach, and the page takes its first answer from build.txt as its own
   build (checkFresh in index.html), so a tab opened on an older copy would
   never learn it is behind and never swap. The page asks here first
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
  try {
    const response = await fetch(STAMP + '?sw=' + Date.now().toString(36), { cache: 'no-store', credentials: 'omit' });
    if (!response.ok) { response.body?.cancel().catch(() => {}); return null }
    const text = (await response.text()).trim();
    return /^[0-9a-f]{16}$/.test(text) ? text : null;
  } catch { return 'offline' }
}

async function keep(response, name) {
  if (!response || response.status !== 200 || response.type !== 'basic' || response.redirected) return;
  if (!/^text\/html/i.test(response.headers.get('content-type') || '')) return;
  const body = await response.arrayBuffer();
  if (name === undefined) name = await siteName();
  if (!/^[0-9a-f]{16}$/.test(name || '') || await bytesName(body) !== name) return;
  const headers = new Headers(response.headers);
  // the body is kept decoded, so it must not claim an encoding or a length
  headers.delete('content-encoding'); headers.delete('content-length');
  headers.set(KEPT, name);
  await (await caches.open(STORE)).put(ROOT, new Response(body, { status: 200, statusText: 'OK', headers }));
}

// tools/build-stamp.mjs: the first sixteen hex digits of the bytes' SHA-256
async function bytesName(body) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', body));
  return [...digest.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}
