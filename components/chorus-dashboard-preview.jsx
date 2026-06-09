"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock3,
  ExternalLink,
  Radio,
  Signal,
  Sparkles,
  UserRound
} from "lucide-react";
import fallbackChorusData from "@/data/chorus-data.json";

const remoteChorusDataUrl = (
  process.env.NEXT_PUBLIC_CHORUS_DATA_URL || "https://akibwa-chorus-refresh.dakibwa.workers.dev/chorus"
).trim();

function formatNumber(value) {
  const numeric = Number(value);
  return new Intl.NumberFormat("en").format(Number.isFinite(numeric) ? numeric : 0);
}

function detailLine(primary, secondary) {
  return secondary ? `${primary} - ${secondary}` : primary;
}

const fallbackNowPlaying = {
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

function RunSoundtrackWidget({ recentRuns }) {
  const pairedRuns = (recentRuns ?? []).filter((run) => run.tracks?.length);

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
            <header className="chorus-run-main">
              <time>
                <strong>{run.dateLabel}</strong>
                <span>{run.timeLabel}</span>
              </time>
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
          </article>
        ))}
      </div>
    </article>
  );
}

function isChorusData(data) {
  return data?.summary && Array.isArray(data?.recentTracks) && Array.isArray(data?.topArtists);
}

export function ChorusDashboardPreview({ compact = false, dataUrl = remoteChorusDataUrl }) {
  const [runtimeChorusData, setRuntimeChorusData] = useState(fallbackChorusData);

  useEffect(() => {
    const url = String(dataUrl || "").trim();
    if (!url) return undefined;

    let cancelled = false;
    let idleId;
    let timerId;

    const refreshData = () => {
      fetch(url, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!cancelled && isChorusData(data)) {
            setRuntimeChorusData(data);
          }
        })
        .catch(() => {});
    };

    if (window.requestIdleCallback) {
      idleId = window.requestIdleCallback(refreshData, { timeout: 1600 });
    } else {
      timerId = window.setTimeout(refreshData, 320);
    }

    return () => {
      cancelled = true;
      if (idleId) window.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, [dataUrl]);

  const chorusData = runtimeChorusData;
  const nowPlaying = chorusData.nowPlaying ?? fallbackNowPlaying;
  const visibleArtists = useMemo(() => chorusData.topArtists ?? [], [chorusData.topArtists]);
  const visibleAlbums = useMemo(() => chorusData.topAlbums ?? [], [chorusData.topAlbums]);
  const visibleTracks = useMemo(() => chorusData.topTracks ?? [], [chorusData.topTracks]);
  const recentTracks = chorusData.recentTracks ?? [];
  const metrics = [
    ["Scrobbles", formatNumber(chorusData.summary?.totalScrobbles), "All-time total", Signal],
    ["Artists", formatNumber(visibleArtists.length), "Known by Last.fm", UserRound],
    ["Albums", formatNumber(visibleAlbums.length), "Known by Last.fm", Radio],
    ["Tracks", formatNumber(visibleTracks.length), "Known by Last.fm", Sparkles],
    ["Top artist", visibleArtists[0]?.name ?? "Unavailable", `${formatNumber(visibleArtists[0]?.plays ?? 0)} scrobbles`, null],
    ["Account age", chorusData.summary.accountAgeLabel, "Since registration", Clock3]
  ];

  return (
    <section className={`chorus-preview ${compact ? "is-compact" : ""}`} aria-label="Chorus dashboard">
      <section className="chorus-dashboard" id="overview">
        <section className="chorus-archive-card">
          <div>
            <span>Chorus / Listening archive</span>
            <h1>Listening archive</h1>
            <p>Live Last.fm snapshot with recent plays, top music, and run pairings.</p>
          </div>
          <p className="chorus-archive-stat">
            <strong>{formatNumber(chorusData.summary?.totalScrobbles)}</strong>
            <span>total scrobbles</span>
          </p>
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
              {recentTracks.map((track, index) => (
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

        <RunSoundtrackWidget recentRuns={chorusData.recentRuns} />

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
          <span>Snapshot from @{chorusData.username ?? "akibwa"} on Last.fm</span>
          <span>
            Data from <strong>{chorusData.source ?? "Last.fm"}</strong>
          </span>
        </footer>
      </section>
    </section>
  );
}
