import React, { useCallback, useEffect, useMemo, useState } from 'react';

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

const DEFAULT_USERNAMES = {
  letterboxd: 'Akibwa',
  goodreads: 'Akibwa',
  lastfm: 'akibwa',
};

const CACHE_VERSION = '7';

const fetchLastFmAlbums = async (username: string): Promise<MediaItem[]> => {
  if (!username || !LASTFM_API_KEY) return [];

  const albums: MediaItem[] = [];

  for (let page = 1; page <= 3; page++) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=500&period=overall&page=${page}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.topalbums?.album?.length) break;

    data.topalbums.album.forEach((album: any, index: number) => {
      const playcount = Number.parseInt(album.playcount, 10) || 0;
      albums.push({
        id: `lastfm-${page}-${index}`,
        type: 'album',
        title: album.name,
        artist: album.artist?.name,
        playcount,
        imageUrl: album.image?.[3]?.['#text'] || album.image?.[2]?.['#text'] || '',
        link: album.url,
        masterpiece: playcount >= 500,
      });
    });

    if (data.topalbums.album.length < 500) break;
  }

  return albums;
};

const fetchLetterboxdFilms = async (username: string): Promise<MediaItem[]> => {
  if (!username) return [];

  const letterboxdRssUrl = `https://letterboxd.com/${username}/rss/`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(letterboxdRssUrl)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`Letterboxd request failed (${response.status})`);
  }

  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const xmlItems = xmlDoc.querySelectorAll('item');

  return Array.from(xmlItems).map((item, index) => {
    const title = item.querySelector('title')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const description = item.querySelector('description')?.textContent || '';

    const ratingMatch = title.match(/★+/);
    const rating = ratingMatch ? ratingMatch[0].length : undefined;
    const hasHalf = title.includes('½');

    const cleanTitle = title
      .replace(/ - ★+½?$/, '')
      .replace(/ - ½$/, '')
      .replace(/, \d{4}$/, '')
      .trim();

    const posterMatch = description.match(/<img[^>]+src="([^"]+)"/);
    let posterUrl = posterMatch?.[1] || '';

    if (posterUrl.includes('ltrbxd.com')) {
      posterUrl = posterUrl.replace(/-0-\d+-0-\d+/, '-0-230-0-345');
    }

    return {
      id: `letterboxd-${index}`,
      type: 'film' as const,
      title: cleanTitle || title,
      link,
      imageUrl: posterUrl,
      rating: hasHalf && rating ? rating + 0.5 : rating,
      masterpiece: rating === 5,
    };
  });
};

const fetchGoodreadsBooks = async (userId: string): Promise<MediaItem[]> => {
  if (!userId) return [];

  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=https://www.goodreads.com/review/list_rss/${userId}?shelf=read&count=500`;
  const res = await fetch(proxyUrl);
  const data = await res.json();

  if (!Array.isArray(data.items)) return [];

  return data.items.map((item: any, index: number) => {
    const authorMatch = item.description?.match(/author: ([^<]+)/i) || item.description?.match(/by ([^<]+)/i);
    const ratingMatch = item.description?.match(/rating: (\d)/i) || item.description?.match(/(\d) of 5 stars/i);
    const imageMatch = item.description?.match(/src="([^"]+)"/);
    const rating = ratingMatch ? Number.parseInt(ratingMatch[1], 10) : undefined;

    return {
      id: `goodreads-${index}`,
      type: 'book' as const,
      title: item.title,
      author: authorMatch?.[1]?.trim(),
      link: item.link,
      imageUrl: imageMatch?.[1],
      rating,
      masterpiece: rating === 5,
    };
  });
};

const dedupeAndRankItems = (items: MediaItem[]): MediaItem[] => {
  const map = new Map<string, MediaItem>();

  items.forEach((item) => {
    const creator = item.artist || item.author || item.director || '';
    const key = `${item.type}:${item.title.toLowerCase().trim()}:${creator.toLowerCase().trim()}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      return;
    }

    const existingScore = (existing.playcount || 0) + (existing.rating || 0);
    const incomingScore = (item.playcount || 0) + (item.rating || 0);

    if (incomingScore > existingScore) {
      map.set(key, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const aScore = (a.masterpiece ? 100000 : 0) + (a.playcount || 0) + (a.rating || 0) * 100;
    const bScore = (b.masterpiece ? 100000 : 0) + (b.playcount || 0) + (b.rating || 0) * 100;
    return bScore - aScore;
  });
};

const Consumption: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState({
    letterboxd: false,
    goodreads: false,
    lastfm: false,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [letterboxdUser, setLetterboxdUser] = useState(DEFAULT_USERNAMES.letterboxd);
  const [goodreadsUser, setGoodreadsUser] = useState(DEFAULT_USERNAMES.goodreads);
  const [lastfmUser, setLastfmUser] = useState(DEFAULT_USERNAMES.lastfm);

  useEffect(() => {
    const savedLetterboxd = localStorage.getItem('dakibwa_letterboxd_user');
    const savedGoodreads = localStorage.getItem('dakibwa_goodreads_user');
    const savedLastfm = localStorage.getItem('dakibwa_lastfm_user');

    if (savedLetterboxd) setLetterboxdUser(savedLetterboxd);
    if (savedGoodreads) setGoodreadsUser(savedGoodreads);
    if (savedLastfm) setLastfmUser(savedLastfm);

    const savedVersion = localStorage.getItem('dakibwa_consumption_version');
    if (savedVersion !== CACHE_VERSION) {
      localStorage.removeItem('dakibwa_consumption_items');
      localStorage.setItem('dakibwa_consumption_version', CACHE_VERSION);
      return;
    }

    const cachedItems = localStorage.getItem('dakibwa_consumption_items');
    if (!cachedItems) return;

    try {
      const parsed = JSON.parse(cachedItems);
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {
      localStorage.removeItem('dakibwa_consumption_items');
    }
  }, []);

  const hasAnyConnection = Boolean(letterboxdUser || goodreadsUser || lastfmUser);

  const fetchAllData = useCallback(async () => {
    if (!hasAnyConnection) return;

    setLoading(true);

    const jobs: Array<Promise<{ source: 'lastfm' | 'letterboxd' | 'goodreads'; items: MediaItem[] }>> = [];

    if (lastfmUser && LASTFM_API_KEY) {
      jobs.push(fetchLastFmAlbums(lastfmUser).then((data) => ({ source: 'lastfm' as const, items: data })));
    }

    if (letterboxdUser) {
      jobs.push(fetchLetterboxdFilms(letterboxdUser).then((data) => ({ source: 'letterboxd' as const, items: data })));
    }

    if (goodreadsUser) {
      jobs.push(fetchGoodreadsBooks(goodreadsUser).then((data) => ({ source: 'goodreads' as const, items: data })));
    }

    const settled = await Promise.allSettled(jobs);
    const nextConnected = { letterboxd: false, goodreads: false, lastfm: false };
    const allItems: MediaItem[] = [];

    settled.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      const { source, items: sourceItems } = result.value;

      if (sourceItems.length > 0) {
        nextConnected[source] = true;
      }

      allItems.push(...sourceItems);
    });

    if (nextConnected.lastfm) localStorage.setItem('dakibwa_lastfm_user', lastfmUser);
    if (nextConnected.letterboxd) localStorage.setItem('dakibwa_letterboxd_user', letterboxdUser);
    if (nextConnected.goodreads) localStorage.setItem('dakibwa_goodreads_user', goodreadsUser);

    const normalizedItems = dedupeAndRankItems(allItems);
    setConnected(nextConnected);
    setItems(normalizedItems);
    localStorage.setItem('dakibwa_consumption_items', JSON.stringify(normalizedItems));
    setLoading(false);
  }, [goodreadsUser, hasAnyConnection, lastfmUser, letterboxdUser]);

  useEffect(() => {
    if (items.length === 0 && hasAnyConnection) {
      fetchAllData();
    }
  }, [fetchAllData, hasAnyConnection, items.length]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'masterpiece') return items.filter((item) => item.masterpiece);
    return items.filter((item) => item.type === filter);
  }, [filter, items]);

  const getCreator = (item: MediaItem) => item.artist || item.author || item.director || '';

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'album':
        return 'Album';
      case 'book':
        return 'Book';
      case 'film':
        return 'Film';
      default:
        return type;
    }
  };

  const getStampColor = (type: string, isMasterpiece?: boolean) => {
    if (isMasterpiece) return 'border-[#d6b970] dark:border-[#b79a56]';
    switch (type) {
      case 'album':
        return 'border-[#7aa2b8] dark:border-[#6f9ab1]';
      case 'film':
        return 'border-[#7aaf89] dark:border-[#6f9f7d]';
      case 'book':
        return 'border-[#c49383] dark:border-[#a97e70]';
      default:
        return 'border-[#d8d3c8] dark:border-[#35312a]';
    }
  };

  const getFilterColor = (key: FilterType) => {
    switch (key) {
      case 'album':
        return 'border-[#7aa2b8] dark:border-[#6f9ab1]';
      case 'film':
        return 'border-[#7aaf89] dark:border-[#6f9f7d]';
      case 'book':
        return 'border-[#c49383] dark:border-[#a97e70]';
      case 'masterpiece':
        return 'border-[#d6b970] dark:border-[#b79a56]';
      default:
        return 'border-[#d8d3c8] dark:border-[#35312a]';
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'album', label: 'Albums' },
    { key: 'film', label: 'Films' },
    { key: 'book', label: 'Books' },
    { key: 'masterpiece', label: 'Masterpieces' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-[#6a655d] dark:text-[#a49a88]">
          {loading ? 'Syncing your libraries...' : `${filteredItems.length} items`}
        </div>
        <button
          onClick={() => setShowSettings((prev) => !prev)}
          className="text-sm text-[#6a655d] dark:text-[#a49a88] hover:text-[#1c1a17] dark:hover:text-[#e8e2d6] transition-colors"
        >
          {showSettings ? 'Close' : 'Connect your services'}
        </button>
      </div>

      {showSettings && (
        <div className="border border-[#d8d3c8] dark:border-[#35312a] bg-[#f6f4ef]/40 dark:bg-[#1b1916]/40 p-6 space-y-4">
          <p className="text-sm text-[#6a655d] dark:text-[#a49a88]">
            Connect your accounts to automatically import your consumption history.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm text-[#6a655d] dark:text-[#a49a88] mb-1">Last.fm Username</label>
              <input
                type="text"
                value={lastfmUser}
                onChange={(e) => setLastfmUser(e.target.value.trim())}
                placeholder="e.g., dakibwa"
                className="w-full bg-transparent border-b border-[#d8d3c8] dark:border-[#35312a] py-2 text-sm outline-none focus:border-[#2a5b53] dark:focus:border-[#7ab2a8]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#6a655d] dark:text-[#a49a88] mb-1">Letterboxd Username</label>
              <input
                type="text"
                value={letterboxdUser}
                onChange={(e) => setLetterboxdUser(e.target.value.trim())}
                placeholder="e.g., dakibwa"
                className="w-full bg-transparent border-b border-[#d8d3c8] dark:border-[#35312a] py-2 text-sm outline-none focus:border-[#2a5b53] dark:focus:border-[#7ab2a8]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#6a655d] dark:text-[#a49a88] mb-1">Goodreads User ID</label>
              <input
                type="text"
                value={goodreadsUser}
                onChange={(e) => setGoodreadsUser(e.target.value.trim())}
                placeholder="e.g., 12345678"
                className="w-full bg-transparent border-b border-[#d8d3c8] dark:border-[#35312a] py-2 text-sm outline-none focus:border-[#2a5b53] dark:focus:border-[#7ab2a8]"
              />
              <p className="text-xs text-[#8a8378] dark:text-[#8f8575] mt-1">Find this in your profile URL</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllData}
              disabled={loading || !hasAnyConnection}
              className="text-sm text-[#1c1a17] dark:text-[#e8e2d6] hover:opacity-70 transition-opacity disabled:opacity-30"
            >
              {loading ? 'Fetching...' : 'Sync now'}
            </button>
            <div className="flex items-center gap-2 text-xs text-[#8a8378] dark:text-[#8f8575]">
              <span className={connected.lastfm ? 'text-[#2a5b53] dark:text-[#7ab2a8]' : ''}>Last.fm</span>
              <span>•</span>
              <span className={connected.letterboxd ? 'text-[#2a5b53] dark:text-[#7ab2a8]' : ''}>Letterboxd</span>
              <span>•</span>
              <span className={connected.goodreads ? 'text-[#2a5b53] dark:text-[#7ab2a8]' : ''}>Goodreads</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end flex-wrap gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 text-sm transition-all border ${
              filter === key
                ? `${getFilterColor(key)} bg-[#1c1a17]/5 dark:bg-white/10 text-[#1c1a17] dark:text-[#e8e2d6]`
                : `${getFilterColor(key)} bg-transparent text-[#6a655d] dark:text-[#a49a88] hover:bg-[#1c1a17]/5 dark:hover:bg-white/5`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && filteredItems.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="border border-[#d8d3c8] dark:border-[#35312a] p-3 animate-pulse">
              <div className="aspect-square mb-3 bg-[#ece8de] dark:bg-[#22201b]" />
              <div className="h-3 w-4/5 bg-[#ece8de] dark:bg-[#22201b] mb-2" />
              <div className="h-3 w-2/3 bg-[#ece8de] dark:bg-[#22201b]" />
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div
                className={`border ${getStampColor(item.type, item.masterpiece)} p-3 h-full transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-sm ${
                  item.masterpiece ? 'bg-[#1c1a17]/5 dark:bg-white/5' : ''
                }`}
              >
                <div className="aspect-square mb-3 overflow-hidden bg-[#ece8de] dark:bg-[#22201b] flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-3xl font-light opacity-30">{item.title.charAt(0)}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-[#1c1a17] dark:text-[#e8e2d6] leading-tight truncate">{item.title}</div>
                  <div className="text-sm text-[#6a655d] dark:text-[#a49a88] leading-tight truncate">{getCreator(item)}</div>
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="text-[11px] text-[#8a8378] dark:text-[#8f8575] uppercase tracking-wide">{getTypeLabel(item.type)}</span>
                    {item.rating ? (
                      <span className="text-[11px] text-[#8a8378] dark:text-[#8f8575]">
                        {'★'.repeat(Math.floor(item.rating))}
                        {item.rating % 1 !== 0 ? '½' : ''}
                      </span>
                    ) : null}
                    {!item.rating && item.playcount ? (
                      <span className="text-[11px] text-[#8a8378] dark:text-[#8f8575]">{item.playcount.toLocaleString()}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-[#6a655d] dark:text-[#a49a88]">
          {hasAnyConnection ? (
            <div className="space-y-4">
              <p>No items yet.</p>
              <button onClick={fetchAllData} className="text-sm hover:opacity-70 transition-opacity">
                Sync your data
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p>Connect your accounts to see your consumption history.</p>
              <button onClick={() => setShowSettings(true)} className="text-sm hover:opacity-70 transition-opacity">
                Connect your services
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Consumption;
