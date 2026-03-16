import React from 'react';
import type { ArtistProfile, ListeningSnapshot } from '../types';

interface ArtistDetailProps {
  artist: ArtistProfile;
  snapshot: ListeningSnapshot;
}

const ArtistDetail: React.FC<ArtistDetailProps> = ({ artist, snapshot }) => {
  const neighbouringArtists = snapshot.artists
    .filter((candidate) => candidate.name !== artist.name && candidate.cluster === artist.cluster)
    .slice(0, 3);

  return (
    <aside className="detail-panel shell-card" aria-live="polite">
      <div>
        <div className="detail-kicker">Selected star</div>
        <h2 className="artist-name">{artist.name}</h2>
        <p className="detail-copy">{artist.summary}</p>
      </div>

      <div className="artist-meta">
        <span className="cluster-chip">
          <span className="swatch" style={{ color: artist.color, background: artist.color }} />
          {artist.clusterLabel}
        </span>
        <span className="cluster-chip">{artist.playcount.toLocaleString()} plays</span>
      </div>

      <div className="detail-grid">
        <div className="insight-card">
          <span className="detail-label">Anchor release</span>
          <div className="detail-value">{artist.topAlbum || 'Still mapping'}</div>
        </div>
        <div className="insight-card">
          <span className="detail-label">Track in orbit</span>
          <div className="detail-value">{artist.topTrack || 'Still mapping'}</div>
        </div>
        <div className="insight-card">
          <span className="detail-label">Tags</span>
          <div className="detail-value">{artist.tags.join(' · ') || 'Unknown weather'}</div>
        </div>
        <div className="insight-card">
          <span className="detail-label">Nearby stars</span>
          <div className="detail-value">{neighbouringArtists.map((entry) => entry.name).join(' · ') || 'No immediate neighbours yet'}</div>
        </div>
      </div>

      <div>
        <h3>Why it sits here</h3>
        <p className="data-note">
          Dakibwa treats Last.fm listening history as the spine, then arranges artists into a few intuitive celestial regions — not as hard genres, more as shared temperature.
        </p>
      </div>

      {artist.url ? (
        <a className="pill primary" href={artist.url} target="_blank" rel="noreferrer">
          Open on Last.fm
        </a>
      ) : null}
    </aside>
  );
};

export default ArtistDetail;
