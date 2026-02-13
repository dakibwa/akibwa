import React, { useEffect, useRef, useState } from 'react';

interface SoundMindProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Node {
  id: string;
  group: number;
  type: 'artist' | 'album' | 'genre';
  playcount?: number;
  favoriteAlbum?: string;
  favoriteTrack?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
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
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ||
  (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
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
const GRAPH_CACHE_VERSION = '2';

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
  if (!uri) return uri;
  try {
    const parsed = new URL(uri);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return uri.replace(/\/$/, '');
  }
};

const normaliseName = (name: string) => name.trim().toLowerCase();

const inferArtistGroup = (artist: ArtistData): number => {
  const genres = (artist.genres || []).map((g) => g.toLowerCase()).join(' ');
  if (genres.includes('electronic') || genres.includes('house') || genres.includes('idm')) return 1;
  if (genres.includes('hip hop') || genres.includes('rap') || genres.includes('trap')) return 2;
  if (genres.includes('rock') || genres.includes('metal') || genres.includes('punk')) return 3;
  if (genres.includes('r&b') || genres.includes('soul') || genres.includes('neo soul')) return 4;
  if (genres.includes('jazz') || genres.includes('fusion')) return 5;
  if (genres.includes('pop')) return 6;
  return 7;
};

const buildDeterministicLinks = (artists: ArtistData[]): Link[] => {
  if (artists.length < 2) return [];
  const sorted = [...artists].sort((a, b) => (b.playcount || 0) - (a.playcount || 0));
  const links: Link[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    links.push({
      source: sorted[i].name,
      target: sorted[i + 1].name,
      reason: 'Adjacency in listening profile',
      type: 'similar',
    });
  }

  const stride = 5;
  for (let i = 0; i < sorted.length; i++) {
    const target = sorted[(i + stride) % sorted.length];
    if (target.name === sorted[i].name) continue;
    links.push({
      source: sorted[i].name,
      target: target.name,
      reason: 'Cross-cluster listening bridge',
      type: 'genre',
    });
  }

  return links;
};

const buildSafeGraphData = (rawData: any, artists: ArtistData[]): GraphData => {
  const byName = new Map<string, ArtistData>();
  artists.forEach((artist) => byName.set(normaliseName(artist.name), artist));

  const nodes: Node[] = artists.map((artist) => ({
    id: artist.name,
    group: inferArtistGroup(artist),
    type: 'artist',
    playcount: artist.playcount,
    favoriteAlbum: artist.favoriteAlbum,
    favoriteTrack: artist.favoriteTrack,
  }));

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

  const minimumLinks = Math.max(artists.length - 1, Math.min(artists.length * 2, 160));
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

const SoundMind: React.FC<SoundMindProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'connect' | 'fetching' | 'analyzing' | 'visualizing'>('idle');
  const [provider, setProvider] = useState<'spotify' | 'lastfm' | 'demo' | null>(null);
  const [artistsData, setArtistsData] = useState<ArtistData[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<Link | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  
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
  const hoveredNodeRef = useRef<string | null>(null);
  const hoveredLinkRef = useRef<Link | null>(null);

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
  }, [hoveredLink, hoveredNode]);

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
        .map((artist) => ({
          ...artist,
          favoriteTrack: artistTrackScore.get(artist.name)?.favoriteTrack,
          favoriteAlbum: artistTrackScore.get(artist.name)?.favoriteAlbum,
        }));
      
      saveToDatabase('spotify_artists', artists);
      setArtistsData(artists);
      
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
        }));
        
        if (IS_DEV) {
          console.info('[Last.fm] Top artist:', topArtists[0]?.name, 'with', topArtists[0]?.playcount, 'scrobbles');
        }
        saveToDatabase('lastfm_artists', topArtists);
        setLastFmEditMode(false);
        setArtistsData(topArtists);
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
        `Create at least ${Math.min(artistNames.length * 2, 120)} links.`,
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

    // Handle window resize
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    // Initialize nodes spread across the canvas
    if (nodesRef.current.length === 0 || nodesRef.current.length !== dataNodes.length) {
      const padding = 120;
      nodesRef.current = dataNodes.map((n, i) => {
        // Spread nodes in a grid-like pattern initially
        const cols = Math.ceil(Math.sqrt(dataNodes.length));
        const row = Math.floor(i / cols);
        const col = i % cols;
        const cellWidth = (width - padding * 2) / cols;
        const cellHeight = (height - padding * 2) / Math.ceil(dataNodes.length / cols);
        
        return {
          ...n,
          x: padding + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.5,
          y: padding + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.5,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5
        };
      });
    }

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nodeColor = isDark ? '#e0e0e0' : '#1a1a1a';
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
      // Dynamic physics based on canvas size
      const area = width * height;
      const nodeCount = nodesRef.current.length;
      const idealSpacing = Math.sqrt(area / nodeCount) * 0.8;
      
      const repulsion = 3000; // Increased repulsion
      const springLength = Math.max(idealSpacing, 200); // Dynamic spring length
      const springStrength = 0.015; // Reduced spring strength
      const damping = 0.9;
      const centerForce = 0.00005; // Much weaker center gravity

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
        const dx = (width / 2) - node.x!;
        const dy = (height / 2) - node.y!;
        node.vx! += dx * centerForce;
        node.vy! += dy * centerForce;

        // Apply velocity
        node.vx! *= damping;
        node.vy! *= damping;
        node.x! += node.vx!;
        node.y! += node.vy!;

        // Keep within bounds with soft bounce
        const padding = 100;
        if (node.x! < padding) { node.x! = padding; node.vx! *= -0.5; }
        if (node.x! > width - padding) { node.x! = width - padding; node.vx! *= -0.5; }
        if (node.y! < padding) { node.y! = padding; node.vy! *= -0.5; }
        if (node.y! > height - padding) { node.y! = height - padding; node.vy! *= -0.5; }
      });

      ctx.clearRect(0, 0, width, height);
      
      // Draw links with type colors
      dataLinks.forEach(link => {
        const s = nodeById.get(link.source);
        const t = nodeById.get(link.target);
        if (s && t) {
          const hoveredCurrent = hoveredLinkRef.current;
          const isHovered = hoveredCurrent?.source === link.source && hoveredCurrent?.target === link.target;
          const color = CONNECTION_COLORS[link.type] || CONNECTION_COLORS.similar;
          
          ctx.beginPath();
          ctx.moveTo(s.x!, s.y!);
          ctx.lineTo(t.x!, t.y!);
          ctx.strokeStyle = isHovered ? color : `${color}77`;
          ctx.lineWidth = isHovered ? 3 : 1.5;
          ctx.stroke();
        }
      });

      // Calculate min/max playcounts for scaling
      const playcounts = nodesRef.current.map(n => n.playcount || 0).filter(p => p > 0);
      const maxPlaycount = Math.max(...playcounts, 1);
      const minPlaycount = Math.min(...playcounts, 0);
      const playcountRange = maxPlaycount - minPlaycount || 1;

      // Draw nodes (circles first)
      nodesRef.current.forEach(node => {
        const isHovered = hoveredNodeRef.current === node.id;
        const normalised = ((node.playcount || minPlaycount) - minPlaycount) / playcountRange;
        const nodeSize = 6 + (normalised * 28); // 6px min, 34px max
        
        if (isHovered) {
          const gradient = ctx.createRadialGradient(node.x!, node.y!, 0, node.x!, node.y!, 35);
          gradient.addColorStop(0, isDark ? 'rgba(224, 224, 224, 0.3)' : 'rgba(26, 26, 26, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 35, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, isHovered ? nodeSize + 2 : nodeSize, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw all labels AFTER all nodes (so they appear on top)
      nodesRef.current.forEach(node => {
        const isHovered = hoveredNodeRef.current === node.id;
        const normalised = ((node.playcount || minPlaycount) - minPlaycount) / playcountRange;
        const nodeSize = 6 + (normalised * 28);
        
        ctx.font = isHovered ? 'bold 14px system-ui, -apple-system, sans-serif' : '12px system-ui, -apple-system, sans-serif';
        const labelX = node.x! + nodeSize + 8;
        const labelY = node.y! + 4;
        
        // Draw text outline for visibility
        ctx.strokeStyle = labelOutlineColor;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(node.id, labelX, labelY);
        
        // Draw text
        ctx.fillStyle = labelColor;
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
  const handleMouseMove = (e: React.MouseEvent) => {
    if (status !== 'visualizing' || !graphData) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let foundNode = null;
    let foundLink: Link | null = null;

      for (const node of nodesRef.current) {
          const dx = mx - node.x!;
          const dy = my - node.y!;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
              foundNode = node.id;
              break;
          }
      }

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

  const clearData = () => {
    localStorage.removeItem('dakibwa_music_graph');
    setGraphData(null);
    setArtistsData([]);
    nodesRef.current = [];
    setProvider(null);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#fafafa] dark:bg-[#1a1a1a] overflow-y-auto">
      {/* Header */}
      <div className="absolute top-6 left-6 z-[110]">
        <button 
          onClick={onClose}
          className="text-sm text-[#666] dark:text-[#999] hover:text-[#1a1a1a] dark:hover:text-[#e0e0e0] transition-colors flex items-center gap-2"
        >
          <span>←</span>
          <span>Back</span>
        </button>
      </div>

      {/* Connect View */}
      {status === 'connect' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-[#1a1a1a] dark:text-[#e0e0e0]">
                We have the right to music
              </h1>
              <p className="text-[#666] dark:text-[#999]">
                Connect your music to discover the hidden relationships between your favorite artists.
              </p>
            </div>

            <div className="space-y-6 pt-4">
              {/* Spotify Option */}
              <button
                onClick={connectSpotify}
                className="w-full flex items-center gap-4 p-4 border border-[#e0e0e0] dark:border-[#333] hover:border-[#1a1a1a] dark:hover:border-[#e0e0e0] transition-colors text-left"
              >
                <svg className="w-6 h-6 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <div>
                  <div className="font-medium text-[#1a1a1a] dark:text-[#e0e0e0]">
                    {spotifyConnected ? 'Reconnect Spotify' : 'Connect Spotify'}
                  </div>
                  <div className="text-sm text-[#666] dark:text-[#999]">
                    {spotifyConnected ? 'Spotify session found on this browser' : 'Use your top artists and listening history'}
                  </div>
                </div>
              </button>

              {/* Last.fm Option */}
              <div className="border border-[#e0e0e0] dark:border-[#333] p-4">
                <div className="flex items-center gap-4 mb-4">
                  <svg className="w-6 h-6 text-[#d51007]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.749c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/>
                  </svg>
                  <div>
                    <div className="font-medium text-[#1a1a1a] dark:text-[#e0e0e0]">Connect Last.fm</div>
                    <div className="text-sm text-[#666] dark:text-[#999]">Sign in once, then continue in one click</div>
                  </div>
                </div>
                {!lastFmEditMode && lastFmUsername ? (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => connectLastFm(lastFmUsername)}
                      className="text-sm text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-70 transition-opacity"
                    >
                      Continue as {lastFmUsername} →
                    </button>
                    <button
                      onClick={() => setLastFmEditMode(true)}
                      className="text-xs text-[#666] dark:text-[#999] hover:opacity-70 transition-opacity"
                    >
                      Use another account
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLastFmSubmit} className="flex gap-3 items-end">
                    <input
                      type="text"
                      value={lastFmDraftUsername}
                      onChange={(e) => setLastFmDraftUsername(e.target.value)}
                      placeholder="Your Last.fm username"
                      className="flex-1 bg-transparent border-b border-[#e0e0e0] dark:border-[#333] py-2 text-[#1a1a1a] dark:text-[#e0e0e0] placeholder-[#999] dark:placeholder-[#666] outline-none focus:border-[#1a1a1a] dark:focus:border-[#e0e0e0] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!lastFmDraftUsername.trim()}
                      className="text-sm text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-60 transition-opacity disabled:opacity-30 pb-2"
                    >
                      Connect →
                    </button>
                  </form>
                )}
             </div>

              {/* Demo Mode */}
              <button
                onClick={handleDemoMode}
                className="w-full p-4 border border-dashed border-[#e0e0e0] dark:border-[#333] hover:border-[#1a1a1a] dark:hover:border-[#e0e0e0] transition-colors text-left"
              >
                <div className="font-medium text-[#1a1a1a] dark:text-[#e0e0e0]">Try Demo</div>
                <div className="text-sm text-[#666] dark:text-[#999]">Explore with sample artist data</div>
              </button>
                  </div>
              </div>
          </div>
      )}

      {/* Fetching/Analysing View */}
      {(status === 'fetching' || status === 'analyzing') && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="space-y-8 text-center max-w-md w-full">
            <div className="space-y-4">
              <p className="text-xl text-[#1a1a1a] dark:text-[#e0e0e0] transition-opacity duration-500">
                {analysisProgress}
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-px bg-[#e0e0e0] dark:bg-[#333] overflow-hidden">
              <div 
                className="h-full bg-[#1a1a1a] dark:bg-[#e0e0e0] transition-all duration-100 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Visualization View */}
      {status === 'visualizing' && (
        <div className="absolute inset-0">
         <canvas 
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onMouseMove={handleMouseMove}
         />

          {/* Reset button */}
          <div className="absolute top-6 right-6">
            <button 
              onClick={clearData}
              className="text-sm text-[#666] dark:text-[#999] hover:text-[#1a1a1a] dark:hover:text-[#e0e0e0] transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Legend */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 hidden md:flex gap-4 text-xs text-[#666] dark:text-[#999]">
            {Object.entries(CONNECTION_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5" style={{ backgroundColor: color }}></div>
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>

          {/* Hover Info */}
          <div className="absolute bottom-6 right-6 pointer-events-none max-w-sm">
            {hoveredNode && (
              <div className="bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e0e0e0] dark:border-[#333] p-4">
                {(() => {
                  const artist = nodesRef.current.find(n => n.id === hoveredNode);
                  return (
                    <>
                      <h3 className="text-xl font-normal text-[#1a1a1a] dark:text-[#e0e0e0]">{hoveredNode}</h3>
                      <p className="text-sm text-[#666] dark:text-[#999] mt-1">
                        {artist?.playcount?.toLocaleString() || 0} plays
                      </p>
                      <p className="text-sm text-[#666] dark:text-[#999] mt-2">
                        Fav album: {artist?.favoriteAlbum || 'Not available'}
                      </p>
                      <p className="text-sm text-[#666] dark:text-[#999]">
                        Fav track: {artist?.favoriteTrack || 'Not available'}
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
            {hoveredLink && !hoveredNode && (
              <div className="bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e0e0e0] dark:border-[#333] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-0.5" style={{ backgroundColor: CONNECTION_COLORS[hoveredLink.type] }}></div>
                  <span className="text-xs text-[#666] dark:text-[#999] capitalize">{hoveredLink.type}</span>
                </div>
                <p className="text-sm text-[#1a1a1a] dark:text-[#e0e0e0]">
                  {hoveredLink.source} ↔ {hoveredLink.target}
                </p>
                <p className="text-sm text-[#666] dark:text-[#999] mt-1">{hoveredLink.reason}</p>
                </div>
            )}
         </div>

          {/* Title */}
          <div className="absolute bottom-6 left-6 pointer-events-none hidden md:block">
            <h1 className="text-4xl font-normal text-[#1a1a1a]/10 dark:text-[#e0e0e0]/10 tracking-tight">
              We have the right to music
            </h1>
         </div>
      </div>
      )}
    </div>
  );
};

export default SoundMind;
