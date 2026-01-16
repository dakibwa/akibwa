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
    <div className="space-y-8">
      {PROJECTS_DATA.map((project) => (
        <div key={project.id} className="space-y-2">
          <button 
            onClick={() => {
              if (project.type === 'Essay') {
                onSelectEssay(project.id);
              } else {
                onLaunchApp(project.id);
              }
            }}
            className="text-xl font-normal hover:text-[#666] dark:hover:text-[#999] transition-colors text-left"
          >
            {project.title}
          </button>
          <p className="text-base text-[#666] dark:text-[#999]">
            {project.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Creation;