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
    <nav className="sticky top-0 bg-[#f6f4ef]/90 dark:bg-[#171613]/90 border-b border-[#d8d3c8] dark:border-[#35312a] z-50 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect?.('')}
              className="text-lg font-medium tracking-tight hover:opacity-70 transition-opacity"
            >
              dakibwa
            </button>
            <span className="hidden md:block text-base text-[#8a8378] dark:text-[#8f8575] font-light">
              — {quote || 'by daniel atkinson'}
            </span>
          </div>
          <div className="flex items-center gap-3 md:gap-5 text-sm md:text-base">
            <button
              onClick={() => onSelect?.('CREATION')}
              className={`hover:opacity-80 transition-all ${
                activeSection === 'CREATION' ? 'opacity-100 font-medium text-[#1c1a17] dark:text-[#f0eadf]' : 'opacity-60'
              }`}
            >
              Creation
            </button>
            <button
              onClick={() => onSelect?.('CONSUMPTION')}
              className={`hover:opacity-80 transition-all ${
                activeSection === 'CONSUMPTION' ? 'opacity-100 font-medium text-[#1c1a17] dark:text-[#f0eadf]' : 'opacity-60'
              }`}
            >
              Consumption
            </button>
            <button
              onClick={() => onSelect?.('CONSCIOUSNESS')}
              className={`hover:opacity-80 transition-all ${
                activeSection === 'CONSCIOUSNESS' ? 'opacity-100 font-medium text-[#1c1a17] dark:text-[#f0eadf]' : 'opacity-60'
              }`}
            >
              Consciousness
            </button>
            <button
              onClick={() => onSelect?.('CONTACT')}
              className={`hover:opacity-80 transition-all ${
                activeSection === 'CONTACT' ? 'opacity-100 font-medium text-[#1c1a17] dark:text-[#f0eadf]' : 'opacity-60'
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
