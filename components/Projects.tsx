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
    status: "Currently being written",
    description: "To be released essay on future consumer hardware's influence on society."
  },
  {
    id: "sound-mind",
    title: "We Have the Right to Music",
    type: "Application",
    status: "Available",
    description: "Understand yourself through music more."
  },
  {
    id: "bio-data-hub",
    title: "Bio Data Hub",
    type: "Application",
    status: "Available",
    description: "Ingest Circle DNA, Cronometer, Whoop, and Randox exports."
  }
];

const Creation: React.FC<CreationProps> = ({ isActive, onSelectEssay, onLaunchApp }) => {
  if (!isActive) return null;

  return (
    <div className="grid gap-4 md:gap-5">
      {PROJECTS_DATA.map((project) => (
        <div
          key={project.id}
          className="surface-panel rounded-xl p-5 md:p-6 space-y-2 transition-transform duration-300 hover:-translate-y-0.5"
        >
          <div className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">
            {project.type} · {project.status}
          </div>
          <button 
            onClick={() => {
              if (project.type === 'Essay') {
                onSelectEssay(project.id);
              } else {
                onLaunchApp(project.id);
              }
            }}
            className="font-display text-2xl md:text-3xl tracking-tight hover:text-[#205c5a] dark:hover:text-[#79b7ab] transition-colors text-left"
          >
            {project.title}
          </button>
          <p className="text-base text-[#696257] dark:text-[#a89d88] max-w-2xl">
            {project.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Creation;
