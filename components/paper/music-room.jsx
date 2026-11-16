"use client";

import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlbumArtImage } from "../site-image";
import { useMusicRanking } from "../use-music-ranking";
import { LARGE_ART } from "./music-art.mjs";
import { fold } from "./music-ranking.mjs";
import { indexItems, search } from "./music-search.mjs";
import { ORDERS, arrange, listened, mergeShelf, peakOf, rowsFor, songTitle, yearPairs } from "./music-shelf.mjs";

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

function useSettledWidth(ref, initial = 1100) {
  // Laid out for a laptop (or the given width) until it has been measured.
  const [width, setWidth] = useState(initial);
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
// Quick to start and soft to land, a slight wave from the top of the screen
// down; covers that arrive (a search widening) fade in rather than pop.
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const GLIDE = { duration: 420, easing: EASE };
const ARRIVE = { duration: 280, easing: EASE };

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
      if (!to) continue;
      const top = origin.top + to.y;
      const delay = Math.round(Math.min(1, Math.max(0, top / innerHeight)) * 90);
      if (!from) {
        if (top < innerHeight && top + to.w > 0) tile.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { ...ARRIVE, delay, fill: "backwards" });
        continue;
      }
      const onScreen = [from.y, to.y].some((y) => origin.top + y < innerHeight && origin.top + y + Math.max(from.w, to.w) > 0);
      if (!onScreen) continue;
      const dx = from.x + from.w / 2 - (to.x + to.w / 2);
      const dy = from.y + from.w / 2 - (to.y + to.w / 2);
      const size = from.w / to.w;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(size - 1) < 0.01) continue;
      tile.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${size})` }, { transform: "none" }], { ...GLIDE, delay, fill: "backwards" });
    }
  }, [list, arrangement, view, measured]);
}

/*
 * The shelf is drawn in one pass, so the page holds every record before
 * scripting runs; a longer list would draw the rest a frame later.
 */
const FIRST = 640;

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

const Tile = memo(function Tile({ item, side, onOpen, onPoint }) {
  const described = `${item.title}, ${item.artist}. ${listened(item.minutes)} listened, ${plays(item.plays)}.`;
  return (
    <li className="music-tile" data-key={item.key} style={{ width: side, height: side, "--side": side, "--tint": item.art ? undefined : tintFor(item.artist) }}>
      <button
        type="button"
        className="music-face"
        onClick={(event) => onOpen(item, event.currentTarget)}
        onPointerEnter={() => onPoint(item)}
        onFocus={() => onPoint(item)}
        aria-label={`${described} ${item.kind === "album" ? "Show its tracks" : "Show it"}.`}
      >
        {item.art ? (
          <AlbumArtImage id={item.art} alt="" large={LARGE_ART[item.art]} sizes={`${Math.ceil(side)}px`} />
        ) : (
          <span className="music-type" aria-hidden="true">
            <b className="music-initial">{item.title.charAt(0)}</b>
            {side >= 96 ? <strong>{item.title}</strong> : null}
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
function Now({ say, order, years, kinds }) {
  const [item, setItem] = useState(null);
  useEffect(() => {
    say.current = setItem;
    return () => {
      say.current = null;
    };
  }, [say]);
  let main = "";
  let side = "";
  if (item) {
    main = item.title;
    const facts = [item.artist, `${listened(item.minutes)} listened`];
    if (order === "year" && years) {
      const peak = peakOf(yearPairs(item, years));
      if (peak) facts.push(`most in ${peak[0]}`);
    } else if (order === "kind" && kinds) {
      const name = kinds.kinds?.[kinds.artists?.[item.artist]];
      if (name) facts.push(name);
    } else if (item.year) {
      facts.push(item.year);
    }
    side = facts.join(" · ");
  }
  // Nothing to say until something is pointed at (Dan, 16 November 2026:
  // “super minimalist and simple”).
  return (
    <output className="music-now" aria-live="polite" data-empty={item ? "false" : "true"}>
      <strong>{main}</strong>
      <span>{side}</span>
    </output>
  );
}

// The colours the track bars take under the pointer, one after another: the
// cast's orange, periwinkle and raspberry among the rooms' inks.
const BARS = ["#fe7735", "#7d7afb", "#eb5772", "#2b5fb8", "#3f7634", "#e3a21a", "#24709f", "#a72d28"];

// The services' marks, drawn in the page's ink.
const SERVICE_MARKS = {
  Spotify: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm4.8 15.2a.65.65 0 0 1-.9.2c-2.5-1.5-5.6-1.9-9.3-1a.65.65 0 1 1-.3-1.3c4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9Zm1.3-2.9a.8.8 0 0 1-1.1.3c-2.8-1.7-7.2-2.3-10.6-1.2a.8.8 0 1 1-.5-1.6c3.9-1.2 8.7-.6 11.9 1.4.4.2.5.7.3 1.1Zm.1-3c-3.4-2-9-2.2-12.2-1.2a1 1 0 1 1-.6-1.9c3.7-1.1 9.9-.9 13.8 1.4a1 1 0 0 1-1 1.7Z" />
    </svg>
  ),
  "Apple Music": (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19 3.2v11.6a3 3 0 1 1-1.6-2.7V7.4l-8 1.8v7.9a3 3 0 1 1-1.6-2.7V6.6c0-.4.3-.8.7-.9l9.5-2.2c.5-.1 1 .2 1 .7Z" />
    </svg>
  )
};

// A sheet over the shelf: a heading, the numbers, where to hear it and the sleeve.
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
      <button type="button" className="music-tracks-close" onClick={onClose} aria-label={label}>
        ×
      </button>
      <div className="music-tracks-sheet">
        {/* The title hugs the top left and the sleeve the top right (Dan, 16
            November 2026); where to hear it is the services' own marks. */}
        <header className="music-tracks-head">
          <div>
            <h3 id="music-tracks-title">{title}</h3>
            <p className="music-tracks-artist">{byline}</p>
            <p className="music-tracks-totals">{totals}</p>
            <p className="music-listen">
              {links.map(([service, href]) => (
                <a key={service} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Listen on ${service}`} title={service}>
                  {SERVICE_MARKS[service]}
                </a>
              ))}
            </p>
          </div>
          {/* The record slides out of its sleeve as the sheet opens. */}
          <span className="music-tracks-sleeve">
            <span className="music-tracks-record" aria-hidden="true">
              <span className="music-tracks-disc" />
            </span>
            <span className="music-tracks-cover">
              {cover ? <AlbumArtImage id={cover} alt="" large={LARGE_ART[cover]} sizes="140px" /> : <span className="music-blank" aria-hidden="true" />}
            </span>
          </span>
        </header>
        {children}
      </div>
    </dialog>
  );
}

// The same song on a sheet as on the shelf, whatever its reissue note.
const sameSong = (a, b) => fold(songTitle(a)).trim() === fold(songTitle(b)).trim();

/*
 * A record's tracks, set as a poster's lineup (Dan, 16 November 2026: "more
 * beautiful inventive ways"): the most listened first, each name as large as
 * its hours, the hours beside it in small capitals and the flower between.
 * Under the pointer a name takes its own colour.
 */
const LINEUP = { least: 14, most: 34 };

function AlbumTracks({ album, year, found, loading, loadError, retry, onClose }) {
  // An album's own tracks, or once the ranking has loaded without them, the
  // songs of it among the top 1,000.
  const known = album.tracks ?? (loading || loadError ? null : album.fallback ?? null);
  const tracks = useMemo(() => [...(known ?? [])].sort((a, b) => b.minutes - a.minutes || b.plays - a.plays), [known]);
  const most = Math.max(1, tracks[0]?.minutes ?? 1);
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
      {known ? (
        <ol className="music-track-list">
          {tracks.map((track, index) => (
            <li
              key={track.title}
              style={{
                "--size": `${(LINEUP.least + (LINEUP.most - LINEUP.least) * Math.sqrt(track.minutes / most)).toFixed(1)}px`,
                "--bar": BARS[index % BARS.length]
              }}
            >
              <span className="music-track-title">{track.title}</span>
              <span className="music-track-hours">
                {listened(track.minutes)}
                <span className="visually-hidden">, {plays(track.plays)}</span>
              </span>
            </li>
          ))}
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

export function MusicRoom({ initial, active }) {
  const music = useMusicRanking(initial, active);
  const meta = useRoomFile(active, "/music-meta.json");
  const years = useRoomFile(active, "/music-years.json");
  const kinds = useRoomFile(active, "/music-kinds.json");
  const links = useRoomFile(active, "/music-links.json");
  // The orders answer at once; the shelf follows as a transition.
  const [pressedOrder, setPressedOrder] = useState("hours");
  const [order, setOrder] = useState("hours");
  const [query, setQuery] = useState("");
  // The record a sheet shows, by its key.
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
  // Choosing an order ends a search; while searching, the shelf is one
  // plain group, most listened first (Dan, 16 November 2026).
  const searching = Boolean(query.trim());
  const sort = (name) => {
    setQuery("");
    setPressedOrder(name);
    startTransition(() => setOrder(name));
  };
  const shown = searching ? "hours" : order;

  // One shelf of records, albums and the records his songs come from, the
  // most listened first (mergeShelf in music-shelf.mjs).
  const records = useMemo(() => mergeShelf(music.albums, music.songs).map((item) => ({ item })), [music.albums, music.songs]);
  const index = useMemo(
    () =>
      indexItems(records.map((entry) => entry.item), {
        meta,
        yearOf: (record) => Number(record.year) || meta?.years?.[record.art] || null,
        extraText: (record) => [...(record.tracks ?? []), ...(record.songs ?? [])].map((track) => track.title).join(" ")
      }),
    [records, meta]
  );
  // All of the shelf, or what the search finds in it.
  const entries = useMemo(() => {
    const found = search(index, query);
    if (!found) return records;
    const kept = new Set(found.map((record) => record.key));
    return records.filter((entry) => kept.has(entry.item.key));
  }, [records, index, query]);

  // Sizes come from the whole shelf, so a search or an order never rescales
  // them; each row's size comes from its records' hours (rowsFor in
  // music-shelf.mjs).
  const reference = records[Math.min(2, records.length - 1)]?.item.minutes || 1;
  const arrangement = useMemo(
    () => arrange(shown, entries, { years, kinds }).map((group) => ({ ...group, rows: rowsFor(group.entries, width, reference) })),
    [entries, width, reference, shown, years, kinds]
  );
  const flat = useMemo(() => arrangement.flatMap((group) => group.entries), [arrangement]);
  const count = useProgressive(flat);
  useGlide(list, arrangement, "shelf", measured);

  const onOpen = useMemo(
    () => (item, button) => {
      opener.current = button;
      setOpen(item.key);
    },
    []
  );
  const onPoint = useCallback((item) => say.current?.(item), []);
  const record = open ? records.find((entry) => entry.item.key === open)?.item ?? null : null;

  const close = () => {
    setOpen(null);
  };

  let drawn = 0;
  return (
    <div className="room-body music">
      <noscript><p className="music-tracks-note">Enable JavaScript to search music and open track lists.</p></noscript>
      <div className="music-bar">
        {/* The signature returns to the shelf as it opens (Dan, 16 November
            2026): no search, most listened first, at the top. */}
        <a
          className="music-sign"
          href="/"
          aria-label="Akibwa, back to the start"
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            sort("hours");
            window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          }}
        >
          <svg viewBox="-2.7 -2.8 5.4 5.15" aria-hidden="true" focusable="false">
            <circle cy="-1.8" r="1" />
            <circle cx="-1.7" r="1" />
            <circle cx="1.7" r="1" />
            <rect x="-1.7" y="-0.62" width="3.4" height="1.24" />
            <rect x="-0.56" y="-1.8" width="1.12" height="1.8" />
            <path d="M-0.6 0V0.9Q-0.51 1.79 0 2.35Q0.51 1.79 0.6 0.9V0Z" />
          </svg>
          Akibwa
        </a>
        <Now say={say} order={shown} years={years} kinds={kinds} />
        <div className="music-order" role="group" aria-label="Order">
          {ORDERS.map(([name, label]) => (
            <button key={name} type="button" aria-pressed={!searching && pressedOrder === name} onClick={() => sort(name)}>
              {label}
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
              // Escape clears the search.
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="search"
            aria-label="Search the records by artist, song, genre or era"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className="music-search-clear" onClick={() => setQuery("")} aria-label="Clear the search">
              ×
            </button>
          ) : null}
        </label>
      </div>

      {/* Measured here, around the shelf. */}
      <div className="music-map-frame" ref={map} onPointerLeave={() => say.current?.(null)}>
        <div
          ref={list}
          className={`music-map is-by-${shown}`}
          role="region"
          aria-label={`The records I play most, ${shown === "hours" ? "most listened first" : shown === "name" ? "a to z" : `by ${shown}`}`}
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
                  {rows.map((row, at) => (
                    <ol key={at} className="music-row">
                      {row.shown.map(({ item }) => (
                        <Tile key={item.key} item={item} side={row.side} onOpen={onOpen} onPoint={onPoint} />
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

      {active && record ? (
        <AlbumTracks
          album={record}
          year={record.year || meta?.years?.[record.art] || null}
          found={record.kind === "album" ? links?.albums?.[record.id] : null}
          loading={music.loading}
          loadError={music.loadError}
          retry={music.retry}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
