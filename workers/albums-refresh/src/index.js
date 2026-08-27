/*
 * Akibwa album wall — play counts.
 *
 * The wall itself is static: 1,645 albums — the 249 sleeves Dan had printed as
 * cards, plus everything else he has played — all shipped with the site. Only
 * the play counts move, so this Worker exists to keep those current without an
 * hourly commit to a public repo.
 *
 * The join is deliberately dumb. Every hour it pulls the full overall
 * `user.gettopalbums` library, sums its rows per normalised key, and looks each
 * sleeve up by that key. It does no fuzzy matching and no `album.getinfo`
 * fallback, because the hard matching already happened at build time:
 * scripts/refresh-album-plays.mjs
 * resolves each sleeve against Last.fm and bakes **Last.fm's own spelling** into
 * the manifest. So a sleeve that reads "MF DOOM — Mm..Food" locally is stored
 * under whatever Last.fm calls it, and the exact key hits from then on — even
 * for records with zero plays today that Dan starts playing next week.
 *
 * Served payload is one integer per album, about 25KB. The site ships a baked
 * copy of the same shape and falls back to it, so the wall is never blank and
 * never blocks on this Worker.
 */
import { normaliseKey } from "../../../lib/album-key.mjs";

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";
const KV_KEY = "albums:v1";
const PAGE_SIZE = 500;
const MAX_PAGES = 12;
const CACHE_SECONDS = 600;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": `public, max-age=${CACHE_SECONDS}`
};


async function fetchLastfm(env, method, params = {}) {
  if (!env.LASTFM_API_KEY) throw new Error("LASTFM_API_KEY is not configured.");
  const url = new URL(LASTFM_API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", env.LASTFM_API_KEY);
  url.searchParams.set("user", env.LASTFM_USERNAME || "akibwa");
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const response = await fetch(url, { cf: { cacheTtl: 0 } });
  if (!response.ok) throw new Error(`Last.fm ${method} returned ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`Last.fm ${method}: ${payload.message}`);
  return payload;
}

async function fetchLibrary(env) {
  const library = new Map();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await fetchLastfm(env, "user.gettopalbums", {
      period: "overall",
      limit: PAGE_SIZE,
      page
    });
    const albums = payload.topalbums?.album ?? [];
    for (const album of albums) {
      // Editions of one record are separate rows and are added together, not
      // overwritten — see lib/album-key.mjs for why this matters to the ranking.
      const key = normaliseKey(album.artist?.name, album.name);
      library.set(key, (library.get(key) ?? 0) + (Number(album.playcount) || 0));
    }
    const totalPages = Number(payload.topalbums?.["@attr"]?.totalPages ?? 1);
    if (page >= totalPages) break;
  }
  return library;
}

async function refresh(env) {
  const manifestUrl = env.MANIFEST_URL;
  if (!manifestUrl) throw new Error("MANIFEST_URL is not configured.");

  const manifestResponse = await fetch(manifestUrl, { cf: { cacheTtl: 0 } });
  if (!manifestResponse.ok) throw new Error(`Manifest returned ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();

  const [library, profile] = await Promise.all([fetchLibrary(env), fetchLastfm(env, "user.getinfo")]);

  const plays = {};
  let matched = 0;
  for (const entry of manifest.sleeves ?? []) {
    // A sleeve with no key was never identified, so it has nothing to look up.
    // It stays absent rather than reading a misleading zero.
    if (!entry.key) continue;
    const count = library.get(entry.key);
    if (count === undefined) {
      plays[entry.id] = 0;
    } else {
      plays[entry.id] = count;
      matched += 1;
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Last.fm",
    username: profile.user?.name || env.LASTFM_USERNAME || "akibwa",
    scrobblingSince: profile.user?.registered?.unixtime
      ? new Date(Number(profile.user.registered.unixtime) * 1000).toISOString().slice(0, 10)
      : null,
    totalScrobbles: Number(profile.user?.playcount) || 0,
    librarySize: library.size,
    sleeveCount: Object.keys(plays).length,
    playedCount: matched,
    plays
  };

  await env.ALBUMS_KV.put(KV_KEY, JSON.stringify(payload));
  return payload;
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      refresh(env).catch(async (error) => {
        await env.ALBUMS_KV.put(
          "albums:last-error",
          JSON.stringify({ at: new Date().toISOString(), message: String(error?.message || error) })
        );
      })
    );
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "authorization, content-type"
        }
      });
    }

    if (url.pathname === "/albums") {
      const stored = await env.ALBUMS_KV.get(KV_KEY);
      if (!stored) return new Response(JSON.stringify({ error: "no data yet" }), { status: 503, headers: JSON_HEADERS });
      return new Response(stored, { headers: JSON_HEADERS });
    }

    if (url.pathname === "/status") {
      const [stored, lastError] = await Promise.all([
        env.ALBUMS_KV.get(KV_KEY),
        env.ALBUMS_KV.get("albums:last-error")
      ]);
      const parsed = stored ? JSON.parse(stored) : null;
      return new Response(
        JSON.stringify({
          ok: Boolean(parsed),
          generatedAt: parsed?.generatedAt ?? null,
          sleeveCount: parsed?.sleeveCount ?? 0,
          playedCount: parsed?.playedCount ?? 0,
          totalScrobbles: parsed?.totalScrobbles ?? 0,
          lastError: lastError ? JSON.parse(lastError) : null
        }),
        { headers: { ...JSON_HEADERS, "cache-control": "no-store" } }
      );
    }

    if (url.pathname === "/refresh" && request.method === "POST") {
      const auth = request.headers.get("authorization") || "";
      if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSON_HEADERS });
      }
      try {
        const payload = await refresh(env);
        return new Response(JSON.stringify({ ok: true, ...payload, plays: undefined }), {
          headers: { ...JSON_HEADERS, "cache-control": "no-store" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: String(error?.message || error) }), {
          status: 500,
          headers: { ...JSON_HEADERS, "cache-control": "no-store" }
        });
      }
    }

    return new Response("Not found", { status: 404 });
  }
};
