"use client";

import {
  Activity,
  ArrowRight,
  Clock3,
  ExternalLink,
  Music2,
  Radio,
  Signal,
  Sparkles,
  UserRound
} from "lucide-react";
import { useState } from "react";
import chorusData from "@/data/chorus-data.json";

const periods = ["7D", "1M", "3M", "6M", "12M", "All"];
const periodLimits = {
  "7D": 6,
  "1M": 8,
  "3M": 10,
  "6M": 12,
  "12M": 16,
  All: Number.POSITIVE_INFINITY
};
const periodDescriptions = {
  "7D": "A tight week-long lens for the most recent listening run.",
  "1M": "A one-month cut across the strongest recent repeats.",
  "3M": "A seasonal view of artists, albums, and tracks with staying power.",
  "6M": "A half-year view for the bigger listening arc.",
  "12M": "A year-long view across the active archive.",
  All: "Overall lens. Totals stay all-time; rankings and identity follow the selected period."
};

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value);
}

function detailLine(primary, secondary) {
  return secondary ? `${primary} - ${secondary}` : primary;
}

const nowPlaying = chorusData.nowPlaying ?? {
  title: "No recent track",
  artist: "Last.fm",
  album: "Listening archive",
  timeLabel: "Recent",
  imageUrl: null
};

function ChorusAvatar({ label, index = 0, imageUrl }) {
  return (
    <span className={`chorus-avatar chorus-avatar-${index % 6}`} aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : label}
    </span>
  );
}

function AlbumCover({ imageUrl, title, artist, tone = "bloom", className = "" }) {
  return (
    <span className={`chorus-album-cover is-${tone} ${imageUrl ? "has-artwork" : ""} ${className}`} aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt={artist ? `${title} by ${artist}` : title} loading="lazy" /> : <i />}
    </span>
  );
}

function ChorusWave() {
  return (
    <span className="chorus-wave" aria-hidden="true">
      {Array.from({ length: 24 }, (_, index) => (
        <i key={index} style={{ "--height": `${22 + ((index * 11) % 36)}px` }} />
      ))}
    </span>
  );
}

function AlbumTile({ album, index }) {
  return (
    <article className="chorus-album">
      <AlbumCover imageUrl={album.imageUrl} title={album.title} artist={album.artist} tone={album.tone} />
      <div>
        <strong>
          {index + 1} {album.title}
        </strong>
        <small>{album.artist}</small>
      </div>
    </article>
  );
}

function TopArtists({ artists }) {
  const topArtistMax = artists[0]?.plays ?? 1;

  return (
    <article className="chorus-panel chorus-list-panel" id="artists">
      <header className="chorus-panel-head">
        <div>
          <h2>Top artists</h2>
          <p>{artists.length} ranked</p>
        </div>
        <a href="#albums">
          Open <ArrowRight size={14} strokeWidth={2} />
        </a>
      </header>
      <div className="chorus-artist-list">
        {artists.map((artist, index) => (
          <div className="chorus-artist-row" key={artist.name}>
            <span className="chorus-rank">{index + 1}</span>
            <ChorusAvatar label={artist.initials} index={index} imageUrl={artist.imageUrl} />
            <div>
              <strong>{artist.name}</strong>
              <small>{formatNumber(artist.plays)} scrobbles</small>
              <i style={{ "--bar": `${Math.round((artist.plays / topArtistMax) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function AlbumsWall({ albums }) {
  return (
    <article className="chorus-panel chorus-album-panel" id="albums">
      <header className="chorus-panel-head">
        <div>
          <h2>Albums wall</h2>
          <p>{albums.length} albums</p>
        </div>
        <a href="#tracks">
          Open <ArrowRight size={14} strokeWidth={2} />
        </a>
      </header>
      <div className="chorus-album-grid">
        {albums.map((album, index) => (
          <AlbumTile album={album} index={index} key={album.title} />
        ))}
      </div>
    </article>
  );
}

function TopTracks({ tracks }) {
  const topTrackMax = tracks[0]?.plays ?? 1;

  return (
    <article className="chorus-panel chorus-track-panel" id="tracks">
      <header className="chorus-panel-head">
        <div>
          <h2>Top tracks</h2>
          <p>{tracks.length} tracks</p>
        </div>
        <a href="#overview">
          Open <ArrowRight size={14} strokeWidth={2} />
        </a>
      </header>
      <div className="chorus-track-list">
        {tracks.map((track, index) => (
          <div className="chorus-track-row" key={track.title}>
            <span>{index + 1}</span>
            <ChorusAvatar label="" index={index + 2} imageUrl={track.imageUrl} />
            <strong>{track.title}</strong>
            <em>{formatNumber(track.plays)}</em>
            <i style={{ "--bar": `${Math.round((track.plays / topTrackMax) * 100)}%` }} />
          </div>
        ))}
      </div>
    </article>
  );
}

function RunSoundtrackWidget() {
  const pairedRuns = (chorusData.recentRuns ?? []).filter((run) => run.tracks?.length);

  if (!pairedRuns.length) return null;

  return (
    <article className="chorus-run-card" aria-label="Recent Strava run soundtracks">
      <header className="chorus-panel-head chorus-run-head">
        <div>
          <h2>Recent Strava runs</h2>
          <p>{pairedRuns.length} paired with Last.fm</p>
        </div>
        <span>
          <Activity size={15} strokeWidth={2} />
          Strava + Last.fm
        </span>
      </header>
      <div className="chorus-run-list">
        {pairedRuns.map((run) => (
          <article className="chorus-run-row" key={`${run.dateLabel}-${run.name}`}>
            <time>
              <strong>{run.dateLabel}</strong>
              <span>{run.timeLabel}</span>
            </time>
            <div className="chorus-run-main">
              <header>
                <div>
                  <strong>{run.name}</strong>
                  <span>
                    {run.distance} / {run.duration} / {run.pace} / {run.elevation}
                  </span>
                </div>
                <em>{run.soundtrack}</em>
              </header>
              <div className="chorus-run-track-strip">
                {run.tracks.slice(0, 2).map((track) => (
                  <span className="chorus-run-track" key={`${run.name}-${track.artist}-${track.title}`}>
                    <span className="chorus-mini-cover" aria-hidden="true">
                      {track.imageUrl ? <img src={track.imageUrl} alt="" loading="lazy" /> : <i />}
                    </span>
                    <span>
                      <strong>{track.title}</strong>
                      <small>{track.artist}</small>
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <span className="chorus-run-badge">
              <Music2 size={14} strokeWidth={2} />
              {run.tracks.length} tracks
            </span>
          </article>
        ))}
      </div>
    </article>
  );
}

export function ChorusDashboardPreview({ compact = false }) {
  const [activePeriod, setActivePeriod] = useState("All");
  const visibleLimit = periodLimits[activePeriod] ?? periodLimits.All;
  const visibleArtists = chorusData.topArtists.slice(0, visibleLimit);
  const visibleAlbums = chorusData.topAlbums.slice(0, visibleLimit);
  const visibleTracks = chorusData.topTracks.slice(0, visibleLimit);
  const metrics = [
    ["Scrobbles", formatNumber(chorusData.summary.totalScrobbles), activePeriod === "All" ? "All-time total" : `${activePeriod} view selected`, Signal],
    ["Artists", formatNumber(visibleArtists.length), activePeriod === "All" ? "Known by Last.fm" : "Visible in this cut", UserRound],
    ["Albums", formatNumber(visibleAlbums.length), activePeriod === "All" ? "Known by Last.fm" : "Visible in this cut", Radio],
    ["Tracks", formatNumber(visibleTracks.length), activePeriod === "All" ? "Known by Last.fm" : "Visible in this cut", Sparkles],
    ["Top artist", visibleArtists[0]?.name ?? "Unavailable", `${formatNumber(visibleArtists[0]?.plays ?? 0)} scrobbles`, null],
    ["Account age", chorusData.summary.accountAgeLabel, "Since registration", Clock3]
  ];

  return (
    <section className={`chorus-preview ${compact ? "is-compact" : ""}`} aria-label="Chorus dashboard">
      <section className="chorus-dashboard" id="overview">
        <section className="chorus-archive-card">
          <div>
            <span>Chorus / Listening archive</span>
            <h1>{formatNumber(chorusData.summary.totalScrobbles)} scrobbles across the full archive.</h1>
            <p>{periodDescriptions[activePeriod]}</p>
          </div>
          <div className="chorus-periods" aria-label="Time period">
            {periods.map((period) => (
              <button
                className={period === activePeriod ? "active" : ""}
                type="button"
                aria-pressed={period === activePeriod}
                onClick={() => setActivePeriod(period)}
                key={period}
              >
                {period}
              </button>
            ))}
          </div>
        </section>

        <section className="chorus-hero-row">
          <article className="chorus-now-card">
            <div className="chorus-cover-card">
              <AlbumCover
                imageUrl={nowPlaying.imageUrl}
                title={nowPlaying.title}
                artist={nowPlaying.artist}
              />
            </div>
            <div className="chorus-now-copy">
              <span>Last played</span>
              <h2>{nowPlaying.title}</h2>
              <strong>{nowPlaying.artist}</strong>
              <p>{nowPlaying.album}</p>
              <ChorusWave />
              <footer>
                <a href="https://www.last.fm/" target="_blank" rel="noreferrer">
                  View on Last.fm <ExternalLink size={14} />
                </a>
                <span>{nowPlaying.timeLabel}</span>
              </footer>
            </div>
          </article>

          <article className="chorus-feed-card">
            <h2>Recent feed</h2>
            <p>Newest plays</p>
            <span>Today</span>
            <div>
              {chorusData.recentTracks.map((track, index) => (
                <article key={`${track.title}-${index}`}>
                  <span className="chorus-mini-cover" aria-hidden="true">
                    {track.imageUrl ? <img src={track.imageUrl} alt="" loading="lazy" /> : <i />}
                  </span>
                  <div>
                    <strong>{track.title}</strong>
                    <small>{detailLine(track.artist, track.album)}</small>
                  </div>
                  <em>{track.timeLabel}</em>
                </article>
              ))}
            </div>
          </article>
        </section>

        <RunSoundtrackWidget />

        <section className="chorus-metric-grid" aria-label="Chorus metrics">
          {metrics.map(([label, value, detail, Icon], index) => (
            <article className="chorus-metric-card" key={label}>
              <header>
                <span>{label}</span>
                {Icon ? <Icon size={15} strokeWidth={2} /> : <ChorusAvatar label="JH" index={index} />}
              </header>
              <strong>{value}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </section>

        <section className="chorus-main-grid">
          <TopArtists artists={visibleArtists} />
          <AlbumsWall albums={visibleAlbums} />
          <TopTracks tracks={visibleTracks} />
        </section>

        <footer className="chorus-preview-footer">
          <span>Snapshot from @{chorusData.username} on Last.fm</span>
          <span>
            Data from <strong>{chorusData.source}</strong>
          </span>
        </footer>
      </section>
    </section>
  );
}
