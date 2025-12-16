import React, { useMemo } from 'react';
import { Star } from '../types';

const Stars: React.FC = () => {
  const stars = useMemo(() => {
    // Generate static stars
    const count = 70;
    const generated: Star[] = [];
    for (let i = 0; i < count; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.7 + 0.3
      });
    }
    return generated;
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            // Add a subtle twinkle effect
            animation: `twinkle ${Math.random() * 4 + 3}s infinite ease-in-out`
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default Stars;