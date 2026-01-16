import React from 'react';

interface MediaItem {
  id: string;
  type: 'album' | 'book' | 'film';
  title: string;
  artist?: string;
  author?: string;
  director?: string;
  year?: number;
  coverUrl?: string;
  notes?: string;
}

// Sample data - you can expand this with your actual media
const MEDIA_ITEMS: MediaItem[] = [
  {
    id: '1',
    type: 'album',
    title: 'Kid A',
    artist: 'Radiohead',
    year: 2000,
    coverUrl: 'https://via.placeholder.com/300x300?text=Kid+A',
  },
  {
    id: '2',
    type: 'book',
    title: 'The Stranger',
    author: 'Albert Camus',
    year: 1942,
    coverUrl: 'https://via.placeholder.com/300x300?text=The+Stranger',
  },
  {
    id: '3',
    type: 'film',
    title: 'Blade Runner 2049',
    director: 'Denis Villeneuve',
    year: 2017,
    coverUrl: 'https://via.placeholder.com/300x300?text=Blade+Runner',
  },
  // Add more items as needed
];

const Consumption: React.FC = () => {
  const getCreator = (item: MediaItem) => {
    return item.artist || item.author || item.director || '';
  };

  const getStampColor = (type: string) => {
    switch (type) {
      case 'album':
        return 'border-[#3b82f6] dark:border-[#60a5fa]'; // Blue for albums
      case 'book':
        return 'border-[#10b981] dark:border-[#34d399]'; // Green for books
      case 'film':
        return 'border-[#f59e0b] dark:border-[#fbbf24]'; // Amber for films
      default:
        return 'border-[#1a1a1a] dark:border-[#e0e0e0]';
    }
  };

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-normal tracking-tight">Consumption</h1>
        <div className="w-16 h-px bg-[#1a1a1a] dark:bg-[#e0e0e0]"></div>
        <p className="text-lg text-[#666] dark:text-[#999] max-w-2xl leading-relaxed">
          A collection of media consumed, documented like stamps in a book.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {MEDIA_ITEMS.map((item) => (
          <div
            key={item.id}
            className="group relative cursor-pointer"
          >
            {/* Stamp-style card with color-coded border */}
            <div className={`relative bg-white dark:bg-[#2a2a2a] border-2 border-dashed ${getStampColor(item.type)} p-2 transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-rotate-1`}>
                  {/* Perforated edge effect - subtle dots */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Top edge */}
                    <div className="absolute top-0 left-0 right-0 h-1 flex justify-evenly">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-0.5 h-0.5 rounded-full bg-[#1a1a1a] dark:bg-[#e0e0e0] opacity-40 mt-0.5"></div>
                      ))}
                    </div>
                    {/* Bottom edge */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 flex justify-evenly">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-0.5 h-0.5 rounded-full bg-[#1a1a1a] dark:bg-[#e0e0e0] opacity-40 mb-0.5"></div>
                      ))}
                    </div>
                    {/* Left edge */}
                    <div className="absolute top-0 bottom-0 left-0 w-1 flex flex-col justify-evenly">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="w-0.5 h-0.5 rounded-full bg-[#1a1a1a] dark:bg-[#e0e0e0] opacity-40 ml-0.5"></div>
                      ))}
                    </div>
                    {/* Right edge */}
                    <div className="absolute top-0 bottom-0 right-0 w-1 flex flex-col justify-evenly">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="w-0.5 h-0.5 rounded-full bg-[#1a1a1a] dark:bg-[#e0e0e0] opacity-40 mr-0.5"></div>
                      ))}
                    </div>
                  </div>

                  {/* Cover image */}
                  <div className="aspect-square bg-[#f0f0f0] dark:bg-[#1a1a1a] mb-2 overflow-hidden">
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999] dark:text-[#666] text-xs">
                        {item.type}
                      </div>
                    )}
                  </div>

                  {/* Title and creator */}
                  <div className="space-y-1 px-1 pb-1">
                    <div className="text-xs font-medium text-[#1a1a1a] dark:text-[#e0e0e0] leading-tight line-clamp-2">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-[#666] dark:text-[#999] leading-tight line-clamp-1">
                      {getCreator(item)}
                    </div>
                    {item.year && (
                      <div className="text-[9px] text-[#999] dark:text-[#666]">
                        {item.year}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
      </div>

      {MEDIA_ITEMS.length === 0 && (
        <div className="text-center py-16 text-[#666] dark:text-[#999]">
          <p>No items yet. Start documenting your consumption.</p>
        </div>
      )}
    </div>
  );
};

export default Consumption;

