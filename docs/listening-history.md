# Listening history on Akibwa

The album and podcast shelves use all available listening history, as requested
on 5 September 2026. The public artifact is `public/listening-catalogue.json`:
album/show identity, artwork references, source counts, reconciled counts,
uncertainty flags and coarse methodology only. It contains no provider event
IDs, timestamps, account identifiers, watch titles, source paths or raw exports.

## Counting and matching

- Read the already normalized private history. Do not run its importers,
  reconciliation builders, datastore rebuild or daily automation from this repo.
- Spotify audio and music-video records contribute one track play after 30
  seconds. Podcast audio/video records use the same threshold. Duplicate source
  IDs and identical account/track/platform/stop-time/duration playbacks count once,
  even when offline, shuffle or reason flags differ. This also applies to the
  separate Spotify duration summary. Short events inform identity without adding plays.
- Spotify supplies the album directly. Preserve existing sleeve IDs and match
  normalized album/artist identity, including edition labels and unambiguous
  collaborative-credit variants. Equal titles by unrelated artists stay separate.
  Additional source albums receive an ID derived from their public identity.
- YouTube contributes watch records only. Reuse the owning history's verified
  single-song identities, then require one unambiguous album in the Spotify
  catalogue. Full performances, unmatched songs and ambiguous album assignments
  do not acquire invented counts. A watch has no known listened duration.
- Podcast videos require an exact recognized show channel or a named show in
  the title on its owning mixed channel. Clips count as views of that show and
  are explicitly described as such; arbitrary mentions by other uploaders do not
  establish a show match. Channel/title rules live in `lib/listening-identity.mjs`.
- The retained historical Last.fm album snapshot has no row-level timestamps.
  Split native observations into before, during and after its known coverage.
  The recorded-play lower bound is `before + max(during, Last.fm) + after`.
  Use each Spotify playback's start/stop interval and a two-minute tolerance:
  a playback crossing the boundary is not safely additive. A newer public
  Last.fm snapshot is retained in `data/album-wall.json`; take the strongest
  supported bound across both windows. A partial refresh must not erase richer
  older edition counts, and the two snapshots are never summed.
  Never sum both overlapping historical counts. The `+` marker identifies a
  lower bound caused by unresolved overlap or album identity.
- Recent Last.fm scrobbles after that snapshot may add a track observation when
  its album is unambiguous. Suppress available timestamped proxies matched to an
  already-counted Spotify/YouTube record; ambiguous proxies remain unadded.
- Apple contributes one observed last-played occurrence for an episode with
  actual playback evidence. Suppress a nearby Spotify/YouTube occurrence of the
  same show conservatively. Do not add undated cumulative repeats or activity-only
  markers. Apple-supported show counts carry a lower-bound marker.

These are bounds on recorded observations across the delivered archives, not
complete lifetime listening, completed songs/episodes or commercial streams.
The separate Spotify duration summary remains provider-specific.

## Presentation and refresh

Hover/focus shows only the number and a short label, without provider branding.
Touch layouts keep the count visible. Cards are focusable articles for reading
the counts; clicking, tapping, Enter and old detail hashes do not open a modal
or change the URL. Project and career interactions retain their own disclosures.

The homepage serializes its opening albums and curated IDs only, then loads the
full aggregate catalogue from the site's static JSON. Long shelves still add
36 cards at a time. Existing covers remain; newly discovered albums without a
verified cover use their album/artist typography, never a fabricated or broken
image. The album archive retains searching, sorting, pagination and noindex.

The old Last.fm-only Worker is not a source for these shelves and cannot replace
reconciled counts through the session cache. Its remote configuration is outside
this change; the public surface registry points to the combined static packet.

To regenerate after the owning history has refreshed, run:

```sh
npm run listening:build -- --history-root /path/to/private/digital-history
```

Only the public aggregate packet and Spotify time summary are written. Review their summary and scoped diff,
run the data/identity checks and normal publication gate, then verify the live
hover, non-navigation and full-catalogue behavior. Do not publish private source
material to automate this step.
