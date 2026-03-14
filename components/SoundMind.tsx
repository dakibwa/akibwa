import React, { useEffect, useMemo, useRef, useState } from 'react';

interface SoundMindProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

interface Node {
  id: string;
  group: number;
  type: 'artist' | 'album' | 'genre';
  playcount?: number;
  favoriteAlbum?: string;
  favoriteTrack?: string;
  primaryGenre?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  driftPhase?: number;
  driftSpeed?: number;
  driftAmplitude?: number;
}

interface Link {
  source: string;
  target: string;
  reason: string;
  type: 'collaboration' | 'influence' | 'genre' | 'label' | 'feature' | 'similar';
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface ArtistData {
  name: string;
  playcount?: number;
  genres?: string[];
  favoriteAlbum?: string;
  favoriteTrack?: string;
  collaborators?: string[];
  similarArtists?: string[];
}

interface ListeningInsights {
  totalArtists: number;
  totalLinks: number;
  dominantCluster: string;
  dominantClusterCount: number;
  bridgeArtist: string;
  collaborationShare: number;
}

// Connection type colors
const CONNECTION_COLORS: Record<string, string> = {
  collaboration: '#3b82f6', // blue
  influence: '#8b5cf6',     // purple
  genre: '#10b981',         // green
  label: '#f59e0b',         // amber
  feature: '#ef4444',       // red
  similar: '#6b7280',       // gray
};

// Spotify OAuth - set your Client ID in environment variable VITE_SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_REDIRECT_URI =
  (typeof window !== 'undefined' ? `${window.location.origin}/` : import.meta.env.VITE_SPOTIFY_REDIRECT_URI || '');
const SPOTIFY_SCOPES = 'user-top-read user-read-recently-played';

// Last.fm API - set your API key in environment variable VITE_LASTFM_API_KEY  
const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY || '';

// OpenAI API configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5-mini';
const IS_DEV = import.meta.env.DEV;
const SPOTIFY_TOKEN_STORAGE_KEY = 'dakibwa_spotify_token';
const SPOTIFY_TOKEN_EXP_STORAGE_KEY = 'dakibwa_spotify_token_exp';
const SPOTIFY_STATE_STORAGE_KEY = 'dakibwa_spotify_state';
const GRAPH_CACHE_VERSION = '4';
const MAX_GRAPH_ARTISTS = 50;
const MIN_LASTFM_PLAYCOUNT = 5;
const MIN_SPOTIFY_SCORE = 40;

const NODE_GROUP_COLORS: Record<number, string> = {
  1: '#3dd6b7', // electronic
  2: '#59a6ff', // hip hop
  3: '#a78bfa', // rock
  4: '#ff8a65', // r&b
  5: '#f6c65b', // jazz
  6: '#ff6f91', // pop
  7: '#c7ced9', // other
};

const NODE_GROUP_SHAPES: Record<number, 'circle' | 'diamond' | 'square' | 'triangle' | 'hexagon'> = {
  1: 'circle',
  2: 'circle',
  3: 'circle',
  4: 'circle',
  5: 'circle',
  6: 'circle',
  7: 'circle',
};

const GROUP_LABELS: Record<number, string> = {
  1: 'Electronic',
  2: 'Hip Hop',
  3: 'Rock',
  4: 'R&B',
  5: 'Jazz',
  6: 'Pop',
  7: 'Eclectic',
};

const MUSIC_PANEL_CLASS =
  'rounded-[1.4rem] border border-white/10 bg-[#07111f]/72 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]';
const MUSIC_SUBPANEL_CLASS = 'rounded-[1.05rem] border border-white/10 bg-white/5';

// Simple database using localStorage
const saveToDatabase = (key: string, data: any) => {
  const db = JSON.parse(localStorage.getItem('dakibwa_music_db') || '{}');
  db[key] = { data, timestamp: new Date().toISOString() };
  localStorage.setItem('dakibwa_music_db', JSON.stringify(db));
};

// Demo data for when no API is connected
const DEMO_ARTISTS: ArtistData[] = [
  { name: "Radiohead", playcount: 1500, genres: ["alternative rock", "art rock"] },
  { name: "Aphex Twin", playcount: 800, genres: ["electronic", "idm"] },
  { name: "Kendrick Lamar", playcount: 1200, genres: ["hip hop", "conscious rap"] },
  { name: "Miles Davis", playcount: 600, genres: ["jazz", "fusion"] },
  { name: "Pink Floyd", playcount: 900, genres: ["progressive rock", "psychedelic"] },
  { name: "Daft Punk", playcount: 1100, genres: ["electronic", "house"] },
  { name: "Björk", playcount: 700, genres: ["art pop", "electronic"] },
  { name: "MF DOOM", playcount: 500, genres: ["hip hop", "abstract hip hop"] },
  { name: "Talking Heads", playcount: 650, genres: ["new wave", "art rock"] },
  { name: "Frank Ocean", playcount: 1300, genres: ["r&b", "neo soul"] },
  { name: "Tame Impala", playcount: 950, genres: ["psychedelic rock", "indie"] },
  { name: "Four Tet", playcount: 400, genres: ["electronic", "folktronica"] },
  { name: "Flying Lotus", playcount: 550, genres: ["electronic", "experimental hip hop"] },
  { name: "J Dilla", playcount: 450, genres: ["hip hop", "instrumental hip hop"] },
  { name: "Bon Iver", playcount: 850, genres: ["indie folk", "alternative"] },
];

const createSpotifyState = () => {
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const normalizeRedirectUri = (uri: string) => {
  try {
    const parsed = new URL(uri);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return '';
  }
};

const normaliseName = (name: string) => name.trim().toLowerCase();

const hexToRgba = (hex: string, alpha: number) => {
  const cleanHex = hex.replace('#', '');
  const value = cleanHex.length === 3
    ? cleanHex.split('').map((c) => c + c).join('')
    : cleanHex;
  const num = Number.parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawNodeShape = (
  ctx: CanvasRenderingContext2D,
  shape: 'circle' | 'diamond' | 'square' | 'triangle' | 'hexagon',
  x: number,
  y: number,
  radius: number
) => {
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    return;
  }
  if (shape === 'diamond') {
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y);
    ctx.lineTo(x, y + radius);
    ctx.lineTo(x - radius, y);
    ctx.closePath();
    return;
  }
  if (shape === 'square') {
    ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
    return;
  }
  if (shape === 'triangle') {
    ctx.moveTo(x, y - radius * 1.12);
    ctx.lineTo(x + radius, y + radius * 0.9);
    ctx.lineTo(x - radius, y + radius * 0.9);
    ctx.closePath();
    return;
  }

  // hexagon
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
};

const GROUP_KEYWORDS: Record<number, string[]> = {
  1: [
    'electronic', 'electronica', 'house', 'techno', 'idm', 'ambient', 'dance',
    'drum and bass', 'dnb', 'dubstep', 'garage', 'uk garage', 'trip hop', 'downtempo',
    'breakbeat', 'synthwave', 'electro', 'leftfield',
  ],
  2: [
    'hip hop', 'hip-hop', 'rap', 'trap', 'drill', 'grime', 'boom bap', 'boom-bap',
    'cloud rap', 'abstract hip hop', 'conscious hip hop',
  ],
  3: [
    'rock', 'indie', 'alternative', 'post-punk', 'punk', 'shoegaze', 'grunge',
    'metal', 'new wave', 'britpop', 'hardcore', 'garage rock', 'psychedelic rock',
  ],
  4: [
    'r&b', 'rnb', 'soul', 'neo soul', 'neosoul', 'funk',
  ],
  5: [
    'jazz', 'fusion', 'bebop', 'swing', 'bossa', 'blues',
  ],
  6: [
    'pop', 'art pop', 'synthpop', 'electropop', 'hyperpop', 'k-pop', 'indie pop',
  ],
};

const inferArtistGroup = (artist: ArtistData): number => {
  const tags = (artist.genres || []).map((genre) => genre.toLowerCase());
  if (tags.length === 0) return 7;

  const scores: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  tags.forEach((tag) => {
    Object.entries(GROUP_KEYWORDS).forEach(([groupId, keywords]) => {
      keywords.forEach((keyword) => {
        if (!tag.includes(keyword)) return;
        const boost = tag === keyword ? 2 : 1;
        scores[Number(groupId)] += boost;
      });
    });
  });

  // Prioritize clearer identities when score ties happen.
  const tieBreakOrder = [2, 4, 1, 5, 3, 6, 7];
  let bestGroup = 7;
  let bestScore = 0;

  tieBreakOrder.forEach((groupId) => {
    if (scores[groupId] > bestScore) {
      bestGroup = groupId;
      bestScore = scores[groupId];
    }
  });

  return bestScore > 0 ? bestGroup : 7;
};

const inferPrimaryGenre = (artist: ArtistData) => GROUP_LABELS[inferArtistGroup(artist)];

const buildDeterministicLinks = (artists: ArtistData[]): Link[] => {
  if (artists.length < 2) return [];
  const sorted = [...artists].sort((a, b) => (b.playcount || 0) - (a.playcount || 0));
  const links: Link[] = [];
  const grouped = new Map<number, ArtistData[]>();

  // Global backbone keeps the whole constellation connected.
  for (let i = 0; i < sorted.length - 1; i++) {
    links.push({
      source: sorted[i].name,
      target: sorted[i + 1].name,
      reason: 'Adjacency in listening profile',
      type: 'similar',
    });
  }

  // Intra-genre links encourage cluster clumping.
  sorted.forEach((artist) => {
    const group = inferArtistGroup(artist);
    const existing = grouped.get(group) || [];
    existing.push(artist);
    grouped.set(group, existing);
  });

  grouped.forEach((artistsInGroup) => {
    for (let i = 0; i < artistsInGroup.length - 1; i++) {
      links.push({
        source: artistsInGroup[i].name,
        target: artistsInGroup[i + 1].name,
        reason: `Shared ${GROUP_LABELS[inferArtistGroup(artistsInGroup[i])]} listening cluster`,
        type: 'genre',
      });
    }
  });

  const stride = 7;
  for (let i = 0; i < sorted.length; i++) {
    const target = sorted[(i + stride) % sorted.length];
    if (target.name === sorted[i].name) continue;
    links.push({
      source: sorted[i].name,
      target: target.name,
      reason: 'Cross-cluster listening bridge',
      type: 'similar',
    });
  }

  return links;
};

const buildSafeGraphData = (rawData: any, artists: ArtistData[]): GraphData => {
  const byName = new Map<string, ArtistData>();
  artists.forEach((artist) => byName.set(normaliseName(artist.name), artist));

  const rawNodeGroupByName = new Map<string, number>();
  if (Array.isArray(rawData?.nodes)) {
    rawData.nodes.forEach((node: any) => {
      const name = String(node?.id || '').trim();
      const group = Number(node?.group);
      if (!name || !Number.isFinite(group) || group < 1 || group > 7) return;
      rawNodeGroupByName.set(normaliseName(name), group);
    });
  }

  const nodes: Node[] = artists.map((artist) => {
    const inferredGroup = inferArtistGroup(artist);
    const aiSuggestedGroup = rawNodeGroupByName.get(normaliseName(artist.name));
    const group = inferredGroup === 7 && aiSuggestedGroup ? aiSuggestedGroup : inferredGroup;

    return {
      id: artist.name,
      group,
      type: 'artist',
      playcount: artist.playcount,
      favoriteAlbum: artist.favoriteAlbum,
      favoriteTrack: artist.favoriteTrack,
      primaryGenre: GROUP_LABELS[group] || inferPrimaryGenre(artist),
    };
  });

  const deduped = new Set<string>();
  const links: Link[] = [];
  const rawLinks = Array.isArray(rawData?.links) ? rawData.links : [];

  rawLinks.forEach((link: any) => {
    const sourceArtist = byName.get(normaliseName(String(link?.source || '')));
    const targetArtist = byName.get(normaliseName(String(link?.target || '')));
    if (!sourceArtist || !targetArtist || sourceArtist.name === targetArtist.name) return;

    const key = [sourceArtist.name, targetArtist.name].sort().join('::');
    if (deduped.has(key)) return;
    deduped.add(key);

    links.push({
      source: sourceArtist.name,
      target: targetArtist.name,
      reason: String(link?.reason || 'Related in listening profile'),
      type: ['collaboration', 'influence', 'genre', 'label', 'feature', 'similar'].includes(link?.type)
        ? link.type
        : 'similar',
    });
  });

  // Derived collaboration links from actual multi-artist listening events.
  artists.forEach((artist) => {
    const collaborators = artist.collaborators || [];
    collaborators.forEach((collaboratorName) => {
      const target = byName.get(normaliseName(collaboratorName));
      if (!target || target.name === artist.name) return;

      const key = [artist.name, target.name].sort().join('::');
      if (deduped.has(key)) return;
      deduped.add(key);

      links.push({
        source: artist.name,
        target: target.name,
        reason: 'Co-appears in your top tracks',
        type: 'collaboration',
      });
    });
  });

  // Derived influence links from Last.fm similar-artist graph.
  artists.forEach((artist) => {
    const similarArtists = artist.similarArtists || [];
    similarArtists.forEach((similarName) => {
      const target = byName.get(normaliseName(similarName));
      if (!target || target.name === artist.name) return;

      const key = [artist.name, target.name].sort().join('::');
      if (deduped.has(key)) return;
      deduped.add(key);

      links.push({
        source: artist.name,
        target: target.name,
        reason: 'Strong Last.fm similarity profile',
        type: 'influence',
      });
    });
  });

  const minimumLinks = Math.max(artists.length - 1, Math.min(Math.floor(artists.length * 1.2), 110));
  if (links.length < minimumLinks) {
    buildDeterministicLinks(artists).forEach((link) => {
      const key = [link.source, link.target].sort().join('::');
      if (deduped.has(key)) return;
      deduped.add(key);
      links.push(link);
    });
  }

  return { nodes, links };
};

const computeListeningInsights = (graphData: GraphData | null): ListeningInsights | null => {
  if (!graphData || !Array.isArray(graphData.nodes) || graphData.nodes.length === 0) return null;

  const groupCounts = new Map<number, number>();
  graphData.nodes.forEach((node) => {
    groupCounts.set(node.group, (groupCounts.get(node.group) || 0) + 1);
  });

  let dominantGroup = 7;
  let dominantCount = 0;
  groupCounts.forEach((count, group) => {
    if (count > dominantCount) {
      dominantCount = count;
      dominantGroup = group;
    }
  });

  const nodeById = new Map<string, Node>();
  graphData.nodes.forEach((node) => nodeById.set(node.id, node));

  const degree = new Map<string, number>();
  const crossGroupNeighbors = new Map<string, Set<number>>();

  graphData.links.forEach((link) => {
    const source = nodeById.get(link.source);
    const target = nodeById.get(link.target);
    if (!source || !target) return;

    degree.set(source.id, (degree.get(source.id) || 0) + 1);
    degree.set(target.id, (degree.get(target.id) || 0) + 1);

    if (source.group !== target.group) {
      const sourceSet = crossGroupNeighbors.get(source.id) || new Set<number>();
      sourceSet.add(target.group);
      crossGroupNeighbors.set(source.id, sourceSet);

      const targetSet = crossGroupNeighbors.get(target.id) || new Set<number>();
      targetSet.add(source.group);
      crossGroupNeighbors.set(target.id, targetSet);
    }
  });

  let bridgeArtist = graphData.nodes[0].id;
  let bestBridgeScore = -1;
  graphData.nodes.forEach((node) => {
    const nodeDegree = degree.get(node.id) || 0;
    const crossGroupCount = crossGroupNeighbors.get(node.id)?.size || 0;
    const score = nodeDegree * (1 + crossGroupCount * 1.4);
    if (score > bestBridgeScore) {
      bestBridgeScore = score;
      bridgeArtist = node.id;
    }
  });

  const collaborationCount = graphData.links.filter((link) => link.type === 'collaboration').length;

  return {
    totalArtists: graphData.nodes.length,
    totalLinks: graphData.links.length,
    dominantCluster: GROUP_LABELS[dominantGroup] || GROUP_LABELS[7],
    dominantClusterCount: dominantCount,
    bridgeArtist,
    collaborationShare: graphData.links.length
      ? Math.round((collaborationCount / graphData.links.length) * 100)
      : 0,
  };
};

const SoundMind: React.FC<SoundMindProps> = ({ isOpen, onClose, embedded = false }) => {
  const [status, setStatus] = useState<'idle' | 'connect' | 'fetching' | 'analyzing' | 'visualizing'>('idle');
  const [provider, setProvider] = useState<'spotify' | 'lastfm' | 'demo' | null>(null);
  const [artistsData, setArtistsData] = useState<ArtistData[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<Link | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroupFilter, setActiveGroupFilter] = useState<number | 'all'>('all');
  // Last.fm state
  const [lastFmUsername, setLastFmUsername] = useState('');
  const [lastFmDraftUsername, setLastFmDraftUsername] = useState('');
  
  // Spotify state
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [lastFmEditMode, setLastFmEditMode] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const starfieldRef = useRef<Array<{ x: number; y: number; size: number; alpha: number; phase: number }>>([]);
  const hoveredNodeRef = useRef<string | null>(null);
  const hoveredLinkRef = useRef<Link | null>(null);
  const selectedNodeRef = useRef<string | null>(null);
  const searchQueryRef = useRef('');
  const activeGroupFilterRef = useRef<number | 'all'>('all');
  const insights = useMemo(() => computeListeningInsights(graphData), [graphData]);
  const sortedNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    return [...graphData.nodes].sort((left, right) => (right.playcount || 0) - (left.playcount || 0));
  }, [graphData]);
  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return sortedNodes.slice(0, 8);

    return sortedNodes
      .filter((node) => node.id.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [searchQuery, sortedNodes]);
  const visibleQuickPicks = useMemo(() => {
    return sortedNodes
      .filter((node) => activeGroupFilter === 'all' || node.group === activeGroupFilter)
      .slice(0, 10);
  }, [activeGroupFilter, sortedNodes]);
  const groupCounts = useMemo(() => {
    const counts = new Map<number, number>();
    graphData?.nodes.forEach((node) => {
      counts.set(node.group, (counts.get(node.group) || 0) + 1);
    });
    return counts;
  }, [graphData]);
  const activeArtistId = selectedNode || hoveredNode;
  const activeArtist = useMemo(() => {
    if (!activeArtistId || !graphData?.nodes) return null;
    return graphData.nodes.find((node) => node.id === activeArtistId) || null;
  }, [activeArtistId, graphData]);
  const activeArtistConnections = useMemo(() => {
    if (!graphData?.links || !activeArtistId) return [];

    const nodeById = new Map<string, Node>();
    graphData.nodes.forEach((node) => nodeById.set(node.id, node));

    const connectionWeight: Record<Link['type'], number> = {
      collaboration: 6,
      influence: 5,
      genre: 4,
      label: 3,
      feature: 5,
      similar: 2,
    };

    return graphData.links
      .filter((link) => link.source === activeArtistId || link.target === activeArtistId)
      .map((link) => {
        const counterpart = link.source === activeArtistId ? link.target : link.source;
        return {
          ...link,
          counterpart,
          counterpartNode: nodeById.get(counterpart) || null,
        };
      })
      .sort((left, right) => {
        const weightDelta = connectionWeight[right.type] - connectionWeight[left.type];
        if (weightDelta !== 0) return weightDelta;
        return (right.counterpartNode?.playcount || 0) - (left.counterpartNode?.playcount || 0);
      })
      .slice(0, 8);
  }, [activeArtistId, graphData]);

  const clearSpotifySession = () => {
    localStorage.removeItem(SPOTIFY_TOKEN_STORAGE_KEY);
    localStorage.removeItem(SPOTIFY_TOKEN_EXP_STORAGE_KEY);
    localStorage.removeItem(SPOTIFY_STATE_STORAGE_KEY);
    setSpotifyToken(null);
    setSpotifyConnected(false);
  };

  const saveSpotifySession = (token: string, expiresInSeconds = 3600) => {
    const expiration = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(SPOTIFY_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(SPOTIFY_TOKEN_EXP_STORAGE_KEY, String(expiration));
    setSpotifyToken(token);
    setSpotifyConnected(true);
  };

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
    hoveredLinkRef.current = hoveredLink;
    selectedNodeRef.current = selectedNode;
    searchQueryRef.current = searchQuery;
    activeGroupFilterRef.current = activeGroupFilter;
  }, [activeGroupFilter, hoveredLink, hoveredNode, searchQuery, selectedNode]);

  useEffect(() => {
    if (!isOpen || embedded) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [embedded, isOpen]);

  // Check for saved auth/data and Spotify callback on mount
  useEffect(() => {
    // 1) Spotify callback should take priority over any cached graph state
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const expiresIn = Number(params.get('expires_in') || '3600');
      const returnedState = params.get('state');
      const expectedState = localStorage.getItem(SPOTIFY_STATE_STORAGE_KEY);
      if (token) {
        if (expectedState && returnedState && expectedState !== returnedState) {
          alert('Spotify sign-in failed security check. Please try again.');
          clearSpotifySession();
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
        saveSpotifySession(token, expiresIn);
        setProvider('spotify');
        window.history.replaceState(null, '', window.location.pathname);
        setStatus('fetching');
        return;
      }
    }

    // 2) Restore valid Spotify session
    const savedToken = localStorage.getItem(SPOTIFY_TOKEN_STORAGE_KEY);
    const savedExp = Number(localStorage.getItem(SPOTIFY_TOKEN_EXP_STORAGE_KEY) || '0');
    if (savedToken && savedExp > Date.now()) {
      setSpotifyToken(savedToken);
      setSpotifyConnected(true);
    } else if (savedToken) {
      clearSpotifySession();
    }
    
    // 3) Check for saved graph
    const savedData = localStorage.getItem('dakibwa_music_graph');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const cachedGraph = parsed?.version === GRAPH_CACHE_VERSION ? parsed?.data : null;
        if (cachedGraph && Array.isArray(cachedGraph.nodes) && Array.isArray(cachedGraph.links)) {
          setGraphData(cachedGraph);
          setStatus('visualizing');
          return;
        }
      } catch (e) {
        // Ignore malformed cache
      }
      localStorage.removeItem('dakibwa_music_graph');
    }
    
    // 4) Load saved Last.fm username
    const savedUser = localStorage.getItem('dakibwa_lastfm_user');
    if (savedUser) {
      setLastFmUsername(savedUser);
      setLastFmDraftUsername(savedUser);
    }
    
    if (status === 'idle') setStatus('connect');
  }, []);

  // Fetch data when provider is selected
  useEffect(() => {
    if (status === 'fetching' && provider) {
      fetchMusicData();
    }
  }, [status, provider]);

  // Run analysis when artists data is loaded
  useEffect(() => {
    if (artistsData.length > 0 && status === 'fetching') {
      analyzeWithOpenAI();
    }
  }, [artistsData]);

  // --- SPOTIFY AUTH ---
  const connectSpotify = () => {
    if (!SPOTIFY_CLIENT_ID) {
      alert('Spotify is not configured yet. Try Demo mode or Last.fm!');
      return;
    }
    const redirectUri = normalizeRedirectUri(SPOTIFY_REDIRECT_URI);
    if (!redirectUri) {
      alert('Spotify redirect URI is missing. Set VITE_SPOTIFY_REDIRECT_URI.');
      return;
    }
    const state = createSpotifyState();
    localStorage.setItem(SPOTIFY_STATE_STORAGE_KEY, state);
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'token',
      redirect_uri: redirectUri,
      scope: SPOTIFY_SCOPES,
      show_dialog: 'true',
      state,
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  };

  // --- DATA FETCHING ---
  const fetchMusicData = async () => {
    setAnalysisProgress('Fetching your listening history...');
    
    if (provider === 'spotify' && spotifyToken) {
      await fetchSpotifyData();
    } else if (provider === 'lastfm') {
      await fetchLastFmData();
    } else if (provider === 'demo') {
      setArtistsData(DEMO_ARTISTS);
    }
  };

  const fetchSpotifyData = async () => {
    if (!spotifyToken) return;
    
    try {
      setAnalysisProgress('Fetching your top artists...');
      
      // Fetch top artists from multiple time ranges for comprehensive data
      const timeRanges = ['long_term', 'medium_term', 'short_term'];
      const artistMap = new Map<string, ArtistData>();
      const artistTrackScore = new Map<string, { score: number; favoriteTrack?: string; favoriteAlbum?: string }>();
      const collaborationWeights = new Map<string, number>();

      const addCollaboration = (left: string, right: string, weight: number) => {
        if (!left || !right || left === right) return;
        const key = [left, right].sort().join('::');
        collaborationWeights.set(key, (collaborationWeights.get(key) || 0) + weight);
      };
      
      for (const range of timeRanges) {
        const res = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=50&time_range=${range}`, {
          headers: { Authorization: `Bearer ${spotifyToken}` }
        });
        if (res.status === 401) {
          clearSpotifySession();
          alert('Spotify session expired. Please reconnect Spotify.');
          setStatus('connect');
          return;
        }
        const data = await res.json();
        
        if (data.items) {
          // Weight by time range (long_term = most listens historically)
          const weight = range === 'long_term' ? 3 : range === 'medium_term' ? 2 : 1;
          
          data.items.forEach((artist: any, index: number) => {
            const existing = artistMap.get(artist.name);
            // Score based on position and weight (top positions = more listens)
            const score = (50 - index) * weight * 20;
            
            if (existing) {
              existing.playcount = (existing.playcount || 0) + score;
            } else {
              artistMap.set(artist.name, {
                name: artist.name,
                genres: artist.genres,
                playcount: score,
              });
            }
          });
        }

        const topTracksRes = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${range}`, {
          headers: { Authorization: `Bearer ${spotifyToken}` }
        });
        if (topTracksRes.ok) {
          const topTracksData = await topTracksRes.json();
          if (Array.isArray(topTracksData.items)) {
            const weight = range === 'long_term' ? 3 : range === 'medium_term' ? 2 : 1;
            topTracksData.items.forEach((track: any, index: number) => {
              const score = (50 - index) * weight * 20;
              const albumName = track?.album?.name;
              const trackName = track?.name;
              const artists = Array.isArray(track?.artists) ? track.artists : [];
              const artistNamesOnTrack = artists
                .map((artistRef: any) => artistRef?.name)
                .filter((name: any) => typeof name === 'string' && name.trim().length > 0) as string[];

              artists.forEach((artistRef: any) => {
                const name = artistRef?.name;
                if (!name) return;
                const existingArtist = artistMap.get(name) || { name, playcount: 0, genres: [] };
                existingArtist.playcount = (existingArtist.playcount || 0) + Math.round(score * 0.12);
                artistMap.set(name, existingArtist);

                const current = artistTrackScore.get(name);
                if (!current || score > current.score) {
                  artistTrackScore.set(name, {
                    score,
                    favoriteTrack: trackName,
                    favoriteAlbum: albumName,
                  });
                }
              });

              for (let i = 0; i < artistNamesOnTrack.length; i++) {
                for (let j = i + 1; j < artistNamesOnTrack.length; j++) {
                  addCollaboration(artistNamesOnTrack[i], artistNamesOnTrack[j], score);
                }
              }
            });
          }
        }
      }
      
      // Also fetch recently played for additional context
      setAnalysisProgress('Fetching recent listening...');
      try {
        const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
          headers: { Authorization: `Bearer ${spotifyToken}` }
        });
        if (recentRes.status === 401) {
          clearSpotifySession();
          setStatus('connect');
          return;
        }
        const recentData = await recentRes.json();
        
        if (recentData.items) {
          for (const item of recentData.items) {
            const artistName = item.track?.artists?.[0]?.name;
            if (artistName) {
              const existing = artistMap.get(artistName);
              if (existing) {
                existing.playcount = (existing.playcount || 0) + 10;
              }
              if (!artistTrackScore.get(artistName) && item.track?.name) {
                artistTrackScore.set(artistName, {
                  score: 1,
                  favoriteTrack: item.track.name,
                  favoriteAlbum: item.track?.album?.name,
                });
              }
            }
          }
        }
      } catch (e) {
        if (IS_DEV) console.warn('Recent plays fetch failed, continuing with top artists');
      }
      
      const artists = Array.from(artistMap.values())
        .sort((a, b) => (b.playcount || 0) - (a.playcount || 0))
        .filter((artist) => (artist.playcount || 0) >= MIN_SPOTIFY_SCORE)
        .slice(0, MAX_GRAPH_ARTISTS);

      const includedNames = new Set(artists.map((artist) => artist.name));
      const collaboratorMap = new Map<string, Array<{ name: string; score: number }>>();

      collaborationWeights.forEach((score, pair) => {
        if (score < 120) return;
        const [left, right] = pair.split('::');
        if (!includedNames.has(left) || !includedNames.has(right)) return;

        const leftList = collaboratorMap.get(left) || [];
        leftList.push({ name: right, score });
        collaboratorMap.set(left, leftList);

        const rightList = collaboratorMap.get(right) || [];
        rightList.push({ name: left, score });
        collaboratorMap.set(right, rightList);
      });

      const enrichedArtists = artists.map((artist) => ({
        ...artist,
        favoriteTrack: artistTrackScore.get(artist.name)?.favoriteTrack,
        favoriteAlbum: artistTrackScore.get(artist.name)?.favoriteAlbum,
        collaborators: (collaboratorMap.get(artist.name) || [])
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map((entry) => entry.name),
      }));
      
      saveToDatabase('spotify_artists', enrichedArtists);
      setArtistsData(enrichedArtists);
      
    } catch (e) {
      console.error('Spotify fetch failed:', e);
      setProvider('demo');
      setArtistsData(DEMO_ARTISTS);
    }
  };

  const fetchLastFmData = async () => {
    if (!lastFmUsername || !LASTFM_API_KEY) {
      if (!LASTFM_API_KEY) console.warn('No Last.fm API key configured');
      setProvider('demo');
      setArtistsData(DEMO_ARTISTS);
      return;
    }
    
    try {
      setAnalysisProgress('Fetching your listening history...');
      
      const [artistsRes, tracksRes, albumsRes] = await Promise.all([
        fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${lastFmUsername}&api_key=${LASTFM_API_KEY}&format=json&limit=200&period=overall`),
        fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${lastFmUsername}&api_key=${LASTFM_API_KEY}&format=json&limit=500&period=overall`),
        fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${lastFmUsername}&api_key=${LASTFM_API_KEY}&format=json&limit=500&period=overall`),
      ]);
      const data = await artistsRes.json();
      const tracksData = tracksRes.ok ? await tracksRes.json() : {};
      const albumsData = albumsRes.ok ? await albumsRes.json() : {};
      
      if (data.error) throw new Error(data.message);
      
      if (data.topartists?.artist) {
        localStorage.setItem('dakibwa_lastfm_user', lastFmUsername);
        
        const favoriteTrackByArtist = new Map<string, string>();
        const favoriteAlbumByArtist = new Map<string, string>();

        if (Array.isArray(tracksData?.toptracks?.track)) {
          tracksData.toptracks.track.forEach((track: any) => {
            const artistName = track?.artist?.name;
            if (!artistName || favoriteTrackByArtist.has(artistName)) return;
            favoriteTrackByArtist.set(artistName, track?.name || '');
          });
        }

        if (Array.isArray(albumsData?.topalbums?.album)) {
          albumsData.topalbums.album.forEach((album: any) => {
            const artistName = album?.artist?.name;
            if (!artistName || favoriteAlbumByArtist.has(artistName)) return;
            favoriteAlbumByArtist.set(artistName, album?.name || '');
          });
        }

        const topArtists: ArtistData[] = data.topartists.artist.map((a: any) => ({
          name: a.name,
          playcount: parseInt(a.playcount, 10),
          favoriteTrack: favoriteTrackByArtist.get(a.name),
          favoriteAlbum: favoriteAlbumByArtist.get(a.name),
        }))
        .filter((artist) => (artist.playcount || 0) >= MIN_LASTFM_PLAYCOUNT)
        .slice(0, MAX_GRAPH_ARTISTS);

        setAnalysisProgress('Mining Last.fm artist profiles...');
        const artistMeta = new Map<string, { genres: string[]; similarArtists: string[] }>();
        const batchSize = 6;

        for (let index = 0; index < topArtists.length; index += batchSize) {
          const batch = topArtists.slice(index, index + batchSize);
          setAnalysisProgress(
            `Mining Last.fm artist profiles (${Math.min(index + batch.length, topArtists.length)}/${topArtists.length})...`
          );

          const batchResults = await Promise.all(
            batch.map(async (artist) => {
              try {
                const artistInfoRes = await fetch(
                  `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist.name)}&api_key=${LASTFM_API_KEY}&format=json&autocorrect=1`
                );
                if (!artistInfoRes.ok) {
                  return { name: artist.name, genres: [], similarArtists: [] };
                }

                const artistInfoData = await artistInfoRes.json();
                let tags = Array.isArray(artistInfoData?.artist?.tags?.tag)
                  ? artistInfoData.artist.tags.tag
                      .map((tag: any) => String(tag?.name || '').trim().toLowerCase())
                      .filter((name: string) => name.length > 0)
                      .slice(0, 10)
                  : [];

                if (tags.length === 0) {
                  const topTagsRes = await fetch(
                    `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist.name)}&api_key=${LASTFM_API_KEY}&format=json&autocorrect=1`
                  );
                  if (topTagsRes.ok) {
                    const topTagsData = await topTagsRes.json();
                    tags = Array.isArray(topTagsData?.toptags?.tag)
                      ? topTagsData.toptags.tag
                          .map((tag: any) => String(tag?.name || '').trim().toLowerCase())
                          .filter((name: string) => name.length > 0)
                          .slice(0, 10)
                      : [];
                  }
                }

                const similarArtists = Array.isArray(artistInfoData?.artist?.similar?.artist)
                  ? artistInfoData.artist.similar.artist
                      .map((similar: any) => String(similar?.name || '').trim())
                      .filter((name: string) => name.length > 0)
                      .slice(0, 10)
                  : [];

                return { name: artist.name, genres: tags, similarArtists };
              } catch {
                return { name: artist.name, genres: [], similarArtists: [] };
              }
            })
          );

          batchResults.forEach((result) => {
            artistMeta.set(normaliseName(result.name), {
              genres: result.genres,
              similarArtists: result.similarArtists,
            });
          });

          if (index + batchSize < topArtists.length) {
            await new Promise((resolve) => setTimeout(resolve, 120));
          }
        }

        const includedArtistNames = new Set(topArtists.map((artist) => normaliseName(artist.name)));
        const enrichedArtists = topArtists.map((artist) => {
          const meta = artistMeta.get(normaliseName(artist.name));
          const genres = (meta?.genres || []).slice(0, 8);
          const similarArtists = (meta?.similarArtists || [])
            .filter((name) => includedArtistNames.has(normaliseName(name)))
            .slice(0, 8);

          return {
            ...artist,
            genres,
            similarArtists,
          };
        });
        
        if (IS_DEV) {
          console.info('[Last.fm] Top artist:', enrichedArtists[0]?.name, 'with', enrichedArtists[0]?.playcount, 'scrobbles');
        }
        saveToDatabase('lastfm_artists', enrichedArtists);
        setLastFmEditMode(false);
        setArtistsData(enrichedArtists);
        } else {
        throw new Error('No artists found');
      }
    } catch (e) {
      console.error('Last.fm fetch failed:', e);
      alert('Could not find that Last.fm user. Please check the username.');
      setLastFmEditMode(true);
      setStatus('connect');
    }
  };

  // --- OPENAI ANALYSIS ---
  const analyzeWithOpenAI = async () => {
    setStatus('analyzing');
    setProgressPercent(0);
    
    // Cycling loading messages
    const loadingMessages = [
      'Analysing music...',
      'Forming links...',
      'Drawing up cartography...',
      'Creating the constellation...'
    ];
    let messageIndex = 0;
    setAnalysisProgress(loadingMessages[0]);
    
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setAnalysisProgress(loadingMessages[messageIndex]);
    }, 2500);
    
    // Smooth animated progress bar
    const progressInterval = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 90) return prev; // Cap at 90% until actually done
        return prev + 0.5;
      });
    }, 100);

    const artistNames = artistsData.map(a => a.name);
    const artistInfo = artistsData.map(a => 
      `${a.name}${a.genres ? ` (${a.genres.slice(0, 3).join(', ')})` : ''}`
    ).join(', ');

    // Save artists to database
    saveToDatabase('artists_input', { artists: artistNames, artistInfo });
    if (!OPENAI_API_KEY) {
      if (IS_DEV) console.warn('[OpenAI] No API key found, using fallback');
      // Fallback without OpenAI
      setAnalysisProgress('Creating connections...');
      const fallbackData: GraphData = buildSafeGraphData({}, artistsData);
      setGraphData(fallbackData);
      localStorage.setItem('dakibwa_music_graph', JSON.stringify({ version: GRAPH_CACHE_VERSION, data: fallbackData }));
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      setProgressPercent(100);
      setStatus('visualizing');
      return;
    }

    try {
      setAnalysisProgress('Analysing artist relationships...');

      const systemPrompt = [
        'You are a music expert.',
        'Generate only JSON for a network graph.',
        'Use only the artists provided by the user. Do not invent, rename, or add artists.',
        'Use this exact schema:',
        '{"nodes":[{"id":"Artist Name","group":1,"type":"artist"}],"links":[{"source":"Artist A","target":"Artist B","reason":"Brief reason","type":"collaboration"}]}',
        'Connection types: collaboration, influence, genre, label, feature, similar',
        'Groups: 1=Electronic, 2=Hip Hop, 3=Rock, 4=R&B, 5=Jazz, 6=Pop, 7=Other',
        `Create at least ${Math.min(Math.floor(artistNames.length * 1.2), 110)} links.`,
        'Every artist needs at least 2 connections.',
      ].join('\n');

      const userPrompt = `Artists: ${artistNames.join(', ')}`;

      setAnalysisProgress(`Waiting for OpenAI (${OPENAI_MODEL})...`);

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.4,
          max_output_tokens: 2400,
          input: [
            { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
            { role: 'user', content: [{ type: 'text', text: userPrompt }] },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `OpenAI request failed (${response.status})`);
      }

      const payload = await response.json();
      setAnalysisProgress('Processing response...');

      const outputText: string =
        payload?.output_text ||
        payload?.output?.flatMap((item: any) => item?.content || []).find((c: any) => c?.type === 'output_text')?.text ||
        '';
      let jsonText: string | undefined = outputText;
      
      if (!jsonText) {
        throw new Error('Unexpected response format - no text found');
      }
      
      setAnalysisProgress('Mapping your musical universe...');
      
      // Save raw response to database
      saveToDatabase('openai_raw_response', jsonText);
      
      if (jsonText) {
        let data: any;
        try {
            data = JSON.parse(jsonText);
        } catch (e) {
            const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
            data = JSON.parse(cleanJson);
        }
        
        // Save parsed response to database
        saveToDatabase('openai_parsed_response', data);

        if (!data || typeof data !== 'object') {
           throw new Error("Invalid response format");
        }

        const safeGraphData: GraphData = buildSafeGraphData(data, artistsData);
        
        saveToDatabase('final_graph', safeGraphData);

        setGraphData(safeGraphData);
        localStorage.setItem('dakibwa_music_graph', JSON.stringify({ version: GRAPH_CACHE_VERSION, data: safeGraphData }));
        clearInterval(progressInterval);
        clearInterval(messageInterval);
        setProgressPercent(100);
        setAnalysisProgress('Complete!');
        setTimeout(() => setStatus('visualizing'), 500);
      } else {
        clearInterval(progressInterval);
        clearInterval(messageInterval);
        throw new Error("No data returned");
      }

    } catch (error: any) {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      if (IS_DEV) {
        console.error("[OpenAI] Analysis Failed:", error);
        console.error("[OpenAI] Error details:", JSON.stringify(error, null, 2));
      }
      saveToDatabase('openai_error', { 
        message: error?.message, 
        stack: error?.stack,
        full: String(error)
      });
      setStatus('connect');
      alert(`Analysis failed: ${error?.message || 'Unknown error'}. Check console for details.`);
    }
  };

  const focusNode = (nodeId: string) => {
    const targetNode = nodesRef.current.find((node) => node.id === nodeId);
    if (!targetNode) return;

    const centerX = window.innerWidth >= 1280 ? window.innerWidth * 0.46 : window.innerWidth * 0.5;
    const centerY = window.innerWidth >= 1024 ? window.innerHeight * 0.52 : window.innerHeight * 0.42;

    targetNode.x = centerX;
    targetNode.y = centerY;
    targetNode.vx = 0;
    targetNode.vy = 0;

    if (!graphData?.links) return;

    const relatedIds = graphData.links
      .filter((link) => link.source === nodeId || link.target === nodeId)
      .map((link) => (link.source === nodeId ? link.target : link.source))
      .slice(0, 8);

    relatedIds.forEach((relatedId, index) => {
      const relatedNode = nodesRef.current.find((node) => node.id === relatedId);
      if (!relatedNode) return;

      const angle = (index / Math.max(relatedIds.length, 1)) * Math.PI * 2;
      const radius = Math.min(window.innerWidth, window.innerHeight) * 0.17;
      relatedNode.x = centerX + Math.cos(angle) * radius;
      relatedNode.y = centerY + Math.sin(angle) * radius;
      relatedNode.vx = 0;
      relatedNode.vy = 0;
    });
  };

  const handleNodeSelection = (nodeId: string, options?: { preserveGroup?: boolean }) => {
    setSelectedNode(nodeId);
    setHoveredNode(nodeId);
    setHoveredLink(null);
    setShowGuide(false);
    if (!options?.preserveGroup) {
      setActiveGroupFilter('all');
    }
    focusNode(nodeId);
  };

  const handleSearchSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return;

    const exactMatch = sortedNodes.find((node) => node.id.toLowerCase() === normalizedQuery);
    const partialMatch = exactMatch || sortedNodes.find((node) => node.id.toLowerCase().includes(normalizedQuery));
    if (!partialMatch) return;

    handleNodeSelection(partialMatch.id);
  };

  // --- CANVAS VISUALIZATION ---
  useEffect(() => {
    if (status !== 'visualizing' || !graphData || !canvasRef.current) return;
    
    const dataNodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
    const dataLinks = Array.isArray(graphData.links) ? graphData.links : [];

    if (dataNodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    if (starfieldRef.current.length === 0) {
      starfieldRef.current = Array.from({ length: 130 }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.3,
        alpha: Math.random() * 0.4 + 0.15,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    // Handle window resize
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      starfieldRef.current = starfieldRef.current.map((star) => ({
        ...star,
        x: Math.min(width, star.x),
        y: Math.min(height, star.y),
      }));
    };
    window.addEventListener('resize', handleResize);

    // Initialize nodes spread across the canvas
    if (nodesRef.current.length === 0 || nodesRef.current.length !== dataNodes.length) {
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.17;
      const groupIds = [1, 2, 3, 4, 5, 6, 7];
      const clusterAnchors = new Map<number, { x: number; y: number }>();
      groupIds.forEach((groupId, idx) => {
        const angle = -Math.PI / 2 + (idx / groupIds.length) * Math.PI * 2;
        clusterAnchors.set(groupId, {
          x: centerX + Math.cos(angle) * baseRadius,
          y: centerY + Math.sin(angle) * baseRadius,
        });
      });

      const groupedNodes = new Map<number, Node[]>();
      dataNodes.forEach((node) => {
        const existing = groupedNodes.get(node.group) || [];
        existing.push(node);
        groupedNodes.set(node.group, existing);
      });

      const seededNodes: Node[] = [];
      groupedNodes.forEach((groupNodes, groupId) => {
        const anchor = clusterAnchors.get(groupId) || { x: centerX, y: centerY };
        groupNodes.forEach((node, index) => {
          const armAngle = (index / Math.max(1, groupNodes.length)) * Math.PI * 2;
          const armRadius = 16 + index * 1.6 + Math.random() * 10;
          seededNodes.push({
            ...node,
            x: anchor.x + Math.cos(armAngle) * armRadius,
            y: anchor.y + Math.sin(armAngle) * armRadius,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            driftPhase: Math.random() * Math.PI * 2,
            driftSpeed: 0.28 + Math.random() * 0.32,
            driftAmplitude: 0.35 + Math.random() * 0.65,
          });
        });
      });

      nodesRef.current = seededNodes;
    }

    const isDark = true;
    const labelColor = isDark ? '#e0e0e0' : '#1a1a1a';
    const labelOutlineColor = isDark ? '#1a1a1a' : '#fafafa';
    const nodeById = new Map<string, Node>();
    nodesRef.current.forEach((node) => nodeById.set(node.id, node));
    const neighbors = new Map<string, Node[]>();
    dataLinks.forEach((link) => {
      const sourceNode = nodeById.get(link.source);
      const targetNode = nodeById.get(link.target);
      if (!sourceNode || !targetNode) return;

      const sourceNeighbors = neighbors.get(sourceNode.id) || [];
      sourceNeighbors.push(targetNode);
      neighbors.set(sourceNode.id, sourceNeighbors);

      const targetNeighbors = neighbors.get(targetNode.id) || [];
      targetNeighbors.push(sourceNode);
      neighbors.set(targetNode.id, targetNeighbors);
    });

    const animate = () => {
      const now = performance.now() * 0.001;
      // Dynamic physics based on canvas size
      const area = width * height;
      const nodeCount = nodesRef.current.length;
      const idealSpacing = Math.sqrt(area / nodeCount) * 0.8;
      const centerX = width / 2;
      const centerY = height / 2;
      const constellationRadius = Math.min(width, height) * 0.18;
      const clusterForce = 0.00075;

      const playcounts = nodesRef.current.map(n => n.playcount || 0).filter(p => p > 0);
      const maxPlaycount = Math.max(...playcounts, 1);
      const minPlaycount = Math.min(...playcounts, 0);
      const playcountRange = maxPlaycount - minPlaycount || 1;
      const getNodeRadius = (node: Node) => {
        const normalised = ((node.playcount || minPlaycount) - minPlaycount) / playcountRange;
        return 4 + normalised * 16;
      };
      const normalizedQuery = searchQueryRef.current.trim().toLowerCase();
      const selectedNodeId = selectedNodeRef.current;
      const filteredGroup = activeGroupFilterRef.current;
      const selectedNeighbors = new Set<string>();

      if (selectedNodeId) {
        dataLinks.forEach((link) => {
          if (link.source === selectedNodeId) selectedNeighbors.add(link.target);
          if (link.target === selectedNodeId) selectedNeighbors.add(link.source);
        });
      }

      const nodeMatchesQuery = (node: Node) => !normalizedQuery || node.id.toLowerCase().includes(normalizedQuery);
      const nodeMatchesGroup = (node: Node) => filteredGroup === 'all' || node.group === filteredGroup;
      const nodeIsFocused = (node: Node) =>
        !selectedNodeId || node.id === selectedNodeId || selectedNeighbors.has(node.id);
      const nodeIsDimmed = (node: Node) => {
        if (!nodeMatchesGroup(node)) return true;
        if (selectedNodeId && !nodeIsFocused(node)) return true;
        if (normalizedQuery && !nodeMatchesQuery(node) && node.id !== selectedNodeId && !selectedNeighbors.has(node.id)) {
          return true;
        }
        return false;
      };

      const groupIds = [1, 2, 3, 4, 5, 6, 7];
      const clusterAnchors = new Map<number, { x: number; y: number }>();
      groupIds.forEach((groupId, idx) => {
        const angle = -Math.PI / 2 + (idx / groupIds.length) * Math.PI * 2;
        clusterAnchors.set(groupId, {
          x: centerX + Math.cos(angle) * constellationRadius,
          y: centerY + Math.sin(angle) * constellationRadius,
        });
      });
      
      const repulsion = 1450;
      const springLength = Math.max(idealSpacing * 0.62, 118);
      const springStrength = 0.014;
      const damping = 0.915;
      const centerForce = 0.00055;
      const edgeBuffer = 220;
      const edgeForce = 0.045;

      nodesRef.current.forEach((node, i) => {
        if (!node.vx) node.vx = 0;
        if (!node.vy) node.vy = 0;

        // Repulsion from other nodes
        nodesRef.current.forEach((otherNode, j) => {
          if (i === j) return;
          const dx = node.x! - otherNode.x!;
          const dy = node.y! - otherNode.y!;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          const force = repulsion / distSq;
          
          node.vx! += (dx / dist) * force;
          node.vy! += (dy / dist) * force;
        });

        // Springs for connected nodes
        const linkedNodes = neighbors.get(node.id) || [];
        linkedNodes.forEach((other) => {
          const dx = other.x! - node.x!;
          const dy = other.y! - node.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - springLength) * springStrength;
          node.vx! += (dx / dist) * force;
          node.vy! += (dy / dist) * force;
        });

        // Very weak center gravity
        const dx = centerX - node.x!;
        const dy = centerY - node.y!;
        node.vx! += dx * centerForce;
        node.vy! += dy * centerForce;

        const anchor = clusterAnchors.get(node.group);
        if (anchor) {
          node.vx! += (anchor.x - node.x!) * clusterForce;
          node.vy! += (anchor.y - node.y!) * clusterForce;
        }

        // Subtle perpetual drift keeps the graph alive without jitter.
        const driftSpeed = node.driftSpeed || 0.36;
        const driftAmplitude = node.driftAmplitude || 0.5;
        const driftPhase = node.driftPhase || 0;
        node.vx! += Math.sin(now * driftSpeed + driftPhase) * driftAmplitude * 0.0024;
        node.vy! += Math.cos(now * (driftSpeed * 0.93) + driftPhase) * driftAmplitude * 0.0024;

        // Soft edge push keeps the constellation away from hard screen edges.
        if (node.x! < edgeBuffer) node.vx! += (edgeBuffer - node.x!) * edgeForce * 0.02;
        if (node.x! > width - edgeBuffer) node.vx! -= (node.x! - (width - edgeBuffer)) * edgeForce * 0.02;
        if (node.y! < edgeBuffer) node.vy! += (edgeBuffer - node.y!) * edgeForce * 0.02;
        if (node.y! > height - edgeBuffer) node.vy! -= (node.y! - (height - edgeBuffer)) * edgeForce * 0.02;

        // Apply velocity
        node.vx! *= damping;
        node.vy! *= damping;
        node.x! += node.vx!;
        node.y! += node.vy!;

        // Keep within bounds with minimal correction.
        const hardPadding = 80;
        node.x! = Math.min(width - hardPadding, Math.max(hardPadding, node.x!));
        node.y! = Math.min(height - hardPadding, Math.max(hardPadding, node.y!));
      });

      // Collision pass to prevent heavy overlap and keep nodes legible.
      for (let i = 0; i < nodesRef.current.length; i++) {
        for (let j = i + 1; j < nodesRef.current.length; j++) {
          const a = nodesRef.current[i];
          const b = nodesRef.current[j];
          const dx = b.x! - a.x!;
          const dy = b.y! - a.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = getNodeRadius(a) + getNodeRadius(b) + 10;
          if (dist >= minDist) continue;

          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;

          a.x! -= nx * overlap;
          a.y! -= ny * overlap;
          b.x! += nx * overlap;
          b.y! += ny * overlap;
        }
      }

      ctx.clearRect(0, 0, width, height);

      const backdrop = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.min(width, height) * 0.06,
        centerX,
        centerY,
        Math.max(width, height) * 0.72
      );
      backdrop.addColorStop(0, isDark ? '#131824' : '#f5f7fb');
      backdrop.addColorStop(1, isDark ? '#0b0d12' : '#eceff5');
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, width, height);

      // Subtle starfield backdrop.
      starfieldRef.current.forEach((star) => {
        const twinkle = 0.7 + 0.3 * Math.sin(now * 0.8 + star.phase);
        ctx.globalAlpha = star.alpha * twinkle;
        ctx.fillStyle = isDark ? '#e0e0e0' : '#1a1a1a';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Cluster halos create a constellation-like grouping by genre.
      const nodesByGroup = new Map<number, Node[]>();
      nodesRef.current.forEach((node) => {
        const existing = nodesByGroup.get(node.group) || [];
        existing.push(node);
        nodesByGroup.set(node.group, existing);
      });

      nodesByGroup.forEach((groupNodes, groupId) => {
        if (groupNodes.length < 3) return;
        const centroid = groupNodes.reduce(
          (acc, node) => ({ x: acc.x + (node.x || 0), y: acc.y + (node.y || 0) }),
          { x: 0, y: 0 }
        );
        centroid.x /= groupNodes.length;
        centroid.y /= groupNodes.length;

        let maxDistance = 0;
        groupNodes.forEach((node) => {
          const dx = (node.x || 0) - centroid.x;
          const dy = (node.y || 0) - centroid.y;
          maxDistance = Math.max(maxDistance, Math.sqrt(dx * dx + dy * dy));
        });

        const haloRadius = Math.min(Math.max(maxDistance + 40, 95), 260);
        const pulse = 0.96 + Math.sin(now * 0.55 + groupId) * 0.04;
        const haloColor = NODE_GROUP_COLORS[groupId] || NODE_GROUP_COLORS[7];
        const haloFade = filteredGroup === 'all' || filteredGroup === groupId ? 1 : 0.22;

        ctx.fillStyle = hexToRgba(haloColor, 0.06 * haloFade);
        ctx.beginPath();
        ctx.arc(centroid.x, centroid.y, haloRadius * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = hexToRgba(haloColor, 0.2 * haloFade);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centroid.x, centroid.y, haloRadius * 0.98, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '500 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = hexToRgba(haloColor, (isDark ? 0.58 : 0.5) * haloFade);
        ctx.fillText(GROUP_LABELS[groupId] || GROUP_LABELS[7], centroid.x, centroid.y);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      });
      
      // Draw links with type colors
      dataLinks.forEach(link => {
        const s = nodeById.get(link.source);
        const t = nodeById.get(link.target);
        if (s && t) {
          const hoveredCurrent = hoveredLinkRef.current;
          const isHovered = hoveredCurrent?.source === link.source && hoveredCurrent?.target === link.target;
          const touchesSelected = selectedNodeId && (link.source === selectedNodeId || link.target === selectedNodeId);
          const linkMatchesGroup = filteredGroup === 'all' || s.group === filteredGroup || t.group === filteredGroup;
          const linkMatchesQuery =
            !normalizedQuery ||
            s.id.toLowerCase().includes(normalizedQuery) ||
            t.id.toLowerCase().includes(normalizedQuery);
          const isMuted = nodeIsDimmed(s) || nodeIsDimmed(t) || !linkMatchesGroup || !linkMatchesQuery;
          const color = CONNECTION_COLORS[link.type] || CONNECTION_COLORS.similar;
          const shimmer = 0.76 + 0.24 * Math.sin(now * 0.9 + s.id.length + t.id.length);
          const baseAlpha = link.type === 'collaboration'
            ? 0.5
            : link.type === 'genre'
            ? 0.38
            : 0.24;
          
          ctx.beginPath();
          ctx.moveTo(s.x!, s.y!);
          ctx.lineTo(t.x!, t.y!);
          ctx.strokeStyle = isHovered
            ? color
            : hexToRgba(color, touchesSelected ? Math.max(0.42, baseAlpha * shimmer) : isMuted ? 0.07 : Math.max(0.16, baseAlpha * shimmer));
          ctx.lineWidth = isHovered ? 3 : touchesSelected ? 2.4 : link.type === 'collaboration' ? 1.9 : 1.35;
          ctx.stroke();
        }
      });

      // Draw nodes with genre-coded color + shape.
      nodesRef.current.forEach(node => {
        const isHovered = hoveredNodeRef.current === node.id;
        const isSelected = selectedNodeId === node.id;
        const isRelated = selectedNeighbors.has(node.id);
        const isDimmed = nodeIsDimmed(node);
        const normalised = ((node.playcount || minPlaycount) - minPlaycount) / playcountRange;
        const pulse = Math.sin(now * 1.2 + node.id.length) * 0.5 + 0.5;
        const nodeSize = 4 + (normalised * 16) + pulse * 0.7 + (isSelected ? 3 : isRelated ? 1.2 : 0);
        const nodeColor = NODE_GROUP_COLORS[node.group] || NODE_GROUP_COLORS[7];
        const nodeShape = NODE_GROUP_SHAPES[node.group] || 'circle';
        
        if (isHovered || isSelected) {
          const gradient = ctx.createRadialGradient(node.x!, node.y!, 0, node.x!, node.y!, 35);
          gradient.addColorStop(0, `${nodeColor}${isSelected ? '88' : '66'}`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 35, 0, Math.PI * 2);
          ctx.fill();
        }

        const glow = ctx.createRadialGradient(node.x!, node.y!, 0, node.x!, node.y!, nodeSize * 1.9);
        glow.addColorStop(0, hexToRgba(nodeColor, 0.18));
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, nodeSize * 1.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = isDimmed ? 0.24 : isRelated ? 0.9 : 1;
        ctx.fillStyle = nodeColor;
        drawNodeShape(ctx, nodeShape, node.x!, node.y!, isHovered || isSelected ? nodeSize + 2 : nodeSize);
        ctx.fill();
        ctx.strokeStyle = isDark ? hexToRgba('#f4f6fb', isDimmed ? 0.18 : 0.38) : hexToRgba('#101114', isDimmed ? 0.18 : 0.32);
        ctx.lineWidth = isHovered || isSelected ? 1.8 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Draw labels AFTER nodes with lightweight collision culling.
      const placedLabels: Array<{ x: number; y: number; w: number; h: number }> = [];
      nodesRef.current.forEach(node => {
        const isHovered = hoveredNodeRef.current === node.id;
        const isSelected = selectedNodeId === node.id;
        const isRelated = selectedNeighbors.has(node.id);
        const isSearchMatch = nodeMatchesQuery(node);
        const isDimmed = nodeIsDimmed(node);
        const normalised = ((node.playcount || minPlaycount) - minPlaycount) / playcountRange;
        const nodeSize = 4 + (normalised * 16);
        if (!isHovered && !isSelected && !isRelated && !isSearchMatch && normalised < 0.58) return;
        if (isDimmed && !isSelected && !isHovered) return;
        
        ctx.font = isHovered || isSelected
          ? '600 14px system-ui, -apple-system, sans-serif'
          : isRelated || isSearchMatch
          ? '500 13px system-ui, -apple-system, sans-serif'
          : '12px system-ui, -apple-system, sans-serif';
        const labelX = node.x! + nodeSize + 8;
        const labelY = node.y! + 4;
        const labelWidth = ctx.measureText(node.id).width;
        const labelHeight = isHovered || isSelected ? 16 : 13;
        const labelRect = {
          x: labelX - 3,
          y: labelY - labelHeight,
          w: labelWidth + 6,
          h: labelHeight + 4,
        };

        if (!isHovered) {
          const intersects = placedLabels.some((existing) => {
            return !(
              labelRect.x + labelRect.w < existing.x ||
              existing.x + existing.w < labelRect.x ||
              labelRect.y + labelRect.h < existing.y ||
              existing.y + existing.h < labelRect.y
            );
          });
          if (intersects) return;
        }
        placedLabels.push(labelRect);
        
        // Draw text outline for visibility
        ctx.strokeStyle = labelOutlineColor;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(node.id, labelX, labelY);
        
        // Draw text
        ctx.fillStyle = isSelected ? '#f5f8ff' : isHovered ? labelColor : `${labelColor}cc`;
        ctx.fillText(node.id, labelX, labelY);
      });

      simulationRef.current = requestAnimationFrame(animate);
    };

    simulationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(simulationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [status, graphData]);

  // Mouse handling
  const findNodeAtPosition = (mx: number, my: number) => {
    const playcounts = nodesRef.current.map((node) => node.playcount || 0).filter((playcount) => playcount > 0);
    const maxPlaycount = Math.max(...playcounts, 1);
    const minPlaycount = Math.min(...playcounts, 0);
    const playcountRange = maxPlaycount - minPlaycount || 1;

    for (const node of nodesRef.current) {
      const normalised = ((node.playcount || minPlaycount) - minPlaycount) / playcountRange;
      const hitRadius = 14 + normalised * 18;
      const dx = mx - node.x!;
      const dy = my - node.y!;
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        return node.id;
      }
    }

    return null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (status !== 'visualizing' || !graphData) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const foundNode = findNodeAtPosition(mx, my);
    let foundLink: Link | null = null;

    if (!foundNode && graphData.links) {
      for (const link of graphData.links) {
              const s = nodesRef.current.find(n => n.id === link.source);
              const t = nodesRef.current.find(n => n.id === link.target);
              if (s && t) {
                  const A = mx - s.x!;
                  const B = my - s.y!;
                  const C = t.x! - s.x!;
                  const D = t.y! - s.y!;
                  const dot = A * C + B * D;
                  const lenSq = C * C + D * D;
          let param = lenSq !== 0 ? dot / lenSq : -1;
                  
                  let xx, yy;
                  if (param < 0) { xx = s.x!; yy = s.y!; }
                  else if (param > 1) { xx = t.x!; yy = t.y!; }
                  else { xx = s.x! + param * C; yy = s.y! + param * D; }
                  
          if (Math.sqrt((mx - xx) ** 2 + (my - yy) ** 2) < 12) {
            foundLink = link;
                      break;
                  }
              }
          }
      }

      setHoveredNode((prev) => (prev === foundNode ? prev : foundNode));
      setHoveredLink((prev) => {
        if (
          prev?.source === foundLink?.source &&
          prev?.target === foundLink?.target &&
          prev?.type === foundLink?.type
        ) {
          return prev;
        }
        return foundLink;
      });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (status !== 'visualizing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const foundNode = findNodeAtPosition(mx, my);

    if (foundNode) {
      handleNodeSelection(foundNode, { preserveGroup: true });
      return;
    }

    setSelectedNode(null);
    setHoveredNode(null);
    setHoveredLink(null);
  };

  const clearData = () => {
    localStorage.removeItem('dakibwa_music_graph');
    setGraphData(null);
    setArtistsData([]);
    nodesRef.current = [];
    setProvider(null);
    setSelectedNode(null);
    setSearchQuery('');
    setActiveGroupFilter('all');
    setStatus('connect');
  };

  const connectLastFm = (username: string) => {
    const cleaned = username.trim();
    if (!cleaned) return;
    if (!LASTFM_API_KEY) {
      alert('Last.fm is not configured yet. Try Demo mode!');
      return;
    }
    localStorage.setItem('dakibwa_lastfm_user', cleaned);
    setLastFmUsername(cleaned);
    setLastFmDraftUsername(cleaned);
    setLastFmEditMode(false);
    setProvider('lastfm');
    setStatus('fetching');
  };

  const handleLastFmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    connectLastFm(lastFmDraftUsername || lastFmUsername);
  };

  const handleDemoMode = () => {
    setProvider('demo');
    setStatus('fetching');
  };

  const handleGroupFilterSelect = (nextGroup: number | 'all') => {
    setActiveGroupFilter(nextGroup);

    if (nextGroup === 'all' || !selectedNode || !graphData?.nodes) return;
    const currentSelected = graphData.nodes.find((node) => node.id === selectedNode);
    if (currentSelected?.group !== nextGroup) {
      setSelectedNode(null);
    }
  };

  const providerLabel = provider === 'spotify'
    ? 'Spotify listening history'
    : provider === 'lastfm'
    ? lastFmUsername
      ? `Last.fm · ${lastFmUsername}`
      : 'Last.fm listening history'
    : provider === 'demo'
    ? 'Demo constellation'
    : graphData
    ? 'Saved map'
    : 'Music map';

  if (!isOpen) return null;

  return (
    <div
      className={`${embedded ? 'relative overflow-hidden rounded-[2rem] border border-[#223149] shadow-[0_30px_100px_rgba(3,7,18,0.45)]' : 'fixed inset-0 z-[100]'} bg-[#030712] text-[#e8eefc] ${
        status === 'visualizing' ? 'overflow-hidden' : 'overflow-y-auto'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_32%),linear-gradient(180deg,#030712_0%,#050b17_55%,#030712_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-12 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className={`relative ${embedded ? 'min-h-[56rem] md:min-h-[62rem]' : 'min-h-screen'}`}>
        {!embedded && (
          <div className="absolute left-4 top-4 z-[140] md:left-6 md:top-6">
            <button
              onClick={onClose}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#07111f]/75 px-4 py-2 text-sm text-[#dbe5ff] transition-colors hover:border-white/20 hover:bg-[#0b1627]"
            >
              <span aria-hidden="true">←</span>
              <span>Back</span>
            </button>
          </div>
        )}

        {status === 'connect' && (
          <div className={`${embedded ? 'min-h-[56rem] px-6 py-10 md:min-h-[62rem] md:py-12' : 'min-h-screen px-6 py-20 md:py-24'}`}>
            <div className="mx-auto max-w-4xl">
              <div className={`${MUSIC_PANEL_CLASS} p-6 md:p-8`}>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8fa1c9]">Source</p>
                  <h2 className="text-2xl font-medium tracking-tight text-white">Bring in your listening history</h2>
                  <p className="text-sm leading-6 text-[#a6b2cf]">
                    Last.fm is the cleanest source for the constellation. Spotify is there if you want a richer recency layer. Demo mode is just for previewing the interaction.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <button
                    onClick={connectSpotify}
                    className={`${MUSIC_SUBPANEL_CLASS} w-full p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.07]`}
                  >
                    <div className="flex items-start gap-4">
                      <svg className="mt-0.5 w-6 h-6 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-white">
                            {spotifyConnected ? 'Reconnect Spotify' : 'Connect Spotify'}
                          </span>
                          {spotifyConnected && (
                            <span className="rounded-full border border-[#1DB954]/30 bg-[#1DB954]/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-[#8fe7b0]">
                              Session found
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#a6b2cf]">
                          Pull top artists, top tracks, and recent listening so the constellation reflects both long-term identity and current drift.
                        </p>
                        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[#7382a4] break-all">
                          Redirect URI: {SPOTIFY_REDIRECT_URI}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className={`${MUSIC_SUBPANEL_CLASS} p-4`}>
                    <div className="flex items-start gap-4">
                      <svg className="mt-0.5 w-6 h-6 text-[#d51007]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.749c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/>
                      </svg>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white">Connect Last.fm</div>
                        <p className="mt-2 text-sm leading-6 text-[#a6b2cf]">
                          Best if you already scrobble. It produces a strong long-term taste map with very little setup.
                        </p>

                        {!lastFmEditMode && lastFmUsername ? (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <button
                              onClick={() => connectLastFm(lastFmUsername)}
                              className="rounded-full bg-[#dbe5ff] px-4 py-2 text-sm font-medium text-[#07111f] transition-colors hover:bg-white"
                            >
                              Continue as {lastFmUsername}
                            </button>
                            <button
                              onClick={() => setLastFmEditMode(true)}
                              className="text-xs uppercase tracking-[0.14em] text-[#8fa1c9] transition-colors hover:text-white"
                            >
                              Use another account
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleLastFmSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <input
                              type="text"
                              value={lastFmDraftUsername}
                              onChange={(e) => setLastFmDraftUsername(e.target.value)}
                              placeholder="Your Last.fm username"
                              className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#050d19] px-4 py-3 text-sm text-white placeholder:text-[#7382a4] outline-none transition-colors focus:border-[#7dd3fc]"
                            />
                            <button
                              type="submit"
                              disabled={!lastFmDraftUsername.trim()}
                              className="rounded-full bg-[#dbe5ff] px-4 py-3 text-sm font-medium text-[#07111f] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Connect
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDemoMode}
                    className="w-full rounded-[1.05rem] border border-dashed border-white/15 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                  >
                    <div className="font-medium text-white">Try Demo</div>
                    <p className="mt-2 text-sm leading-6 text-[#a6b2cf]">
                      Use curated sample data to explore the interface before connecting your own history.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(status === 'fetching' || status === 'analyzing') && (
          <div className={`${embedded ? 'min-h-[56rem] md:min-h-[62rem]' : 'min-h-screen'} flex items-center justify-center px-6 py-20`}>
            <div className={`${MUSIC_PANEL_CLASS} w-full max-w-xl p-8 md:p-10 text-center`}>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8fa1c9]">Building constellation</p>
              <h2 className="mt-4 text-3xl md:text-4xl font-display tracking-tight text-white">
                Building Music Map
              </h2>
              <p className="mt-4 text-lg leading-7 text-[#dbe5ff] transition-opacity duration-500">
                {analysisProgress}
              </p>

              <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#7dd3fc_0%,#38bdf8_45%,#c084fc_100%)] transition-all duration-100 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="mt-5 text-sm leading-6 text-[#8fa1c9]">
                Pulling artists, finding clusters, then building the interaction layer so the graph stays readable once it appears.
              </p>
            </div>
          </div>
        )}

        {status === 'visualizing' && (
          <div className="absolute inset-0">
            <canvas
              ref={canvasRef}
              className="h-full w-full cursor-crosshair touch-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => {
                setHoveredNode(null);
                setHoveredLink(null);
              }}
              onClick={handleCanvasClick}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_50%,rgba(3,7,18,0.28)_100%)]" />

            <div className={`absolute inset-x-4 z-[120] md:inset-x-6 ${embedded ? 'top-4 md:top-4' : 'top-16 md:top-6'}`}>
              <div className="mx-auto max-w-3xl">
                <div className={`${MUSIC_PANEL_CLASS} pointer-events-auto p-3 md:p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8fa1c9]">
                      <span>{providerLabel}</span>
                    </div>
                    <button
                      onClick={clearData}
                      className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-[#dbe5ff] transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      Reset
                    </button>
                  </div>

                  <form onSubmit={handleSearchSubmit} className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      list="soundmind-artist-search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search an artist"
                      className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#050d19] px-4 py-3 text-sm text-white placeholder:text-[#7382a4] outline-none transition-colors focus:border-[#7dd3fc]"
                    />
                    <button
                      type="submit"
                      disabled={!searchQuery.trim()}
                      className="rounded-full bg-[#dbe5ff] px-4 py-3 text-sm font-medium text-[#07111f] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Focus
                    </button>
                    <datalist id="soundmind-artist-search">
                      {sortedNodes.map((node) => (
                        <option key={node.id} value={node.id} />
                      ))}
                    </datalist>
                  </form>

                  {searchQuery.trim() && searchResults.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {searchResults.slice(0, 5).map((node) => (
                        <button
                          key={node.id}
                          onClick={() => handleNodeSelection(node.id)}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-[#dbe5ff] transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                        >
                          {node.id}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs">
                    <button
                      onClick={() => handleGroupFilterSelect('all')}
                      className={`shrink-0 rounded-full border px-3 py-1.5 transition-colors ${
                        activeGroupFilter === 'all'
                          ? 'border-[#7dd3fc] bg-[#0d1b30] text-white'
                          : 'border-white/10 text-[#a6b2cf] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      All
                    </button>
                    {Object.entries(GROUP_LABELS).map(([groupId, label]) => {
                      const numericGroupId = Number(groupId);
                      return (
                        <button
                          key={groupId}
                          onClick={() => handleGroupFilterSelect(numericGroupId)}
                          className={`shrink-0 rounded-full border px-3 py-1.5 transition-colors ${
                            activeGroupFilter === numericGroupId
                              ? 'border-[#7dd3fc] bg-[#0d1b30] text-white'
                              : 'border-white/10 text-[#a6b2cf] hover:border-white/20 hover:bg-white/[0.05]'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {activeArtist && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-[#f5f8ff]">
                        {selectedNode ? 'Selected' : 'Hover'}: {activeArtist.id}
                      </span>
                      {activeArtist.playcount ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[#dbe5ff]">
                          {(activeArtist.playcount || 0).toLocaleString()} plays
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[#dbe5ff]">
                        {activeArtist.primaryGenre || 'Eclectic'}
                      </span>
                      {selectedNode && (
                        <button
                          onClick={() => {
                            setSelectedNode(null);
                            setHoveredNode(null);
                          }}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[#dbe5ff] transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {hoveredLink && (
              <div className="absolute bottom-4 left-4 z-[120] max-w-md md:bottom-6 md:left-6">
                <div className={`${MUSIC_PANEL_CLASS} pointer-events-auto px-4 py-3 text-xs leading-5 text-[#a6b2cf]`}>
                  <span className="text-[#f5f8ff]">
                    {hoveredLink.source} ↔ {hoveredLink.target}
                  </span>{' '}
                  · {hoveredLink.reason}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SoundMind;
