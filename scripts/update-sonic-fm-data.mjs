import { readFile, writeFile } from "node:fs/promises";

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";
const PLACEHOLDER_IMAGE_HASHES = [
  "2a96cbd8b46e442fc41c2b86b821562f",
  "c6f59c1e5e7240a4c0d427abd71f3dbb"
];

const apiKey = process.env.LASTFM_API_KEY;
const username = process.env.LASTFM_USERNAME ?? "akibwa";

if (!apiKey) {
  throw new Error("LASTFM_API_KEY is required to refresh Sonic FM data.");
}

function lastfmUrl(method, params = {}) {
  const url = new URL(LASTFM_API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("user", username);
  url.searchParams.set("format", "json");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  return url;
}

async function fetchLastfm(method, params) {
  const response = await fetch(lastfmUrl(method, params));
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.message ?? `Last.fm ${method} returned HTTP ${response.status}.`);
  }

  return payload;
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

  return candidates.at(-1) ?? null;
}

function textValue(value) {
  if (typeof value === "string") return value;
  return value?.["#text"] ?? value?.name ?? "";
}

function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "LF";
}

function formatNumber(value) {
  return Number.parseInt(value ?? "0", 10) || 0;
}

function formatAccountAge(registeredAt, generatedAt) {
  if (!registeredAt) return "Unavailable";
  const years = Math.max(0, generatedAt.getUTCFullYear() - registeredAt.getUTCFullYear());
  if (years === 1) return "1 year";
  return `${years} years`;
}

function formatTrackTime(track, generatedAt) {
  if (track?.["@attr"]?.nowplaying === "true") return "Now";

  const uts = Number.parseInt(track?.date?.uts ?? "", 10);
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

const existing = JSON.parse(await readFile("data/sonic-fm-data.json", "utf8"));
const generatedAt = new Date();

const [profilePayload, recentPayload, artistsPayload, albumsPayload, tracksPayload] = await Promise.all([
  fetchLastfm("user.getinfo"),
  fetchLastfm("user.getrecenttracks", { limit: 6 }),
  fetchLastfm("user.gettopartists", { period: "overall", limit: 24 }),
  fetchLastfm("user.gettopalbums", { period: "overall", limit: 24 }),
  fetchLastfm("user.gettoptracks", { period: "overall", limit: 24 })
]);

const profile = profilePayload.user ?? {};
const registeredAt = profile.registered?.unixtime ? new Date(Number(profile.registered.unixtime) * 1000) : null;
const recentTracks = asArray(recentPayload.recenttracks?.track).map((track) => mapRecentTrack(track, generatedAt));
const topArtists = asArray(artistsPayload.topartists?.artist).map(mapArtist);
const topAlbums = asArray(albumsPayload.topalbums?.album).map(mapAlbum);
const topTracks = asArray(tracksPayload.toptracks?.track).map(mapTopTrack);

const payload = {
  snapshotDate: generatedAt.toISOString().slice(0, 10),
  generatedAt: generatedAt.toISOString(),
  source: "Last.fm",
  username: profile.name ?? username,
  summary: {
    totalScrobbles: formatNumber(profile.playcount),
    artistCount: formatNumber(profile.artist_count),
    albumCount: formatNumber(profile.album_count),
    trackCount: formatNumber(profile.track_count),
    accountAgeLabel: formatAccountAge(registeredAt, generatedAt)
  },
  nowPlaying: recentTracks[0] ?? {
    title: "No recent track",
    artist: "Last.fm",
    album: "Listening archive",
    timeLabel: "Recent",
    imageUrl: null
  },
  recentTracks,
  recentRuns: existing.recentRuns ?? [],
  topArtists,
  topAlbums,
  topTracks
};

await writeFile("data/sonic-fm-data.json", `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      snapshotDate: payload.snapshotDate,
      generatedAt: payload.generatedAt,
      username: payload.username,
      totalScrobbles: payload.summary.totalScrobbles,
      recentTracks: payload.recentTracks.length,
      topArtists: payload.topArtists.length,
      topAlbums: payload.topAlbums.length,
      topTracks: payload.topTracks.length
    },
    null,
    2
  )
);
