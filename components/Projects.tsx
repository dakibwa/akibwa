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
  }
];

const Creation: React.FC<CreationProps> = ({ isActive, onSelectEssay, onLaunchApp }) => {
  if (!isActive) return null;

  return (
    <div className="space-y-6">
      {PROJECTS_DATA.map((project) => (
        <div key={project.id} className="space-y-2 border-b border-[#d8d3c8] dark:border-[#35312a] pb-6">
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
            className="text-xl md:text-2xl font-normal tracking-tight hover:text-[#2a5b53] dark:hover:text-[#7ab2a8] transition-colors text-left"
          >
            {project.title}
          </button>
          <p className="text-base text-[#6a655d] dark:text-[#a49a88]">
            {project.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Creation;
