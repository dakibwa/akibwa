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

    const animate = () => {
      // Physics Constants
      const repulsion = 800;
      const springLength = 180;
      const springStrength = 0.04;
      const damping = 0.93;
      const centerForce = 0.0003;

      // 1. Calculate Forces
      nodesRef.current.forEach((node, i) => {
        if (!node.vx) node.vx = 0;
        if (!node.vy) node.vy = 0;

        // Repulsion (Coulomb)
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

        // Attraction (Springs) along links
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

        // Center Gravity
        const dx = (width / 2) - node.x!;
        const dy = (height / 2) - node.y!;
        node.vx! += dx * centerForce;
        node.vy! += dy * centerForce;

        // Apply Velocity
        node.vx! *= damping;
        node.vy! *= damping;
        node.x! += node.vx!;
        node.y! += node.vy!;

        // Boundary bounce (soft)
        const padding = 50;
        if (node.x! < padding) node.vx! += 0.5;
        if (node.x! > width - padding) node.vx! -= 0.5;
        if (node.y! < padding) node.vy! += 0.5;
        if (node.y! > height - padding) node.vy! -= 0.5;
      });

      // 2. Render
      ctx.clearRect(0, 0, width, height);
      
      // Draw Links
      dataLinks.forEach(link => {
        const s = nodesRef.current.find(n => n.id === link.source);
        const t = nodesRef.current.find(n => n.id === link.target);
        if (s && t) {
            ctx.beginPath();
            ctx.moveTo(s.x!, s.y!);
            ctx.lineTo(t.x!, t.y!);
            ctx.strokeStyle = 'rgba(209, 250, 255, 0.15)'; // #D1FAFF low opacity
            ctx.lineWidth = 1;
            ctx.stroke();
        }
      });

      // Draw Nodes
      nodesRef.current.forEach(node => {
         const isHovered = hoveredNode === node.id;
         
         // Star Glow
         if (isHovered) {
             const gradient = ctx.createRadialGradient(node.x!, node.y!, 0, node.x!, node.y!, 25);
             gradient.addColorStop(0, 'rgba(209, 250, 255, 0.6)');
             gradient.addColorStop(1, 'rgba(209, 250, 255, 0)');
             ctx.fillStyle = gradient;
             ctx.beginPath();
             ctx.arc(node.x!, node.y!, 25, 0, Math.PI * 2);
             ctx.fill();
         }

         // Star Core
         ctx.fillStyle = isHovered ? '#FFFFFF' : '#D1FAFF';
         ctx.beginPath();
         ctx.arc(node.x!, node.y!, isHovered ? 4 : 2, 0, Math.PI * 2);
         ctx.fill();

         // Label (only if hovered or close neighbors)
         if (isHovered) {
             ctx.fillStyle = '#FFF';
             ctx.font = '14px Space Grotesk';
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

  return (
    <div 
      className={`
        fixed inset-0 z-[100] bg-black transition-all duration-700
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none delay-500'}
      `}
    >
      {/* HEADER / NAV */}
      <div className="absolute top-12 left-12 z-[110] flex gap-4">
        <button 
          onClick={onClose}
          className="border border-white/20 px-6 py-3 bg-black/80 hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-md uppercase text-xs tracking-[0.3em] cursor-pointer"
        >
          Exit System
        </button>
        {status === 'visualizing' && (
             <button 
             onClick={clearData}
             className="border border-[#D1FAFF]/20 text-[#D1FAFF] px-6 py-3 bg-black/80 hover:bg-[#D1FAFF] hover:text-black transition-all duration-300 backdrop-blur-md uppercase text-xs tracking-[0.3em] cursor-pointer"
           >
             Reset Data
           </button>
        )}
      </div>

      {/* VIEW: INPUT */}
      {status === 'input' && (
         <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-[105]">
             <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-thin tracking-tighter text-white">SoundMind<span className="text-[#D1FAFF] text-2xl align-top">©</span></h1>
                    <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
                        Cartography for your audio interface
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6 pt-8">
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="ENTER LAST.FM USERNAME"
                            className="w-full bg-transparent border-b border-white/30 py-4 text-center text-xl text-[#D1FAFF] placeholder-gray-700 outline-none focus:border-[#D1FAFF] transition-colors font-light tracking-widest uppercase"
                        />
                        <div className="relative group">
                            <input 
                                type="password" 
                                value={lastFmKey}
                                onChange={(e) => setLastFmKey(e.target.value)}
                                placeholder="LAST.FM API KEY (OPTIONAL)"
                                className="w-full bg-transparent border-b border-white/10 py-2 text-center text-xs text-gray-400 placeholder-gray-800 outline-none focus:border-[#D1FAFF]/50 focus:text-[#D1FAFF] transition-colors font-mono tracking-widest"
                            />
                            <div className="text-[9px] text-gray-700 text-center pt-2 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                Leave blank for simulated data
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={!username}
                        className="w-full bg-white/5 border border-white/10 py-4 text-xs font-bold tracking-[0.4em] uppercase hover:bg-[#D1FAFF] hover:text-black transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white cursor-pointer"
                    >
                        Initialize Analysis
                    </button>
                </form>
             </div>
         </div>
      )}

      {/* VIEW: ANALYZING */}
      {status === 'analyzing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-[105]">
              <div className="space-y-6 text-center">
                  <div className="w-16 h-16 border-2 border-[#D1FAFF] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <h2 className="text-[#D1FAFF] text-xl font-light tracking-[0.3em] uppercase animate-pulse">
                      Gemini 3 Processing
                  </h2>
                  <div className="font-mono text-xs text-gray-500 space-y-1">
                      <p>Accessing Neural Pathways...</p>
                      <p className="delay-75">Reasoning about Genre Topology...</p>
                      <p className="delay-150">Constructing Constellation...</p>
                  </div>
              </div>
          </div>
      )}

      {/* VIEW: VISUALIZATION */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${status === 'visualizing' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
         <canvas 
            ref={canvasRef}
            className="w-full h-full"
            onMouseMove={handleMouseMove}
         />

         {/* Floating Info Overlay */}
         <div className="absolute bottom-12 left-12 md:left-auto md:right-12 pointer-events-none">
            {hoveredNode && (
                <div className="bg-black/80 border border-[#D1FAFF] p-6 backdrop-blur-md max-w-sm animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-3xl font-light text-white">{hoveredNode}</h3>
                    <p className="text-[#D1FAFF] text-xs uppercase tracking-widest mt-2">Artist Node</p>
                </div>
            )}
            {hoveredLink && !hoveredNode && (
                <div className="bg-black/80 border border-white/20 p-4 backdrop-blur-md max-w-sm animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-gray-300 text-sm font-mono">{hoveredLink}</p>
                </div>
            )}
         </div>

         {/* Legend / Title */}
         <div className="absolute bottom-12 left-12 pointer-events-none hidden md:block opacity-50">
             <h1 className="text-6xl font-extralight text-white/10 tracking-tighter">SoundMind</h1>
         </div>
      </div>
    </div>
  );
};

export default SoundMind;