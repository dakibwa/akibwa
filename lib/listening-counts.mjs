import { createHash } from "node:crypto";
import { stripEdition } from "./album-key.mjs";
import { albumIdentity, songIdentity } from "./listening-identity.mjs";

const music = (event) => ["track", "video_track"].includes(event.mediaType);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const unique = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    if (typeof row.id !== "string" || !row.id) throw Error("A provider event needs a stable identity");
    if (seen.has(row.id)) return false;
    seen.add(row.id); return true;
  });
};

// Spotify can deliver the same stopped playback more than once with different
// offline timestamps, reason flags or shuffle state. Those fields do not make
// another listen when account, track, platform, stop time and duration agree.
export function deduplicateSpotifyPlaybacks(events) {
  const seen = new Set();
  return unique(events).filter((event) => {
    const key = JSON.stringify([
      event.accountScope ?? null, event.occurredAt, event.mediaType,
      event.uri ?? null, event.creator, event.collection, event.name,
      event.msPlayed, event.platform ?? null,
    ]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

// These are bounds on recorded listening observations, not completed songs.
// Within the undated Last.fm snapshot window, max(native, scrobbles) is the
// defensible lower bound on their union. Disjoint dates can be added exactly.
export function mergeAlbumObservations({ before = 0, during = 0, after = 0, historical = null }) {
  return {
    plays: before + Math.max(during, historical ?? 0) + after,
    atLeast: historical > 0 && during > 0,
  };
}

// Albums only: the podcast counts went with the homepage's taste room
// (Dan, 16 November 2026).
export function buildListeningCounts({ wall, spotify, youtube, youtubeAnnotations, lastfm, lastfmAnnotations, asOf }) {
  const albums = new Map(), aliases = new Map(), byTitle = new Map(), bySong = new Map();
  const start = Date.parse(`${wall.scrobblingSince}T00:00:00Z`), end = Date.parse(wall.refreshedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw Error("Invalid Last.fm snapshot coverage");
  const diagnostics = {
    spotifyMusic: 0, youtubeMusic: 0,
    youtubeUnresolvedAlbum: 0, lastfmInterim: 0, lastfmProxiesSuppressed: 0,
    lastfmUnresolvedAlbum: 0,
    spotifyDuplicatePlaybacksSuppressed: 0, spotifyQualifiedDuplicatesSuppressed: 0,
  };
  const addAlbum = (metadata, historical = null) => {
    const key = metadata.artist && metadata.album ? albumIdentity(metadata.artist, metadata.album) : `unidentified::${metadata.id}`;
    const row = { ...metadata, historical, before: 0, during: 0, after: 0, spotify: 0, youtube: 0, lastfm: historical ?? 0, observations: [] };
    albums.set(key, row); aliases.set(key, key);
    const title = key.split("::")[1], candidates = byTitle.get(title) || new Set();
    candidates.add(key); byTitle.set(title, candidates);
    return key;
  };
  for (const item of [...wall.sleeves.map((r) => ({ ...r, printed: true })), ...(wall.played || []).map((r) => ({ ...r, printed: false }))]) {
    if (item.duplicateOf) continue;
    const key = item.artist && item.album ? albumIdentity(item.artist, item.album) : `unidentified::${item.id}`;
    // The public wall already marks duplicate sleeves. Retain its canonical ID.
    if (albums.has(key)) {
      const existing = albums.get(key);
      if (count(item.plays) && (existing.historical === null || item.plays > existing.historical)) {
        existing.historical = item.plays;
        existing.lastfm = item.plays;
      }
      if (item.lastfmArtist && item.lastfmAlbum) aliases.set(albumIdentity(item.lastfmArtist, item.lastfmAlbum), key);
      continue;
    }
    addAlbum({ id: item.id, artist: item.artist, album: item.album, year: item.year || null, printed: item.printed, artwork: true }, count(item.plays) ? item.plays : null);
    if (item.lastfmArtist && item.lastfmAlbum) aliases.set(albumIdentity(item.lastfmArtist, item.lastfmAlbum), key);
  }
  const findAlbum = (artist, title, create = false) => {
    if (!artist || !title) return null;
    const key = albumIdentity(artist, title);
    if (aliases.has(key)) return aliases.get(key);
    // Explicit collaborative-credit differences, only when the album match is
    // unique. Equal titles by unrelated artists never merge.
    const artistKey = key.split("::")[0];
    const candidates = [...(byTitle.get(key.split("::")[1]) || [])].filter((candidate) => {
      const other = candidate.split("::")[0];
      return ` ${other} `.includes(` ${artistKey} `) || ` ${artistKey} `.includes(` ${other} `);
    });
    if (candidates.length === 1) { aliases.set(key, candidates[0]); return candidates[0]; }
    if (!create) return null;
    return addAlbum({ id: `history-${createHash("sha256").update(key).digest("hex").slice(0, 16)}`, artist, album: stripEdition(title).trim(), year: null, printed: false, artwork: false });
  };
  const addObservation = (key, at, provider, duration = 0) => {
    const row = albums.get(key), time = Date.parse(at);
    if (!row || !Number.isFinite(time)) return false;
    const interval = { start: time - duration, end: time };
    row[provider]++;
    // A playback crossing a snapshot boundary can already be scrobbled inside
    // it. Only a disjoint interval is safely additive; allow timestamp tolerance.
    row[interval.end < start - 120000 ? "before" : interval.start > end + 120000 ? "after" : "during"]++;
    row.observations.push(interval);
    return true;
  };
  const spotifyRows = unique(spotify), native = deduplicateSpotifyPlaybacks(spotifyRows);
  diagnostics.spotifyDuplicatePlaybacksSuppressed = spotifyRows.length - native.length;
  diagnostics.spotifyQualifiedDuplicatesSuppressed = spotifyRows.filter((event) => event.msPlayed >= 30000).length - native.filter((event) => event.msPlayed >= 30000).length;
  // All source album metadata builds the identity index, including short plays;
  // only provider-recorded durations of at least 30 seconds increase counts.
  for (const event of native.filter(music)) {
    const key = findAlbum(event.creator, event.collection, true);
    if (!key) continue;
    const song = songIdentity(event.creator, event.name), candidates = bySong.get(song) || new Set();
    candidates.add(key); bySong.set(song, candidates);
    if (event.msPlayed >= 30000 && addObservation(key, event.occurredAt, "spotify", event.msPlayed)) diagnostics.spotifyMusic++;
  }
  const mapSong = (artist, track) => {
    const keys = bySong.get(songIdentity(artist, track));
    if (keys?.size > 1) for (const key of keys) albums.get(key).uncertainIdentity = true;
    return keys?.size === 1 ? [...keys][0] : null;
  };
  const ytAnnotations = new Map(youtubeAnnotations.map((event) => [event.id, event]));
  const lfAnnotations = new Map(lastfmAnnotations.map((event) => [event.id, event]));
  const countedDirect = new Set();
  // A Last.fm proxy may reference either copy of a collapsed Spotify playback.
  for (const event of spotifyRows.filter((e) => music(e) && e.msPlayed >= 30000 && findAlbum(e.creator, e.collection) && Number.isFinite(Date.parse(e.occurredAt)))) countedDirect.add(event.id);
  const youtubeEvents = unique(youtube);
  for (const event of youtubeEvents) {
    const annotation = ytAnnotations.get(event.id);
    if (event.eventType !== "watch" || annotation?.musicClassification?.status !== "identified_music") continue;
    const identity = annotation.musicClassification.identity;
    const key = mapSong(identity.artist, identity.track);
    if (!key) { diagnostics.youtubeUnresolvedAlbum++; continue; }
    if (addObservation(key, event.occurredAt, "youtube")) { diagnostics.youtubeMusic++; countedDirect.add(event.id); }
  }
  for (const event of unique(lastfm)) {
    // Earlier rows already belong to the historic album snapshot.
    if (Date.parse(event.occurredAt) <= end) continue;
    const annotation = lfAnnotations.get(event.id)?.reconciliation;
    if (countedDirect.has(annotation?.match?.direct?.id)) { diagnostics.lastfmProxiesSuppressed++; continue; }
    // An ambiguous proxy may be one of the direct observations; do not invent
    // another play. Its original evidence remains in the private record.
    if (annotation?.role === "ambiguous_proxy_non_additive") { diagnostics.lastfmProxiesSuppressed++; continue; }
    const key = mapSong(event.creator, event.name);
    if (!key) { diagnostics.lastfmUnresolvedAlbum++; continue; }
    if (addObservation(key, event.occurredAt, "lastfm")) diagnostics.lastfmInterim++;
  }
  const latest = wall.latestLastfmSnapshot;
  const latestAt = Date.parse(latest?.asOf);
  const hasLatest = Number.isFinite(latestAt) && latestAt > end && latestAt <= Date.parse(`${asOf}T23:59:59Z`);
  diagnostics.lastfmCurrentSnapshotAlbums = 0;
  const outputAlbums = [...albums.values()].map((row) => {
    const merged = mergeAlbumObservations(row);
    const current = hasLatest && count(latest.plays?.[row.id]) ? latest.plays[row.id] : null;
    if (current !== null) {
      diagnostics.lastfmCurrentSnapshotAlbums++;
      const after = row.observations.filter((interval) => interval.start > latestAt + 120000).length;
      const currentBound = mergeAlbumObservations({
        before: row.before, after,
        during: row.observations.length - row.before - after,
        historical: current,
      });
      // The Worker can expose fewer edition matches than the retained snapshot.
      // Keep the strongest supported bound; never replace richer older evidence
      // with a smaller partial count or blindly add the two snapshots.
      merged.plays = Math.max(merged.plays, currentBound.plays);
      merged.atLeast ||= currentBound.atLeast;
    }
    return {
      id: row.id, artist: row.artist, album: row.album || "Unidentified sleeve", year: row.year,
      printed: row.printed, artwork: row.artwork,
      plays: row.historical === null && current === null && row.observations.length === 0 ? null : merged.plays,
      atLeast: merged.atLeast || !!row.uncertainIdentity,
      sources: { spotify: row.spotify, youtube: row.youtube, lastfm: Math.max(row.lastfm, current ?? 0) },
    };
  }).filter((row) => row.artwork || row.plays > 0)
    .sort((a, b) => (b.plays ?? -1) - (a.plays ?? -1) || a.artist.localeCompare(b.artist, "en") || a.album.localeCompare(b.album, "en"));
  return {
    schemaVersion: 1, asOf, albums: outputAlbums, diagnostics,
    method: {
      music: "Spotify audio and music-video starts lasting at least 30 seconds, verified YouTube song views with an unambiguous album, and available Last.fm album/scrobble records. Matching Spotify playbacks with identical account, track, platform, stop time and duration count once even when bookkeeping flags differ. These count tracks, not completed albums.",
      overlap: "Within each retained Last.fm snapshot window, take the larger of its album count and the provider-record count. Add only disjoint playback intervals and suppress matched timestamped Last.fm proxies. Keep the strongest bound from the saved and current snapshots, without replacing richer older evidence with a partial refresh. A + marks a conservative lower bound where overlap cannot be resolved.",
      coverage: "All delivered Spotify history from two accounts (2012 to August 2026; no delivered events in 2013 or 2015), both available YouTube scopes (2024 to September 2026), and the retained Last.fm catalogue and recent scrobbles. This is available recorded history, not complete lifetime coverage.",
      unknown: "YouTube has no watched-duration field. Songs with ambiguous album identities remain unassigned; searches and browsing are never plays. Public output contains album aggregates only.",
    },
  };
}
