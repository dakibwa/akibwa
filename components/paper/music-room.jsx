"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AlbumArtImage } from "../site-image";
import { Arrow } from "./arrow";
import { unpackRanking, fold } from "./music-ranking.mjs";

const BATCH = 60;
const count = (value) => value.toLocaleString("en-GB");
// Sleeves without artwork are set in type on one of these papers.
const PAPERS = ["#2e3a7a", "#a8520c", "#3f7634", "#a72d28", "#6a4c93", "#1f6f78", "#8a6a1f"];
const paperFor = (name) => PAPERS[[...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % PAPERS.length];

/*
 * The music library as cards, like the old Taste wall, over the top 1,000
 * songs and the top 100 artists. Cards are dealt onto the paper most played
 * first; pointing at one (or focusing it) unfolds its count beside the cover.
 * Artists open onto their own songs. Search covers both. Cards never navigate.
 */
export function MusicRoom({ preview, active }) {
  const [ranking, setRanking] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active || ranking || failed) return undefined;
    let live = true;
    fetch("/music-ranking.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((packet) => live && setRanking(unpackRanking(packet)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [active, ranking, failed]);

  return (
    <div className="room-body music">
      {ranking ? <Library ranking={ranking} /> : <MusicPreview preview={preview} failed={failed} retry={() => setFailed(false)} />}
      <p className="music-more">
        <a className="pencil-link" href="https://dans-top-250.pages.dev/">
          the top 250, as a list to read <Arrow />
        </a>
        <span>
          Counted from my Spotify and YouTube history to {preview.asOfLabel}: Spotify plays of at least 30 seconds plus
          identified YouTube song watches. Two ambient albums I sleep to are left out.
        </span>
      </p>
    </div>
  );
}

// Before the ranking loads (or without JavaScript) the room is a plain list.
function MusicPreview({ preview, failed, retry }) {
  return (
    <div className="music-preview">
      <section aria-labelledby="music-songs-preview">
        <h3 id="music-songs-preview" className="music-subhead">Most played songs</h3>
        <ol className="music-plain">
          {preview.songs.map((song) => (
            <li key={song.rank}>
              <strong>{song.title}</strong> <span>{song.artist}</span> <em>{count(song.plays)}</em>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="music-artists-preview">
        <h3 id="music-artists-preview" className="music-subhead">Most played artists</h3>
        <ol className="music-plain">
          {preview.artists.map((artist) => (
            <li key={artist.rank}>
              <strong>{artist.name}</strong> <em>{count(artist.plays)}</em>
            </li>
          ))}
        </ol>
      </section>
      {failed ? (
        <p className="music-retry">
          The full library didn’t load.{" "}
          <button type="button" className="text-button" onClick={retry}>
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}

function Library({ ranking }) {
  const { songs, artists } = ranking;
  const [view, setView] = useState("songs");
  const [artist, setArtist] = useState(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(BATCH);
  const more = useRef(null);
  const grid = useRef(null);

  const words = fold(query).split(/\s+/).filter(Boolean);
  const matches = (text) => words.every((word) => fold(text).includes(word));
  const songList = useMemo(() => {
    let list = songs;
    if (artist) list = list.filter((song) => song.artist === artist.name);
    if (words.length) list = list.filter((song) => matches(`${song.title} ${song.artist}`));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, artist, query]);
  const artistList = useMemo(
    () => (words.length ? artists.filter((entry) => matches(entry.name)) : artists),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artists, query]
  );
  const list = view === "songs" ? songList : artistList;
  const visible = list.slice(0, shown);

  // Changing what is shown deals a fresh hand from the top.
  const change = (apply) => {
    const run = () => {
      flushSync(apply);
      setShown(BATCH);
    };
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) run();
    else {
      const transition = document.startViewTransition(run);
      transition.ready.catch(() => {});
    }
  };

  // Deal more cards as the end of the hand comes into view.
  useEffect(() => {
    const sentinel = more.current;
    if (!sentinel || shown >= list.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setShown((value) => value + BATCH);
    }, { rootMargin: "600px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shown, list.length]);

  // Unfold the detail towards whichever side has room.
  const aim = (event) => {
    const card = event.currentTarget;
    const box = card.getBoundingClientRect();
    const bounds = grid.current.getBoundingClientRect();
    card.dataset.open = box.right + Math.min(240, box.width * 1.6) > bounds.right ? "left" : "right";
  };

  const openArtist = (entry) =>
    change(() => {
      setArtist(entry);
      setView("songs");
      setQuery("");
    });

  const summary =
    view === "artists"
      ? `${count(artistList.length)} ${artistList.length === 1 ? "artist" : "artists"}, most played first`
      : artist
        ? `${artist.name}: ${count(artist.plays)} plays in all, ${songList.length} of the top 1,000 songs`
        : `${count(songList.length)} ${songList.length === 1 ? "song" : "songs"}, most played first`;

  return (
    <div className="library">
      <div className="library-tools">
        <div className="library-views" role="group" aria-label="Show">
          {["songs", "artists"].map((option) => (
            <button
              key={option}
              type="button"
              className="chip"
              aria-pressed={view === option && !(option === "songs" && artist)}
              onClick={() =>
                change(() => {
                  setView(option);
                  setArtist(null);
                })
              }
            >
              {option === "songs" ? "top 1,000 songs" : "top 100 artists"}
            </button>
          ))}
          {artist ? (
            <button type="button" className="chip is-held" aria-pressed="true" onClick={() => change(() => setArtist(null))}>
              {artist.name} <span aria-hidden="true">×</span>
              <span className="visually-hidden"> — show every song</span>
            </button>
          ) : null}
        </div>
        <label className="library-search">
          <span className="visually-hidden">Find a song or artist</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
            <path d="M15.4 15.6l4.6 4.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            placeholder="find a song or artist"
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(BATCH);
            }}
          />
        </label>
      </div>

      <p className="library-summary" aria-live="polite">
        {summary}
      </p>

      {list.length ? (
        <ol className={`library-grid is-${view}`} ref={grid} key={`${view}-${artist?.name ?? ""}`}>
          {visible.map((entry, index) =>
            view === "songs" ? (
              <SongCard key={entry.rank} song={entry} order={index % BATCH} aim={aim} />
            ) : (
              <ArtistCard key={entry.rank} artist={entry} songs={songs} order={index % BATCH} aim={aim} open={() => openArtist(entry)} />
            )
          )}
        </ol>
      ) : (
        <p className="library-empty">
          Nothing called “{query}” here.{" "}
          <button type="button" className="text-button" onClick={() => setQuery("")}>
            Clear the search
          </button>
        </p>
      )}

      {shown < list.length ? (
        <div className="library-more" ref={more}>
          <button type="button" className="text-button" onClick={() => setShown((value) => value + BATCH)}>
            Deal {Math.min(BATCH, list.length - shown)} more
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Cover({ art, title, name }) {
  if (art) return <AlbumArtImage id={art} />;
  return (
    <span className="card-type" style={{ "--card-paper": paperFor(name) }}>
      <span>{title}</span>
    </span>
  );
}

function SongCard({ song, order, aim }) {
  const detail = `No. ${song.rank}, ${song.title} by ${song.artist}, ${count(song.plays)} plays`;
  return (
    <li className="card" style={{ "--deal": order }}>
      <article className="card-face" tabIndex={0} aria-label={detail} onPointerEnter={aim} onFocus={aim}>
        <span className="card-cover">
          <Cover art={song.art} title={song.title} name={song.artist} />
          <span className="card-rank" aria-hidden="true">
            {song.rank}
          </span>
        </span>
        <span className="card-detail" aria-hidden="true">
          <strong>{count(song.plays)} plays</strong>
          <span className="card-title">{song.title}</span>
          <span className="card-by">{song.artist}</span>
          {song.youtube ? <span className="card-note">{count(song.youtube)} on YouTube</span> : null}
        </span>
        <span className="card-caption" aria-hidden="true">
          <span className="card-title">{song.title}</span>
          <span className="card-by">{song.artist}</span>
          <span className="card-count">{count(song.plays)} plays</span>
        </span>
      </article>
    </li>
  );
}

function ArtistCard({ artist, songs, order, aim, open }) {
  const best = artist.top.length ? songs[artist.top[0] - 1] : null;
  const detail = `No. ${artist.rank}, ${artist.name}, ${count(artist.plays)} plays, ${artist.top.length} of the top 1,000 songs`;
  return (
    <li className="card" style={{ "--deal": order }}>
      <button type="button" className="card-face" aria-label={`${detail}. Show their songs.`} onPointerEnter={aim} onFocus={aim} onClick={open} disabled={!artist.top.length}>
        <span className="card-cover">
          <Cover art={artist.art} title={artist.name} name={artist.name} />
          <span className="card-rank" aria-hidden="true">
            {artist.rank}
          </span>
        </span>
        <span className="card-detail" aria-hidden="true">
          <strong>{count(artist.plays)} plays</strong>
          <span className="card-title">{artist.name}</span>
          <span className="card-by">
            {artist.top.length ? `${artist.top.length} of the top 1,000` : "no songs in the top 1,000"}
          </span>
          {best ? <span className="card-note">best: {best.title}, no. {best.rank}</span> : null}
        </span>
        <span className="card-caption" aria-hidden="true">
          <span className="card-title">{artist.name}</span>
          <span className="card-count">{count(artist.plays)} plays</span>
        </span>
      </button>
    </li>
  );
}
