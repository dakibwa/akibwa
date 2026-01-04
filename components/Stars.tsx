import React, { useMemo } from 'react';
import { Star } from '../types';

interface EnhancedStar extends Star {
  delay: number;
  duration: number;
  isSpectral: boolean;
}

const Stars: React.FC = () => {
  const stars = useMemo(() => {
    const count = 120; // Increased density for a richer sky
    const generated: EnhancedStar[] = [];
    for (let i = 0; i < count; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.7 + 0.3,
        delay: Math.random() * 5, // Random start time
        duration: Math.random() * 3 + 2, // Faster/Slower cycles
        isSpectral: Math.random() > 0.92 // 8% chance to be a Dr. Manhattan blue star
      });
    }
    return generated;
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className={`absolute rounded-full ${star.isSpectral ? 'bg-[#D1FAFF]' : 'bg-white'}`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            boxShadow: star.isSpectral ? '0 0 4px #8EE3F4' : 'none',
            animation: `twinkle ${star.duration}s infinite ease-in-out`,
            animationDelay: `${star.delay}s`
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { 
            opacity: 0.2; 
            transform: scale(0.8);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default Stars;