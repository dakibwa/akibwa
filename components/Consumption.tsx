import React, { useState, useEffect } from 'react';

// Last.fm API key from env
const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY || '';

interface MediaItem {
  id: string;
  type: 'album' | 'book' | 'film';
  title: string;
  artist?: string;
  author?: string;
  director?: string;
  year?: string;
  masterpiece?: boolean;
  imageUrl?: string;
  link?: string;
  rating?: number;
  playcount?: number;
}

type FilterType = 'all' | 'album' | 'book' | 'film' | 'masterpiece';

// Default usernames
const DEFAULT_USERNAMES = {
  letterboxd: 'Akibwa',
  goodreads: 'Akibwa',
  lastfm: 'akibwa',
};

// Cache version - increment to clear old cached data
const CACHE_VERSION = '2';

const Consumption: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState({
    letterboxd: false,
    goodreads: false,
    lastfm: false,
  });
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [letterboxdUser, setLetterboxdUser] = useState(DEFAULT_USERNAMES.letterboxd);
  const [goodreadsUser, setGoodreadsUser] = useState(DEFAULT_USERNAMES.goodreads);
  const [lastfmUser, setLastfmUser] = useState(DEFAULT_USERNAMES.lastfm);

  // Load saved usernames on mount and check cache version
  useEffect(() => {
    const savedLetterboxd = localStorage.getItem('dakibwa_letterboxd_user');
    const savedGoodreads = localStorage.getItem('dakibwa_goodreads_user');
    const savedLastfm = localStorage.getItem('dakibwa_lastfm_user');
    
    if (savedLetterboxd) setLetterboxdUser(savedLetterboxd);
    if (savedGoodreads) setGoodreadsUser(savedGoodreads);
    if (savedLastfm) setLastfmUser(savedLastfm);
    
    // Check cache version - clear if outdated
    const savedVersion = localStorage.getItem('dakibwa_consumption_version');
    if (savedVersion !== CACHE_VERSION) {
      localStorage.removeItem('dakibwa_consumption_items');
      localStorage.setItem('dakibwa_consumption_version', CACHE_VERSION);
    } else {
      // Load cached items
      const cachedItems = localStorage.getItem('dakibwa_consumption_items');
      if (cachedItems) {
        try {
          setItems(JSON.parse(cachedItems));
        } catch (e) {
          console.error('Failed to load cached items');
        }
      }
    }
  }, []);

  // Auto-fetch on mount if we have usernames and no items
  useEffect(() => {
    if (items.length === 0 && (letterboxdUser || lastfmUser || goodreadsUser)) {
      fetchAllData();
    }
  }, [items.length]);

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    const allItems: MediaItem[] = [];

    // Fetch Last.fm albums - paginate to get more data
    if (lastfmUser && LASTFM_API_KEY) {
      try {
        localStorage.setItem('dakibwa_lastfm_user', lastfmUser);
        setConnected(prev => ({ ...prev, lastfm: true }));
        
        // Fetch multiple pages to get more albums (500 per page, up to 3 pages = 1500 albums)
        for (let page = 1; page <= 3; page++) {
          const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${lastfmUser}&api_key=${LASTFM_API_KEY}&format=json&limit=500&period=overall&page=${page}`;
          const res = await fetch(url);
          const data = await res.json();
          
          if (data.topalbums?.album) {
            data.topalbums.album.forEach((album: any, index: number) => {
              const playcount = parseInt(album.playcount);
              allItems.push({
                id: `lastfm-${page}-${index}`,
                type: 'album',
                title: album.name,
                artist: album.artist?.name,
                playcount: playcount,
                imageUrl: album.image?.[3]?.['#text'] || album.image?.[2]?.['#text'], // Get larger image
                link: album.url,
                masterpiece: playcount >= 500, // 500+ plays = masterpiece
              });
            });
            
            // If we got fewer than 500, we've reached the end
            if (data.topalbums.album.length < 500) break;
          } else {
            break;
          }
        }
      } catch (e) {
        console.error('Last.fm fetch failed:', e);
      }
    }

    // Fetch Letterboxd films via RSS - using /films/rss/ for all watched films
    if (letterboxdUser) {
      try {
        // Fetch from films feed (all watched) instead of diary
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=https://letterboxd.com/${letterboxdUser}/films/rss/&count=500`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        
        if (data.items) {
          localStorage.setItem('dakibwa_letterboxd_user', letterboxdUser);
          setConnected(prev => ({ ...prev, letterboxd: true }));
          
          data.items.forEach((item: any, index: number) => {
            // Parse rating from description if present (films feed format)
            // Description may contain: "★★★★★" or similar
            const descRatingMatch = item.description?.match(/★+/);
            const titleRatingMatch = item.title?.match(/★+/);
            const ratingMatch = descRatingMatch || titleRatingMatch;
            const rating = ratingMatch ? ratingMatch[0].length : undefined;
            // Check for half star
            const hasHalf = item.description?.includes('½') || item.title?.includes('½');
            // Clean title - remove rating stars and year
            const cleanTitle = item.title?.replace(/ - ★+½?$/, '').replace(/, \d{4}$/, '').trim();
            
            // Extract film poster from description (Letterboxd includes img tag)
            const posterMatch = item.description?.match(/<img[^>]+src="([^"]+)"/);
            const posterUrl = posterMatch?.[1];
            
            allItems.push({
              id: `letterboxd-${index}`,
              type: 'film',
              title: cleanTitle || item.title,
              link: item.link,
              imageUrl: posterUrl,
              rating: hasHalf && rating ? rating + 0.5 : rating,
              masterpiece: rating === 5, // Exactly 5 stars
            });
          });
        }
      } catch (e) {
        console.error('Letterboxd fetch failed:', e);
      }
    }

    // Fetch Goodreads books via RSS
    if (goodreadsUser) {
      try {
        // Try to get as many books as possible
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=https://www.goodreads.com/review/list_rss/${goodreadsUser}?shelf=read&count=500`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        
        if (data.items) {
          localStorage.setItem('dakibwa_goodreads_user', goodreadsUser);
          setConnected(prev => ({ ...prev, goodreads: true }));
          
          data.items.forEach((item: any, index: number) => {
            // Extract author from description - try multiple patterns
            const authorMatch = item.description?.match(/author: ([^<]+)/i) || 
                               item.description?.match(/by ([^<]+)/i);
            // Extract rating - try multiple patterns
            const ratingMatch = item.description?.match(/rating: (\d)/i) ||
                               item.description?.match(/(\d) of 5 stars/i);
            const rating = ratingMatch ? parseInt(ratingMatch[1]) : undefined;
            
            // Extract book cover image if available
            const imageMatch = item.description?.match(/src="([^"]+)"/);
            
            allItems.push({
              id: `goodreads-${index}`,
              type: 'book',
              title: item.title,
              author: authorMatch?.[1]?.trim(),
              link: item.link,
              imageUrl: imageMatch?.[1],
              rating: rating,
              masterpiece: rating === 5, // Exactly 5 stars
            });
          });
        }
      } catch (e) {
        console.error('Goodreads fetch failed:', e);
      }
    }

    setItems(allItems);
    localStorage.setItem('dakibwa_consumption_items', JSON.stringify(allItems));
    setLoading(false);
  };

  const getCreator = (item: MediaItem) => {
    return item.artist || item.author || item.director || '';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'album': return 'Album';
      case 'book': return 'Book';
      case 'film': return 'Film';
      default: return type;
    }
  };

  const getStampColor = (type: string, isMasterpiece?: boolean) => {
    if (isMasterpiece) return 'border-[#f0d890] dark:border-[#d4b85c]'; // Pastel yellow
    switch (type) {
      case 'album': return 'border-[#7eb8da] dark:border-[#5a9fc7]'; // Blue
      case 'film': return 'border-[#8bc99b] dark:border-[#6bb37e]'; // Green
      case 'book': return 'border-[#e8a5a5] dark:border-[#d48888]'; // Pastel red
      default: return 'border-[#e0e0e0] dark:border-[#333]';
    }
  };

  const getFilterColor = (key: FilterType) => {
    switch (key) {
      case 'album': return 'border-[#7eb8da] dark:border-[#5a9fc7]'; // Blue
      case 'film': return 'border-[#8bc99b] dark:border-[#6bb37e]'; // Green
      case 'book': return 'border-[#e8a5a5] dark:border-[#d48888]'; // Pastel red
      case 'masterpiece': return 'border-[#f0d890] dark:border-[#d4b85c]'; // Pastel yellow
      default: return 'border-[#e0e0e0] dark:border-[#333]';
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'masterpiece') return item.masterpiece;
    return item.type === filter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'album', label: 'Albums' },
    { key: 'film', label: 'Films' },
    { key: 'book', label: 'Books' },
    { key: 'masterpiece', label: 'Masterpieces' },
  ];

  const hasAnyConnection = letterboxdUser || goodreadsUser || lastfmUser;

  return (
    <div className="space-y-6">
      {/* Header with settings */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-sm text-[#666] dark:text-[#999] hover:text-[#1a1a1a] dark:hover:text-[#e0e0e0] transition-colors"
        >
          {showSettings ? 'Close' : 'Connect your Services'}
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="border border-[#e0e0e0] dark:border-[#333] p-6 space-y-4">
          <p className="text-sm text-[#666] dark:text-[#999]">
            Connect your accounts to automatically import your consumption history.
          </p>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm text-[#666] dark:text-[#999] mb-1">
                Last.fm Username
              </label>
              <input
                type="text"
                value={lastfmUser}
                onChange={(e) => setLastfmUser(e.target.value)}
                placeholder="e.g., dakibwa"
                className="w-full bg-transparent border-b border-[#e0e0e0] dark:border-[#333] py-2 text-sm outline-none focus:border-[#1a1a1a] dark:focus:border-[#e0e0e0]"
              />
            </div>
            
            <div>
              <label className="block text-sm text-[#666] dark:text-[#999] mb-1">
                Letterboxd Username
              </label>
              <input
                type="text"
                value={letterboxdUser}
                onChange={(e) => setLetterboxdUser(e.target.value)}
                placeholder="e.g., dakibwa"
                className="w-full bg-transparent border-b border-[#e0e0e0] dark:border-[#333] py-2 text-sm outline-none focus:border-[#1a1a1a] dark:focus:border-[#e0e0e0]"
              />
            </div>
            
            <div>
              <label className="block text-sm text-[#666] dark:text-[#999] mb-1">
                Goodreads User ID
              </label>
              <input
                type="text"
                value={goodreadsUser}
                onChange={(e) => setGoodreadsUser(e.target.value)}
                placeholder="e.g., 12345678"
                className="w-full bg-transparent border-b border-[#e0e0e0] dark:border-[#333] py-2 text-sm outline-none focus:border-[#1a1a1a] dark:focus:border-[#e0e0e0]"
              />
              <p className="text-xs text-[#999] dark:text-[#666] mt-1">
                Find in your profile URL
              </p>
            </div>
          </div>
          
          <button
            onClick={fetchAllData}
            disabled={loading || !hasAnyConnection}
            className="text-sm text-[#1a1a1a] dark:text-[#e0e0e0] hover:opacity-60 transition-opacity disabled:opacity-30"
          >
            {loading ? 'Fetching...' : 'Sync Now →'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex justify-end flex-wrap gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 text-sm transition-colors border-2 ${
              filter === key
                ? `${getFilterColor(key)} bg-[#1a1a1a]/10 dark:bg-white/10 text-[#1a1a1a] dark:text-[#e0e0e0]`
                : `${getFilterColor(key)} bg-transparent text-[#666] dark:text-[#999] hover:bg-[#1a1a1a]/5 dark:hover:bg-white/5`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className={`border-2 ${getStampColor(item.type, item.masterpiece)} p-3 hover:opacity-80 transition-all ${item.masterpiece ? 'bg-[#1a1a1a]/5 dark:bg-white/5 shadow-[0_0_8px_rgba(240,216,144,0.3)]' : ''}`}>
                {/* Image or placeholder */}
                <div className="aspect-square mb-3 overflow-hidden bg-[#f0f0f0] dark:bg-[#222] flex items-center justify-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-light opacity-30">
                      {item.title.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Title and creator */}
                <div className="space-y-1">
                  <div className="text-sm font-medium text-[#1a1a1a] dark:text-[#e0e0e0] leading-tight h-[2.5rem] line-clamp-2 overflow-hidden">
                    {item.title}
                  </div>
                  <div className="text-xs text-[#666] dark:text-[#999] leading-tight h-[1rem] line-clamp-1 overflow-hidden">
                    {getCreator(item)}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#999] dark:text-[#666] uppercase">
                      {getTypeLabel(item.type)}
                    </span>
                    {item.rating && (
                      <span className="text-[10px] text-[#999] dark:text-[#666]">
                        {'★'.repeat(Math.floor(item.rating))}{item.rating % 1 !== 0 ? '½' : ''}
                      </span>
                    )}
                    {item.playcount && (
                      <span className="text-[10px] text-[#999] dark:text-[#666]">
                        {item.playcount.toLocaleString()} plays
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-[#666] dark:text-[#999]">
          {hasAnyConnection ? (
            <div className="space-y-4">
              <p>No items yet.</p>
              <button
                onClick={fetchAllData}
                className="text-sm hover:opacity-60 transition-opacity"
              >
                Sync your data →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p>Connect your accounts to see your consumption history.</p>
              <button
                onClick={() => setShowSettings(true)}
                className="text-sm hover:opacity-60 transition-opacity"
              >
                Connect your Services →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Consumption;
