import React from 'react';

// Using the raw GitHub URL to serve the image directly
const BACKGROUND_IMAGE_URL = "https://raw.githubusercontent.com/dakibwa/akibwa/main/hero-bg.jpg";

const Scene: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <img 
        src={BACKGROUND_IMAGE_URL}
        alt="Background Scene" 
        className="w-full h-full object-cover" 
      />
      
      {/* 
        Optional: Subtle overlay to ensure the white text and navigation remain legible 
        against bright parts of the image. 
      */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
    </div>
  );
};

export default Scene;