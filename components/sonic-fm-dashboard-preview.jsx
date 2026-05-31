"use client";

import {
  ArrowRight,
  Clock3,
  ExternalLink,
  Radio,
  Signal,
  Sparkles,
  UserRound
} from "lucide-react";
import { useEffect, useState } from "react";
import sonicData from "@/data/sonic-fm-data.json";

const periods = ["7D", "1M", "3M", "6M", "12M", "All"];
const navItems = ["Overview", "Artists", "Albums", "Tracks"];

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value);
}

function detailLine(primary, secondary) {
  return secondary ? `${primary} - ${secondary}` : primary;
}

const metrics = [
  ["Scrobbles", formatNumber(sonicData.summary.totalScrobbles), "All-time total", Signal],
  ["Artists", formatNumber(sonicData.summary.artistCount), "Known by Last.fm", UserRound],
  ["Albums", formatNumber(sonicData.summary.albumCount), "Known by Last.fm", Radio],
  ["Tracks", formatNumber(sonicData.summary.trackCount), "Known by Last.fm", Sparkles],
  ["Top artist", sonicData.topArtists[0]?.name ?? "Unavailable", `${formatNumber(sonicData.topArtists[0]?.plays ?? 0)} scrobbles`, null],
  ["Account age", sonicData.summary.accountAgeLabel, "Since registration", Clock3]
];

const topArtistMax = sonicData.topArtists[0]?.plays ?? 1;
const topTrackMax = sonicData.topTracks[0]?.plays ?? 1;
const nowPlaying = sonicData.nowPlaying ?? {
  title: "No recent track",
  artist: "Last.fm",
  album: "Listening archive",
  timeLabel: "Recent",
  imageUrl: null
};

function ChorusLogo() {
  return (
    <span className="sonic-logo" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function SonicAvatar({ label, index = 0, imageUrl }) {
  return (
    <span className={`sonic-avatar sonic-avatar-${index % 6}`} aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : label}
    </span>
  );
}

function AlbumCover({ imageUrl, title, artist, tone = "bloom", className = "" }) {
  return (
    <span className={`sonic-album-cover is-${tone} ${imageUrl ? "has-artwork" : ""} ${className}`} aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt={artist ? `${title} by ${artist}` : title} loading="lazy" /> : <i />}
    </span>
  );
}

function SonicWave() {
  return (
    <span className="sonic-wave" aria-hidden="true">
      {Array.from({ length: 24 }, (_, index) => (
        <i key={index} style={{ "--height": `${22 + ((index * 11) % 36)}px` }} />
      ))}
    </span>
  );
}

function AlbumTile({ album, index }) {
  return (
    <article className="sonic-album">
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

function TopArtists() {
  return (
    <article className="sonic-panel sonic-list-panel" id="artists">
      <header className="sonic-panel-head">
        <div>
          <h2>Top artists</h2>
          <p>24 ranked</p>
        </div>
        <a href="#albums">
          Open <ArrowRight size={14} strokeWidth={2} />
        </a>
      </header>
      <div className="sonic-artist-list">
        {sonicData.topArtists.map((artist, index) => (
          <div className="sonic-artist-row" key={artist.name}>
            <span className="sonic-rank">{index + 1}</span>
            <SonicAvatar label={artist.initials} index={index} imageUrl={artist.imageUrl} />
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

function AlbumsWall() {
  return (
    <article className="sonic-panel sonic-album-panel" id="albums">
      <header className="sonic-panel-head">
        <div>
          <h2>Albums wall</h2>
          <p>120 albums</p>
        </div>
        <a href="#tracks">
          Open <ArrowRight size={14} strokeWidth={2} />
        </a>
      </header>
      <div className="sonic-album-grid">
        {sonicData.topAlbums.map((album, index) => (
          <AlbumTile album={album} index={index} key={album.title} />
        ))}
      </div>
    </article>
  );
}

function TopTracks() {
  return (
    <article className="sonic-panel sonic-track-panel" id="tracks">
      <header className="sonic-panel-head">
        <div>
          <h2>Top tracks</h2>
          <p>40 tracks</p>
        </div>
        <a href="#overview">
          Open <ArrowRight size={14} strokeWidth={2} />
        </a>
      </header>
      <div className="sonic-track-list">
        {sonicData.topTracks.map((track, index) => (
          <div className="sonic-track-row" key={track.title}>
            <span>{index + 1}</span>
            <SonicAvatar label="" index={index + 2} imageUrl={track.imageUrl} />
            <strong>{track.title}</strong>
            <em>{formatNumber(track.plays)}</em>
            <i style={{ "--bar": `${Math.round((track.plays / topTrackMax) * 100)}%` }} />
          </div>
        ))}
      </div>
    </article>
  );
}

export function SonicFmDashboardPreview({ compact = false }) {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    function syncHash() {
      const section = window.location.hash.replace("#", "") || "overview";
      if (navItems.some((item) => item.toLowerCase() === section)) {
        setActiveSection(section);
      }
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  return (
    <section className={`sonic-preview ${compact ? "is-compact" : ""}`} aria-label="Chorus dashboard preview">
      <header className="sonic-topbar">
        <a className="sonic-brand" href="#overview">
          <ChorusLogo />
          Chorus
        </a>
        <nav aria-label="Chorus preview navigation">
          {navItems.map((item) => {
            const section = item.toLowerCase();
            return (
              <a
                className={activeSection === section ? "active" : ""}
                href={`#${section}`}
                key={item}
                onClick={() => setActiveSection(section)}
              >
                {item}
              </a>
            );
          })}
        </nav>
        <a className="sonic-lastfm-link" href="https://www.last.fm/" target="_blank" rel="noreferrer">
          View on Last.fm
          <ExternalLink size={14} strokeWidth={2} />
        </a>
      </header>

      <section className="sonic-dashboard" id="overview">
        <section className="sonic-archive-card">
          <div>
            <span>Listening archive</span>
            <h1>{formatNumber(sonicData.summary.totalScrobbles)} scrobbles across the full archive.</h1>
            <p>Overall lens. Totals stay all-time; rankings and identity follow the selected period.</p>
          </div>
          <div className="sonic-periods" aria-label="Time period">
            {periods.map((period) => (
              <button className={period === "All" ? "active" : ""} type="button" key={period}>
                {period}
              </button>
            ))}
          </div>
        </section>

        <section className="sonic-hero-row">
          <article className="sonic-now-card">
            <div className="sonic-cover-card">
              <AlbumCover
                imageUrl={nowPlaying.imageUrl}
                title={nowPlaying.title}
                artist={nowPlaying.artist}
              />
            </div>
            <div className="sonic-now-copy">
              <span>Last played</span>
              <h2>{nowPlaying.title}</h2>
              <strong>{nowPlaying.artist}</strong>
              <p>{nowPlaying.album}</p>
              <SonicWave />
              <footer>
                <a href="https://www.last.fm/" target="_blank" rel="noreferrer">
                  View on Last.fm <ExternalLink size={14} />
                </a>
                <span>{nowPlaying.timeLabel}</span>
              </footer>
            </div>
          </article>

          <article className="sonic-feed-card">
            <h2>Recent feed</h2>
            <p>Newest plays</p>
            <span>Today</span>
            <div>
              {sonicData.recentTracks.map((track, index) => (
                <article key={`${track.title}-${index}`}>
                  <span className="sonic-mini-cover" aria-hidden="true">
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

        <section className="sonic-metric-grid" aria-label="Chorus metrics">
          {metrics.map(([label, value, detail, Icon], index) => (
            <article className="sonic-metric-card" key={label}>
              <header>
                <span>{label}</span>
                {Icon ? <Icon size={15} strokeWidth={2} /> : <SonicAvatar label="JH" index={index} />}
              </header>
              <strong>{value}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </section>

        <section className="sonic-main-grid">
          <TopArtists />
          <AlbumsWall />
          <TopTracks />
        </section>

        <footer className="sonic-preview-footer">
          <span>Snapshot from @{sonicData.username} on Last.fm</span>
          <span>
            Data from <strong>{sonicData.source}</strong>
          </span>
        </footer>
      </section>
    </section>
  );
}
