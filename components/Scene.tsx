import React, { useEffect, useRef } from 'react';
import Stars from './Stars';
import { BACKGROUND_IMAGE_URL } from '../constants';

const Scene: React.FC = React.memo(() => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!imgRef.current) return;

      // Calculate movement value (gentle movement)
      // Moving opposite to mouse creates a "far away" depth effect
      const moveX = (e.clientX / window.innerWidth) * -15; 
      const moveY = (e.clientY / window.innerHeight) * -15;

      imgRef.current.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.05)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none">
      {/* Stars behind the transparency of the scene if any, or layered carefully */}
      <Stars />
      
      <img 
        ref={imgRef}
        src={BACKGROUND_IMAGE_URL}
        alt="Background Scene" 
        className="w-full h-full object-cover relative z-10 opacity-90 transition-transform duration-100 ease-out"
        style={{ transform: 'scale(1.05)' }} // Slight scale up to prevent edges showing during movement
        loading="eager"
        decoding="sync"
      />
      
      {/* 
        Optional: Subtle overlay to ensure the white text and navigation remain legible 
        against bright parts of the image. 
      */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none z-20" />
    </div>
  );
});

export default Scene;