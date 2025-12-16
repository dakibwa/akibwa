import React, { useState, useEffect } from 'react';

const MESSAGES = [
  "Here is my notebook, a place to make my thoughts legible.",
  "A conscious effort to move from consuming to creating.",
  "A place for experiments, essays and ideas in motion."
];

const PurposeBubbles: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    // Reveal bubbles one by one with a delay
    if (visibleCount < MESSAGES.length) {
      const timeout = setTimeout(() => {
        setVisibleCount((prev) => prev + 1);
      }, 1200); // 1.2 second delay between bubbles
      return () => clearTimeout(timeout);
    }
  }, [visibleCount]);

  return (
    <div className="absolute top-[25%] md:top-[30%] left-[10%] md:left-[55%] flex flex-col gap-6 z-20 max-w-[80%] md:max-w-sm pointer-events-none">
      {MESSAGES.map((msg, idx) => (
        <div 
          key={idx}
          className={`
            bg-white border-2 border-black p-4 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] transform transition-all duration-700 ease-out origin-left
            ${idx < visibleCount ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-4 scale-95'}
          `}
          style={{ transitionDelay: `${idx * 100}ms` }}
        >
          <p className="text-black font-bold font-sans-serif text-sm md:text-base leading-relaxed tracking-wide uppercase">
            {msg}
          </p>
        </div>
      ))}
    </div>
  );
};

export default PurposeBubbles;