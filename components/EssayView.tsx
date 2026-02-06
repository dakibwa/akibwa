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
      className="fixed inset-0 z-[100] bg-[#f5f3ec] dark:bg-[#161511] overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto px-5 md:px-7 py-10 md:py-16">
        <button
          onClick={onClose}
          className="mb-8 text-xs uppercase tracking-[0.12em] text-[#696257] dark:text-[#a89d88] hover:text-[#205c5a] dark:hover:text-[#79b7ab] transition-colors flex items-center gap-2"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <article className="surface-panel rounded-2xl p-6 md:p-10 space-y-8">
          <header className="space-y-5">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">
              <span>Essay</span>
              <span>·</span>
              <time>Coming Soon</time>
            </div>
            <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-[1.05]">
              Livestream Your Life
            </h1>
            <div className="w-20 h-px bg-[#d8cfbe] dark:bg-[#342f25]" />
          </header>

          <section className="space-y-4 text-lg leading-relaxed text-[#696257] dark:text-[#a89d88]">
            <p className="italic">This essay is currently being written.</p>
          </section>
        </article>
      </div>
    </div>
  );
};

export default EssayView;
