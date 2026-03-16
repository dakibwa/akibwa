export type ClusterId = 'pulse' | 'drift' | 'hearth' | 'veil';

export interface ArtistProfile {
  name: string;
  playcount: number;
  listeners?: number;
  url?: string;
  imageUrl?: string;
  tags: string[];
  similar: string[];
  topTrack?: string;
  topAlbum?: string;
  cluster: ClusterId;
  clusterLabel: string;
  color: string;
  summary: string;
}

export interface AlbumProfile {
  name: string;
  artist: string;
  playcount: number;
  imageUrl?: string;
  url?: string;
}

export interface ListeningSnapshot {
  source: 'lastfm' | 'fallback';
  username: string;
  fetchedAt: string;
  artists: ArtistProfile[];
  albums: AlbumProfile[];
}

export interface ConstellationNode extends ArtistProfile {
  id: string;
  radius: number;
  x: number;
  y: number;
}

export interface ConstellationLink {
  source: string;
  target: string;
  strength: number;
  type: 'cluster' | 'similar' | 'bridge';
}

export interface ConstellationGraph {
  nodes: ConstellationNode[];
  links: ConstellationLink[];
}
