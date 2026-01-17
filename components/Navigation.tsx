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
    <nav className="sticky top-0 bg-[#fafafa] dark:bg-[#1a1a1a] border-b border-[#e0e0e0] dark:border-[#333] z-50 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect?.('')}
              className="text-lg font-normal hover:opacity-70 transition-opacity"
            >
              dakibwa
            </button>
            <span className="text-lg text-[#999] dark:text-[#666] font-light">
              — {quote || 'by daniel atkinson'}
            </span>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-sm md:text-base">
            <button
              onClick={() => onSelect?.('CREATION')}
              className={`hover:opacity-70 transition-opacity ${
                activeSection === 'CREATION' ? 'opacity-100 font-medium' : 'opacity-60'
              }`}
            >
              Creation
            </button>
            <button
              onClick={() => onSelect?.('CONSUMPTION')}
              className={`hover:opacity-70 transition-opacity ${
                activeSection === 'CONSUMPTION' ? 'opacity-100 font-medium' : 'opacity-60'
              }`}
            >
              Consumption
            </button>
            <button
              onClick={() => onSelect?.('CONSCIOUSNESS')}
              className={`hover:opacity-70 transition-opacity ${
                activeSection === 'CONSCIOUSNESS' ? 'opacity-100 font-medium' : 'opacity-60'
              }`}
            >
              Consciousness
            </button>
            <button
              onClick={() => onSelect?.('CONTACT')}
              className={`hover:opacity-70 transition-opacity ${
                activeSection === 'CONTACT' ? 'opacity-100 font-medium' : 'opacity-60'
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