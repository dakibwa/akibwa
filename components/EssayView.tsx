import React, { useEffect, useRef } from 'react';

interface EssayViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const EssayView: React.FC<EssayViewProps> = ({ isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#fafafa] dark:bg-[#1a1a1a] overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <button 
          onClick={onClose}
          className="mb-12 text-sm text-[#666] dark:text-[#999] hover:text-[#1a1a1a] dark:hover:text-[#e0e0e0] transition-colors flex items-center gap-2"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <article className="space-y-12">
          <header className="space-y-6">
            <div className="flex items-center gap-3 text-sm text-[#666] dark:text-[#999]">
              <span>Essay</span>
              <span>·</span>
              <time>Coming Soon</time>
          </div>
            <h1 className="text-4xl md:text-5xl font-normal tracking-tight leading-tight">
              Livestream Your Life
          </h1>
            <div className="w-16 h-px bg-[#1a1a1a] dark:bg-[#e0e0e0]"></div>
        </header>

          <section className="space-y-6 text-lg leading-relaxed text-[#666] dark:text-[#999]">
            <p className="italic">
              This essay is currently being written.
            </p>
        </section>
      </article>
      </div>
    </div>
  );
};

export default EssayView;