import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface SoundMindProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Node {
  id: string;
  group: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Link {
  source: string;
  target: string;
  reason: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

// Pre-defined set of diverse artists to simulate a "fetch" from a music provider
// Used as fallback if Last.fm fetch fails or no API key provided
const MOCK_LISTENING_HISTORY = [
  "Radiohead", "Aphex Twin", "Kendrick Lamar", "Miles Davis", "Pink Floyd", 
  "Daft Punk", "Björk", "MF DOOM", "Talking Heads", "Frank Ocean", 
  "Tame Impala", "Four Tet", "Burial", "Flying Lotus", "J Dilla"
];

const SoundMind: React.FC<SoundMindProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'input' | 'analyzing' | 'visualizing'>('idle');
  const [username, setUsername] = useState('');
  const [lastFmKey, setLastFmKey] = useState('');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);

  // Check for persisted data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('akibwa_soundmind_graph');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Validate structure to prevent crashes
        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
            setGraphData(parsed);
            setStatus('visualizing');
        } else {
            console.warn("Corrupt graph data found, clearing storage.");
            localStorage.removeItem('akibwa_soundmind_graph');
            setStatus('input');
        }
      } catch (e) {
        console.error("Failed to parse saved graph", e);
        setStatus('input');
      }
    } else {
      setStatus('input');
    }
    
    // Load saved Last.fm key
    const savedKey = localStorage.getItem('akibwa_lastfm_key');
    if (savedKey) setLastFmKey(savedKey);
    const savedUser = localStorage.getItem('akibwa_lastfm_user');
    if (savedUser) setUsername(savedUser);
  }, []);

  const fetchLastFmData = async (user: string, key: string) => {
    try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${user}&api_key=${key}&format=json&limit=20&period=12month`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error) {
            throw new Error(data.message);
        }
        
        if (data.topartists && data.topartists.artist) {
            return data.topartists.artist.map((a: any) => a.name);
        }
        return null;
    } catch (e) {
        console.warn("Last.fm fetch failed, reverting to mock data", e);
        return null;
    }
  };

  const generateConstellation = async () => {
    setStatus('analyzing');

    let artistsList = MOCK_LISTENING_HISTORY;
    
    // Attempt Real Fetch if credentials exist
    if (username && lastFmKey) {
        const realData = await fetchLastFmData(username, lastFmKey);
        if (realData && realData.length > 0) {
            artistsList = realData;
            localStorage.setItem('akibwa_lastfm_key', lastFmKey);
            localStorage.setItem('akibwa_lastfm_user', username);
        } else {
            alert("Could not fetch Last.fm data. Using simulation data instead.");
        }
    } else if (username && !lastFmKey) {
         // Just simulation with user name
         localStorage.setItem('akibwa_lastfm_user', username);
    }

    if (!process.env.API_KEY) {
      console.warn("No Google API Key found. Using fallback.");
      const fallbackData: GraphData = {
         nodes: artistsList.slice(0, 5).map((id, i) => ({ id, group: 1 })),
         links: [
            { source: artistsList[0], target: artistsList[1], reason: "Sonic similarity" },
         ]
      };
      setGraphData(fallbackData);
      setStatus('visualizing');
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Analyze this list of music artists: ${artistsList.join(", ")}.
        
        Create a network graph JSON representing the musical universe of this listener.
        Identify deep connections (genre, production style, historical influence, collaborators).
        
        The schema must be:
        {
          "nodes": [{"id": "Artist Name", "group": 1}],
          "links": [{"source": "Artist A", "target": "Artist B", "reason": "Short phrase (max 4 words)"}]
        }
        
        Requirements:
        1. Create at least ${Math.min(artistsList.length * 1.5, 25)} links.
        2. Assign groups based on genre/vibe (1=Electronic, 2=HipHop, 3=Indie, etc).
        3. Ensure the graph is interconnected.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 2048 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    group: { type: Type.INTEGER }
                  }
                }
              },
              links: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        let data: any;
        try {
            data = JSON.parse(jsonText);
        } catch (e) {
            // Sometimes models return markdown blocks despite mimetype config
            const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
            data = JSON.parse(cleanJson);
        }

        // Validate data structure completely before setting state
        if (!data || typeof data !== 'object') {
           throw new Error("Invalid response format");
        }

        const safeGraphData: GraphData = {
          nodes: Array.isArray(data.nodes) ? data.nodes : [],
          links: Array.isArray(data.links) ? data.links : []
        };

        setGraphData(safeGraphData);
        localStorage.setItem('akibwa_soundmind_graph', JSON.stringify(safeGraphData));
        setStatus('visualizing');
      } else {
         throw new Error("No data returned");
      }

    } catch (error) {
      console.error("Gemini Analysis Failed", error);
      setStatus('input'); // Reset on failure
      alert("Analysis failed. Please check your API keys or try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    generateConstellation();
  };

  // --- CANVAS VISUALIZATION ---

  useEffect(() => {
    // Basic null checks
    if (status !== 'visualizing' || !graphData || !canvasRef.current) return;
    
    // Create safe references to arrays to prevent runtime errors during loop
    const dataNodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
    const dataLinks = Array.isArray(graphData.links) ? graphData.links : [];

    if (dataNodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize Physics
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Reset physics nodes if loading fresh or mismatch
    // Using dataNodes length check is safer
    if (nodesRef.current.length === 0 || nodesRef.current.length !== dataNodes.length) {
      nodesRef.current = dataNodes.map(n => ({
        ...n,
        x: width / 2 + (Math.random() - 0.5) * 50,
        y: height / 2 + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      }));
    }

    // Detect theme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nodeColor = isDark ? '#e0e0e0' : '#1a1a1a';
    const linkColor = isDark ? 'rgba(224, 224, 224, 0.15)' : 'rgba(26, 26, 26, 0.15)';
    const glowColor = isDark ? 'rgba(224, 224, 224, 0.4)' : 'rgba(26, 26, 26, 0.3)';

    const animate = () => {
      const repulsion = 800;
      const springLength = 180;
      const springStrength = 0.04;
      const damping = 0.93;
      const centerForce = 0.0003;

      nodesRef.current.forEach((node, i) => {
        if (!node.vx) node.vx = 0;
        if (!node.vy) node.vy = 0;

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

        dataLinks.forEach(link => {
            const sourceNode = nodesRef.current.find(n => n.id === link.source);
            const targetNode = nodesRef.current.find(n => n.id === link.target);
            
            if (sourceNode && targetNode) {
                if (node.id === sourceNode.id) {
                    const dx = targetNode.x! - node.x!;
                    const dy = targetNode.y! - node.y!;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const force = (dist - springLength) * springStrength;
                    node.vx! += (dx / dist) * force;
                    node.vy! += (dy / dist) * force;
                } else if (node.id === targetNode.id) {
                    const dx = sourceNode.x! - node.x!;
                    const dy = sourceNode.y! - node.y!;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const force = (dist - springLength) * springStrength;
                    node.vx! += (dx / dist) * force;
                    node.vy! += (dy / dist) * force;
                }
            }
        });

        const dx = (width / 2) - node.x!;
        const dy = (height / 2) - node.y!;
        node.vx! += dx * centerForce;
        node.vy! += dy * centerForce;

        node.vx! *= damping;
        node.vy! *= damping;
        node.x! += node.vx!;
        node.y! += node.vy!;

        const padding = 50;
        if (node.x! < padding) node.vx! += 0.5;
        if (node.x! > width - padding) node.vx! -= 0.5;
        if (node.y! < padding) node.vy! += 0.5;
        if (node.y! > height - padding) node.vy! -= 0.5;
      });

      ctx.clearRect(0, 0, width, height);
      
      dataLinks.forEach(link => {
        const s = nodesRef.current.find(n => n.id === link.source);
        const t = nodesRef.current.find(n => n.id === link.target);
        if (s && t) {
            ctx.beginPath();
            ctx.moveTo(s.x!, s.y!);
            ctx.lineTo(t.x!, t.y!);
            ctx.strokeStyle = linkColor;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
      });

      nodesRef.current.forEach(node => {
         const isHovered = hoveredNode === node.id;
         
         if (isHovered) {
             const gradient = ctx.createRadialGradient(node.x!, node.y!, 0, node.x!, node.y!, 25);
             gradient.addColorStop(0, glowColor);
             gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
             ctx.fillStyle = gradient;
             ctx.beginPath();
             ctx.arc(node.x!, node.y!, 25, 0, Math.PI * 2);
             ctx.fill();
         }

         ctx.fillStyle = nodeColor;
         ctx.beginPath();
         ctx.arc(node.x!, node.y!, isHovered ? 4 : 2, 0, Math.PI * 2);
         ctx.fill();

         if (isHovered) {
             ctx.fillStyle = nodeColor;
             ctx.font = '14px system-ui, -apple-system, sans-serif';
             ctx.fillText(node.id, node.x! + 12, node.y! + 4);
         }
      });

      simulationRef.current = requestAnimationFrame(animate);
    };

    simulationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(simulationRef.current);
  }, [status, graphData, hoveredNode]);

  // Handle Mouse Interactions for Canvas
  const handleMouseMove = (e: React.MouseEvent) => {
      if (status !== 'visualizing') return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let foundNode = null;
      let foundLink = null;

      // Check Nodes
      for (const node of nodesRef.current) {
          const dx = mx - node.x!;
          const dy = my - node.y!;
          if (Math.sqrt(dx*dx + dy*dy) < 25) { // Hit radius
              foundNode = node.id;
              break;
          }
      }

      // Check Links (if no node found)
      // Robust check for array existence
      const links = Array.isArray(graphData?.links) ? graphData!.links : [];
      if (!foundNode && links.length > 0) {
          for (const link of links) {
              const s = nodesRef.current.find(n => n.id === link.source);
              const t = nodesRef.current.find(n => n.id === link.target);
              if (s && t) {
                  // Distance from point to line segment
                  const A = mx - s.x!;
                  const B = my - s.y!;
                  const C = t.x! - s.x!;
                  const D = t.y! - s.y!;
                  const dot = A * C + B * D;
                  const lenSq = C * C + D * D;
                  let param = -1;
                  if (lenSq !== 0) param = dot / lenSq;
                  
                  let xx, yy;
                  if (param < 0) { xx = s.x!; yy = s.y!; }
                  else if (param > 1) { xx = t.x!; yy = t.y!; }
                  else { xx = s.x! + param * C; yy = s.y! + param * D; }
                  
                  const dx = mx - xx;
                  const dy = my - yy;
                  if (Math.sqrt(dx*dx + dy*dy) < 10) { // Line hit tolerance
                      foundLink = `${s.id} ↔ ${t.id}: ${link.reason}`;
                      break;
                  }
              }
          }
      }

      setHoveredNode(foundNode);
      setHoveredLink(foundLink);
  };

  const clearData = () => {
    localStorage.removeItem('akibwa_soundmind_graph');
    setGraphData(null);
    nodesRef.current = [];
    setStatus('input');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#fafafa] dark:bg-[#1a1a1a] overflow-y-auto">
      {/* HEADER */}
      <div className="absolute top-6 left-6 z-[110]">
        <button 
          onClick={onClose}
          className="text-sm text-[#666] dark:text-[#999] hover:text-[#1a1a1a] dark:hover:text-[#e0e0e0] transition-colors flex items-center gap-2"
        >
          <span>←</span>
          <span>Back</span>
        </button>
      </div>

      {/* VIEW: INPUT */}
      {status === 'input' && (
         <div className="min-h-screen flex flex-col items-center justify-center p-6">
             <div className="max-w-md w-full space-y-8">
                <div className="space-y-4">
                    <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-[#1a1a1a] dark:text-[#e0e0e0]">
                      We have the right to music
                    </h1>
                    <p className="text-[#666] dark:text-[#999]">
                        Understand yourself through music more.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-[#666] dark:text-[#999] mb-2">
                            Last.fm Username
                          </label>
                          <input 
                              type="text" 
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="Enter your username"
                              className="w-full bg-transparent border-b border-[#e0e0e0] dark:border-[#333] py-3 text-[#1a1a1a] dark:text-[#e0e0e0] placeholder-[#999] dark:placeholder-[#666] outline-none focus:border-[#1a1a1a] dark:focus:border-[#e0e0e0] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-[#666] dark:text-[#999] mb-2">
                            API Key <span className="text-[#999] dark:text-[#666]">(optional)</span>
                          </label>
                          <input 
                              type="password" 
                              value={lastFmKey}
                              onChange={(e) => setLastFmKey(e.target.value)}
                              placeholder="Leave blank for demo data"
                              className="w-full bg-transparent border-b border-[#e0e0e0] dark:border-[#333] py-3 text-[#1a1a1a] dark:text-[#e0e0e0] placeholder-[#999] dark:placeholder-[#666] outline-none focus:border-[#1a1a1a] dark:focus:border-[#e0e0e0] transition-colors text-sm"
                          />
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={!username}
                        className="py-3 text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-60 transition-opacity disabled:opacity-30 cursor-pointer"
                    >
                        Generate →
                    </button>
                </form>
             </div>
         </div>
      )}

      {/* VIEW: ANALYZING */}
      {status === 'analyzing' && (
          <div className="min-h-screen flex flex-col items-center justify-center">
              <div className="space-y-6 text-center">
                  <div className="w-8 h-8 border border-[#1a1a1a] dark:border-[#e0e0e0] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[#666] dark:text-[#999]">
                      Analyzing your music...
                  </p>
              </div>
          </div>
      )}

      {/* VIEW: VISUALIZATION */}
      {status === 'visualizing' && (
        <div className="absolute inset-0">
           <canvas 
              ref={canvasRef}
              className="w-full h-full"
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

           {/* Floating Info */}
           <div className="absolute bottom-6 left-6 md:left-auto md:right-6 pointer-events-none">
              {hoveredNode && (
                  <div className="bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e0e0e0] dark:border-[#333] p-4 max-w-sm">
                      <h3 className="text-xl font-normal text-[#1a1a1a] dark:text-[#e0e0e0]">{hoveredNode}</h3>
                      <p className="text-sm text-[#666] dark:text-[#999] mt-1">Artist</p>
                  </div>
              )}
              {hoveredLink && !hoveredNode && (
                  <div className="bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e0e0e0] dark:border-[#333] p-4 max-w-sm">
                      <p className="text-sm text-[#666] dark:text-[#999]">{hoveredLink}</p>
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