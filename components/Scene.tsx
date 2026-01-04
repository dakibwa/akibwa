import React from 'react';
import Stars from './Stars';

// Using the raw GitHub URL to serve the image directly
const BACKGROUND_IMAGE_URL = "https://raw.githubusercontent.com/dakibwa/akibwa/main/hero-bg.jpg";

const Scene: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none">
      {/* Stars behind the transparency of the scene if any, or layered carefully */}
      <Stars />
      
      <img 
        src={BACKGROUND_IMAGE_URL}
        alt="Background Scene" 
        className="w-full h-full object-cover relative z-10 opacity-90" 
      />
      
      {/* 
        Character Interaction Zone (Hitbox)
        Positioned to overlay the character in the center of the image.
      */}
      <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[240px] md:w-[200px] md:h-[300px] z-20 group cursor-pointer">
         {/* The Orange Glow Effect */}
         <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 ease-in-out bg-orange-500/30 blur-[40px] mix-blend-screen scale-110" />
         <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out shadow-[0_0_50px_rgba(249,115,22,0.6)]" />
      </div>
      
      {/* 
        Optional: Subtle overlay to ensure the white text and navigation remain legible 
        against bright parts of the image. 
      */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none z-20" />
    </div>
  );
};

export default Scene;