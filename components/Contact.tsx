import React from 'react';
import Stars from './Stars';

const Contact: React.FC = () => {
  // Mars-like pink color for accents
  const accentColorClass = "text-[#E66B88]"; // Adjusted to a soft Mars pink
  const borderHoverClass = "group-hover:border-[#E66B88]";
  const textHoverClass = "hover:text-[#E66B88]";

  return (
    <div className="absolute inset-0 flex items-center justify-center z-0 bg-black overflow-hidden">
      {/* Background Stars to maintain the vibe */}
      <Stars />
      
      <div className="relative z-10 flex flex-col gap-12 items-start pl-8 md:pl-0">
        {/* Twitter / X */}
        <a 
          href="https://twitter.com/dakibwa" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`group flex items-center gap-6 text-white ${textHoverClass} transition-colors duration-300`}
        >
            <div className={`w-14 h-14 border border-white ${borderHoverClass} flex items-center justify-center transition-colors duration-300 bg-black`}>
                {/* X Logo */}
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                </svg>
            </div>
            <span className="text-xl md:text-2xl tracking-[0.2em] font-light uppercase">Dakibwa</span>
        </a>

        {/* Email */}
        <a 
          href="mailto:***REMOVED***"
          className={`group flex items-center gap-6 text-white ${textHoverClass} transition-colors duration-300`}
        >
            <div className={`w-14 h-14 border border-white ${borderHoverClass} flex items-center justify-center transition-colors duration-300 bg-black`}>
                 {/* Mail Icon */}
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                 </svg>
            </div>
            <span className="text-xl md:text-2xl tracking-[0.2em] font-light uppercase">***REMOVED***</span>
        </a>
      </div>
    </div>
  );
};

export default Contact;