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
      
      {/* Background image with heavy overlay and blur for subtle atmospheric effect */}
      <div className="absolute inset-0 z-10">
        <img 
          ref={imgRef}
          src={BACKGROUND_IMAGE_URL}
          alt="Background Scene" 
          className="w-full h-full object-cover opacity-20 blur-[3px] transition-transform duration-100 ease-out"
          style={{ transform: 'scale(1.1)' }} // Slight scale up to prevent edges showing during movement
          loading="eager"
          decoding="sync"
        />
        {/* Heavy dark overlay to make image more atmospheric and less focal */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black/90" />
        {/* Vignette effect for more focus on center content */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 0%, transparent 30%, rgba(0,0,0,0.6) 100%)' 
          }} 
        />
      </div>
    </div>
  );
});

export default Scene;