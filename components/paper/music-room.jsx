"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AlbumArtImage } from "../site-image";
import { useMusicRanking } from "../use-music-ranking";
import { albumWeights, drawnOrder, layoutBands, layoutMap } from "./music-map.mjs";
import { LARGE_ART } from "./music-art.mjs";

/*
 * Music: Dan's top 100 albums or his top 1,000 songs, one or the other, as a
 * map of sleeves laid edge to edge. A sleeve's area is the hours he listened
 * to it, the most listened first, with those hours pinned in its corner; the
 * line beside the switch names whatever the pointer is on. Choosing an album
 * opens its track list: the songs he played from it, most played first, with
 * plays and hours. Songs come a hundred at a time.
 */

const SONGS_STEP = 100;
const SONGS_MAX = 1000;

export const listened = (minutes) => {
  if (minutes >= 600) return `${Math.round(minutes / 60)} h`;
  if (minutes >= 60) return `${(minutes / 60).toFixed(1).replace(/\.0$/, "")} h`;
  return `${Math.max(1, minutes)} min`;
};

const plays = (count) => `${count.toLocaleString("en-GB")} ${count === 1 ? "play" : "plays"}`;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// The smallest sleeve's side, in pixels, for a map this wide.
const least = (width, view) => (view === "albums" ? clamp(width / 26, 28, 42) : clamp(width / 22, 30, 50));

// The map's width, measured before paint so a resize never shows a stale map.
function useWidth(ref) {
  const [width, setWidth] = useState(1100);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const read = () => Math.floor(element.clientWidth);
    if (read() > 0) setWidth(read());
    const observer = new ResizeObserver(() => {
      const next = read();
      if (next > 0) flushSync(() => setWidth(next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

// The line beside the switch: the name of whatever the pointer is on.
function Caption({ bind, view }) {
  const [item, setItem] = useState(null);
  useEffect(() => {
    bind.current = setItem;
    return () => {
      bind.current = () => {};
    };
  }, [bind]);
  useEffect(() => setItem(null), [view]);
  return (
    <p className="music-caption" aria-hidden="true">
      {item ? (
        <>
          <strong>{item.title}</strong> {item.artist} · {listened(item.minutes)} · {plays(item.plays)}
        </>
      ) : null}
    </p>
  );
}

const Tiles = memo(function Tiles({ kind, entries, tiles, point, onOpen }) {
  return entries.map(({ item }, index) => {
    const tile = tiles[index];
    if (!tile) return null;
    const side = Math.min(tile.w, tile.h);
    const art = item.art ?? (kind === "albums" ? item.id : null);
    const described = `${item.title}, ${item.artist}. ${listened(item.minutes)} listened, ${plays(item.plays)}.`;
    const labelled = tile.w >= 116 && tile.h >= 92;
    const face = (
      <>
        {art ? (
          <AlbumArtImage id={art} alt="" large={LARGE_ART[art]} sizes={`${Math.max(tile.w, tile.h)}px`} />
        ) : (
          <span className="music-blank" aria-hidden="true">
            {side >= 56 ? item.title : null}
          </span>
        )}
        {side >= 58 ? (
          <span className="music-hours" aria-hidden="true">
            {listened(item.minutes)}
          </span>
        ) : null}
        {labelled ? (
          <span className="music-label" aria-hidden="true">
            <strong>{item.title}</strong>
            <span>{item.artist}</span>
          </span>
        ) : null}
      </>
    );
    return (
      <li
        key={`${kind}-${item.rank}`}
        className="music-tile"
        style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h, "--i": index % SONGS_STEP, "--side": side }}
        onPointerEnter={() => point.current(item)}
        onPointerDown={() => point.current(item)}
      >
        {onOpen ? (
          <button
            type="button"
            className="music-face"
            onClick={(event) => onOpen(item, event.currentTarget)}
            onFocus={() => point.current(item)}
            aria-label={`${described} Show its tracks.`}
          >
            {face}
          </button>
        ) : (
          <span className="music-face" role="img" aria-label={described}>
            {face}
          </span>
        )}
      </li>
    );
  });
});

function AlbumTracks({ album, loading, onClose }) {
  const panel = useRef(null);
  useEffect(() => {
    const dialog = panel.current;
    if (!dialog.open) dialog.showModal();
    return () => dialog.open && dialog.close();
  }, []);
  const most = Math.max(1, ...(album.tracks ?? []).map((track) => track.plays));
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
        // Escape closes the track list, not the room behind it.
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
        <button type="button" className="music-tracks-close" onClick={onClose} aria-label="Close the track list">
          ×
        </button>
        <header className="music-tracks-head">
          <span className="music-tracks-cover">
            <AlbumArtImage id={album.id} alt="" large={LARGE_ART[album.id]} sizes="150px" />
          </span>
          <div>
            <h3 id="music-tracks-title">{album.title}</h3>
            <p className="music-tracks-artist">
              {album.artist}
              {album.year ? ` · ${album.year}` : ""}
            </p>
            <p className="music-tracks-totals">
              {plays(album.plays)} · {listened(album.minutes)} listened
            </p>
          </div>
        </header>
        {album.tracks ? (
          <>
            <ol className="music-track-list">
              {album.tracks.map((track) => (
                <li key={track.title} style={{ "--share": track.plays / most }}>
                  <span className="music-track-title">{track.title}</span>
                  <span className="music-track-plays">{plays(track.plays)}</span>
                  <span className="music-track-hours">{listened(track.minutes)}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="music-tracks-note" role="status">
            {loading ? "Fetching the tracks…" : "The tracks could not be loaded."}
          </p>
        )}
      </div>
    </dialog>
  );
}

export function MusicRoom({ initial, active }) {
  const music = useMusicRanking(initial, active);
  const [view, setView] = useState("albums");
  const [shown, setShown] = useState(SONGS_STEP);
  const [open, setOpen] = useState(null);
  const opener = useRef(null);
  const point = useRef(() => {});
  const map = useRef(null);
  const width = useWidth(map);

  // Albums by the hours they are drawn at; songs by their hours.
  const albums = useMemo(() => drawnOrder(music.albums, albumWeights(music.albums)), [music.albums]);
  const songs = useMemo(
    () =>
      [...music.songs]
        .sort((a, b) => b.minutes - a.minutes || a.rank - b.rank)
        .slice(0, shown)
        .map((item) => ({ item, weight: Math.max(1, item.minutes) })),
    [music.songs, shown]
  );
  const entries = view === "albums" ? albums : songs;
  const layout = useMemo(
    () =>
      view === "albums"
        ? layoutMap(albums.map((entry) => entry.weight), width, least(width, "albums"))
        : layoutBands(songs.map((entry) => entry.weight), width, least(width, "songs"), SONGS_STEP),
    [view, albums, songs, width]
  );
  const onOpen = useMemo(
    () => (item, button) => {
      opener.current = button;
      setOpen(item.id);
    },
    []
  );
  const album = open === null ? null : music.albums.find((entry) => entry.id === open) ?? null;
  const waiting = music.loading && music.songs.length <= shown;

  const close = () => {
    setOpen(null);
    opener.current?.focus({ preventScroll: true });
  };

  return (
    <div className="room-body music">
      <div className="music-bar">
        <div className="music-switch" role="group" aria-label="Albums or songs" data-view={view}>
          <span className="music-switch-thumb" aria-hidden="true" />
          {["albums", "songs"].map((name) => (
            <button key={name} type="button" aria-pressed={view === name} onClick={() => setView(name)}>
              {name}
            </button>
          ))}
        </div>
        <Caption bind={point} view={view} />
      </div>

      {/* Measured here, outside the list the switch replaces. */}
      <div ref={map}>
        <ol
          key={view}
          className={`music-map is-${view}`}
          style={{ height: layout.height }}
          aria-label={view === "albums" ? "My top 100 albums, most listened first" : "My top songs, most listened first"}
          onPointerLeave={() => point.current(null)}
        >
          <Tiles kind={view} entries={entries} tiles={layout.tiles} point={point} onOpen={view === "albums" ? onOpen : null} />
        </ol>
      </div>

      {view === "songs" ? (
        <div className="music-more">
          {shown < SONGS_MAX ? (
            <button type="button" className="chip" disabled={waiting} onClick={() => setShown((count) => Math.min(SONGS_MAX, count + SONGS_STEP))}>
              {waiting ? "loading…" : `${SONGS_STEP} more songs`}
            </button>
          ) : null}
          {music.loadError ? (
            <button type="button" className="chip" onClick={music.retry}>
              try loading again
            </button>
          ) : null}
        </div>
      ) : null}

      {album ? <AlbumTracks album={album} loading={music.loading} onClose={close} /> : null}
    </div>
  );
}
