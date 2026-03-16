import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ConstellationGraph } from '../types';

interface ConstellationCanvasProps {
  graph: ConstellationGraph;
  selectedId: string;
  onSelect: (id: string) => void;
}

const linkPalette = {
  cluster: 'rgba(138, 216, 255, 0.18)',
  similar: 'rgba(205, 168, 255, 0.38)',
  bridge: 'rgba(248, 213, 139, 0.42)',
} as const;

const findPointerTarget = (
  graph: ConstellationGraph,
  pointerX: number,
  pointerY: number,
  width: number,
  height: number
) => {
  let closest: { id: string; distance: number } | null = null;

  graph.nodes.forEach((node) => {
    const x = node.x * width;
    const y = node.y * height;
    const distance = Math.hypot(pointerX - x, pointerY - y);
    if (distance <= node.radius + 10 && (!closest || distance < closest.distance)) {
      closest = { id: node.id, distance };
    }
  });

  return closest?.id ?? null;
};

const ConstellationCanvas: React.FC<ConstellationCanvasProps> = ({ graph, selectedId, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const highlighted = hoveredId || selectedId;

  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return undefined;

    let animationFrame = 0;

    const render = (time: number) => {
      const rect = frame.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      graph.links.forEach((link) => {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (!source || !target) return;

        const emphasis = highlighted && (highlighted === source.id || highlighted === target.id) ? 1 : 0.42;
        ctx.beginPath();
        ctx.moveTo(source.x * rect.width, source.y * rect.height);
        ctx.lineTo(target.x * rect.width, target.y * rect.height);
        ctx.strokeStyle = linkPalette[link.type];
        ctx.globalAlpha = emphasis * link.strength;
        ctx.lineWidth = link.type === 'bridge' ? 1.4 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      graph.nodes.forEach((node, index) => {
        const pulse = 0.85 + Math.sin(time / 900 + index) * 0.12;
        const x = node.x * rect.width;
        const y = node.y * rect.height;
        const active = highlighted === node.id;
        const radius = node.radius * (active ? 1.2 : pulse);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.8);
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(0.4, `${node.color}66`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = active ? '#ffffff' : node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = active ? 24 : 16;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (active) {
          ctx.fillStyle = 'rgba(237, 242, 255, 0.9)';
          ctx.font = '600 13px Inter, sans-serif';
          ctx.fillText(node.name, x + radius + 8, y - radius - 6);
        }
      });

      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [graph, highlighted, nodeMap]);

  const updatePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const target = findPointerTarget(graph, event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    setHoveredId(target);
  };

  return (
    <div className="canvas-frame" ref={frameRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Interactive music constellation"
        onPointerMove={updatePointer}
        onPointerLeave={() => setHoveredId(null)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const target = findPointerTarget(graph, event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
          if (target) onSelect(target);
        }}
      />
      <div className="canvas-overlay" />
    </div>
  );
};

export default ConstellationCanvas;
