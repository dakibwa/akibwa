"use client";
import { useEffect, useRef, useState } from "react";
import { AlbumArtImage, SiteImage } from "./site-image";
import { MediaDialog } from "./media-dialog";
import curation from "@/data/taste-curation.json";
import {
  tasteItemKey,
  tasteItemHash,
  resolveTasteItem,
} from "./taste-identity.mjs";

const groups = [
  ["all", "Highlights", "32, 32, 30"],
  ["music", "Music", "224, 122, 26"],
  ["films", "Films", "94, 142, 103"],
  ["games", "Games", "115, 112, 255"],
  ["tv", "TV", "0, 154, 205"],
  ["podcasts", "Podcasts", "164, 74, 126"],
];
const editorialArt = (src) =>
  src
    .replace("/film-posters/", "/taste-art/films/")
    .replace("/game-covers/", "/taste-art/games/")
    .replace("/tv-posters/", "/taste-art/tv/");
export function TasteLibrary({ albumPreview, albumCount }) {
  const [category, setCategory] = useState("all"),
    [selected, setSelected] = useState(null);
  const rail = useRef(null);
  const music = albumPreview.map((album) => ({
    ...album,
    title: album.album,
    creator: album.artist,
    kind: "music",
  }));
  const lists = {
    music,
    ...Object.fromEntries(
      ["films", "games", "tv", "podcasts"].map((kind) => [
        kind,
        curation[kind].map((item) => ({ ...item, kind })),
      ]),
    ),
  };
  const mixed = Array.from({ length: 12 }, (_, index) => {
    const kind = ["music", "films", "music", "games", "tv", "podcasts"][
      index % 6
    ];
    return lists[kind][
      Math.floor(index / 6) + (kind === "music" && index % 6 === 2 ? 2 : 0)
    ];
  }).filter(Boolean);
  const list = category === "all" ? mixed : lists[category];
  useEffect(() => {
    const sync = () => {
      setSelected(resolveTasteItem(location.hash, albumPreview, curation));
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [albumPreview]);
  const open = (item) => {
    history.pushState(
      { ...history.state, tasteDialog: true },
      "",
      tasteItemHash(item),
    );
    setSelected(item);
  };
  const close = () => {
    if (history.state?.tasteDialog) history.back();
    else {
      history.replaceState(history.state, "", "#taste");
      setSelected(null);
    }
  };
  return (
    <section
      className="page-grid concept-archive personal-taste"
      id="taste"
      aria-labelledby="taste-title"
    >
      <header className="concept-taste-head">
        <div className="concept-archive-head">
          <h2 id="taste-title">Taste Library</h2>
        </div>
        <a className="archive-link" href="/albums/">
          Browse all {albumCount.toLocaleString("en-GB")} albums{" "}
          <span aria-hidden="true">↗</span>
        </a>
      </header>
      <nav className="taste-filters deck-legend" aria-label="Browse the taste library">
        {groups.map(([id, label, accent]) => (
          <button
            key={id}
            className={`rail-word${category === id ? " is-active" : ""}`}
            style={{ "--index-accent-rgb": accent }}
            type="button"
            aria-pressed={category === id}
            onClick={() => {
              setCategory(id);
              if (rail.current) rail.current.scrollLeft = 0;
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="personal-taste-rail" ref={rail}>
        {list.map((item) => (
          <button
            className="personal-taste-card"
            type="button"
            key={`${item.kind}-${tasteItemKey(item)}`}
            onClick={() => open(item)}
            aria-label={`${item.title}, ${item.creator}. Open details`}
          >
            <span className="personal-taste-art">
              {item.kind === "music" ? (
                <AlbumArtImage id={item.id} rung="wall" alt="" />
              ) : (
                <SiteImage
                  src={editorialArt(item.art)}
                  slot={item.kind === "podcasts" ? "deckTile" : "tasteArt"}
                  sizes="(max-width:1130px) 104px, (max-width:1480px) 9.2vw, 136px"
                  alt=""
                />
              )}
            </span>
            <span className="personal-taste-title">{item.title}</span>
            <span className="personal-taste-creator">{item.creator}</span>
          </button>
        ))}
      </div>
      <p className="taste-source-note">
        {category === "music"
          ? "A few favourites. The album archive has the full collection and listening history."
          : "A few things I keep coming back to. Scroll to explore, or open a cover."}
      </p>
      {selected ? (
        <MediaDialog
          title={`${selected.title} — ${selected.creator}`}
          onClose={close}
        >
          <div className="archive-detail-art">
            {selected.kind === "music" ? (
              <AlbumArtImage id={selected.id} rung="card" alt="" priority />
            ) : (
              <SiteImage
                src={editorialArt(selected.art)}
                slot={selected.kind === "podcasts" ? "deckTile" : "tasteArt"}
                alt=""
              />
            )}
          </div>
          <div className="archive-detail-copy">
            <p className="archive-eyebrow">
              {groups.find(([id]) => id === selected.kind)?.[1]}
            </p>
            <h2>{selected.title}</h2>
            <p>
              {selected.creator}
              {selected.year ? ` · ${selected.year}` : ""}
            </p>
            {selected.note ? <p>{selected.note}</p> : null}
            {selected.kind === "music" ? (
              <a href={`/albums/#album=${encodeURIComponent(selected.id)}`}>
                Find this in the album archive ↗
              </a>
            ) : null}
            {selected.href ? (
              <a href={selected.href}>Visit the podcast ↗</a>
            ) : null}
          </div>
        </MediaDialog>
      ) : null}
    </section>
  );
}
