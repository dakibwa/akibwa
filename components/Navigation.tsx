import React from 'react';

interface NavigationProps {
  onSelect?: (label: string) => void;
  activeSection?: string;
}

const Navigation: React.FC<NavigationProps> = ({ onSelect, activeSection }) => {
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
        return null;
    }
  };

  const quote = getQuote();

  return (
    <nav className="sticky top-0 bg-[#f5f3ec]/85 dark:bg-[#161511]/85 border-b border-[#d8cfbe] dark:border-[#342f25] z-50 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-5 md:px-7">
        <div className="flex items-center justify-between h-16 md:h-[4.6rem]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelect?.('')}
              className="font-display text-2xl tracking-tight hover:opacity-75 transition-opacity"
            >
              dakibwa
            </button>
            <span className="hidden md:block text-sm uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">
              — {quote || 'by daniel atkinson'}
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-sm">
            <button
              onClick={() => onSelect?.('CREATION')}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                activeSection === 'CREATION'
                  ? 'border-[#205c5a] dark:border-[#79b7ab] text-[#205c5a] dark:text-[#79b7ab] bg-[#205c5a]/8 dark:bg-[#79b7ab]/10'
                  : 'border-transparent text-[#696257] dark:text-[#a89d88] hover:border-[#d8cfbe] dark:hover:border-[#342f25]'
              }`}
            >
              Creation
            </button>
            <button
              onClick={() => onSelect?.('CONSUMPTION')}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                activeSection === 'CONSUMPTION'
                  ? 'border-[#205c5a] dark:border-[#79b7ab] text-[#205c5a] dark:text-[#79b7ab] bg-[#205c5a]/8 dark:bg-[#79b7ab]/10'
                  : 'border-transparent text-[#696257] dark:text-[#a89d88] hover:border-[#d8cfbe] dark:hover:border-[#342f25]'
              }`}
            >
              Consumption
            </button>
            <button
              onClick={() => onSelect?.('CONSCIOUSNESS')}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                activeSection === 'CONSCIOUSNESS'
                  ? 'border-[#205c5a] dark:border-[#79b7ab] text-[#205c5a] dark:text-[#79b7ab] bg-[#205c5a]/8 dark:bg-[#79b7ab]/10'
                  : 'border-transparent text-[#696257] dark:text-[#a89d88] hover:border-[#d8cfbe] dark:hover:border-[#342f25]'
              }`}
            >
              Consciousness
            </button>
            <button
              onClick={() => onSelect?.('CONTACT')}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                activeSection === 'CONTACT'
                  ? 'border-[#205c5a] dark:border-[#79b7ab] text-[#205c5a] dark:text-[#79b7ab] bg-[#205c5a]/8 dark:bg-[#79b7ab]/10'
                  : 'border-transparent text-[#696257] dark:text-[#a89d88] hover:border-[#d8cfbe] dark:hover:border-[#342f25]'
              }`}
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
