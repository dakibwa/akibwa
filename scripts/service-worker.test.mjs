import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

function worker({ names = [], cached, fetcher = async () => new Response("fresh"), write = async () => {}, unavailable = false } = {}) {
  const listeners = new Map();
  const kept = new Set(names);
  const deleted = [];
  const writes = [];
  const cache = {
    match: async () => cached?.clone(),
    put: async (request, response) => {
      await write();
      writes.push([request.url, await response.text()]);
    }
  };
  runInNewContext(source, {
    URL,
    fetch: fetcher,
    caches: {
      keys: async () => [...kept],
      delete: async (key) => { deleted.push(key); return kept.delete(key); },
      open: async (key) => {
        if (unavailable) throw new Error("Cache storage is unavailable");
        kept.add(key);
        return cache;
      }
    },
    self: {
      location: { origin: "https://akibwa.test" },
      clients: { claim: async () => {} },
      skipWaiting() {},
      addEventListener: (name, listener) => listeners.set(name, listener)
    }
  });
  const dispatch = (name, request) => {
    const waits = [];
    let response;
    listeners.get(name)({ request, waitUntil: (promise) => waits.push(promise), respondWith: (promise) => { response = promise; } });
    return { response, waits };
  };
  return { dispatch, deleted, kept, writes };
}

test("activation retires only Akibwa caches and preserves other apps and Trek tiles", async () => {
  const w = worker({ names: ["akibwa-static-v2", "akibwa-static-v3", "akibwa-static-v4", "features-offline", "trek-map-tiles-v1", "another-app"] });
  await Promise.all(w.dispatch("activate").waits);
  assert.deepEqual(w.deleted, ["akibwa-static-v2", "akibwa-static-v3"]);
  assert.deepEqual([...w.kept], ["akibwa-static-v4", "features-offline", "trek-map-tiles-v1", "another-app"]);
});

test("cached artwork responds immediately and holds the worker through refresh and disk write", async () => {
  const network = deferred();
  const disk = deferred();
  const w = worker({ cached: new Response("previous"), fetcher: () => network.promise, write: () => disk.promise });
  const event = w.dispatch("fetch", new Request("https://akibwa.test/album-art/cover.webp"));
  assert.equal(event.waits.length, 1, "the background task must extend the fetch event at dispatch");
  assert.equal(await (await event.response).text(), "previous");
  let finished = false;
  event.waits[0].then(() => { finished = true; });
  network.resolve(new Response("replacement"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(finished, false, "network completion alone cannot end the worker's lifetime");
  disk.resolve();
  await Promise.all(event.waits);
  assert.deepEqual(w.writes, [["https://akibwa.test/album-art/cover.webp", "replacement"]]);
});

test("artwork remains usable when its background refresh fails", async () => {
  const w = worker({ cached: new Response("previous"), fetcher: async () => { throw new Error("offline"); } });
  const event = w.dispatch("fetch", new Request("https://akibwa.test/cover.webp"));
  assert.equal(await (await event.response).text(), "previous");
  await Promise.all(event.waits);
});

test("an uncached offline image rejects instead of returning an invalid response", async () => {
  const w = worker({ fetcher: async () => { throw new Error("offline"); } });
  const event = w.dispatch("fetch", new Request("https://akibwa.test/cover.webp"));
  await assert.rejects(event.response, /offline/);
  await Promise.all(event.waits);
});

test("unavailable cache storage and failed writes do not block valid network responses", async () => {
  for (const options of [{ unavailable: true }, { write: async () => { throw new Error("quota"); } }]) {
    for (const path of ["/cover.webp", "/_next/static/chunk.js"]) {
      const w = worker(options);
      const event = w.dispatch("fetch", new Request(`https://akibwa.test${path}`));
      assert.equal(await (await event.response).text(), "fresh");
      await Promise.all(event.waits);
    }
  }
});

test("the worker leaves documents, data, other apps and foreign origins to their owners", () => {
  const w = worker();
  for (const url of ["https://akibwa.test/features/icon.png", "https://akibwa.test/onebagger/icon.png", "https://akibwa.test/music-ranking.json", "https://other.test/cover.webp"]) {
    assert.equal(w.dispatch("fetch", new Request(url)).response, undefined);
  }
  assert.equal(w.dispatch("fetch", { url: "https://akibwa.test/cover.svg", method: "GET", mode: "navigate", destination: "document" }).response, undefined);
  assert.equal(w.dispatch("fetch", new Request("https://akibwa.test/cover.webp", { method: "POST" })).response, undefined);
});
