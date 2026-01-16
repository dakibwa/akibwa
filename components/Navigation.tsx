import React from 'react';

interface NavigationProps {
  onSelect?: (label: string) => void;
  activeSection?: string;
}

const Navigation: React.FC<NavigationProps> = ({ onSelect, activeSection }) => {
  return (
    <nav className="sticky top-0 bg-[#fafafa] dark:bg-[#1a1a1a] border-b border-[#e0e0e0] dark:border-[#333] z-50 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => onSelect?.('')}
            className="text-lg font-normal hover:opacity-70 transition-opacity"
          >
            akibwa
          </button>
          <div className="flex items-center gap-6 text-sm">
            <button
              onClick={() => onSelect?.('PROJECTS')}
              className={`hover:opacity-70 transition-opacity ${
                activeSection === 'PROJECTS' ? 'opacity-100 font-medium' : 'opacity-60'
              }`}
            >
              Projects
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