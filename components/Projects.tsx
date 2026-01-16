import React from 'react';

interface CreationProps {
  isActive: boolean;
  onSelectEssay: (id: string) => void;
  onLaunchApp: (id: string) => void;
}

const PROJECTS_DATA = [
  {
    id: "livestream-your-life",
    title: "Livestream Your Life",
    type: "Essay",
    date: "4th Jan 2026",
    description: "An exploration of self-perception in the age of constant digital visibility. How the camera lens reframes our private existence into a public performance."
  },
  {
    id: "sound-mind",
    title: "SoundMind",
    type: "Application",
    date: "12th Feb 2026",
    description: "An AI-driven cartographer for your musical taste. Uses Gemini to analyze your listening history and generate a constellation map of semantic connections."
  }
];

const Creation: React.FC<CreationProps> = ({ isActive, onSelectEssay, onLaunchApp }) => {
  if (!isActive) return null;

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-normal tracking-tight">Creation</h1>
        <div className="w-16 h-px bg-[#1a1a1a] dark:bg-[#e0e0e0]"></div>
      </header>

      <div className="space-y-16 pt-8">
        {PROJECTS_DATA.map((project) => (
          <article 
            key={project.id}
            className="border-b border-[#e0e0e0] dark:border-[#333] pb-12 last:border-0"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-[#666] dark:text-[#999] uppercase tracking-wider font-medium">
                    {project.type}
                  </span>
                  <span className="text-[#ccc] dark:text-[#444]">·</span>
                  <time className="text-xs text-[#666] dark:text-[#999]">
                    {project.date}
                  </time>
                </div>
                <h2 className="text-3xl md:text-4xl font-normal mb-4 leading-tight">
                  {project.title}
                </h2>
              </div>
            </div>
            
            <p className="text-lg leading-relaxed text-[#444] dark:text-[#bbb] mb-6 max-w-3xl">
              {project.description}
            </p>

            <button
              onClick={() => {
                if (project.type === 'Essay') {
                  onSelectEssay(project.id);
                } else {
                  onLaunchApp(project.id);
                }
              }}
              className="text-sm text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-70 transition-opacity flex items-center gap-2 group"
            >
              {project.type === 'Essay' ? 'Read essay' : 'Open application'}
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Creation;