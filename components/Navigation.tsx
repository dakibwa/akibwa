import React from 'react';

interface NavigationProps {
  onSelect?: (label: string) => void;
  activeSection?: string;
  onOpenMusic?: () => void;
  isMusicOpen?: boolean;
}

const NAV_ITEMS = [
  { id: 'CREATION', label: 'Creation' },
  { id: 'CONSUMPTION', label: 'Consumption' },
  { id: 'CONSCIOUSNESS', label: 'Consciousness' },
  { id: 'CONTACT', label: 'Contact' },
];

const Navigation: React.FC<NavigationProps> = ({ onSelect, activeSection, onOpenMusic, isMusicOpen }) => {
  const getQuote = () => {
    switch (activeSection) {
      case 'CONSUMPTION':
        return 'the things that keep shaping me';
      case 'CREATION':
        return 'music and writing that are actually ready to open';
      case 'CONTACT':
        return 'the shortest path to a conversation';
      case 'CONSCIOUSNESS':
        return 'questions before they harden into essays';
      default:
        return 'music, consumption, and consciousness';
    }
  };

  const getButtonClassName = (sectionId: string) =>
    `rounded-full border px-3.5 py-2 text-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] ${
      activeSection === sectionId
        ? 'border-[#205c5a] dark:border-[#79b7ab] text-[#205c5a] dark:text-[#79b7ab] bg-[#205c5a]/8 dark:bg-[#79b7ab]/10'
        : 'border-[#d8cfbe] dark:border-[#342f25] text-[#696257] dark:text-[#a89d88] hover:border-[#205c5a]/45 dark:hover:border-[#79b7ab]/45 hover:text-[#205c5a] dark:hover:text-[#79b7ab]'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-[#d8cfbe]/90 bg-[#f5f3ec]/88 backdrop-blur-xl dark:border-[#342f25]/90 dark:bg-[#161511]/88">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-4 focus:rounded-full focus:bg-[#205c5a] focus:px-3 focus:py-2 focus:text-sm focus:text-[#f8f4ed]"
      >
        Skip to content
      </a>

      <div className="max-w-6xl mx-auto px-5 md:px-7 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              onClick={() => onSelect?.('')}
              className="font-display text-2xl tracking-tight transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a]"
            >
              dakibwa
            </button>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8a8378] dark:text-[#8f8575]">
              {getQuote()}
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onOpenMusic}
              aria-pressed={isMusicOpen}
              className={`rounded-full border px-3.5 py-2 text-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] ${
                isMusicOpen
                  ? 'border-[#205c5a] dark:border-[#79b7ab] bg-[#205c5a] text-[#f8f4ed] dark:bg-[#79b7ab] dark:text-[#102624]'
                  : 'border-[#205c5a]/25 dark:border-[#79b7ab]/30 bg-[#205c5a] text-[#f8f4ed] hover:bg-[#184947] dark:bg-[#79b7ab] dark:text-[#102624] dark:hover:bg-[#8cc4b9]'
              }`}
            >
              Music Map
            </button>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect?.(item.id)}
                aria-pressed={activeSection === item.id}
                className={getButtonClassName(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2 md:hidden">
          <button
            onClick={onOpenMusic}
            aria-pressed={isMusicOpen}
            className={`w-full rounded-full border px-3.5 py-2 text-left text-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] ${
              isMusicOpen
                ? 'border-[#205c5a] dark:border-[#79b7ab] bg-[#205c5a] text-[#f8f4ed] dark:bg-[#79b7ab] dark:text-[#102624]'
                : 'border-[#205c5a]/25 dark:border-[#79b7ab]/30 bg-[#205c5a] text-[#f8f4ed] hover:bg-[#184947] dark:bg-[#79b7ab] dark:text-[#102624] dark:hover:bg-[#8cc4b9]'
            }`}
          >
            Music Map
          </button>

          <div className="grid grid-cols-2 gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect?.(item.id)}
              aria-pressed={activeSection === item.id}
              className={`${getButtonClassName(item.id)} text-left`}
            >
              {item.label}
            </button>
          ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
