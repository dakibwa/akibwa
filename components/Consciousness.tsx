import React from 'react';

const Consciousness: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="surface-panel rounded-xl p-6 md:p-8 space-y-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Notebook</p>
        <h3 className="font-display text-3xl md:text-4xl tracking-tight">Consciousness</h3>
        <p className="text-lg leading-relaxed text-[#696257] dark:text-[#a89d88] max-w-3xl">
          Thoughts, reflections, and attempts at understanding.
        </p>
      </div>

      <div className="surface-panel rounded-xl p-6 md:p-8 space-y-5">
        <p className="text-lg leading-relaxed max-w-3xl">
          This section is where I share my inner world - the questions I'm wrestling with,
          the ideas that won't leave me alone, and the moments of clarity that come and go.
        </p>
        <p className="text-[#696257] dark:text-[#a89d88] italic">Coming soon.</p>
      </div>
    </div>
  );
};

export default Consciousness;
