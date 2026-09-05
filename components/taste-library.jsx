"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlbumArtImage, SiteImage } from "./site-image";
import { MediaDialog } from "./media-dialog";
import curation from "@/data/taste-curation.json";
import { browseAlbums } from "./album-catalogue.mjs";
import { useAlbumCatalogue } from "./use-album-catalogue";
import { rankPodcasts } from "./listening-label.mjs";
import { ListeningHover, listeningDescription } from "./listening-hover";
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
function TasteArtwork({ item, large = false }) {
  if (item.kind === "music") {
    return <AlbumArtImage id={item.id} rung={large ? "card" : "wall"} alt="" priority={large} />;
  }
  if (item.art) {
    return <SiteImage
      src={editorialArt(item.art)}
      slot={item.kind === "podcasts" ? "podcastArt" : "tasteArt"}
      sizes={large ? "(max-width:600px) 320px, 442px" : "(max-width:1130px) 104px, (max-width:1480px) 9.2vw, 136px"}
      alt=""
    />;
  }
  const tint = [...item.title].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 6;
  return <span className={`podcast-type-cover podcast-type-cover-${tint}`} aria-hidden="true">
    <small>Podcast</small>
    <strong>{item.title}</strong>
    <span>◉</span>
  </span>;
}

export function TasteLibrary({ initialCatalogue, refreshedAt }) {
  const [category, setCategory] = useState("all"),
    [selectedHash, setSelectedHash] = useState(""),
    [visibleCount, setVisibleCount] = useState(36);
  const rail = useRef(null);
  const more = useRef(null);
  const catalogue = useAlbumCatalogue(initialCatalogue, refreshedAt);
  const music = useMemo(() => browseAlbums(catalogue).map((album) => ({
    ...album,
    title: album.album,
    creator: album.artist,
    kind: "music",
  })), [catalogue]);
  const lists = {
    music,
    ...Object.fromEntries(
      ["films", "games", "tv"].map((kind) => [
        kind,
        curation[kind].map((item) => ({ ...item, kind })),
      ]),
    ),
    podcasts: rankPodcasts(curation.podcasts).map((item) => ({ ...item, kind: "podcasts" })),
  };
  // Highlights retains the mixed editorial selection. Within each listening
  // medium its chosen records follow the same descending counts as the shelf.
  const highlights = {
    ...lists,
    music: music.filter((item) => curation.albumIds.includes(item.id)).slice(0, 4),
  };
  const mixed = Array.from({ length: 12 }, (_, index) => {
    const kind = ["music", "films", "music", "games", "tv", "podcasts"][
      index % 6
    ];
    return highlights[kind][
      kind === "music"
        ? Math.floor(index / 6) * 2 + (index % 6 === 2 ? 1 : 0)
        : Math.floor(index / 6)
    ];
  }).filter(Boolean);
  const list = category === "all" ? mixed : lists[category];
  const visible = list.slice(0, visibleCount);
  const selected = resolveTasteItem(selectedHash, catalogue, curation);
  useEffect(() => {
    if (!more.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => count + 36);
    }, { root: rail.current, rootMargin: "0px 240px 0px 0px" });
    observer.observe(more.current);
    return () => observer.disconnect();
  }, [category, visibleCount]);
  useEffect(() => {
    const sync = () => {
      setSelectedHash(location.hash);
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  const open = (item) => {
    history.pushState(
      { ...history.state, tasteDialog: true },
      "",
      tasteItemHash(item),
    );
    setSelectedHash(tasteItemHash(item));
  };
  const close = () => {
    if (history.state?.tasteDialog) history.back();
    else {
      history.replaceState(history.state, "", "#taste");
      setSelectedHash("");
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
              setVisibleCount(36);
              if (rail.current) rail.current.scrollLeft = 0;
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="personal-taste-rail" ref={rail}>
        {visible.map((item) => (
          <button
            className="personal-taste-card"
            type="button"
            key={`${item.kind}-${tasteItemKey(item)}`}
            onClick={() => open(item)}
            aria-label={`${item.title}${item.creator ? `, ${item.creator}` : ""}. ${listeningDescription(item)} Open details`}
            data-listens={item.kind === "music" ? item.plays : item.listens}
            onKeyDown={(event) => {
              if (event.key === "Escape") event.currentTarget.dataset.countDismissed = "true";
            }}
            onMouseLeave={(event) => { delete event.currentTarget.dataset.countDismissed; }}
            onBlur={(event) => { delete event.currentTarget.dataset.countDismissed; }}
          >
            <span className="personal-taste-art">
              <TasteArtwork item={item} />
              <ListeningHover item={item} />
            </span>
            <span className="personal-taste-title">{item.title}</span>
            {item.creator ? <span className="personal-taste-creator">{item.creator}</span> : null}
          </button>
        ))}
        {visible.length < list.length ? (
          <button className="taste-load-more" type="button" ref={more} onClick={() => setVisibleCount((count) => count + 36)}>
            More {category === "music" ? "albums" : "podcasts"} <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
      {selected ? (
        <MediaDialog
          title={`${selected.title}${selected.creator ? ` — ${selected.creator}` : ""}`}
          onClose={close}
        >
          <div className="archive-detail-art">
            <TasteArtwork item={selected} large />
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
