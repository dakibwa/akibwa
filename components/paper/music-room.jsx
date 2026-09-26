"use client";

import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlbumArtImage } from "../site-image";
import { useMusicRanking } from "../use-music-ranking";
import { albumSides, albumWeights, drawnOrder, packSquares, rowOfSquares, targetColumns, tilesFor } from "./music-map.mjs";
import { LARGE_ART } from "./music-art.mjs";
import { fold } from "./music-ranking.mjs";
import { indexItems, search } from "./music-search.mjs";

/*
 * Music: Dan's top 150 albums or all his top 1,000 songs, one or the other,
 * as squares laid edge to edge with no holes (music-map.mjs), each as large as
 * the hours he listened to it, the most listened first, with those hours
 * pinned in its corner. Albums are their sleeves; songs are typeset, since a
 * sleeve is the album's and not the song's (Dan, 25 September 2026). No square
 * is smaller than a grid cell, and a small one grows to a readable size under
 * the pointer or a tap. A search box finds artists and the artists around
 * them, genres and eras (music-search.mjs) and packs just what it finds, and
 * a line of years redraws the map as one year's listening (music-years.json).
 * Choosing an album opens its track list: the songs he played from it, most
 * played first, with plays and hours. Choosing a song opens its album's list
 * with the song lit, or the song alone when its album is not among these.
 * Each sheet links to the release on Spotify and Apple Music (Dan, 26
 * September 2026).
 */

// A public file the room fetches once it opens: the search's genres and
// years, the hours by year, or where each album can be heard.
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

/*
 * One year's albums or songs: those played in it, each at its hours that
 * year, the most listened first. A year's list is kept, so scrubbing back to
 * it finds the same list and, with it, the same packing.
 */
function useYearLists(albums, songs, years) {
  return useMemo(() => {
    const kept = new Map();
    const inYear = (pairs, year) => pairs?.find(([at]) => at === year)?.[1] ?? 0;
    return (view, year) => {
      if (!years || year === null) return null;
      const key = `${view}|${year}`;
      if (!kept.has(key)) {
        if (view === "albums") {
          const played = albums.map((album) => ({ ...album, minutes: inYear(years.albums[album.id], year) })).filter((album) => album.minutes > 0);
          kept.set(key, drawnOrder(played, albumWeights(played)));
        } else {
          const played = songs.map((song) => ({ ...song, minutes: inYear(years.songs[song.rank - 1], year) })).filter((song) => song.minutes > 0);
          kept.set(key, played.sort((a, b) => b.minutes - a.minutes || a.rank - b.rank).map((item) => ({ item, weight: item.minutes })));
        }
      }
      return kept.get(key);
    };
  }, [albums, songs, years]);
}

/*
 * The years: an ink pill carrying the year, sliding along a pencil line with a
 * tick for each year, over a native range so it takes the keys and reads as
 * one control. All time is the right-hand end, where it starts.
 */
function YearLine({ years, value, onChange }) {
  const stops = years.length;
  const index = value === null ? stops : years.indexOf(value);
  return (
    <label className="music-years" style={{ "--at": index / stops }}>
      <input
        type="range"
        min={0}
        max={stops}
        step={1}
        value={index}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(next >= stops ? null : years[next]);
        }}
        aria-label="Year"
        aria-valuetext={value === null ? "all time" : String(value)}
      />
      <span className="music-years-line" aria-hidden="true">
        {[...years, null].map((year, at) => (
          <i key={year ?? "all"} style={{ "--x": at / stops }} />
        ))}
      </span>
      <span className="music-years-pill" aria-hidden="true">
        {value ?? "all time"}
      </span>
    </label>
  );
}

// Where to hear it: the release found on each service, or a search there.
function listenLinks(found, artist, title) {
  const term = encodeURIComponent(`${artist} ${title}`);
  return [
    ["Spotify", found?.spotify ?? `https://open.spotify.com/search/${term}`],
    ["Apple Music", found?.apple ?? `https://music.apple.com/gb/search?term=${term}`]
  ];
}

// How far a sleeve grows under the pointer, at least.
const POP = 136;

// Paper tints for the songs, one to an artist.
const TINTS = ["#f6efdd", "#f1dcd4", "#dfe8ef", "#e3ead6", "#f4e3b8", "#e8dff0", "#f0d9c2", "#d9e6e0"];
const tintFor = (artist) => TINTS[[...artist].reduce((hash, letter) => (hash * 31 + letter.charCodeAt(0)) >>> 0, 7) % TINTS.length];

// A song's name as set on its square: without a reissue note or its guests.
const songTitle = (title) =>
  title
    .replace(/\s+-\s+(\d{4}\s+)?(digital\s+)?remaster(ed)?.*$/i, "")
    .replace(/\s*[([]feat\.[^)\]]*[)\]]/i, "")
    .trim();

export const listened = (minutes) => {
  if (minutes >= 600) return `${Math.round(minutes / 60)} h`;
  if (minutes >= 60) return `${(minutes / 60).toFixed(1).replace(/\.0$/, "")} h`;
  return `${Math.max(1, minutes)} min`;
};

const plays = (count) => `${count.toLocaleString("en-GB")} ${count === 1 ? "play" : "plays"}`;

/*
 * Grid cells (the smallest a sleeve can be), the shape to aim for and the
 * range the largest sleeve's side is searched in, as fractions of the width.
 * If nothing packs exactly, a wider search follows.
 */
const PLANS = {
  albums: (phone) => (phone ? { cell: 24, aspect: 3, range: [0.35, 0.8], tries: 12, spread: 3 } : { cell: 32, aspect: 0.9, range: [0.14, 0.26], tries: 10, spread: 3 }),
  songs: (phone) => (phone ? { cell: 22, aspect: 6, range: [0.4, 0.62], tries: 6, spread: 1 } : { cell: 23, aspect: 2.4, range: [0.18, 0.26], tries: 5, spread: 1 })
};

/*
 * Packings are kept per list and column count, so turning the switch back, or
 * returning to a width seen before, costs nothing.
 */
const packings = new WeakMap();

function packFor(kind, values, target, phone, adjust, listKey) {
  let byTarget = packings.get(listKey);
  if (!byTarget) packings.set(listKey, (byTarget = new Map()));
  const key = `${kind}|${target}|${phone}`;
  if (byTarget.has(key)) return byTarget.get(key);
  const base = PLANS[kind](phone);
  let grid = packSquares(values, target, { ...base, adjust });
  // If nothing packs exactly, a wider search follows.
  if (!grid) grid = packSquares(values, target, { ...base, adjust, range: [0.08, 0.9], tries: 40, spread: 8 });
  byTarget.set(key, grid);
  return grid;
}

// Fewer sleeves (a search) get bigger cells, so they still fill the width.
function columnsFor(kind, count, width) {
  const base = PLANS[kind](width < 600);
  const cell = Math.max(base.cell, width / Math.max(8, Math.round(Math.sqrt(count) * 6.5)));
  return targetColumns(width, cell);
}

/*
 * Resizing is smooth because the sleeves are not laid out again at every
 * pixel. While the window moves, the map drawn at the last settled width is
 * scaled to fit in one GPU transform (`live`, each frame, before paint); once
 * it has been still for a moment the settled width changes, the map is laid
 * out afresh at it, and the sleeves glide there (useGlide).
 */
const SETTLE = 160;

function useSettledWidth(ref, live) {
  const [width, setWidth] = useState(1100);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const read = () => Math.floor(element.clientWidth);
    let last = read();
    if (last > 0) setWidth(last);
    let timer = 0;
    const observer = new ResizeObserver(() => {
      const next = read();
      const shown = last > 0;
      last = next;
      if (next <= 0) return;
      clearTimeout(timer);
      // A room opening is laid out at once; only a resize waits to settle.
      if (!shown) {
        setWidth(next);
        return;
      }
      live.current?.(next);
      timer = setTimeout(() => setWidth(read()), SETTLE);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [ref, live]);
  return width;
}

/*
 * FLIP: after a new layout is committed, each sleeve on screen is put back
 * where it was seen (a transform, so the compositor does the work) and
 * released to glide to its new place. Sleeves off screen just move.
 */
const GLIDE = { duration: 440, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };

function useGlide(list, layout, view, count) {
  const seen = useRef(null);
  useLayoutEffect(() => {
    const was = seen.current;
    seen.current = { view, scale: 1, rects: new Map() };
    const element = list.current;
    if (!element) return;
    const tiles = [...element.children];
    const top = element.getBoundingClientRect().top;
    tiles.forEach((tile) => seen.current.rects.set(tile.dataset.key, { x: tile.offsetLeft, y: tile.offsetTop, w: tile.offsetWidth }));
    if (!was || was.view !== view || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const tile of tiles) {
      const from = was.rects.get(tile.dataset.key);
      if (!from) continue;
      const to = seen.current.rects.get(tile.dataset.key);
      const k = was.scale;
      const onScreen = [from.y * k, to.y].some((y) => top + y < innerHeight && top + y + Math.max(from.w * k, to.w) > 0);
      if (!onScreen) continue;
      const dx = from.x * k + (from.w * k) / 2 - (to.x + to.w / 2);
      const dy = from.y * k + (from.w * k) / 2 - (to.y + to.w / 2);
      const size = (from.w * k) / to.w;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(size - 1) < 0.01) continue;
      tile.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${size})` }, { transform: "none" }], GLIDE);
    }
  }, [layout, view, list, count]);
  // The last scale the map was shown at while the window moved.
  return useCallback((scale) => {
    if (seen.current) seen.current.scale = scale;
  }, []);
}

/*
 * Room to grow into under the pointer, kept inside the map's edges, measured
 * when the pointer arrives rather than on every resize.
 */
function grow(event) {
  const tile = event.currentTarget;
  const map = tile.parentElement;
  if (!map) return;
  const width = map.clientWidth;
  const height = map.clientHeight;
  const x = tile.offsetLeft;
  const y = tile.offsetTop;
  const side = tile.offsetWidth;
  const more = Math.max(0, POP - side);
  const left = Math.min(more / 2, x);
  const right = Math.min(more - left, Math.max(0, width - x - side));
  const top = Math.min(more / 2, y);
  const bottom = Math.min(more - top, Math.max(0, height - y - side));
  // Whatever one side cannot take, the other does, so it stays square.
  tile.style.setProperty("--pop-l", `${more - right}px`);
  tile.style.setProperty("--pop-r", `${right}px`);
  tile.style.setProperty("--pop-t", `${more - bottom}px`);
  tile.style.setProperty("--pop-b", `${bottom}px`);
}

const Tiles = memo(function Tiles({ kind, entries, tiles, count, onOpen }) {
  return entries.slice(0, count).map(({ item }, index) => {
    const tile = tiles[index];
    if (!tile) return null;
    const side = tile.w;
    const art = item.art ?? (kind === "albums" ? item.id : null);
    const described = `${item.title}, ${item.artist}. ${listened(item.minutes)} listened, ${plays(item.plays)}.`;
    const roomy = side >= 116;
    const face = kind === "songs" ? (
      <>
        <span className="music-type" aria-hidden="true">
          <b className="music-initial">{songTitle(item.title).charAt(0)}</b>
          <strong>{songTitle(item.title)}</strong>
          <span>{item.artist}</span>
        </span>
        <span className="music-hours" aria-hidden="true">
          {listened(item.minutes)}
        </span>
      </>
    ) : (
      <>
        {art ? (
          <AlbumArtImage id={art} alt="" large={LARGE_ART[art]} sizes={`${Math.max(side, POP)}px`} />
        ) : (
          <span className="music-blank" aria-hidden="true">
            {side >= 56 ? item.title : null}
          </span>
        )}
        <span className="music-hours" aria-hidden="true">
          {listened(item.minutes)}
        </span>
        <span className="music-label" aria-hidden="true">
          <strong>{item.title}</strong>
          <span>{item.artist}</span>
        </span>
      </>
    );
    return (
      <li
        key={`${kind}-${item.rank}`}
        data-key={`${kind}-${item.rank}`}
        className={`music-tile${roomy ? " is-roomy" : ""}${side >= (kind === "songs" ? 88 : 58) ? " has-hours" : ""}${side < 40 ? " is-tiny" : ""}`}
        style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.w, "--i": Math.min(index, 120), "--side": side, "--tint": kind === "songs" ? tintFor(item.artist) : undefined }}
        onPointerEnter={grow}
        onFocus={grow}
      >
        <button
          type="button"
          className="music-face"
          onClick={(event) => onOpen(kind, item, event.currentTarget)}
          aria-label={`${described} ${kind === "songs" ? "Show it" : "Show its tracks"}.`}
        >
          {face}
        </button>
      </li>
    );
  });
});

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

// The same song on a sheet as on the map, whatever its reissue note.
const sameSong = (a, b) => fold(songTitle(a)).trim() === fold(songTitle(b)).trim();

function AlbumTracks({ album, year, picked, found, loading, onClose }) {
  const lit = useRef(null);
  const most = Math.max(1, ...(album.tracks ?? []).map((track) => track.plays));
  // A song chosen on the map is brought into view on its album's list.
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
        <p className="music-tracks-note" role="status">
          {loading ? "Fetching the tracks…" : "The tracks could not be loaded."}
        </p>
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
  const links = useRoomFile(active, "/music-links.json");
  // The switch and the years answer at once; the map follows as a transition.
  const [pressed, setPressed] = useState("albums");
  const [view, setView] = useState("albums");
  const [pressedYear, setPressedYear] = useState(null);
  const [year, setYear] = useState(null);
  const [query, setQuery] = useState("");
  // What a sheet shows: an album (with a song lit) or a song alone.
  const [open, setOpen] = useState(null);
  const opener = useRef(null);
  const map = useRef(null);
  const list = useRef(null);
  const live = useRef(null);
  const width = useSettledWidth(map, live);
  const choose = (name) => {
    setPressed(name);
    startTransition(() => setView(name));
  };
  const chooseYear = (next) => {
    setPressedYear(next);
    startTransition(() => setYear(next));
  };

  // Albums by the hours they are drawn at; songs by their hours.
  const albums = useMemo(() => drawnOrder(music.albums, albumWeights(music.albums)), [music.albums]);
  const songs = useMemo(
    () => [...music.songs].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank).map((item) => ({ item, weight: Math.max(1, item.minutes) })),
    [music.songs]
  );
  const albumIndex = useMemo(
    () =>
      indexItems(albums.map((entry) => entry.item), {
        meta,
        yearOf: (album) => Number(album.year) || meta?.years?.[album.id] || null,
        extraText: (album) => (album.tracks ?? []).map((track) => track.title).join(" ")
      }),
    [albums, meta]
  );
  const songIndex = useMemo(() => indexItems(songs.map((entry) => entry.item), { meta, yearOf: (song) => meta?.years?.[song.art] ?? null }), [songs, meta]);
  const yearList = useYearLists(music.albums, music.songs, years);
  // One year's listening or all of it, then what the search finds in it.
  const entries = useMemo(() => {
    const all = yearList(view, year) ?? (view === "albums" ? albums : songs);
    const found = search(view === "albums" ? albumIndex : songIndex, query);
    if (!found) return all;
    const key = (item) => (view === "albums" ? item.id : item.rank);
    const kept = new Set(found.map(key));
    return all.filter((entry) => kept.has(key(entry.item)));
  }, [view, year, yearList, albums, songs, albumIndex, songIndex, query]);

  // A packing for the settled width, packed again only when the column count
  // changes; a handful found by a search stand in a row instead.
  const phone = width < 600;
  const row = entries.length <= 3;
  const target = columnsFor(view, entries.length, width);
  const grid = useMemo(() => {
    if (row) return null;
    const adjust = view === "albums" ? albumSides(entries.map((entry) => entry.item)) : undefined;
    return packFor(view, entries.map((entry) => entry.weight), target, phone, adjust, entries);
  }, [view, entries, target, phone, row]);
  const layout = useMemo(() => {
    if (row) return { width, ...rowOfSquares(entries.length, width) };
    return grid ? { width, ...tilesFor(grid, width) } : { width, height: 0, tiles: [] };
  }, [row, grid, entries.length, width]);
  const count = useProgressive(entries);
  const shownAt = useGlide(list, layout, view, count);

  // Between settled widths, the map as laid out is scaled to the window.
  useLayoutEffect(() => {
    const element = list.current;
    const frame = map.current;
    if (element) element.style.transform = "";
    if (frame) frame.style.height = "";
    live.current = (now) => {
      const scale = now / layout.width;
      if (element) element.style.transform = Math.abs(scale - 1) < 0.001 ? "" : `scale(${scale})`;
      if (frame) frame.style.height = `${Math.round(layout.height * scale)}px`;
      shownAt(scale);
    };
  }, [layout, shownAt]);

  const onOpen = useMemo(
    () => (kind, item, button) => {
      opener.current = button;
      setOpen(kind === "albums" ? { album: item.id } : { song: item.rank });
    },
    []
  );
  const song = open?.song ? music.songs.find((entry) => entry.rank === open.song) ?? null : null;
  // A song opens its album's list when the album is among these.
  const albumId = open?.album ?? (song?.art && music.albums.some((entry) => entry.id === song.art) ? song.art : null);
  const album = albumId ? music.albums.find((entry) => entry.id === albumId) ?? null : null;

  const close = () => {
    setOpen(null);
    opener.current?.focus({ preventScroll: true });
  };

  return (
    <div className="room-body music">
      <div className="music-bar">
        <div className="music-switch" role="group" aria-label="Albums or songs" data-view={pressed}>
          <span className="music-switch-thumb" aria-hidden="true" />
          {["albums", "songs"].map((name) => (
            <button key={name} type="button" aria-pressed={pressed === name} onClick={() => choose(name)}>
              {name}
            </button>
          ))}
        </div>
        {years?.years?.length ? <YearLine years={years.years} value={pressedYear} onChange={chooseYear} /> : null}
        <label className="music-search">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
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
            placeholder="artist, genre or era"
            aria-label="Search the albums and songs by artist, genre or era"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>

      {/* Measured here, outside the list the switch replaces. */}
      <div className="music-map-frame" ref={map}>
        <ol
          key={view}
          ref={list}
          className={`music-map is-${view}`}
          style={{ height: layout.height }}
          aria-label={`My top ${view === "albums" ? "albums" : "songs"}${year === null ? "" : ` in ${year}`}, most listened first`}
        >
          <Tiles kind={view} entries={entries} tiles={layout.tiles} count={count} onOpen={onOpen} />
        </ol>
      </div>

      {query && !entries.length ? <p className="music-none">Nothing matches.</p> : null}

      {music.loadError ? (
        <div className="music-more">
          <button type="button" className="chip" onClick={music.retry}>
            try loading again
          </button>
        </div>
      ) : null}

      {album ? (
        <AlbumTracks
          album={album}
          year={album.year || meta?.years?.[album.id] || null}
          picked={song ? song.title : null}
          found={links?.albums?.[album.id]}
          loading={music.loading}
          onClose={close}
        />
      ) : song ? (
        <SongSheet song={song} onClose={close} />
      ) : null}
    </div>
  );
}
