/*
 * Tombstone for the retired Meditator app.
 *
 * Meditator shipped a service worker at this path, so every visitor who ever
 * opened akibwa.com/meditator/ still has one registered against this origin.
 * Deleting the app's files does not remove it: the registered worker keeps
 * serving its cached shell and intercepting fetches under /meditator/, so the
 * app looks alive while its backend Worker returns 404 — which is a worse
 * failure than a clean 404 would have been.
 *
 * This replacement claims the same scope, empties every cache it left behind
 * and unregisters itself. It can be deleted in a later release, once returning
 * visitors have had a chance to pick it up; removing it now would simply leave
 * the old worker in place.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) await caches.delete(name);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" })) {
        client.navigate(client.url);
      }
    })()
  );
});
