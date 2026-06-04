const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";
const USER_AGENT = "akibwa-chorus-cloudflare/1";

const PUBLIC_DATA_KEY = "chorus-data";
const STATUS_KEY = "refresh-status";
const PLACEHOLDER_IMAGE_HASHES = [
  "2a96cbd8b46e442fc41c2b86b821562f",
  "c6f59c1e5e7240a4c0d427abd71f3dbb"
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/chorus" || url.pathname === "/chorus-data.json") {
      const data = await readPublicData(env);
      return jsonResponse(data, 200, {
        "Cache-Control": "public, max-age=60, s-maxage=180"
      });
    }

    if (url.pathname === "/status") {
      return jsonResponse((await env.CHORUS_KV.get(STATUS_KEY, "json")) || { ok: false, status: "not refreshed yet" });
    }

    if (url.pathname === "/refresh") {
      if (request.method !== "POST") {
        return jsonResponse({ ok: false, error: "Use POST." }, 405);
      }
      if (!isAuthorized(request, env)) {
        return jsonResponse({ ok: false, error: "Unauthorized." }, 401);
      }

      try {
        return jsonResponse(await refreshChorus(env, "manual"));
      } catch (error) {
        const status = await recordFailure(env, error, "manual");
        return jsonResponse(status, 500);
      }
    }

    return jsonResponse({ ok: false, error: "Not found." }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      refreshChorus(env, event.cron).catch((error) => recordFailure(env, error, event.cron))
    );
  }
};

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...headers
    }
  });
}

function isAuthorized(request, env) {
  const configuredToken = env.ADMIN_TOKEN || "";
  if (!configuredToken) return false;

  const header = request.headers.get("Authorization") || "";
  return header === `Bearer ${configuredToken}`;
}

async function readPublicData(env) {
  const cached = await env.CHORUS_KV.get(PUBLIC_DATA_KEY, "json");
  if (cached) return cached;

  const seeded = await fetchSeedData(env);
  await env.CHORUS_KV.put(PUBLIC_DATA_KEY, JSON.stringify(seeded));
  return seeded;
}

async function fetchSeedData(env) {
  const seedUrl = env.PUBLIC_SEED_URL || "https://raw.githubusercontent.com/dakibwa/dakibwa/main/data/chorus-data.json";
  const response = await fetch(seedUrl, {
    headers: { "User-Agent": USER_AGENT }
  });

  if (!response.ok) {
    throw new Error(`Seed data fetch failed with HTTP ${response.status}`);
  }

  return response.json();
}

async function refreshChorus(env, trigger) {
  const existing = await readPublicData(env);
  const generatedAt = new Date();
  const [
    profilePayload,
    recentPayload,
    artistsPayload,
    albumsPayload,
    tracksPayload
  ] = await Promise.all([
    fetchLastfm(env, "user.getinfo"),
    fetchLastfm(env, "user.getrecenttracks", { limit: 6 }),
    fetchLastfm(env, "user.gettopartists", { period: "overall", limit: 24 }),
    fetchLastfm(env, "user.gettopalbums", { period: "overall", limit: 24 }),
    fetchLastfm(env, "user.gettoptracks", { period: "overall", limit: 24 })
  ]);

  const profile = profilePayload.user || {};
  const registeredAt = profile.registered?.unixtime ? new Date(Number(profile.registered.unixtime) * 1000) : null;
  const recentTracks = asArray(recentPayload.recenttracks?.track).map((track) => mapRecentTrack(track, generatedAt));
  const topArtists = asArray(artistsPayload.topartists?.artist).map(mapArtist);
  const topAlbums = asArray(albumsPayload.topalbums?.album).map(mapAlbum);
  const topTracks = asArray(tracksPayload.toptracks?.track).map(mapTopTrack);

  const payload = {
    snapshotDate: generatedAt.toISOString().slice(0, 10),
    generatedAt: generatedAt.toISOString(),
    source: "Last.fm",
    username: profile.name || env.LASTFM_USERNAME || "akibwa",
    summary: {
      totalScrobbles: formatNumber(profile.playcount),
      artistCount: formatNumber(profile.artist_count),
      albumCount: formatNumber(profile.album_count),
      trackCount: formatNumber(profile.track_count),
      accountAgeLabel: formatAccountAge(registeredAt, generatedAt)
    },
    nowPlaying: recentTracks[0] || {
      title: "No recent track",
      artist: "Last.fm",
      album: "Listening archive",
      timeLabel: "Recent",
      imageUrl: null
    },
    recentTracks,
    recentRuns: existing.recentRuns || [],
    topArtists,
    topAlbums,
    topTracks
  };

  await env.CHORUS_KV.put(PUBLIC_DATA_KEY, JSON.stringify(payload));

  const status = {
    ok: true,
    trigger,
    changed: stableChorusData(existing) !== stableChorusData(payload),
    refreshedAt: new Date().toISOString(),
    mode: "cloudflare-worker",
    username: payload.username,
    snapshotDate: payload.snapshotDate,
    generatedAt: payload.generatedAt,
    totalScrobbles: payload.summary.totalScrobbles,
    recentTracks: payload.recentTracks.length,
    topArtists: payload.topArtists.length,
    topAlbums: payload.topAlbums.length,
    topTracks: payload.topTracks.length,
    error: null
  };
  await env.CHORUS_KV.put(STATUS_KEY, JSON.stringify(status));
  return status;
}

async function recordFailure(env, error, trigger) {
  const status = {
    ok: false,
    trigger,
    refreshedAt: new Date().toISOString(),
    mode: "cloudflare-worker",
    error: safeError(error)
  };
  await env.CHORUS_KV.put(STATUS_KEY, JSON.stringify(status));
  return status;
}

function safeError(error) {
  return String(error?.message || error || "Unknown error").replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]");
}

function stableChorusData(data) {
  const clone = {
    ...data,
    generatedAt: undefined,
    snapshotDate: undefined
  };
  return JSON.stringify(clone);
}

async function fetchLastfm(env, method, params = {}) {
  if (!env.LASTFM_API_KEY) {
    throw new Error("LASTFM_API_KEY is not configured.");
  }

  const response = await fetch(lastfmUrl(env, method, params), {
    headers: { "User-Agent": USER_AGENT }
  });
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.message || `Last.fm ${method} returned HTTP ${response.status}.`);
  }

  return payload;
}

function lastfmUrl(env, method, params = {}) {
  const url = new URL(LASTFM_API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", env.LASTFM_API_KEY);
  url.searchParams.set("user", env.LASTFM_USERNAME || "akibwa");
  url.searchParams.set("format", "json");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  return url;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickImage(images) {
  const candidates = asArray(images)
    .map((image) => image?.["#text"])
    .filter(Boolean)
    .filter((url) => !PLACEHOLDER_IMAGE_HASHES.some((hash) => url.includes(hash)));

  return candidates.at(-1) || null;
}

function textValue(value) {
  if (typeof value === "string") return value;
  return value?.["#text"] || value?.name || "";
}

function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "LF";
}

function formatNumber(value) {
  return Number.parseInt(value || "0", 10) || 0;
}

function formatAccountAge(registeredAt, generatedAt) {
  if (!registeredAt) return "Unavailable";
  const years = Math.max(0, generatedAt.getUTCFullYear() - registeredAt.getUTCFullYear());
  if (years === 1) return "1 year";
  return `${years} years`;
}

function formatTrackTime(track, generatedAt) {
  if (track?.["@attr"]?.nowplaying === "true") return "Now";

  const uts = Number.parseInt(track?.date?.uts || "", 10);
  if (!uts) return textValue(track?.date) || "Recent";

  const playedAt = new Date(uts * 1000);
  const diffMinutes = Math.max(0, Math.round((generatedAt.getTime() - playedAt.getTime()) / 60000));

  if (diffMinutes < 2) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 8) return `${diffDays} days ago`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short"
  }).format(playedAt);
}

function mapRecentTrack(track, generatedAt) {
  return {
    title: track.name,
    artist: textValue(track.artist),
    album: textValue(track.album) || "Album unavailable",
    timeLabel: formatTrackTime(track, generatedAt),
    imageUrl: pickImage(track.image)
  };
}

function mapArtist(artist) {
  return {
    name: artist.name,
    plays: formatNumber(artist.playcount),
    initials: initials(artist.name),
    imageUrl: pickImage(artist.image)
  };
}

function mapAlbum(album) {
  return {
    title: album.name,
    artist: textValue(album.artist),
    plays: formatNumber(album.playcount),
    imageUrl: pickImage(album.image)
  };
}

function mapTopTrack(track) {
  return {
    title: track.name,
    artist: textValue(track.artist),
    plays: formatNumber(track.playcount),
    imageUrl: pickImage(track.image)
  };
}
