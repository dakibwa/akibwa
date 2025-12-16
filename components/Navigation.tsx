import React, { useState } from 'react';
import { MENU_ITEMS } from '../constants';

interface NavigationProps {
  onSelect?: (label: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <nav 
      className="fixed top-12 left-12 z-50 flex flex-col items-start"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Label - Click to reset to Landing Page */}
      <div 
        onClick={() => onSelect?.('')}
        className={`
          border-2 border-white px-6 py-3 bg-black/50 backdrop-blur-sm cursor-pointer transition-colors duration-300
          ${isHovered ? 'bg-black' : ''}
        `}
      >
        <h1 className="text-white text-2xl tracking-[0.2em] font-light uppercase select-none">
          Akibwa
        </h1>
      </div>

      {/* Dropdown Menu */}
      <div 
        className={`
          overflow-hidden transition-all duration-500 ease-in-out origin-top
          ${isHovered ? 'max-h-64 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}
        `}
      >
        <div className="bg-white px-6 py-4 flex flex-col gap-3 min-w-[200px] shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          {MENU_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                onSelect?.(item.label);
              }}
              className="text-black text-sm font-bold tracking-widest hover:text-pink-600 transition-colors uppercase block w-full text-left cursor-pointer"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;