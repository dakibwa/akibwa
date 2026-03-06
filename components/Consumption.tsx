import React, { useCallback, useEffect, useMemo, useState } from 'react';

const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY || '';
const LETTERBOXD_BASE_URL = 'https://letterboxd.com';
const LETTERBOXD_PROXY_URL = 'https://api.allorigins.win/raw?url=';
const MIN_LASTFM_ALBUM_PLAYCOUNT = 5;
const MAX_LETTERBOXD_PAGES = 80;

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
  liked?: boolean;
}

type FilterType = 'all' | 'album' | 'book' | 'film' | 'masterpiece';

const DEFAULT_USERNAMES = {
  letterboxd: 'Akibwa',
  goodreads: 'Akibwa',
  lastfm: 'akibwa',
};

const CACHE_VERSION = '8';

const normaliseText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const getCreatorValue = (item: Pick<MediaItem, 'artist' | 'author' | 'director'>) =>
  item.artist || item.author || item.director || '';

const createMediaId = (
  item: Pick<MediaItem, 'type' | 'title' | 'artist' | 'author' | 'director' | 'year' | 'link'>
) => {
  const linkKey =
    item.type === 'film' && item.link
      ? new URL(item.link, LETTERBOXD_BASE_URL).pathname.replace(/\/$/, '')
      : '';

  return [
    item.type,
    normaliseText(item.title),
    normaliseText(getCreatorValue(item)),
    normaliseText(item.year || ''),
    normaliseText(linkKey),
  ].join(':');
};

const parseSrcSet = (value: string | null) => {
  if (!value) return '';

  const candidates = value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);

  return candidates[candidates.length - 1] || '';
};

const normaliseImageUrl = (value: string) => {
  if (!value) return '';

  const resolved = value.startsWith('//') ? `https:${value}` : value;
  if (resolved.includes('empty-poster')) return '';

  return resolved.replace(/-0-\d+-0-\d+/, '-0-230-0-345');
};

const parseStarRating = (value: string) => {
  const compact = value.replace(/\s+/g, '');
  const fullStars = (compact.match(/★/g) || []).length;
  const hasHalf = compact.includes('½');

  if (!fullStars && !hasHalf) return undefined;
  return fullStars + (hasHalf ? 0.5 : 0);
};

const parseTenPointRating = (value: string | null) => {
  if (!value) return undefined;

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;

  return Math.max(0.5, Math.min(5, parsed / 2));
};

const mergeMediaItems = (existing: MediaItem, incoming: MediaItem): MediaItem => {
  const rating = incoming.rating ?? existing.rating;

  return {
    ...existing,
    ...incoming,
    id: createMediaId(existing),
    artist: incoming.artist || existing.artist,
    author: incoming.author || existing.author,
    director: incoming.director || existing.director,
    year: incoming.year || existing.year,
    imageUrl: incoming.imageUrl || existing.imageUrl,
    link: incoming.link || existing.link,
    rating,
    playcount: Math.max(existing.playcount || 0, incoming.playcount || 0) || undefined,
    liked: Boolean(existing.liked || incoming.liked),
    masterpiece: Boolean(existing.masterpiece || incoming.masterpiece || rating === 5),
  };
};

const dedupeAndRankItems = (items: MediaItem[]): MediaItem[] => {
  const map = new Map<string, MediaItem>();

  items.forEach((item) => {
    const key = createMediaId(item);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...item, id: key });
      return;
    }

    map.set(key, mergeMediaItems(existing, item));
  });

  return Array.from(map.values()).sort((left, right) => {
    const leftScore = (left.masterpiece ? 100000 : 0) + (left.playcount || 0) + (left.rating || 0) * 100 + (left.liked ? 25 : 0);
    const rightScore = (right.masterpiece ? 100000 : 0) + (right.playcount || 0) + (right.rating || 0) * 100 + (right.liked ? 25 : 0);
    return rightScore - leftScore;
  });
};

const fetchLastFmAlbums = async (username: string): Promise<MediaItem[]> => {
  if (!username || !LASTFM_API_KEY) return [];

  const albums: MediaItem[] = [];

  for (let page = 1; page <= 3; page++) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=500&period=overall&page=${page}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.topalbums?.album?.length) break;

    data.topalbums.album.forEach((album: any) => {
      const playcount = Number.parseInt(album.playcount, 10) || 0;
      if (playcount < MIN_LASTFM_ALBUM_PLAYCOUNT) return;

      albums.push({
        id: createMediaId({
          type: 'album',
          title: album.name,
          artist: album.artist?.name,
        }),
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

const fetchTextThroughProxy = async (url: string) => {
  const response = await fetch(`${LETTERBOXD_PROXY_URL}${encodeURIComponent(url)}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.text();
};

const extractLetterboxdItemsFromDocument = (document: Document, liked: boolean) => {
  const posters = Array.from(
    document.querySelectorAll<HTMLElement>('li.poster-container, .poster-container')
  );

  const results: MediaItem[] = [];
  const seen = new Set<string>();

  posters.forEach((poster, index) => {
    const posterNode =
      poster.querySelector<HTMLElement>('.really-lazy-load, .film-poster, [data-target-link]') || poster;
    const anchor = poster.querySelector<HTMLAnchorElement>('a[href*="/film/"]');
    const image = poster.querySelector<HTMLImageElement>('img');

    const href =
      posterNode.getAttribute('data-target-link') ||
      anchor?.getAttribute('href') ||
      '';
    const title =
      image?.getAttribute('alt')?.trim() ||
      anchor?.getAttribute('title')?.trim() ||
      posterNode.getAttribute('data-film-name')?.trim() ||
      '';

    if (!href || !title) return;

    const rating =
      parseTenPointRating(poster.getAttribute('data-owner-rating')) ||
      parseTenPointRating(posterNode.getAttribute('data-owner-rating')) ||
      parseStarRating(poster.querySelector('.poster-viewingdata')?.textContent || '') ||
      parseStarRating(anchor?.getAttribute('aria-label') || '');

    const imageUrl = normaliseImageUrl(
      image?.getAttribute('data-src') ||
        parseSrcSet(image?.getAttribute('data-srcset')) ||
        parseSrcSet(image?.getAttribute('srcset')) ||
        image?.getAttribute('src') ||
        posterNode.getAttribute('data-poster-url') ||
        ''
    );

    const item: MediaItem = {
      id: createMediaId({ type: 'film', title }),
      type: 'film',
      title,
      imageUrl,
      link: new URL(href, LETTERBOXD_BASE_URL).toString(),
      rating,
      liked,
      masterpiece: rating === 5,
    };

    if (seen.has(item.id)) return;
    seen.add(item.id);

    results.push(item);
  });

  if (results.length > 0) return results;

  const fallbackAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/film/"]'));
  fallbackAnchors.forEach((anchor, index) => {
    const href = anchor.getAttribute('href') || '';
    const title = anchor.getAttribute('title')?.trim() || anchor.textContent?.trim() || '';
    if (!href || !title || title.length > 120 || !href.startsWith('/film/')) return;

    const key = createMediaId({ type: 'film', title });
    if (seen.has(key)) return;
    seen.add(key);

    results.push({
      id: `${key}:${index}`,
      type: 'film',
      title,
      link: new URL(href, LETTERBOXD_BASE_URL).toString(),
      liked,
    });
  });

  return results;
};

const getNextLetterboxdPageUrl = (document: Document, currentUrl: string) => {
  const href =
    document.querySelector<HTMLAnchorElement>('.paginate-nextprev .next')?.getAttribute('href') ||
    document.querySelector<HTMLAnchorElement>('a.next')?.getAttribute('href');

  if (!href) return null;
  return new URL(href, currentUrl).toString();
};

const fetchLetterboxdCollection = async (username: string, collectionPath: string, liked: boolean) => {
  const parser = new DOMParser();
  const collected: MediaItem[] = [];
  const visited = new Set<string>();

  let nextUrl = new URL(`/${username}/${collectionPath.replace(/^\/|\/$/g, '')}/`, LETTERBOXD_BASE_URL).toString();
  let pageCount = 0;

  while (nextUrl && pageCount < MAX_LETTERBOXD_PAGES && !visited.has(nextUrl)) {
    visited.add(nextUrl);
    const html = await fetchTextThroughProxy(nextUrl);
    const document = parser.parseFromString(html, 'text/html');
    const items = extractLetterboxdItemsFromDocument(document, liked);

    if (items.length === 0 && pageCount > 0) break;

    collected.push(...items);
    nextUrl = getNextLetterboxdPageUrl(document, nextUrl) || '';
    pageCount += 1;
  }

  return collected;
};

const fetchLetterboxdFilms = async (username: string): Promise<MediaItem[]> => {
  if (!username) return [];

  const [watchedFilms, likedFilms] = await Promise.all([
    fetchLetterboxdCollection(username, 'films', false),
    fetchLetterboxdCollection(username, 'likes/films', true),
  ]);

  return dedupeAndRankItems([...watchedFilms, ...likedFilms]);
};

const fetchGoodreadsBooks = async (userId: string): Promise<MediaItem[]> => {
  if (!userId) return [];

  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=https://www.goodreads.com/review/list_rss/${userId}?shelf=read&count=500`;
  const res = await fetch(proxyUrl);
  const data = await res.json();

  if (!Array.isArray(data.items)) return [];

  return data.items.map((item: any) => {
    const authorMatch = item.description?.match(/author: ([^<]+)/i) || item.description?.match(/by ([^<]+)/i);
    const ratingMatch = item.description?.match(/rating: (\d)/i) || item.description?.match(/(\d) of 5 stars/i);
    const imageMatch = item.description?.match(/src="([^"]+)"/);
    const rating = ratingMatch ? Number.parseInt(ratingMatch[1], 10) : undefined;

    return {
      id: createMediaId({
        type: 'book',
        title: item.title,
        author: authorMatch?.[1]?.trim(),
      }),
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

const MediaArtwork: React.FC<{ item: MediaItem }> = ({ item }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [item.imageUrl]);

  const showImage = Boolean(item.imageUrl) && !failed;

  return (
    <div className="aspect-square mb-3 overflow-hidden bg-[#ece8de] dark:bg-[#22201b] relative flex items-center justify-center">
      {showImage ? (
        <img
          key={item.imageUrl}
          src={item.imageUrl}
          alt={item.title}
          className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.03] ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(false);
          }}
        />
      ) : null}

      {(!showImage || !loaded) && (
        <span className="text-3xl font-light opacity-30">{item.title.charAt(0)}</span>
      )}
    </div>
  );
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

  const getCreator = (item: MediaItem) => getCreatorValue(item);

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

  const getSignalLabel = (item: MediaItem) => {
    if (item.rating) {
      return `${'★'.repeat(Math.floor(item.rating))}${item.rating % 1 !== 0 ? '½' : ''}`;
    }

    if (item.liked) {
      return 'Liked';
    }

    if (item.playcount) {
      return `${item.playcount.toLocaleString()} listens`;
    }

    return null;
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
      <div className="surface-panel rounded-xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="text-sm text-[#696257] dark:text-[#a89d88]">
          {loading ? 'Syncing your libraries...' : `${filteredItems.length} items`}
        </div>
        <button
          onClick={() => setShowSettings((prev) => !prev)}
          className="text-xs uppercase tracking-[0.12em] text-[#696257] dark:text-[#a89d88] hover:text-[#205c5a] dark:hover:text-[#79b7ab] transition-colors"
        >
          {showSettings ? 'Close' : 'Connect your services'}
        </button>
      </div>

      {showSettings && (
        <div className="surface-panel rounded-xl p-6 space-y-4">
          <p className="text-sm text-[#696257] dark:text-[#a89d88]">
            Pull in your music, books, and films. Letterboxd now tries to walk every watched and liked film page, then keeps your rating when one exists.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm text-[#696257] dark:text-[#a89d88] mb-1">Last.fm Username</label>
              <input
                type="text"
                value={lastfmUser}
                onChange={(e) => setLastfmUser(e.target.value.trim())}
                placeholder="e.g., dakibwa"
                className="w-full bg-transparent border-b border-[#d8d3c8] dark:border-[#35312a] py-2 text-sm outline-none focus:border-[#2a5b53] dark:focus:border-[#7ab2a8]"
              />
              <p className="text-xs text-[#8a8378] dark:text-[#8f8575] mt-1">Albums with fewer than 5 listens are excluded.</p>
            </div>

            <div>
              <label className="block text-sm text-[#696257] dark:text-[#a89d88] mb-1">Letterboxd Username</label>
              <input
                type="text"
                value={letterboxdUser}
                onChange={(e) => setLetterboxdUser(e.target.value.trim())}
                placeholder="e.g., dakibwa"
                className="w-full bg-transparent border-b border-[#d8d3c8] dark:border-[#35312a] py-2 text-sm outline-none focus:border-[#2a5b53] dark:focus:border-[#7ab2a8]"
              />
              <p className="text-xs text-[#8a8378] dark:text-[#8f8575] mt-1">Imports watched films plus liked films, not just the RSS feed.</p>
            </div>

            <div>
              <label className="block text-sm text-[#696257] dark:text-[#a89d88] mb-1">Goodreads User ID</label>
              <input
                type="text"
                value={goodreadsUser}
                onChange={(e) => setGoodreadsUser(e.target.value.trim())}
                placeholder="e.g., 12345678"
                className="w-full bg-transparent border-b border-[#d8d3c8] dark:border-[#35312a] py-2 text-sm outline-none focus:border-[#2a5b53] dark:focus:border-[#7ab2a8]"
              />
              <p className="text-xs text-[#8a8378] dark:text-[#8f8575] mt-1">Find this in your profile URL.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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
            className={`px-3 py-1 text-sm rounded-full transition-all border ${
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
                className={`surface-panel ${getStampColor(item.type, item.masterpiece)} p-3 h-full transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-sm ${
                  item.masterpiece ? 'bg-[#1c1a17]/5 dark:bg-white/5' : ''
                }`}
              >
                <MediaArtwork item={item} />

                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-[#1c1a17] dark:text-[#e8e2d6] leading-tight truncate">{item.title}</div>
                  <div className="text-sm text-[#6a655d] dark:text-[#a49a88] leading-tight truncate">{getCreator(item)}</div>
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="text-[11px] text-[#8a8378] dark:text-[#8f8575] uppercase tracking-wide">{getTypeLabel(item.type)}</span>
                    {getSignalLabel(item) ? (
                      <span className="text-[11px] text-[#8a8378] dark:text-[#8f8575]">{getSignalLabel(item)}</span>
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
