import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from "@google/genai";

interface SoundMindProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Node {
  id: string;
  group: number;
  type: 'artist' | 'album' | 'genre';
  playcount?: number;
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
const SPOTIFY_REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : '';
const SPOTIFY_SCOPES = 'user-top-read user-read-recently-played';

// Last.fm API - set your API key in environment variable VITE_LASTFM_API_KEY  
const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY || '';

// Gemini API Key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Simple database using localStorage
const saveToDatabase = (key: string, data: any) => {
  const db = JSON.parse(localStorage.getItem('dakibwa_music_db') || '{}');
  db[key] = { data, timestamp: new Date().toISOString() };
  localStorage.setItem('dakibwa_music_db', JSON.stringify(db));
  console.log(`[DB] Saved to ${key}:`, data);
};

const getFromDatabase = (key: string) => {
  const db = JSON.parse(localStorage.getItem('dakibwa_music_db') || '{}');
  return db[key]?.data || null;
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

const SoundMind: React.FC<SoundMindProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'connect' | 'fetching' | 'analyzing' | 'visualizing'>('idle');
  const [provider, setProvider] = useState<'spotify' | 'lastfm' | 'demo' | null>(null);
  const [artistsData, setArtistsData] = useState<ArtistData[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<Link | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  
  // Last.fm state
  const [lastFmUsername, setLastFmUsername] = useState('');
  
  // Spotify state
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);

  // Check for saved data and Spotify callback on mount
  useEffect(() => {
    // Check for Spotify OAuth callback
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setSpotifyToken(token);
        setProvider('spotify');
        window.history.replaceState(null, '', window.location.pathname);
        setStatus('fetching');
      }
    }
    
    // Check for saved graph
    const savedData = localStorage.getItem('dakibwa_music_graph');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
          setGraphData(parsed);
          setStatus('visualizing');
          return;
        }
      } catch (e) {
        localStorage.removeItem('dakibwa_music_graph');
      }
    }
    
    // Load saved Last.fm username
    const savedUser = localStorage.getItem('dakibwa_lastfm_user');
    if (savedUser) setLastFmUsername(savedUser);
    
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
      analyzeWithGemini();
    }
  }, [artistsData]);

  // --- SPOTIFY AUTH ---
  const connectSpotify = () => {
    if (!SPOTIFY_CLIENT_ID) {
      alert('Spotify is not configured yet. Try Demo mode or Last.fm!');
      return;
    }
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'token',
      redirect_uri: SPOTIFY_REDIRECT_URI,
      scope: SPOTIFY_SCOPES,
      show_dialog: 'true',
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
      // Fetch top artists
      const topArtistsRes = await fetch('https://api.spotify.com/v1/me/top/artists?limit=30&time_range=medium_term', {
        headers: { Authorization: `Bearer ${spotifyToken}` }
      });
      const topArtists = await topArtistsRes.json();
      
      if (topArtists.items) {
        const artists: ArtistData[] = topArtists.items.map((artist: any) => ({
          name: artist.name,
          genres: artist.genres,
          playcount: artist.popularity,
        }));
        setArtistsData(artists);
      }
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
      const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${lastFmUsername}&api_key=${LASTFM_API_KEY}&format=json&limit=30&period=12month`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.error) throw new Error(data.message);
      
      if (data.topartists?.artist) {
        localStorage.setItem('dakibwa_lastfm_user', lastFmUsername);
        
        const artists: ArtistData[] = data.topartists.artist.map((a: any) => ({
          name: a.name,
          playcount: parseInt(a.playcount),
        }));
        setArtistsData(artists);
      } else {
        throw new Error('No artists found');
      }
    } catch (e) {
      console.error('Last.fm fetch failed:', e);
      alert('Could not find that Last.fm user. Please check the username.');
      setStatus('connect');
    }
  };

  // --- GEMINI ANALYSIS ---
  const analyzeWithGemini = async () => {
    setStatus('analyzing');
    setAnalysisProgress('Thinking about your music taste...');

    const artistNames = artistsData.map(a => a.name);
    const artistInfo = artistsData.map(a => 
      `${a.name}${a.genres ? ` (${a.genres.slice(0, 3).join(', ')})` : ''}`
    ).join(', ');

    // Save artists to database
    saveToDatabase('artists_input', { artists: artistNames, artistInfo });
    console.log('[Gemini] Input artists:', artistNames);

    if (!GEMINI_API_KEY) {
      console.warn('[Gemini] No API key found, using fallback');
      // Fallback without Gemini
      setAnalysisProgress('Creating connections...');
      const fallbackData: GraphData = {
        nodes: artistsData.slice(0, 15).map((a, i) => ({
          id: a.name,
          group: i % 5,
          type: 'artist' as const,
          playcount: a.playcount,
        })),
        links: [
          { source: artistNames[0], target: artistNames[1], reason: "Similar sound", type: 'similar' as const },
          { source: artistNames[1], target: artistNames[2], reason: "Genre overlap", type: 'genre' as const },
        ]
      };
      setGraphData(fallbackData);
      localStorage.setItem('dakibwa_music_graph', JSON.stringify(fallbackData));
      setStatus('visualizing');
      return;
    }

    try {
      console.log('[Gemini] Using API key:', GEMINI_API_KEY.substring(0, 10) + '...');
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      setAnalysisProgress('Analyzing artist relationships...');
      
      const prompt = `You are a music expert. Analyze these artists and create a JSON network graph showing their connections.

Artists: ${artistNames.join(", ")}

Return ONLY valid JSON with this exact structure:
{
  "nodes": [{"id": "Artist Name", "group": 1, "type": "artist"}],
  "links": [{"source": "Artist A", "target": "Artist B", "reason": "Brief reason", "type": "collaboration"}]
}

Connection types: collaboration, influence, genre, label, feature, similar
Groups: 1=Electronic, 2=Hip Hop, 3=Rock, 4=R&B, 5=Jazz, 6=Pop, 7=Other

Create ${Math.min(artistNames.length * 2, 30)} links minimum. Every artist needs at least 2 connections.`;

      console.log('[Gemini] Sending prompt:', prompt);

      const response = await ai.models.generateContent({
        model: 'gemini-3.0-flash-preview',
        contents: prompt
      });

      setAnalysisProgress('Building your musical universe...');

      const jsonText = response.text;
      console.log('[Gemini] Raw response:', jsonText);
      
      // Save raw response to database
      saveToDatabase('gemini_raw_response', jsonText);
      
      if (jsonText) {
        let data: any;
        try {
          data = JSON.parse(jsonText);
        } catch (e) {
          console.log('[Gemini] Parsing failed, trying to clean JSON...');
          const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
          data = JSON.parse(cleanJson);
        }

        console.log('[Gemini] Parsed data:', data);
        console.log('[Gemini] Nodes count:', data.nodes?.length || 0);
        console.log('[Gemini] Links count:', data.links?.length || 0);
        
        // Save parsed response to database
        saveToDatabase('gemini_parsed_response', data);

        if (!data || typeof data !== 'object') {
          throw new Error("Invalid response format");
        }

        // Add playcount data to nodes
        const nodesWithPlaycount = (data.nodes || []).map((node: any) => {
          const artistData = artistsData.find(a => a.name === node.id);
          return {
            ...node,
            type: node.type || 'artist',
            playcount: artistData?.playcount,
          };
        });

        const safeGraphData: GraphData = {
          nodes: nodesWithPlaycount,
          links: (data.links || []).map((link: any) => ({
            ...link,
            type: link.type || 'similar',
          }))
        };
        
        console.log('[Gemini] Final graph data:', safeGraphData);
        saveToDatabase('final_graph', safeGraphData);

        setGraphData(safeGraphData);
        localStorage.setItem('dakibwa_music_graph', JSON.stringify(safeGraphData));
        setStatus('visualizing');
      } else {
        throw new Error("No data returned");
      }

    } catch (error: any) {
      console.error("[Gemini] Analysis Failed:", error);
      console.error("[Gemini] Error message:", error?.message);
      console.error("[Gemini] Error details:", JSON.stringify(error, null, 2));
      saveToDatabase('gemini_error', { 
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

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    if (nodesRef.current.length === 0 || nodesRef.current.length !== dataNodes.length) {
      nodesRef.current = dataNodes.map(n => ({
        ...n,
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      }));
    }

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nodeColor = isDark ? '#e0e0e0' : '#1a1a1a';
    const labelColor = isDark ? '#e0e0e0' : '#1a1a1a';

    const animate = () => {
      const repulsion = 1200;
      const springLength = 150;
      const springStrength = 0.03;
      const damping = 0.92;
      const centerForce = 0.0002;

      nodesRef.current.forEach((node, i) => {
        if (!node.vx) node.vx = 0;
        if (!node.vy) node.vy = 0;

        // Repulsion
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

        // Springs
        dataLinks.forEach(link => {
          const sourceNode = nodesRef.current.find(n => n.id === link.source);
          const targetNode = nodesRef.current.find(n => n.id === link.target);
          
          if (sourceNode && targetNode) {
            if (node.id === sourceNode.id || node.id === targetNode.id) {
              const other = node.id === sourceNode.id ? targetNode : sourceNode;
              const dx = other.x! - node.x!;
              const dy = other.y! - node.y!;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const force = (dist - springLength) * springStrength;
              node.vx! += (dx / dist) * force;
              node.vy! += (dy / dist) * force;
            }
          }
        });

        // Center gravity
        const dx = (width / 2) - node.x!;
        const dy = (height / 2) - node.y!;
        node.vx! += dx * centerForce;
        node.vy! += dy * centerForce;

        // Apply
        node.vx! *= damping;
        node.vy! *= damping;
        node.x! += node.vx!;
        node.y! += node.vy!;

        // Bounds
        const padding = 80;
        if (node.x! < padding) node.vx! += 0.5;
        if (node.x! > width - padding) node.vx! -= 0.5;
        if (node.y! < padding) node.vy! += 0.5;
        if (node.y! > height - padding) node.vy! -= 0.5;
      });

      ctx.clearRect(0, 0, width, height);
      
      // Draw links with type colors
      dataLinks.forEach(link => {
        const s = nodesRef.current.find(n => n.id === link.source);
        const t = nodesRef.current.find(n => n.id === link.target);
        if (s && t) {
          const isHovered = hoveredLink?.source === link.source && hoveredLink?.target === link.target;
          const color = CONNECTION_COLORS[link.type] || CONNECTION_COLORS.similar;
          
          ctx.beginPath();
          ctx.moveTo(s.x!, s.y!);
          ctx.lineTo(t.x!, t.y!);
          ctx.strokeStyle = isHovered ? color : `${color}33`;
          ctx.lineWidth = isHovered ? 2 : 1;
          ctx.stroke();
        }
      });

      // Draw nodes
      nodesRef.current.forEach(node => {
        const isHovered = hoveredNode === node.id;
        const nodeSize = Math.max(3, Math.min(8, (node.playcount || 500) / 200));
        
        if (isHovered) {
          const gradient = ctx.createRadialGradient(node.x!, node.y!, 0, node.x!, node.y!, 30);
          gradient.addColorStop(0, isDark ? 'rgba(224, 224, 224, 0.3)' : 'rgba(26, 26, 26, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 30, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, isHovered ? nodeSize + 2 : nodeSize, 0, Math.PI * 2);
        ctx.fill();

        if (isHovered) {
          ctx.fillStyle = labelColor;
          ctx.font = '14px system-ui, -apple-system, sans-serif';
          ctx.fillText(node.id, node.x! + 15, node.y! + 5);
        }
      });

      simulationRef.current = requestAnimationFrame(animate);
    };

    simulationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(simulationRef.current);
  }, [status, graphData, hoveredNode, hoveredLink]);

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

    setHoveredNode(foundNode);
    setHoveredLink(foundLink);
  };

  const clearData = () => {
    localStorage.removeItem('dakibwa_music_graph');
    setGraphData(null);
    setArtistsData([]);
    nodesRef.current = [];
    setProvider(null);
    setStatus('connect');
  };

  const handleLastFmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastFmUsername) return;
    if (!LASTFM_API_KEY) {
      alert('Last.fm is not configured yet. Try Demo mode!');
      return;
    }
    setProvider('lastfm');
    setStatus('fetching');
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
                  <div className="font-medium text-[#1a1a1a] dark:text-[#e0e0e0]">Connect Spotify</div>
                  <div className="text-sm text-[#666] dark:text-[#999]">Use your top artists and listening history</div>
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
                    <div className="text-sm text-[#666] dark:text-[#999]">Enter your Last.fm username</div>
                  </div>
                </div>
                <form onSubmit={handleLastFmSubmit} className="flex gap-3 items-end">
                  <input 
                    type="text" 
                    value={lastFmUsername}
                    onChange={(e) => setLastFmUsername(e.target.value)}
                    placeholder="Your Last.fm username"
                    className="flex-1 bg-transparent border-b border-[#e0e0e0] dark:border-[#333] py-2 text-[#1a1a1a] dark:text-[#e0e0e0] placeholder-[#999] dark:placeholder-[#666] outline-none focus:border-[#1a1a1a] dark:focus:border-[#e0e0e0] transition-colors"
                  />
                  <button 
                    type="submit"
                    disabled={!lastFmUsername}
                    className="text-sm text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-60 transition-opacity disabled:opacity-30 pb-2"
                  >
                    Connect →
                  </button>
                </form>
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

      {/* Fetching/Analyzing View */}
      {(status === 'fetching' || status === 'analyzing') && (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="space-y-6 text-center max-w-md">
            <div className="w-8 h-8 border border-[#1a1a1a] dark:border-[#e0e0e0] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-[#666] dark:text-[#999]">
              {analysisProgress}
            </p>
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
                <h3 className="text-xl font-normal text-[#1a1a1a] dark:text-[#e0e0e0]">{hoveredNode}</h3>
                <p className="text-sm text-[#666] dark:text-[#999] mt-1">Artist</p>
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
