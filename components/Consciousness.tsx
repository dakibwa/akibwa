import React from 'react';

const THEMES = [
  {
    title: 'Attention',
    description: 'What deserves focus, what steals it, and how technology reshapes the balance.',
  },
  {
    title: 'Selfhood',
    description: 'Identity, discipline, and the gap between private intent and public action.',
  },
  {
    title: 'Meaning',
    description: 'Questions about purpose, values, and the kind of life worth constructing.',
  },
];

const Consciousness: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="surface-panel rounded-[1.5rem] p-6 md:p-8 space-y-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[#8a8378] dark:text-[#8f8575]">Notebook</p>
        <h3 className="font-display text-3xl md:text-4xl tracking-tight">Consciousness</h3>
        <p className="text-lg leading-relaxed text-[#696257] dark:text-[#a89d88] max-w-3xl">
          The section closest to the raw thinking: less polished than essays, more revealing than a finished summary.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {THEMES.map((theme) => (
          <div
            key={theme.title}
            className="surface-panel rounded-[1.3rem] p-5 md:p-6"
          >
            <p className="font-display text-2xl tracking-tight">{theme.title}</p>
            <p className="mt-3 text-sm leading-6 text-[#696257] dark:text-[#a89d88]">
              {theme.description}
            </p>
          </div>
        ))}
      </div>

      <div className="surface-panel rounded-[1.5rem] p-6 md:p-8 space-y-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[#8a8378] dark:text-[#8f8575]">Status</p>
        <p className="text-lg leading-relaxed max-w-3xl">
          This area is still being shaped. Until more notes are published here, Creation holds the clearer outputs and Contact is the right path if you want to talk through an idea directly.
        </p>
        <p className="text-sm leading-6 text-[#696257] dark:text-[#a89d88]">
          Expect shorter fragments, recurring questions, and draft-level thoughts rather than finished essays.
        </p>
      </div>
    </div>
  );
};

export default Consciousness;
