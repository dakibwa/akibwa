import React from 'react';

interface CreationProps {
  isActive: boolean;
  onSelectEssay: (id: string) => void;
  onLaunchApp: (id: string) => void;
}

const PROJECTS_DATA = [
  {
    id: 'sound-mind',
    title: 'We Have the Right to Music',
    type: 'Application',
    status: 'Available',
    description: 'A constellation map of your listening history with cluster, bridge, and connection detail built in.',
  },
  {
    id: 'livestream-your-life',
    title: 'Livestream Your Life',
    type: 'Essay',
    status: 'Currently being written',
    description: "A forthcoming essay on future consumer hardware's influence on society.",
  },
];

const Creation: React.FC<CreationProps> = ({ isActive, onSelectEssay, onLaunchApp }) => {
  if (!isActive) return null;

  return (
    <div className="grid gap-4 md:gap-5">
      {PROJECTS_DATA.map((project) => {
        const actionLabel = project.type === 'Essay' ? 'Preview essay' : 'Open app';

        return (
          <button
            key={project.id}
            onClick={() => {
              if (project.type === 'Essay') {
                onSelectEssay(project.id);
                return;
              }

              onLaunchApp(project.id);
            }}
            className="surface-panel group rounded-[1.4rem] p-5 md:p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#205c5a]/45 hover:shadow-[0_18px_40px_rgba(18,14,8,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:hover:border-[#79b7ab]/45 dark:hover:shadow-[0_18px_40px_rgba(0,0,0,0.24)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.14em] text-[#8a8378] dark:text-[#8f8575]">
                  {project.type} · {project.status}
                </div>
                <h3 className="font-display text-2xl md:text-3xl tracking-tight transition-colors group-hover:text-[#205c5a] dark:group-hover:text-[#79b7ab]">
                  {project.title}
                </h3>
              </div>

              <span className="hidden sm:inline-flex shrink-0 rounded-full border border-[#d8cfbe] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#696257] dark:border-[#342f25] dark:text-[#a89d88]">
                {actionLabel}
              </span>
            </div>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[#696257] dark:text-[#a89d88]">
              {project.description}
            </p>

            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#205c5a] transition-transform duration-200 group-hover:translate-x-1 dark:text-[#79b7ab]">
              {actionLabel}
              <span aria-hidden="true">→</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default Creation;
