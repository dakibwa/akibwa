"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AlbumArtImage } from "../site-image";
import { useMusicRanking } from "../use-music-ranking";
import { albumSides, albumWeights, drawnOrder, layoutSquares } from "./music-map.mjs";
import { LARGE_ART } from "./music-art.mjs";

/*
 * Music: Dan's top 100 albums or all his top 1,000 songs, one or the other,
 * as squares laid edge to edge with no holes (music-map.mjs), each as large as
 * the hours he listened to it, the most listened first, with those hours pinned
 * in its corner. Albums are their sleeves; songs are typeset, since a sleeve is
 * the album's and not the song's (Dan, 25 September 2026). No sleeve is smaller than a grid cell, and a
 * small one grows to a readable size under the pointer or a tap. Choosing an
 * album opens its track list: the songs he played from it, most played first,
 * with plays and hours.
 */

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

function squares(kind, values, width, adjust) {
  const plan = { ...PLANS[kind](width < 600), adjust };
  const map = layoutSquares(values, width, plan);
  return map.height ? map : layoutSquares(values, width, { ...plan, range: [0.08, 0.9], tries: 40, spread: 6 });
}

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

// Room to grow into under the pointer, kept inside the map's edges.
function growth(tile, width, height) {
  const grow = Math.max(0, POP - tile.w);
  const left = Math.min(grow / 2, tile.x);
  const right = Math.min(grow - left, Math.max(0, width - tile.x - tile.w));
  const top = Math.min(grow / 2, tile.y);
  const bottom = Math.min(grow - top, Math.max(0, height - tile.y - tile.h));
  // Whatever one side cannot take, the other does, so it stays square.
  return {
    "--pop-l": `${grow - right}px`,
    "--pop-r": `${right}px`,
    "--pop-t": `${grow - bottom}px`,
    "--pop-b": `${bottom}px`
  };
}

const Tiles = memo(function Tiles({ kind, entries, tiles, width, height, onOpen }) {
  return entries.map(({ item }, index) => {
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
        className={`music-tile${roomy ? " is-roomy" : ""}${side >= (kind === "songs" ? 88 : 58) ? " has-hours" : ""}${side < 40 ? " is-tiny" : ""}`}
        style={{ left: tile.x, top: tile.y, width: side, height: side, "--i": Math.min(index, 160), "--side": side, "--tint": kind === "songs" ? tintFor(item.artist) : undefined, ...growth(tile, width, height) }}
      >
        {onOpen ? (
          <button
            type="button"
            className="music-face"
            onClick={(event) => onOpen(item, event.currentTarget)}
            aria-label={`${described} Show its tracks.`}
          >
            {face}
          </button>
        ) : (
          // Focusable, so a tap on a phone grows it as the pointer would.
          <span className="music-face" role="img" tabIndex={0} aria-label={described}>
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
  const [open, setOpen] = useState(null);
  const opener = useRef(null);
  const map = useRef(null);
  const width = useWidth(map);

  // Albums by the hours they are drawn at; songs by their hours.
  const albums = useMemo(() => drawnOrder(music.albums, albumWeights(music.albums)), [music.albums]);
  const songs = useMemo(
    () => [...music.songs].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank).map((item) => ({ item, weight: Math.max(1, item.minutes) })),
    [music.songs]
  );
  const entries = view === "albums" ? albums : songs;
  const layout = useMemo(
    () =>
      view === "albums"
        ? squares("albums", albums.map((entry) => entry.weight), width, albumSides(albums.map((entry) => entry.item)))
        : squares("songs", songs.map((entry) => entry.weight), width),
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
      </div>

      {/* Measured here, outside the list the switch replaces. */}
      <div ref={map}>
        <ol
          key={view}
          className={`music-map is-${view}`}
          style={{ height: layout.height }}
          aria-label={view === "albums" ? "My top 100 albums, most listened first" : "My top songs, most listened first"}
        >
          <Tiles kind={view} entries={entries} tiles={layout.tiles} width={width} height={layout.height} onOpen={view === "albums" ? onOpen : null} />
        </ol>
      </div>

      {music.loadError ? (
        <div className="music-more">
          <button type="button" className="chip" onClick={music.retry}>
            try loading again
          </button>
        </div>
      ) : null}

      {album ? <AlbumTracks album={album} loading={music.loading} onClose={close} /> : null}
    </div>
  );
}
