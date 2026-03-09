import React from 'react';

interface NavigationProps {
  onShowGallery: () => void;
  onOpenMusic: () => void;
  isMusicOpen: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ onShowGallery, onOpenMusic, isMusicOpen }) => {
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
              onClick={onShowGallery}
              className="font-display text-2xl tracking-tight transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a]"
            >
              dakibwa
            </button>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8a8378] dark:text-[#8f8575]">
              listening, watching, mapping taste
            </p>
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={onShowGallery}
              aria-pressed={!isMusicOpen}
              className={getButtonClassName(!isMusicOpen)}
            >
              Gallery
            </button>
            <button
              onClick={onOpenMusic}
              aria-pressed={isMusicOpen}
              className={getButtonClassName(isMusicOpen)}
            >
              Music Map
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
