import React, { useState } from 'react';

interface MediaItem {
  id: string;
  type: 'album' | 'book' | 'film';
  title: string;
  artist?: string;
  author?: string;
  director?: string;
  year?: number;
  masterpiece?: boolean;
}

const MEDIA_ITEMS: MediaItem[] = [
  {
    id: '1',
    type: 'album',
    title: 'Person Pitch',
    artist: 'Panda Bear',
    year: 2007,
    masterpiece: true,
  },
  {
    id: '2',
    type: 'album',
    title: 'Graceland',
    artist: 'Paul Simon',
    year: 1986,
    masterpiece: true,
  },
  {
    id: '3',
    type: 'album',
    title: 'Ghosteen',
    artist: 'Nick Cave & The Bad Seeds',
    year: 2019,
  },
  {
    id: '4',
    type: 'film',
    title: 'Past Lives',
    director: 'Celine Song',
    year: 2023,
  },
  {
    id: '5',
    type: 'film',
    title: 'Magnolia',
    director: 'Paul Thomas Anderson',
    year: 1999,
    masterpiece: true,
  },
  {
    id: '6',
    type: 'book',
    title: 'Atomic Habits',
    author: 'James Clear',
    year: 2018,
  },
  {
    id: '7',
    type: 'book',
    title: 'Brave New World',
    author: 'Aldous Huxley',
    year: 1932,
    masterpiece: true,
  },
  {
    id: '8',
    type: 'book',
    title: 'The Doors of Perception',
    author: 'Aldous Huxley',
    year: 1954,
  },
  {
    id: '9',
    type: 'film',
    title: 'Boogie Nights',
    director: 'Paul Thomas Anderson',
    year: 1997,
  },
  {
    id: '10',
    type: 'film',
    title: 'Adaptation',
    director: 'Spike Jonze',
    year: 2002,
  },
];

type FilterType = 'all' | 'album' | 'book' | 'film' | 'masterpiece';

const Consumption: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');

  const getCreator = (item: MediaItem) => {
    return item.artist || item.author || item.director || '';
  };

  const getStampColor = (type: string) => {
    switch (type) {
      case 'album':
        return 'border-[#3b82f6] dark:border-[#60a5fa] bg-[#3b82f6]/10'; // Blue for albums
      case 'book':
        return 'border-[#10b981] dark:border-[#34d399] bg-[#10b981]/10'; // Green for books
      case 'film':
        return 'border-[#f59e0b] dark:border-[#fbbf24] bg-[#f59e0b]/10'; // Amber for films
      default:
        return 'border-[#1a1a1a] dark:border-[#e0e0e0]';
    }
  };

  const filteredItems = MEDIA_ITEMS.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'masterpiece') return item.masterpiece;
    return item.type === filter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'masterpiece', label: 'Masterpieces' },
    { key: 'album', label: 'Music' },
    { key: 'film', label: 'Film' },
    { key: 'book', label: 'Book' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters - aligned right */}
      <div className="flex justify-end flex-wrap gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 text-sm transition-colors ${
              filter === key
                ? 'bg-[#1a1a1a] dark:bg-[#e0e0e0] text-white dark:text-[#1a1a1a]'
                : 'bg-transparent border border-[#e0e0e0] dark:border-[#333] text-[#666] dark:text-[#999] hover:border-[#1a1a1a] dark:hover:border-[#e0e0e0]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group relative cursor-pointer"
          >
            {/* Stamp-style card with color-coded border */}
            <div className={`relative border border-dashed ${getStampColor(item.type)} p-1.5 ${item.masterpiece ? 'shadow-[0_0_8px_rgba(255,255,255,0.15)]' : ''}`}>
                  {/* Colored placeholder with initial */}
                  <div className="aspect-square mb-1.5 overflow-hidden flex items-center justify-center">
                    <span className="text-2xl font-light opacity-40">
                      {item.title.charAt(0)}
                    </span>
                  </div>

                  {/* Title and creator */}
                  <div className="space-y-0.5 px-0.5">
                    <div className="text-[10px] font-medium text-[#1a1a1a] dark:text-[#e0e0e0] leading-tight line-clamp-2">
                      {item.title}
                    </div>
                    <div className="text-[8px] text-[#666] dark:text-[#999] leading-tight line-clamp-1">
                      {getCreator(item)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-[#666] dark:text-[#999]">
          <p>No items match this filter.</p>
        </div>
      )}
    </div>
  );
};

export default Consumption;

