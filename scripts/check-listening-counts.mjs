import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildListeningCounts, mergeAlbumObservations, deduplicateSpotifyPlaybacks, spotifyMusicAudioSummary } from "../lib/listening-counts.mjs";
import { albumIdentity, youtubePodcast } from "../lib/listening-identity.mjs";
import { acceptsListeningCatalogue, listeningSeed } from "../components/listening-catalogue.mjs";
import { listeningLabel, rankPodcasts } from "../components/listening-label.mjs";

assert.deepEqual(mergeAlbumObservations({ before: 10, during: 8, after: 3, historical: 5 }), { plays: 21, atLeast: true });
assert.deepEqual(mergeAlbumObservations({ before: 10, during: 4, after: 3, historical: 8 }), { plays: 21, atLeast: true });
assert.deepEqual(mergeAlbumObservations({ before: 10, during: 4, after: 3, historical: null }), { plays: 17, atLeast: false });
assert.notEqual(albumIdentity("Artist One", "Shared title"), albumIdentity("Artist Two", "Shared title"));
assert.notEqual(albumIdentity("宇多田ヒカル", "初恋"), albumIdentity("宇多田ヒカル", "光"));
assert.equal(youtubePodcast({ eventType: "search", creator: "Lex Fridman", title: "Podcast" }), null);
assert.equal(youtubePodcast({ eventType: "watch", creator: "Stripe", title: "A Cheeky Pint with a guest" }), "Cheeky Pint");
assert.equal(youtubePodcast({ eventType: "watch", creator: "Stripe", title: "A product launch" }), null);
assert.equal(youtubePodcast({ eventType: "watch", creator: "Random uploader", title: "A Cheeky Pint with a guest" }), null);

const track = (id, time, overrides = {}) => ({ id, occurredAt: time, mediaType: "track", creator: "Artist One", collection: "First", name: "Song", msPlayed: 60000, ...overrides });
const before = track("before", "2024-12-01T12:00:00Z");
const during = track("during", "2025-01-05T12:00:00Z");
const after = track("after", "2025-02-01T12:00:00Z");
assert.equal(deduplicateSpotifyPlaybacks([after, { ...after, id: "offline-copy", offlineTimestamp: 1234, reasonStart: "remote" }]).length, 1, "playback bookkeeping differences do not create another listen");
assert.equal(deduplicateSpotifyPlaybacks([after, { ...after, id: "later-play", occurredAt: "2025-02-01T12:05:00Z" }]).length, 2, "a real repeat at another time still counts");
assert.deepEqual(spotifyMusicAudioSummary([after, { ...after, id: "offline-copy", shuffle: true }]), { playbackEvents: 1, eventsAtLeast30Seconds: 1, millisecondsPlayed: 60000 });
const unknown = (id) => ({ id, artist: "", album: "", plays: null });
const fixture = buildListeningCounts({
  wall: { scrobblingSince: "2025-01-01", refreshedAt: "2025-01-10T12:00:00Z", sleeves: [
    { id: "first", artist: "Artist One", album: "First", plays: 5 },
    unknown("unknown-one"), unknown("unknown-two"),
  ], played: [] },
  curation: { podcasts: [{ title: "Lex Fridman Podcast" }] },
  spotify: [before, during, after, after, track("short", "2025-02-01T13:00:00Z", { msPlayed: 2000 }),
    track("ambig-one", "2025-02-01T14:00:00Z", { name: "Ambiguous" }),
    track("ambig-two", "2025-02-01T14:05:00Z", { name: "Ambiguous", collection: "Second" }),
    track("podcast", "2025-02-03T12:00:00Z", { mediaType: "video_episode", collection: "Lex Fridman Podcast", name: "Episode" }),
  ],
  youtube: [
    { id: "watch", eventType: "watch", occurredAt: "2025-02-02T12:00:00Z" },
    { id: "ambiguous", eventType: "watch", occurredAt: "2025-02-02T13:00:00Z" },
    { id: "pod-view", eventType: "watch", occurredAt: "2025-02-04T12:00:00Z", creator: "Lex Fridman", title: "An interview" },
    { id: "search", eventType: "search", occurredAt: "2025-02-04T12:00:00Z", creator: "Lex Fridman", title: "An interview" },
  ],
  youtubeAnnotations: [
    { id: "watch", musicClassification: { status: "identified_music", identity: { artist: "Artist One", track: "Song" } } },
    { id: "ambiguous", musicClassification: { status: "identified_music", identity: { artist: "Artist One", track: "Ambiguous" } } },
  ],
  lastfm: [
    { id: "proxy", creator: "Artist One", name: "Song", occurredAt: "2025-02-02T12:00:00Z" },
    { id: "extra", creator: "Artist One", name: "Song", occurredAt: "2025-02-05T12:00:00Z" },
  ],
  lastfmAnnotations: [{ id: "proxy", reconciliation: { match: { direct: { id: "watch" } } } }],
  apple: { episodes: [
    { showTitle: "Lex Fridman Podcast", episodeTitle: "Older episode", playCount: 4, lastPlayedAt: "2023-01-01T12:00:00Z" },
    { showTitle: "Lex Fridman Podcast", episodeTitle: "Episode", playCount: 1, lastPlayedAt: "2025-02-03T12:00:30Z" },
    { showTitle: "Lex Fridman Podcast", episodeTitle: "Marker", playCount: 0, playheadSeconds: 0, status: "activity_marker_only" },
  ] },
  asOf: "2025-02-06",
});
assert.equal(fixture.albums.find((row) => row.id === "first").plays, 10, "disjoint history is added, historical overlap is bounded, and a YouTube scrobble counts once");
assert.equal(fixture.albums.find((row) => row.id === "first").sources.spotify, 4, "duplicate IDs and sub-30-second starts do not increase counts");
assert.equal(fixture.diagnostics.youtubeUnresolvedAlbum, 1, "ambiguous songs are not arbitrarily assigned to an album");
assert.equal(fixture.diagnostics.lastfmProxiesSuppressed, 1);
assert.equal(fixture.albums.filter((row) => row.id.startsWith("unknown-")).length, 2);
assert(fixture.albums.filter((row) => row.id.startsWith("unknown-")).every((row) => row.plays === null));
assert.equal(fixture.podcasts[0].plays, 3, "one Spotify start, one YouTube view and one independent Apple occurrence");
assert.equal(fixture.diagnostics.appleOverlapsSuppressed, 1);
assert.equal(fixture.diagnostics.appleMarkersExcluded, 1);

const snapshotFixture = (spotify, latestLastfmSnapshot) => buildListeningCounts({
  wall: { scrobblingSince: "2025-01-01", refreshedAt: "2025-01-10T12:00:00Z",
    sleeves: [{ id: "first", artist: "Artist One", album: "First", plays: 5 }], latestLastfmSnapshot },
  curation: { podcasts: [] }, spotify, youtube: [], youtubeAnnotations: [],
  lastfm: [], lastfmAnnotations: [], apple: { episodes: [] }, asOf: "2025-02-08",
});
const crossing = snapshotFixture([
  track("crossing-start", "2025-01-01T00:01:00Z", { msPlayed: 360000 }),
  track("crossing-end", "2025-01-10T12:03:00Z", { msPlayed: 360000 }),
  track("disjoint", "2025-01-10T12:10:00Z"),
]);
assert.equal(crossing.albums[0].plays, 6, "playbacks spanning a snapshot boundary are not added twice");
const currentSnapshot = { asOf: "2025-02-06T12:00:00Z", plays: { first: 12 } };
const refreshed = snapshotFixture([before, during, after, track("after-current", "2025-02-07T12:00:00Z")], currentSnapshot);
assert.equal(refreshed.albums[0].plays, 14, "the current snapshot includes overlapping records and adds only disjoint observations");
assert.equal(refreshed.albums[0].sources.lastfm, 12);
assert.equal(refreshed.diagnostics.lastfmCurrentSnapshotAlbums, 1);
const partialRefresh = snapshotFixture([before, during, after], { ...currentSnapshot, plays: { first: 2 } });
assert.equal(partialRefresh.albums[0].plays, 7, "a smaller partial refresh preserves the stronger historical bound");

const packet = JSON.parse(readFileSync(new URL("../public/listening-catalogue.json", import.meta.url)));
const curation = JSON.parse(readFileSync(new URL("../data/taste-curation.json", import.meta.url)));
assert(acceptsListeningCatalogue(packet, packet.asOf), "the public packet must satisfy the browser schema");
assert(!acceptsListeningCatalogue({ refreshedAt: "2026-09-05", plays: { first: 9000 } }, packet.asOf), "legacy Last.fm packets cannot replace reconciled counts");
assert(!acceptsListeningCatalogue({ ...packet, asOf: "2001-01-01" }, packet.asOf));
assert(!acceptsListeningCatalogue({ ...packet, asOf: "2099-01-01" }, packet.asOf));
assert(!acceptsListeningCatalogue({ ...packet, albums: [null] }, packet.asOf));
assert(!acceptsListeningCatalogue({ ...packet, albums: packet.albums.slice(0, 1) }, packet.asOf, packet.albums.slice(0, 2)), "partial packets cannot erase known identities");
assert(packet.albums.length > 13000, "older Spotify albums remain available");
assert(curation.albumIds.every((id) => packet.albums.some((row) => row.id === id)), "all curated identities, including unknown sleeves, survive");
assert(packet.albums.every((row, index) => !index || (row.plays ?? -1) <= (packet.albums[index - 1].plays ?? -1)));
assert(packet.albums.every((row) => row.plays === null || row.plays >= row.sources.spotify));
for (const row of packet.albums.filter((album) => album.artwork))
  assert(existsSync(new URL(`../public/album-art/${row.id}-wall.webp`, import.meta.url)), `missing album art ${row.id}`);
assert.equal(new Set(packet.podcasts.map((show) => show.title)).size, packet.podcasts.length);
const showFields = new Set(["title", "creator", "art", "plays", "atLeast", "sources"]);
for (const show of packet.podcasts) {
  assert(Object.keys(show).every((key) => showFields.has(key)));
  assert.deepEqual(Object.keys(show.sources).sort(), ["apple", "spotify", "youtube"]);
  assert(Object.values(show.sources).every((value) => Number.isSafeInteger(value) && value >= 0));
  assert.equal(show.plays, show.sources.apple + show.sources.spotify + show.sources.youtube || null);
  if (show.art) assert(existsSync(new URL(`../public${show.art}`, import.meta.url)));
}
assert(packet.diagnostics.spotifyMusic === 187176 && packet.diagnostics.youtubeMusic > 1000);
assert(packet.diagnostics.spotifyPodcast === 3275 && packet.diagnostics.youtubePodcast > 900 && packet.diagnostics.appleEvidence > 0);
assert.equal(packet.diagnostics.spotifyQualifiedDuplicatesSuppressed, 548);
const publicJson = JSON.stringify(packet);
assert(!/(?:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\/Users\/|sourceArchiveId|accountScope|publicVideoId|occurredAt|lastPlayedAt|incognitoMode)/i.test(publicJson), "the aggregate packet contains no private identifiers or event fields");
assert(listeningSeed(packet, curation.albumIds).length < 400, "the full history does not bloat the initial homepage payload");
assert.equal(listeningLabel({ kind: "music", plays: 125, atLeast: true }).value, "125+");
assert.equal(listeningLabel({ kind: "music", plays: null }).label, "No recorded count");
assert.equal(listeningLabel({ kind: "podcasts", plays: 12, sources: { youtube: 4 } }).label, "plays & views");
assert(!Object.hasOwn(listeningLabel({ kind: "music", plays: 12 }), "source"));
assert.deepEqual(rankPodcasts([{ title: "Unknown", plays: null }, { title: "Low", plays: 2 }, { title: "High", plays: 10 }]).map((row) => row.title), ["High", "Low", "Unknown"]);
console.log(`Listening history passed: ${packet.albums.length} albums, ${packet.podcasts.length} shows; overlap bounds, identity matching, source-safe schema and compact homepage seed.`);
