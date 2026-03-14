import React, { useCallback, useEffect, useMemo, useState } from 'react';

const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY || '';
const LETTERBOXD_BASE_URL = 'https://letterboxd.com';
const LETTERBOXD_PROXY_URL = 'https://api.allorigins.win/raw?url=';
const MIN_LASTFM_ALBUM_PLAYCOUNT = 5;
const MAX_LETTERBOXD_PAGES = 80;

interface MediaItem {
  id: string;
  type: 'album';
  title: string;
  artist?: string;
  director?: string;
  year?: string;
  masterpiece?: boolean;
  imageUrl?: string;
  link?: string;
  rating?: number;
  playcount?: number;
  liked?: boolean;
}

type FilterType = 'all';

const DEFAULT_USERNAMES = {
  lastfm: 'akibwa',
};

const CACHE_VERSION = '9';

const normaliseText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const getCreatorValue = (item: Pick<MediaItem, 'artist' | 'director'>) => item.artist || item.director || '';

const createMediaId = (item: Pick<MediaItem, 'type' | 'title' | 'artist' | 'director' | 'year' | 'link'>) => {
  let linkKey = '';

  if (item.type === 'film' && item.link) {
    try {
      linkKey = new URL(item.link, LETTERBOXD_BASE_URL).pathname.replace(/\/$/, '');
    } catch {
      linkKey = item.link;
    }
  }

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

  return resolved.replace(/-0-\d+-0-\d+/, '-0-460-0-460');
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

const rankItem = (item: MediaItem) =>
  (item.masterpiece ? 100000 : 0) + (item.playcount || 0) + (item.rating || 0) * 90 + (item.liked ? 20 : 0);

const mergeMediaItems = (existing: MediaItem, incoming: MediaItem): MediaItem => {
  const merged: MediaItem = {
    ...existing,
    ...incoming,
    artist: incoming.artist || existing.artist,
    director: incoming.director || existing.director,
    year: incoming.year || existing.year,
    imageUrl: incoming.imageUrl || existing.imageUrl,
    link: incoming.link || existing.link,
    rating: incoming.rating ?? existing.rating,
    playcount: Math.max(existing.playcount || 0, incoming.playcount || 0) || undefined,
    liked: Boolean(existing.liked || incoming.liked),
    masterpiece: Boolean(existing.masterpiece || incoming.masterpiece || incoming.rating === 5 || existing.rating === 5),
  };

  merged.id = createMediaId(merged);
  return merged;
};

const dedupeAndRankItems = (items: MediaItem[]) => {
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

  return Array.from(map.values()).sort((left, right) => rankItem(right) - rankItem(left));
};

const fetchLastFmAlbums = async (username: string): Promise<MediaItem[]> => {
  if (!username || !LASTFM_API_KEY) return [];

  const albums: MediaItem[] = [];

  for (let page = 1; page <= 3; page += 1) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=500&period=overall&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();

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
        imageUrl: album.image?.[4]?.['#text'] || album.image?.[3]?.['#text'] || album.image?.[2]?.['#text'] || '',
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
  const posters = Array.from(document.querySelectorAll<HTMLElement>('li.poster-container, .poster-container'));
  const results: MediaItem[] = [];
  const seen = new Set<string>();

  posters.forEach((poster) => {
    const posterNode =
      poster.querySelector<HTMLElement>('.really-lazy-load, .film-poster, [data-target-link]') || poster;
    const anchor = poster.querySelector<HTMLAnchorElement>('a[href*="/film/"]');
    const image = poster.querySelector<HTMLImageElement>('img');

    const href = posterNode.getAttribute('data-target-link') || anchor?.getAttribute('href') || '';
    const title =
      image?.getAttribute('alt')?.trim() ||
      anchor?.getAttribute('title')?.trim() ||
      posterNode.getAttribute('data-film-name')?.trim() ||
      '';

    if (!href || !title) return;

    const resolvedLink = new URL(href, LETTERBOXD_BASE_URL).toString();
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
      id: createMediaId({ type: 'film', title, link: resolvedLink }),
      type: 'film',
      title,
      imageUrl,
      link: resolvedLink,
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
  fallbackAnchors.forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    const title = anchor.getAttribute('title')?.trim() || anchor.textContent?.trim() || '';

    if (!href || !title || title.length > 120 || !href.startsWith('/film/')) return;

    const resolvedLink = new URL(href, LETTERBOXD_BASE_URL).toString();
    const key = createMediaId({ type: 'film', title, link: resolvedLink });
    if (seen.has(key)) return;

    seen.add(key);
    results.push({
      id: key,
      type: 'film',
      title,
      link: resolvedLink,
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

const MediaArtwork: React.FC<{
  item: MediaItem;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}> = ({
  item,
  className = 'relative aspect-square overflow-hidden bg-[#ece8de] dark:bg-[#22201b] flex items-center justify-center',
  imageClassName = 'absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.03]',
  fallbackClassName = 'text-3xl font-light opacity-30',
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [item.imageUrl]);

  const showImage = Boolean(item.imageUrl) && !failed;

  return (
    <div className={className}>
      {showImage ? (
        <img
          key={item.imageUrl}
          src={item.imageUrl}
          alt={item.title}
          className={`${imageClassName} ${loaded ? 'opacity-100' : 'opacity-0'}`}
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

      {(!showImage || !loaded) && <span className={fallbackClassName}>{item.title.charAt(0)}</span>}
    </div>
  );
};

const getSignalLabel = (item: MediaItem) => {
  if (item.playcount) return `${item.playcount.toLocaleString()} listens`;
  if (item.rating) return `${'★'.repeat(Math.floor(item.rating))}${item.rating % 1 !== 0 ? '½' : ''}`;
  if (item.liked) return 'Liked';
  return null;
};

const getStampColor = (item: MediaItem) => {
  if (item.masterpiece) return 'border-[#d6b970] dark:border-[#b79a56]';
  return 'border-[#7aa2b8] dark:border-[#6f9ab1]';
};

const Consumption: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState({
    lastfm: false,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [lastfmUser, setLastfmUser] = useState(DEFAULT_USERNAMES.lastfm);

  useEffect(() => {
    const savedLastfm = localStorage.getItem('dakibwa_lastfm_user');

    if (savedLastfm) setLastfmUser(savedLastfm);

    const savedVersion = localStorage.getItem('dakibwa_consumption_version');
    if (savedVersion !== CACHE_VERSION) {
      localStorage.removeItem('dakibwa_consumption_items');
      localStorage.removeItem('dakibwa_goodreads_user');
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

  const hasAnyConnection = Boolean(lastfmUser);

  const fetchAllData = useCallback(async () => {
    if (!hasAnyConnection) return;

    setLoading(true);

    try {
      const jobs: Array<Promise<{ source: 'lastfm'; items: MediaItem[] }>> = [];

      if (lastfmUser && LASTFM_API_KEY) {
        jobs.push(fetchLastFmAlbums(lastfmUser).then((data) => ({ source: 'lastfm' as const, items: data })));
      }

      const settled = await Promise.allSettled(jobs);
      const nextConnected = { lastfm: false };
      const allItems: MediaItem[] = [];

      settled.forEach((result) => {
        if (result.status !== 'fulfilled') return;

        const { source, items: sourceItems } = result.value;
        if (sourceItems.length > 0) nextConnected[source] = true;
        allItems.push(...sourceItems);
      });

      const normalizedItems = dedupeAndRankItems(allItems);
      setConnected(nextConnected);
      setItems(normalizedItems);

      localStorage.setItem('dakibwa_lastfm_user', lastfmUser);
      localStorage.setItem('dakibwa_consumption_items', JSON.stringify(normalizedItems));
    } finally {
      setLoading(false);
    }
  }, [hasAnyConnection, lastfmUser]);

  useEffect(() => {
    if (items.length === 0 && hasAnyConnection) {
      fetchAllData();
    }
  }, [fetchAllData, hasAnyConnection, items.length]);

  const albumItems = useMemo(
    () => [...items].sort((left, right) => (right.playcount || 0) - (left.playcount || 0)),
    [items]
  );
  const topAlbums = useMemo(() => albumItems.slice(0, 6), [albumItems]);
  const leadAlbum = topAlbums[0] || null;
  const supportingAlbums = topAlbums.slice(1);

  const filteredItems = useMemo(() => items, [items]);

  const featuredAlbumIds = useMemo(() => new Set(topAlbums.map((album) => album.id)), [topAlbums]);
  const galleryItems = useMemo(() => {
    if (filter === 'all' || filter === 'album') {
      return filteredItems.filter((item) => !featuredAlbumIds.has(item.id));
    }

    return filteredItems;
  }, [featuredAlbumIds, filter, filteredItems]);

  const totalAlbumListens = useMemo(
    () => albumItems.reduce((sum, item) => sum + (item.playcount || 0), 0),
    [albumItems]
  );

  return (
    <div className="space-y-8">
      <div className="surface-panel flex flex-wrap items-center justify-between gap-4 rounded-[1.4rem] px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8a8378] dark:text-[#8f8575]">Library</p>
          <p className="mt-1 text-sm text-[#696257] dark:text-[#a89d88]">
            {loading ? 'Gathering listening history and shaping the map...' : `${items.length} records in view`}
          </p>
        </div>

        <button
          onClick={() => setShowSettings((current) => !current)}
          className="text-xs uppercase tracking-[0.14em] text-[#696257] transition-colors hover:text-[#205c5a] dark:text-[#a89d88] dark:hover:text-[#79b7ab]"
        >
          {showSettings ? 'Close sources' : 'Edit sources'}
        </button>
      </div>

      {showSettings && (
        <div className="surface-panel rounded-[1.6rem] p-6">
          <div className="max-w-2xl">
            <p className="text-sm leading-6 text-[#696257] dark:text-[#a89d88]">
              This section is now just the listening record underneath the map. Last.fm is the only source that matters here.
            </p>
          </div>

          <div className="mt-6 max-w-md">
            <label className="mb-1 block text-sm text-[#696257] dark:text-[#a89d88]">Last.fm username</label>
            <input
              type="text"
              value={lastfmUser}
              onChange={(event) => setLastfmUser(event.target.value.trim())}
              placeholder="e.g. akibwa"
              className="w-full border-b border-[#d8d3c8] bg-transparent py-2 text-sm outline-none transition-colors focus:border-[#205c5a] dark:border-[#35312a] dark:focus:border-[#79b7ab]"
            />
            <p className="mt-1 text-xs text-[#8a8378] dark:text-[#8f8575]">Albums with fewer than 5 listens stay out of the view.</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={fetchAllData}
              disabled={loading || !hasAnyConnection}
              className="text-sm text-[#1c1a17] transition-opacity hover:opacity-70 disabled:opacity-30 dark:text-[#e8e2d6]"
            >
              {loading ? 'Syncing...' : 'Sync now'}
            </button>
            <div className="flex items-center gap-2 text-xs text-[#8a8378] dark:text-[#8f8575]">
              <span className={connected.lastfm ? 'text-[#205c5a] dark:text-[#79b7ab]' : ''}>Last.fm</span>
            </div>
          </div>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="surface-panel animate-pulse rounded-[1.4rem] p-4">
              <div className="aspect-square rounded-[1rem] bg-[#ece8de] dark:bg-[#22201b]" />
              <div className="mt-4 h-3 w-3/4 bg-[#ece8de] dark:bg-[#22201b]" />
              <div className="mt-2 h-3 w-1/2 bg-[#ece8de] dark:bg-[#22201b]" />
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="surface-panel rounded-[1.4rem] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a8378] dark:text-[#8f8575]">Albums in orbit</p>
              <p className="mt-2 font-display text-3xl tracking-tight text-[#1c1a16] dark:text-[#ece3d0]">{albumItems.length}</p>
            </div>
            <div className="surface-panel rounded-[1.4rem] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a8378] dark:text-[#8f8575]">Signals gathered</p>
              <p className="mt-2 font-display text-3xl tracking-tight text-[#1c1a16] dark:text-[#ece3d0]">
                {totalAlbumListens.toLocaleString()}
              </p>
            </div>
          </div>

          {topAlbums.length > 0 && (
            <section>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#696257] dark:text-[#a89d88]">
                <span className="text-xs uppercase tracking-[0.18em] text-[#8a8378] dark:text-[#8f8575]">Top 5</span>
                {topAlbums.slice(0, 5).map((album, index) => (
                  <a
                    key={album.id}
                    href={album.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate rounded-full border border-[#d8d3c8] px-3 py-1.5 text-[13px] transition-colors hover:border-[#7aa2b8] hover:text-[#1c1a16] dark:border-[#35312a] dark:hover:border-[#6f9ab1] dark:hover:text-[#ece3d0]"
                  >
                    {index + 1}. {album.title}
                  </a>
                ))}
              </div>
            </section>
          )}

          <section>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a8378] dark:text-[#8f8575]">Listening library</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight text-[#1c1a16] dark:text-[#ece3d0]">
                Records behind the map
              </h2>
            </div>

            {galleryItems.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {galleryItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <div
                      className={`surface-panel h-full rounded-[1.3rem] border p-2.5 transition-all duration-300 group-hover:-translate-y-0.5 ${getStampColor(item)}`}
                    >
                      <MediaArtwork item={item} className="relative aspect-square overflow-hidden rounded-[0.8rem] bg-[#ece8de] dark:bg-[#22201b] flex items-center justify-center" fallbackClassName="text-xl font-light opacity-30" />

                      <div className="mt-2.5 space-y-1">
                        <h3 className="truncate text-[13px] font-medium leading-tight text-[#1c1a16] dark:text-[#e8e2d6]">
                          {item.title}
                        </h3>
                        <p className="truncate text-[13px] leading-tight text-[#6a655d] dark:text-[#a49a88]">
                          {getCreatorValue(item)}
                        </p>
                        {getSignalLabel(item) ? (
                          <div className="pt-1 text-[11px] text-[#8a8378] dark:text-[#8f8575]">{getSignalLabel(item)}</div>
                        ) : null}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="surface-panel mt-6 rounded-[1.5rem] px-6 py-10 text-center text-[#6a655d] dark:text-[#a49a88]">
                {filter === 'all' || filter === 'album'
                  ? 'The heaviest musical signals are already surfaced above.'
                  : 'Nothing matches this filter yet.'}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="surface-panel rounded-[1.6rem] px-6 py-16 text-center text-[#6a655d] dark:text-[#a49a88]">
          {hasAnyConnection ? (
            <div className="mx-auto max-w-2xl space-y-4">
              <p className="font-display text-2xl text-[#1c1a16] dark:text-[#ece3d0]">The constellation is still dark.</p>
              <p>
                There is enough structure here to become a map of taste, but the listening signals have not landed yet.
              </p>
              <button onClick={fetchAllData} className="text-sm transition-opacity hover:opacity-70">
                Sync listening data
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-4">
              <p className="font-display text-2xl text-[#1c1a16] dark:text-[#ece3d0]">Start with Last.fm.</p>
              <p>
                The music constellation begins with real listening history. Connect Last.fm first; everything else is secondary.
              </p>
              <button onClick={() => setShowSettings(true)} className="text-sm transition-opacity hover:opacity-70">
                Edit sources
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Consumption;
