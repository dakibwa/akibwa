import React from 'react';

const Character: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
        <div className="relative mt-32 md:mt-48 group">
            {/* 
              Since we can't generate the specific illustration of the man, 
              we act as a placeholder or use a silhouette effect.
              Ideally, this <img /> would point to the transparent PNG of the character.
            */}
            
            {/* Rock Shadow */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-64 h-12 bg-black/40 blur-lg rounded-[100%]"></div>
            
            {/* The Rock (Abstracted as CSS shape) */}
            <div className="relative w-48 h-32 bg-purple-950 rounded-tr-[40px] rounded-bl-[30px] rounded-br-[60px] rounded-tl-[50px] transform rotate-3 mx-auto shadow-2xl">
               <div className="absolute top-2 left-4 w-12 h-20 bg-purple-900/50 rounded-full blur-sm"></div>
            </div>

            {/* The Person (Abstracted) */}
            <div className="absolute bottom-[90%] left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                 {/* Legs */}
                 <div className="flex gap-4">
                     <div className="w-8 h-24 bg-[#e0cba8] rounded-full transform rotate-12 translate-y-4 shadow-inner"></div>
                     <div className="w-8 h-24 bg-[#e0cba8] rounded-full transform -rotate-12 translate-y-4 shadow-inner"></div>
                 </div>
                 {/* Torso */}
                 <div className="w-24 h-28 bg-black rounded-xl -mt-6 relative z-10"></div>
                 {/* Head */}
                 <div className="w-16 h-20 bg-[#f0d5b1] rounded-full -mt-4 relative z-20 shadow-lg">
                    {/* Hair */}
                    <div className="absolute top-0 w-full h-1/2 bg-black rounded-t-full"></div>
                    <div className="absolute -left-2 top-4 w-4 h-12 bg-black rounded-full"></div>
                    <div className="absolute -right-2 top-4 w-4 h-12 bg-black rounded-full"></div>
                 </div>
            </div>
        </div>
    </div>
  );
};

export default Character;