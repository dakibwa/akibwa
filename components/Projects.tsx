import React from 'react';

interface ProjectsProps {
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

const Projects: React.FC<ProjectsProps> = ({ isActive, onSelectEssay, onLaunchApp }) => {
  return (
    <div className={`absolute inset-0 z-30 flex justify-end items-center pointer-events-none overflow-hidden transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`
          w-full md:w-[600px] h-full md:h-[75%] bg-black/75 backdrop-blur-3xl md:mr-12 border-l border-white/10 md:border border-white/20 p-8 md:p-14 flex flex-col gap-12 pointer-events-auto shadow-[0_0_100px_rgba(0,0,0,0.95)] 
          transition-all duration-[1000ms] cubic-bezier(0.19, 1, 0.22, 1) transform-gpu
          mt-32 md:mt-40
          ${isActive ? 'translate-x-0 opacity-100 blur-0' : 'translate-x-full opacity-0 blur-xl'}
        `}
        style={{ willChange: 'transform' }}
        onClick={(e) => e.stopPropagation()} // Stop click from hitting background and resetting view
      >
        <div className={`space-y-3 transition-all duration-800 delay-200 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h2 className="text-white text-5xl font-extralight tracking-[0.35em] uppercase">Projects</h2>
          <div className="h-[2px] w-20 bg-[#D1FAFF]/70 shadow-[0_0_15px_#D1FAFF]"></div>
        </div>

        <div className="flex flex-col gap-14 mt-6">
          {PROJECTS_DATA.map((project, idx) => (
            <button 
              key={project.id}
              onClick={(e) => {
                e.stopPropagation();
                if (project.type === 'Essay') {
                  onSelectEssay(project.id);
                } else {
                  onLaunchApp(project.id);
                }
              }}
              className={`
                group block space-y-5 text-left w-full transition-all duration-1000
                ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}
              `}
              style={{ transitionDelay: isActive ? `${400 + idx * 150}ms` : '0ms' }}
            >
              <div className="flex items-center gap-6">
                <span className="text-[12px] tracking-[0.5em] text-[#D1FAFF] uppercase font-bold">
                  {project.type} / {project.date}
                </span>
                <div className="h-[1px] flex-grow bg-white/10 group-hover:bg-[#D1FAFF]/60 transition-all duration-500"></div>
              </div>
              
              <h3 className="text-white text-3xl md:text-4xl font-light tracking-wide group-hover:text-[#D1FAFF] transition-colors duration-500">
                {project.title}
              </h3>
              
              <p className="text-gray-400 text-base md:text-lg leading-relaxed font-light tracking-wide transition-colors duration-500 group-hover:text-gray-200">
                {project.description}
              </p>

              <div className="pt-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-25px] group-hover:translate-x-0 flex items-center gap-4">
                <span className="text-[11px] text-[#D1FAFF] uppercase tracking-[0.5em] font-bold">
                  {project.type === 'Essay' ? 'Read Document' : 'Initialize System'}
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D1FAFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                  {project.type === 'Essay' ? (
                    <>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </>
                  )}
                </svg>
              </div>
            </button>
          ))}
        </div>

        <div className={`mt-auto pt-16 border-t border-white/5 transition-all duration-1000 delay-800 ${isActive ? 'opacity-50 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="text-[10px] tracking-[0.8em] text-white uppercase font-light">
            Selected Works
          </p>
        </div>
      </div>
    </div>
  );
};

export default Projects;