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

const MEDIA_ITEMS: MediaItem[] = [
  {
    id: '1',
    type: 'album',
    title: 'Person Pitch',
    artist: 'Panda Bear',
    year: 2007,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/4/40/Panda_Bear_-_Person_Pitch.png',
  },
  {
    id: '2',
    type: 'album',
    title: 'Graceland',
    artist: 'Paul Simon',
    year: 1986,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/0/01/Graceland_cover_-_Paul_Simon.jpg',
  },
  {
    id: '3',
    type: 'album',
    title: 'Ghosteen',
    artist: 'Nick Cave & The Bad Seeds',
    year: 2019,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/5/5b/Nick_Cave_and_the_Bad_Seeds_-_Ghosteen.png',
  },
  {
    id: '4',
    type: 'film',
    title: 'Past Lives',
    director: 'Celine Song',
    year: 2023,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/4/4c/Past_Lives_film_poster.png',
  },
  {
    id: '5',
    type: 'film',
    title: 'Magnolia',
    director: 'Paul Thomas Anderson',
    year: 1999,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/9/93/Magnolia_poster.png',
  },
  {
    id: '6',
    type: 'book',
    title: 'Atomic Habits',
    author: 'James Clear',
    year: 2018,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/2/23/Atomic_habits_book_cover.jpg',
  },
  {
    id: '7',
    type: 'book',
    title: 'Brave New World',
    author: 'Aldous Huxley',
    year: 1932,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/6/62/BraveNewWorld_FirstEdition.jpg',
  },
  {
    id: '8',
    type: 'book',
    title: 'The Doors of Perception',
    author: 'Aldous Huxley',
    year: 1954,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/0/05/DoorsofPerception.jpg',
  },
  {
    id: '9',
    type: 'film',
    title: 'Boogie Nights',
    director: 'Paul Thomas Anderson',
    year: 1997,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Boogie_nights_ver1.jpg',
  },
  {
    id: '10',
    type: 'film',
    title: 'Adaptation',
    director: 'Spike Jonze',
    year: 2002,
    coverUrl: 'https://upload.wikimedia.org/wikipedia/en/1/15/Adaptation._film.jpg',
  },
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

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {MEDIA_ITEMS.map((item) => (
          <div
            key={item.id}
            className="group relative cursor-pointer"
          >
            {/* Stamp-style card with color-coded border */}
            <div className={`relative bg-white dark:bg-[#2a2a2a] border border-dashed ${getStampColor(item.type)} p-1.5`}>
                  {/* Cover image */}
                  <div className="aspect-square bg-[#f0f0f0] dark:bg-[#1a1a1a] mb-1.5 overflow-hidden">
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999] dark:text-[#666] text-[8px]">
                        {item.type}
                      </div>
                    )}
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

      {MEDIA_ITEMS.length === 0 && (
        <div className="text-center py-16 text-[#666] dark:text-[#999]">
          <p>No items yet. Start documenting your consumption.</p>
        </div>
      )}
    </div>
  );
};

export default Consumption;

