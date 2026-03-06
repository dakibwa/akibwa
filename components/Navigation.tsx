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
        return 'we all collect something';
      case 'CREATION':
        return 'trying to materialise something';
      case 'CONTACT':
        return 'come converse with me';
      case 'CONSCIOUSNESS':
        return 'sharing my inner world';
      default:
        return 'by daniel atkinson';
    }
  };

  const getButtonClassName = (isActive: boolean) =>
    `text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] ${
      isActive
        ? 'text-[#205c5a] dark:text-[#79b7ab]'
        : 'text-[#696257] dark:text-[#a89d88] hover:text-[#205c5a] dark:hover:text-[#79b7ab]'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-[#d8cfbe]/90 bg-[#f5f3ec]/88 backdrop-blur-xl dark:border-[#342f25]/90 dark:bg-[#161511]/88">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-4 focus:rounded-full focus:bg-[#205c5a] focus:px-3 focus:py-2 focus:text-sm focus:text-[#f8f4ed]"
      >
        Skip to content
      </a>

      <div className="max-w-5xl mx-auto px-5 md:px-7 py-4">
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

          <div className="hidden md:flex items-center gap-5">
            <button
              onClick={onOpenMusic}
              aria-pressed={isMusicOpen}
              className={getButtonClassName(!!isMusicOpen)}
            >
              Music
            </button>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect?.(item.id)}
                aria-pressed={activeSection === item.id}
                className={getButtonClassName(activeSection === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex gap-4 overflow-x-auto no-scrollbar md:hidden">
          <button
            onClick={onOpenMusic}
            aria-pressed={isMusicOpen}
            className={`${getButtonClassName(!!isMusicOpen)} shrink-0`}
          >
            Music
          </button>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect?.(item.id)}
              aria-pressed={activeSection === item.id}
              className={`${getButtonClassName(activeSection === item.id)} shrink-0`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
