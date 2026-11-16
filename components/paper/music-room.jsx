"use client";

import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlbumArtImage } from "../site-image";
import { useMusicRanking } from "../use-music-ranking";
import { LARGE_ART } from "./music-art.mjs";
import { fold } from "./music-ranking.mjs";
import { indexItems, search } from "./music-search.mjs";
import { ORDERS, arrange, listened, peakOf, rowsFor, songTitle } from "./music-shelf.mjs";

/*
 * Music (Dan, 16 November 2026): one shelf of Dan's top 150 albums or all his
 * top 1,000 songs, one or the other. Each square is as large as the hours he
 * listened to it, its area following the hours, between a floor that keeps
 * every sleeve big enough to see and a cap that stops any one dominating.
 * The bar at the top holds everything there is to know: what is under the
 * pointer, how the shelf is ordered (by hours, by the year he played it most,
 * by kind of music, or a to z), albums or songs, and a search for artists,
 * the artists around them, genres and eras (music-search.mjs). Choosing an
 * order sorts the whole shelf into it, every sleeve gliding to its new place,
 * and shows only the headings that order needs. Albums are their sleeves;
 * songs are typeset, since a sleeve is the album's and not the song's (Dan,
 * 25 September 2026). Choosing an album opens its track list: the songs he
 * played from it, most played first, with plays and hours. Choosing a song
 * opens its album's list with the song lit, or the song alone when its album
 * is not among these. Each sheet links to the release on Spotify and Apple
 * Music (Dan, 26 September 2026).
 */

// A public file the room fetches once it opens: the search's genres and
// years, the hours by year, the kinds, or where each album can be heard.
function useRoomFile(active, path) {
  const [packet, setPacket] = useState(null);
  useEffect(() => {
    if (!active || packet) return undefined;
    let cancelled = false;
    fetch(path)
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body) setPacket(body);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active, packet, path]);
  return packet;
}

// Where to hear it: the release found on each service, or a search there.
function listenLinks(found, artist, title) {
  const term = encodeURIComponent(`${artist} ${title}`);
  return [
    ["Spotify", found?.spotify ?? `https://open.spotify.com/search/${term}`],
    ["Apple Music", found?.apple ?? `https://music.apple.com/gb/search?term=${term}`]
  ];
}

// Paper tints for the songs, one to an artist.
const TINTS = ["#f6efdd", "#f1dcd4", "#dfe8ef", "#e3ead6", "#f4e3b8", "#e8dff0", "#f0d9c2", "#d9e6e0"];
const tintFor = (artist) => TINTS[[...artist].reduce((hash, letter) => (hash * 31 + letter.charCodeAt(0)) >>> 0, 7) % TINTS.length];

const plays = (count) => `${count.toLocaleString("en-GB")} ${count === 1 ? "play" : "plays"}`;

/*
 * The width the shelf is laid out at. A room opening is laid out at once; a
 * resize waits until the window has been still for a moment, so the sleeves
 * are not sized again at every pixel, then they glide to their new sizes.
 */
const SETTLE = 160;

function useSettledWidth(ref) {
  // Laid out for a laptop until the shelf has been measured.
  const [width, setWidth] = useState(1100);
  const [measured, setMeasured] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const read = () => Math.floor(element.clientWidth);
    let last = read();
    if (last > 0) {
      setWidth(last);
      setMeasured(true);
    }
    let timer = 0;
    const observer = new ResizeObserver(() => {
      const next = read();
      const shown = last > 0;
      last = next;
      if (next <= 0) return;
      clearTimeout(timer);
      if (!shown) {
        setWidth(next);
        setMeasured(true);
        return;
      }
      timer = setTimeout(() => setWidth(read()), SETTLE);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [ref]);
  return [width, measured];
}

/*
 * FLIP: after the shelf is sorted or sized again, each sleeve on screen is put
 * back where it was seen (a transform, so the compositor does the work) and
 * released to glide to its new place. Sleeves off screen just move.
 */
const GLIDE = { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };

function useGlide(list, arrangement, view, measured) {
  const seen = useRef(null);
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const origin = element.getBoundingClientRect();
    const tiles = [...element.querySelectorAll(".music-tile")];
    const rects = new Map();
    for (const tile of tiles) {
      const box = tile.getBoundingClientRect();
      rects.set(tile.dataset.key, { x: box.left - origin.left, y: box.top - origin.top, w: box.width });
    }
    const was = seen.current;
    seen.current = { view, measured, rects };
    // Nothing glides into the first measured layout, only between layouts seen.
    if (!was || !was.measured || was.view !== view || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const tile of tiles) {
      const from = was.rects.get(tile.dataset.key);
      const to = rects.get(tile.dataset.key);
      if (!from || !to) continue;
      const onScreen = [from.y, to.y].some((y) => origin.top + y < innerHeight && origin.top + y + Math.max(from.w, to.w) > 0);
      if (!onScreen) continue;
      const dx = from.x + from.w / 2 - (to.x + to.w / 2);
      const dy = from.y + from.w / 2 - (to.y + to.w / 2);
      const size = from.w / to.w;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(size - 1) < 0.01) continue;
      tile.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${size})` }, { transform: "none" }], GLIDE);
    }
  }, [list, arrangement, view, measured]);
}

/*
 * The first screenful of a list is drawn at once and the rest a frame later,
 * so the switch answers before a thousand songs are laid down.
 */
const FIRST = 160;

function useProgressive(list) {
  const [shown, setShown] = useState({ list, count: Math.min(list.length, FIRST) });
  const current = shown.list === list ? shown : { list, count: Math.min(list.length, FIRST) };
  if (current !== shown) setShown(current);
  useEffect(() => {
    if (current.count >= list.length) return undefined;
    const frame = requestAnimationFrame(() => startTransition(() => setShown({ list, count: list.length })));
    return () => cancelAnimationFrame(frame);
  }, [list, current.count]);
  return current.count;
}

const Tile = memo(function Tile({ kind, item, side, onOpen, onPoint }) {
  const art = item.art ?? (kind === "albums" ? item.id : null);
  const described = `${item.title}, ${item.artist}. ${listened(item.minutes)} listened, ${plays(item.plays)}.`;
  return (
    <li className="music-tile" data-key={`${kind}-${item.rank}`} style={{ width: side, height: side, "--tint": kind === "songs" ? tintFor(item.artist) : undefined }}>
      <button
        type="button"
        className="music-face"
        onClick={(event) => onOpen(kind, item, event.currentTarget)}
        onPointerEnter={() => onPoint(item)}
        onFocus={() => onPoint(item)}
        aria-label={`${described} ${kind === "songs" ? "Show it" : "Show its tracks"}.`}
      >
        {kind === "songs" ? (
          <span className="music-type" aria-hidden="true">
            <b className="music-initial">{songTitle(item.title).charAt(0)}</b>
            {side >= 112 ? <strong>{songTitle(item.title)}</strong> : null}
          </span>
        ) : art ? (
          <AlbumArtImage id={art} alt="" large={LARGE_ART[art]} sizes={`${side}px`} />
        ) : (
          <span className="music-blank" aria-hidden="true">
            {side >= 56 ? item.title : null}
          </span>
        )}
      </button>
    </li>
  );
});

/*
 * The bar's one line of words: whatever is under the pointer or the
 * keyboard, and nothing otherwise. It keeps its own state, so pointing at a sleeve
 * does not draw the shelf again.
 */
function Now({ say, view, order, shownCount, shownMinutes, years, kinds }) {
  const [item, setItem] = useState(null);
  useEffect(() => {
    say.current = setItem;
    return () => {
      say.current = null;
    };
  }, [say]);
  useEffect(() => setItem(null), [view]);
  let main;
  let side;
  if (item) {
    main = view === "songs" ? songTitle(item.title) : item.title;
    const facts = [item.artist, `${listened(item.minutes)} listened`];
    if (order === "year" && years) {
      const peak = peakOf(view === "albums" ? years.albums?.[item.id] : years.songs?.[item.rank - 1]);
      if (peak) facts.push(`most in ${peak[0]}`);
    } else if (order === "kind" && kinds) {
      const name = kinds.kinds?.[kinds.artists?.[item.artist]];
      if (name) facts.push(name);
    } else if (view === "albums" && item.year) {
      facts.push(item.year);
    }
    side = facts.join(" · ");
  } else {
    // Nothing to say until something is pointed at (Dan, 16 November 2026:
    // “super minimalist and simple”).
    main = "";
    side = "";
  }
  return (
    <output className="music-now" aria-live="polite">
      <strong>{main}</strong>
      <span>{side}</span>
    </output>
  );
}

// The colours the track bars take under the pointer, one after another: the
// cast's orange, periwinkle and raspberry among the rooms' inks.
const BARS = ["#fe7735", "#7d7afb", "#eb5772", "#2b5fb8", "#3f7634", "#e3a21a", "#24709f", "#a72d28"];

// A sheet over the room: a sleeve, a heading, the numbers and where to hear it.
function Sheet({ cover, title, byline, totals, links, label, onClose, children }) {
  const panel = useRef(null);
  useEffect(() => {
    const dialog = panel.current;
    if (!dialog.open) dialog.showModal();
    return () => dialog.open && dialog.close();
  }, []);
  return (
    <dialog
      className="music-tracks"
      ref={panel}
      aria-labelledby="music-tracks-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        // Escape closes the sheet, not the room behind it.
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === panel.current) onClose();
      }}
    >
      <div className="music-tracks-sheet">
        <button type="button" className="music-tracks-close" onClick={onClose} aria-label={label}>
          ×
        </button>
        <header className="music-tracks-head">
          <span className="music-tracks-cover">
            {cover ? <AlbumArtImage id={cover} alt="" large={LARGE_ART[cover]} sizes="150px" /> : <span className="music-blank" aria-hidden="true" />}
          </span>
          <div>
            <h3 id="music-tracks-title">{title}</h3>
            <p className="music-tracks-artist">{byline}</p>
            <p className="music-tracks-totals">{totals}</p>
            <p className="music-listen">
              {links.map(([service, href]) => (
                <a key={service} href={href} target="_blank" rel="noopener noreferrer">
                  {service} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </p>
          </div>
        </header>
        {children}
      </div>
    </dialog>
  );
}

// The same song on a sheet as on the shelf, whatever its reissue note.
const sameSong = (a, b) => fold(songTitle(a)).trim() === fold(songTitle(b)).trim();

function AlbumTracks({ album, year, picked, found, loading, loadError, retry, onClose }) {
  const lit = useRef(null);
  const most = Math.max(1, ...(album.tracks ?? []).map((track) => track.plays));
  // A song chosen on the shelf is brought into view on its album's list.
  useEffect(() => {
    lit.current?.scrollIntoView({ block: "center" });
  }, [album.tracks]);
  return (
    <Sheet
      cover={album.id}
      title={album.title}
      byline={`${album.artist}${year ? ` · ${year}` : ""}`}
      totals={`${plays(album.plays)} · ${listened(album.minutes)} listened`}
      links={listenLinks(found, album.artist, album.title)}
      label="Close the track list"
      onClose={onClose}
    >
      {album.tracks ? (
        <ol className="music-track-list">
          {album.tracks.map((track, index) => {
            const chosen = picked !== null && sameSong(track.title, picked);
            return (
              <li
                key={track.title}
                ref={chosen ? lit : undefined}
                className={chosen ? "is-picked" : undefined}
                aria-current={chosen ? "true" : undefined}
                style={{ "--share": track.plays / most, "--bar": BARS[index % BARS.length] }}
              >
                <span className="music-track-title">{track.title}</span>
                <span className="music-track-plays">{plays(track.plays)}</span>
                <span className="music-track-hours">{listened(track.minutes)}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="music-tracks-note">
          <p role="status">{loading ? "Fetching the tracks…" : "The tracks could not be loaded."}</p>
          {loadError && !loading ? <button type="button" className="chip" onClick={retry}>try loading again</button> : null}
        </div>
      )}
    </Sheet>
  );
}

// A song whose album is not among the albums: the song alone.
function SongSheet({ song, onClose }) {
  const title = songTitle(song.title);
  return (
    <Sheet
      cover={song.art}
      title={title}
      byline={song.artist}
      totals={`${plays(song.plays)} · ${listened(song.minutes)} listened`}
      links={listenLinks(null, song.artist, title)}
      label="Close the song"
      onClose={onClose}
    />
  );
}

export function MusicRoom({ initial, active }) {
  const music = useMusicRanking(initial, active);
  const meta = useRoomFile(active, "/music-meta.json");
  const years = useRoomFile(active, "/music-years.json");
  const kinds = useRoomFile(active, "/music-kinds.json");
  const links = useRoomFile(active, "/music-links.json");
  // The switch and the orders answer at once; the shelf follows as a transition.
  const [pressed, setPressed] = useState("albums");
  const [view, setView] = useState("albums");
  const [pressedOrder, setPressedOrder] = useState("hours");
  const [order, setOrder] = useState("hours");
  const [query, setQuery] = useState("");
  // What a sheet shows: an album (with a song lit) or a song alone.
  const [open, setOpen] = useState(null);
  const opener = useRef(null);
  useEffect(() => {
    if (!active) {
      setOpen(null);
      opener.current = null;
    } else if (!open) {
      // Wait until the modal has been removed and the shelf accepts focus.
      opener.current?.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [active, open]);
  const map = useRef(null);
  const list = useRef(null);
  const say = useRef(null);
  const [width, measured] = useSettledWidth(map);
  const choose = (name) => {
    setPressed(name);
    startTransition(() => setView(name));
  };
  const sort = (name) => {
    setPressedOrder(name);
    startTransition(() => setOrder(name));
  };

  // Each list by its hours, the most listened first.
  const lists = useMemo(() => {
    const byHours = (items) => [...items].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank).map((item) => ({ item }));
    return { albums: byHours(music.albums), songs: byHours(music.songs) };
  }, [music.albums, music.songs]);
  const albumIndex = useMemo(
    () =>
      indexItems(lists.albums.map((entry) => entry.item), {
        meta,
        yearOf: (album) => Number(album.year) || meta?.years?.[album.id] || null,
        extraText: (album) => (album.tracks ?? []).map((track) => track.title).join(" ")
      }),
    [lists.albums, meta]
  );
  const songIndex = useMemo(() => indexItems(lists.songs.map((entry) => entry.item), { meta, yearOf: (song) => meta?.years?.[song.art] ?? null }), [lists.songs, meta]);
  // All of the list, or what the search finds in it.
  const entries = useMemo(() => {
    const all = lists[view];
    const found = search(view === "albums" ? albumIndex : songIndex, query);
    if (!found) return all;
    const key = (item) => (view === "albums" ? item.id : item.rank);
    const kept = new Set(found.map(key));
    return all.filter((entry) => kept.has(key(entry.item)));
  }, [view, lists, albumIndex, songIndex, query]);

  // Sizes come from the whole list, so a search or an order never rescales them;
  // each row's size comes from its albums' hours (rowsFor in music-shelf.mjs).
  const reference = lists[view][Math.min(2, lists[view].length - 1)]?.item.minutes || 1;
  const arrangement = useMemo(
    () => arrange(order, view, entries, { years, kinds }).map((group) => ({ ...group, rows: rowsFor(group.entries, width, reference) })),
    [entries, width, reference, order, view, years, kinds]
  );
  const flat = useMemo(() => arrangement.flatMap((group) => group.entries), [arrangement]);
  const count = useProgressive(flat);
  useGlide(list, arrangement, view, measured);
  const shownMinutes = useMemo(() => entries.reduce((sum, entry) => sum + entry.item.minutes, 0), [entries]);

  const onOpen = useMemo(
    () => (kind, item, button) => {
      opener.current = button;
      setOpen(kind === "albums" ? { album: item.id } : { song: item.rank });
    },
    []
  );
  const onPoint = useCallback((item) => say.current?.(item), []);
  const song = open?.song ? music.songs.find((entry) => entry.rank === open.song) ?? null : null;
  // A song opens its album's list when the album is among these.
  const albumId = open?.album ?? (song?.art && music.albums.some((entry) => entry.id === song.art) ? song.art : null);
  const album = albumId ? music.albums.find((entry) => entry.id === albumId) ?? null : null;

  const close = () => {
    setOpen(null);
  };

  let drawn = 0;
  return (
    <div className="room-body music">
      <noscript><p className="music-tracks-note">Enable JavaScript to search music and open track lists.</p></noscript>
      <div className="music-bar">
        <span className="music-sign" aria-hidden="true">
          <svg viewBox="-2.7 -2.8 5.4 5.15" focusable="false">
            <circle cy="-1.8" r="1" />
            <circle cx="-1.7" r="1" />
            <circle cx="1.7" r="1" />
            <rect x="-1.7" y="-0.62" width="3.4" height="1.24" />
            <rect x="-0.56" y="-1.8" width="1.12" height="1.8" />
            <path d="M-0.6 0V0.9Q-0.51 1.79 0 2.35Q0.51 1.79 0.6 0.9V0Z" />
          </svg>
          Akibwa
        </span>
        <Now say={say} view={view} order={order} shownCount={entries.length} shownMinutes={shownMinutes} years={years} kinds={kinds} />
        <div className="music-order" role="group" aria-label="Order">
          {ORDERS.map(([name, label]) => (
            <button key={name} type="button" aria-pressed={pressedOrder === name} onClick={() => sort(name)}>
              {label}
            </button>
          ))}
        </div>
        <div className="music-switch" role="group" aria-label="Albums or songs" data-view={pressed}>
          {["albums", "songs"].map((name) => (
            <button key={name} type="button" aria-pressed={pressed === name} onClick={() => choose(name)}>
              {name}
            </button>
          ))}
        </div>
        <label className="music-search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <circle cx="10.5" cy="10.5" r="6.2" />
            <path d="M15.2 15.4l5 5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Escape clears the search, not the room.
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="search"
            aria-label="Search the albums and songs by artist, genre or era"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>

      {/* Measured here, outside the shelf the switch replaces. */}
      <div className="music-map-frame" ref={map} onPointerLeave={() => say.current?.(null)}>
        <div
          key={view}
          ref={list}
          className={`music-map is-${view} is-by-${order}`}
          role="region"
          aria-label={`My top ${view}, ${order === "hours" ? "most listened first" : order === "name" ? "a to z" : `by ${order}`}`}
        >
          {arrangement.map((group) => {
            const rows = group.rows.map((row) => ({ ...row, shown: row.entries.filter(() => drawn++ < count) })).filter((row) => row.shown.length);
            if (!rows.length) return null;
            return (
              <section key={group.key} className="music-group">
                {group.label ? (
                  <h3 className="music-group-head">
                    <span>{group.label}</span>
                    <span className="music-group-figures">{group.figures}</span>
                  </h3>
                ) : null}
                <div className="music-shelf">
                  {rows.map((row, index) => (
                    <ol key={index} className="music-row">
                      {row.shown.map(({ item }) => (
                        <Tile key={`${view}-${item.rank}`} kind={view} item={item} side={row.side} onOpen={onOpen} onPoint={onPoint} />
                      ))}
                    </ol>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {query && !entries.length ? <p className="music-none">Nothing matches.</p> : null}

      {music.loadError ? (
        <div className="music-more">
          <button type="button" className="chip" onClick={music.retry}>
            try loading again
          </button>
        </div>
      ) : null}

      {active && album ? (
        <AlbumTracks
          album={album}
          year={album.year || meta?.years?.[album.id] || null}
          picked={song ? song.title : null}
          found={links?.albums?.[album.id]}
          loading={music.loading}
          loadError={music.loadError}
          retry={music.retry}
          onClose={close}
        />
      ) : active && song ? (
        <SongSheet song={song} onClose={close} />
      ) : null}
    </div>
  );
}
