"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteImage } from "./site-image";
import { AlbumCover } from "./album-cover";
import curation from "@/data/taste-curation.json";
import { browseAlbums } from "./album-catalogue.mjs";
import { useAlbumCatalogue } from "./use-album-catalogue";
import { rankPodcasts } from "./listening-label.mjs";
import { ListeningHover, listeningDescription } from "./listening-hover";
import { tasteItemKey } from "./taste-identity.mjs";

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
function TasteArtwork({ item }) {
  if (item.kind === "music") {
    return <AlbumCover album={item} />;
  }
  if (item.art) {
    return <SiteImage
      src={editorialArt(item.art)}
      slot={item.kind === "podcasts" ? "podcastArt" : "tasteArt"}
      sizes="(max-width:1130px) 104px, (max-width:1480px) 9.2vw, 136px"
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

export function TasteLibrary({ initialCatalogue, refreshedAt, podcasts }) {
  const [category, setCategory] = useState("all"),
    [visibleCount, setVisibleCount] = useState(36);
  const rail = useRef(null);
  const more = useRef(null);
  const { catalogue, loading, loadError, retry } = useAlbumCatalogue(initialCatalogue, refreshedAt, category === "music");
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
    podcasts: rankPodcasts(podcasts).map((item) => ({ ...item, kind: "podcasts" })),
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
  useEffect(() => {
    if (!more.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => count + 36);
    }, { root: rail.current, rootMargin: "0px 240px 0px 0px" });
    observer.observe(more.current);
    return () => observer.disconnect();
  }, [category, visibleCount]);
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
          <article
            className="personal-taste-card"
            tabIndex={item.kind === "music" || item.kind === "podcasts" ? 0 : undefined}
            key={`${item.kind}-${tasteItemKey(item)}`}
            aria-label={`${item.title}${item.creator ? `, ${item.creator}` : ""}. ${listeningDescription(item)}`}
            data-listens={item.plays}
            data-album-id={item.kind === "music" ? item.id : undefined}
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
          </article>
        ))}
        {visible.length < list.length ? (
          <button className="taste-load-more" type="button" ref={more} onClick={() => setVisibleCount((count) => count + 36)}>
            More {category === "music" ? "albums" : "podcasts"} <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
      {category === "music" && (loading || loadError) ? <p className="taste-load-status" role="status">
        {loadError ? <>The full album history couldn’t load. <button type="button" onClick={retry}>Try again</button></> : "Loading the full album history…"}
      </p> : null}
    </section>
  );
}
