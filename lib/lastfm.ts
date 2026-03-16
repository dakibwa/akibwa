import { demoSnapshot, FALLBACK_USERNAME } from './demoTaste';
import type { AlbumProfile, ArtistProfile, ClusterId, ListeningSnapshot } from '../types';

const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY || '';
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const DEFAULT_USERNAME = FALLBACK_USERNAME;

const clusterProfiles: Array<{
  id: ClusterId;
  label: string;
  color: string;
  keywords: string[];
  fallbackSummary: string;
}> = [
  {
    id: 'pulse',
    label: 'Pulse',
    color: '#8ad8ff',
    keywords: ['electronic', 'ambient', 'house', 'techno', 'idm', 'dance', 'club'],
    fallbackSummary: 'Rhythmic light, inward motion, and electronics with emotional depth.'
  },
  {
    id: 'drift',
    label: 'Drift',
    color: '#cda8ff',
    keywords: ['jazz', 'spiritual', 'folk', 'experimental', 'psych', 'dream', 'cosmic'],
    fallbackSummary: 'Airy, exploratory music that treats silence and texture as real material.'
  },
  {
    id: 'hearth',
    label: 'Hearth',
    color: '#f8d58b',
    keywords: ['indie', 'rock', 'songwriter', 'art rock', 'post-punk', 'alternative'],
    fallbackSummary: 'Guitars, rooms, voices, and the vivid intimacy of people making strange songs.'
  },
  {
    id: 'veil',
    label: 'Veil',
    color: '#f3a6ff',
    keywords: ['hip-hop', 'grime', 'rap', 'r&b', 'neo soul', 'uk rap'],
    fallbackSummary: 'Sharper silhouettes: rap, nocturnal elegance, and emotional directness.'
  }
];

const safeArray = <T,>(value: T | T[] | undefined | null): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const request = async (params: Record<string, string>) => {
  const url = new URL(LASTFM_BASE_URL);
  Object.entries({ ...params, api_key: LASTFM_API_KEY, format: 'json', autocorrect: '1' }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Last.fm request failed (${response.status})`);
  }

  return response.json();
};

const normaliseTag = (value: string) => value.trim().toLowerCase();

const pickCluster = (tags: string[]): { cluster: ClusterId; label: string; color: string; summary: string } => {
  const tagSet = tags.map(normaliseTag);
  let best = clusterProfiles[0];
  let bestScore = -1;

  clusterProfiles.forEach((profile) => {
    const score = profile.keywords.reduce((total, keyword) => total + (tagSet.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = profile;
      bestScore = score;
    }
  });

  return {
    cluster: best.id,
    label: best.label,
    color: best.color,
    summary: best.fallbackSummary,
  };
};

const enrichArtist = async (artist: { name: string; playcount: string; url?: string; image?: Array<{ '#text': string }> }) => {
  const [info, topTracks, topAlbums] = await Promise.all([
    request({ method: 'artist.getinfo', artist: artist.name }),
    request({ method: 'artist.gettoptracks', artist: artist.name, limit: '1' }),
    request({ method: 'artist.gettopalbums', artist: artist.name, limit: '1' })
  ]);

  const tags = safeArray(info.artist?.tags?.tag)
    .map((tag: any) => tag.name)
    .filter(Boolean)
    .slice(0, 4);

  const similar = safeArray(info.artist?.similar?.artist)
    .map((entry: any) => entry.name)
    .filter(Boolean)
    .slice(0, 4);

  const cluster = pickCluster(tags);

  const profile: ArtistProfile = {
    name: artist.name,
    playcount: Number.parseInt(artist.playcount, 10) || 0,
    listeners: Number.parseInt(info.artist?.stats?.listeners || '0', 10) || undefined,
    url: artist.url || info.artist?.url,
    imageUrl:
      artist.image?.at(-1)?.['#text'] ||
      safeArray(info.artist?.image).at(-1)?.['#text'] ||
      undefined,
    tags,
    similar,
    topTrack: safeArray(topTracks.toptracks?.track)[0]?.name,
    topAlbum: safeArray(topAlbums.topalbums?.album)[0]?.name,
    cluster: cluster.cluster,
    clusterLabel: cluster.label,
    color: cluster.color,
    summary: cluster.summary,
  };

  return profile;
};

const topArtistNames = new Set(demoSnapshot.artists.map((artist) => artist.name.toLowerCase()));

const mergeWithTasteBias = (artists: ArtistProfile[]) => {
  return artists.map((artist) => {
    const match = demoSnapshot.artists.find((entry) => entry.name.toLowerCase() === artist.name.toLowerCase());
    if (!match) return artist;

    return {
      ...artist,
      cluster: match.cluster,
      clusterLabel: match.clusterLabel,
      color: match.color,
      summary: match.summary,
      topTrack: artist.topTrack || match.topTrack,
      topAlbum: artist.topAlbum || match.topAlbum,
      tags: artist.tags.length ? artist.tags : match.tags,
      similar: artist.similar.length ? artist.similar : match.similar,
    };
  }).sort((left, right) => {
    const leftBias = topArtistNames.has(left.name.toLowerCase()) ? 1 : 0;
    const rightBias = topArtistNames.has(right.name.toLowerCase()) ? 1 : 0;
    return rightBias - leftBias || right.playcount - left.playcount;
  });
};

export const fetchListeningSnapshot = async (username = DEFAULT_USERNAME): Promise<ListeningSnapshot> => {
  if (!LASTFM_API_KEY) {
    return demoSnapshot;
  }

  try {
    const [topArtistsResponse, topAlbumsResponse] = await Promise.all([
      request({ method: 'user.gettopartists', user: username, limit: '18', period: 'overall' }),
      request({ method: 'user.gettopalbums', user: username, limit: '8', period: 'overall' }),
    ]);

    const rawArtists = safeArray(topArtistsResponse.topartists?.artist).slice(0, 12);
    const artists = mergeWithTasteBias(await Promise.all(rawArtists.map(enrichArtist)));

    const albums: AlbumProfile[] = safeArray(topAlbumsResponse.topalbums?.album)
      .slice(0, 6)
      .map((album: any) => ({
        name: album.name,
        artist: album.artist?.name || 'Unknown artist',
        playcount: Number.parseInt(album.playcount, 10) || 0,
        imageUrl: safeArray(album.image).at(-1)?.['#text'] || undefined,
        url: album.url || undefined,
      }));

    return {
      source: 'lastfm',
      username,
      fetchedAt: new Date().toISOString(),
      artists,
      albums,
    };
  } catch (error) {
    console.error('Falling back to embedded taste snapshot:', error);
    return demoSnapshot;
  }
};
