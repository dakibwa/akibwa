const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const USER_AGENT = "akibwa-chorus-cloudflare/1";

const PUBLIC_DATA_KEY = "chorus-data";
const STATUS_KEY = "refresh-status";
const STRAVA_TOKEN_STATE_KEY = "strava:oauth";
const TOKEN_REFRESH_GRACE_SECONDS = 300;
const RUN_LOOKBACK_LIMIT = 14;
const RUN_DISPLAY_LIMIT = 4;
const LASTFM_BEFORE_RUN_SECONDS = 15 * 60;
const LASTFM_AFTER_RUN_SECONDS = 30 * 60;
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
  const strava = await readStravaRunSoundtracks(env, existing.recentRuns || []);

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
    recentRuns: strava.runs,
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
    strava: strava.status,
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

async function readStravaRunSoundtracks(env, fallbackRuns) {
  const generatedAt = new Date().toISOString();

  try {
    const token = await getStravaAccessToken(env);
    const activities = await fetchStravaActivities(token);
    const runs = activities.filter(isRun).slice(0, RUN_LOOKBACK_LIMIT);
    const paired = (await Promise.all(runs.map((activity) => pairRunWithLastFm(env, activity))))
      .filter(Boolean)
      .slice(0, RUN_DISPLAY_LIMIT);

    if (!paired.length) {
      return fallbackStravaPayload(fallbackRuns, generatedAt, "No recent Strava runs had Last.fm scrobbles in their run window.");
    }

    return {
      runs: paired,
      status: {
        source: "strava-api",
        generatedAt,
        latestActivityAt: getActivityStart(activities[0])?.toISOString() || null,
        latestRunAt: getActivityStart(runs[0])?.toISOString() || null,
        pairedCount: paired.length,
        activityCount: activities.length,
        error: null
      }
    };
  } catch (error) {
    return fallbackStravaPayload(fallbackRuns, generatedAt, safeError(error), error?.missingConfig);
  }
}

async function getStravaAccessToken(env) {
  const storedState = await readStravaTokenState(env);
  const refreshToken = storedState.refreshToken || env.STRAVA_REFRESH_TOKEN || null;
  const missingConfig = [
    ["STRAVA_CLIENT_ID", env.STRAVA_CLIENT_ID],
    ["STRAVA_CLIENT_SECRET", env.STRAVA_CLIENT_SECRET],
    ["STRAVA_REFRESH_TOKEN or CHORUS_STRAVA_TOKENS", refreshToken]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingConfig.length) {
    const error = new Error("Strava API credentials are not configured yet.");
    error.missingConfig = missingConfig;
    throw error;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    storedState.accessToken &&
    storedState.expiresAt &&
    storedState.expiresAt > nowSeconds + TOKEN_REFRESH_GRACE_SECONDS
  ) {
    return storedState.accessToken;
  }

  const body = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT },
    body
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(readApiMessage(payload, "Strava token refresh failed."));
  }

  const accessToken = stringFrom(payload.access_token);
  const nextRefreshToken = stringFrom(payload.refresh_token) || refreshToken;
  const expiresAt = numberFrom(payload.expires_at);

  if (!accessToken || !nextRefreshToken || !expiresAt) {
    throw new Error("Strava did not return a usable access token.");
  }

  await writeStravaTokenState(env, {
    accessToken,
    refreshToken: nextRefreshToken,
    expiresAt,
    updatedAt: new Date().toISOString()
  });

  return accessToken;
}

async function readStravaTokenState(env) {
  if (!env.CHORUS_STRAVA_TOKENS) return emptyStravaTokenState();

  try {
    const raw = await env.CHORUS_STRAVA_TOKENS.get(STRAVA_TOKEN_STATE_KEY);
    if (!raw) return emptyStravaTokenState();
    const parsed = JSON.parse(raw);
    return {
      accessToken: stringFrom(parsed.accessToken),
      refreshToken: stringFrom(parsed.refreshToken),
      expiresAt: numberFrom(parsed.expiresAt),
      updatedAt: stringFrom(parsed.updatedAt)
    };
  } catch {
    return emptyStravaTokenState();
  }
}

async function writeStravaTokenState(env, state) {
  if (!env.CHORUS_STRAVA_TOKENS) return;
  await env.CHORUS_STRAVA_TOKENS.put(STRAVA_TOKEN_STATE_KEY, JSON.stringify(state));
}

function emptyStravaTokenState() {
  return {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    updatedAt: null
  };
}

async function fetchStravaActivities(accessToken) {
  const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "30");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT
    }
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(readApiMessage(payload, "Strava activity refresh failed."));
  }

  return Array.isArray(payload) ? payload : [];
}

async function pairRunWithLastFm(env, activity) {
  const start = getActivityStart(activity);
  if (!start) return null;

  const movingTime = Math.max(0, numberFrom(activity.moving_time) || 0);
  const elapsedTime = Math.max(movingTime, numberFrom(activity.elapsed_time) || movingTime);
  const from = Math.floor(start.getTime() / 1000) - LASTFM_BEFORE_RUN_SECONDS;
  const to = Math.floor((start.getTime() + elapsedTime * 1000) / 1000) + LASTFM_AFTER_RUN_SECONDS;
  const tracks = await getLastFmRunTracks(env, from, to);
  if (!tracks.length) return null;

  return {
    name: stringFrom(activity.name) || "Run",
    dateLabel: formatRunDate(activity.start_date_local, start),
    timeLabel: formatRunTime(activity.start_date_local, start),
    startedAt: start.toISOString(),
    distance: formatDistance(numberFrom(activity.distance) || 0),
    duration: formatDuration(movingTime),
    pace: formatPace(numberFrom(activity.distance) || 0, movingTime),
    elevation: formatElevation(numberFrom(activity.total_elevation_gain)),
    soundtrack: dominantArtist(tracks),
    tracks: tracks.map((track) => ({
      title: track.title,
      artist: track.artist,
      album: track.album || "Unknown album",
      imageUrl: track.imageUrl
    }))
  };
}

async function getLastFmRunTracks(env, from, to) {
  const payload = await fetchLastfm(env, "user.getrecenttracks", { from, to, limit: 100, extended: 1 });

  return asArray(payload.recenttracks?.track)
    .filter((track) => track?.["@attr"]?.nowplaying !== "true")
    .map(mapRunTrack)
    .filter((track) => track.title && track.artist);
}

function mapRunTrack(track) {
  return {
    title: track.name || "",
    artist: textValue(track.artist),
    album: textValue(track.album) || "Unknown album",
    imageUrl: pickImage(track.image)
  };
}

function fallbackStravaPayload(fallbackRuns, generatedAt, error, missingConfig) {
  const runs = asArray(fallbackRuns).filter((run) => run?.tracks?.length);
  const latestFallback = runs
    .map((run) => run.startedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return {
    runs,
    status: {
      source: "static-fallback",
      generatedAt,
      latestActivityAt: latestFallback,
      latestRunAt: latestFallback,
      pairedCount: runs.length,
      activityCount: 0,
      error,
      missingConfig
    }
  };
}

function isRun(activity) {
  const type = stringFrom(activity.type);
  const sportType = stringFrom(activity.sport_type);
  return ["Run", "TrailRun", "VirtualRun"].includes(sportType || type || "");
}

function getActivityStart(activity) {
  const raw = stringFrom(activity?.start_date);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatRunDate(localValue, fallback) {
  const date = parseStravaLocalDate(localValue) || fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(date);
}

function formatRunTime(localValue, fallback) {
  const date = parseStravaLocalDate(localValue) || fallback;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  }).format(date);
}

function parseStravaLocalDate(value) {
  const raw = stringFrom(value);
  if (!raw) return null;
  const date = new Date(raw.endsWith("Z") ? raw : `${raw}Z`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDistance(meters) {
  if (!meters) return "0 km";
  const kilometers = meters / 1000;
  return `${kilometers < 10 ? kilometers.toFixed(2) : kilometers.toFixed(1)} km`;
}

function formatDuration(seconds) {
  if (!seconds) return "0 min";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function formatPace(meters, seconds) {
  if (!meters || !seconds) return "Pace n/a";
  const secondsPerKm = seconds / (meters / 1000);
  const minutes = Math.floor(secondsPerKm / 60);
  const remainingSeconds = Math.round(secondsPerKm % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}/km`;
}

function formatElevation(value) {
  if (value === null || value === undefined) return "0 m";
  return `${Math.round(value)} m`;
}

function dominantArtist(tracks) {
  const counts = new Map();
  for (const track of tracks) counts.set(track.artist, (counts.get(track.artist) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || tracks[0]?.artist || "Last.fm";
}

function readApiMessage(payload, fallback) {
  if (payload && typeof payload === "object") {
    const message = stringFrom(payload.message);
    if (message) return message;
    const errors = Array.isArray(payload.errors) ? payload.errors : [];
    const firstMessage = errors
      .map((error) => error && typeof error === "object" ? stringFrom(error.message) : null)
      .find(Boolean);
    if (firstMessage) return firstMessage;
  }
  return fallback;
}

function stringFrom(value) {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text ? text : null;
  }
  return null;
}

function numberFrom(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
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
