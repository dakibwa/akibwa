"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteImage } from "./site-image";
import { AlbumCover } from "./album-cover";
import curation from "@/data/taste-curation.json";
import { browseAlbums } from "./album-catalogue.mjs";
import { useAlbumCatalogue } from "./use-album-catalogue";
import { listeningLabel, rankPodcasts } from "./listening-label.mjs";
import { listeningDescription } from "./listening-hover";
import { tasteItemKey } from "./taste-identity.mjs";
import { IndexReveal } from "./index-reveal";
import { RailControls } from "./rail-controls";
import { Search, X } from "lucide-react";

const groups = [
  ["all", "Highlights", "32, 32, 30"],
  ["music", "Music", "224, 122, 26"],
  ["films", "Films", "94, 142, 103"],
  ["games", "Games", "115, 112, 255"],
  ["tv", "TV", "0, 154, 205"],
  ["podcasts", "Podcasts", "164, 74, 126"],
];
const searchable = (value) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
function TasteArtwork({ item }) {
  if (item.kind === "music") {
    return <AlbumCover album={item} />;
  }
  if (item.art) {
    return <SiteImage
      src={item.art}
      slot={item.kind === "podcasts" ? "podcastArt" : item.kind === "games" ? "gameArt" : "posterArt"}
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
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButton = useRef(null);
  const rail = useRef(null);
  const more = useRef(null);
  const activeCard = useRef(null);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const dismissDetail = () => {
    activeCard.current = null;
    setDetailOpen(false);
  };
  const revealDetail = (item, card) => {
    if (!matchMedia("(hover: hover)").matches) return;
    activeCard.current = card;
    setDetail(item);
    setDetailOpen(true);
  };
  useEffect(() => {
    if (!detailOpen) return;
    const onEscape = (event) => { if (event.key === "Escape") dismissDetail(); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [detailOpen]);
  const { catalogue, loading, loadError, retry } = useAlbumCatalogue(initialCatalogue, refreshedAt, category === "music" || searchOpen);
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
  const terms = searchable(query.trim()).split(/\s+/).filter(Boolean);
  const selection = category === "all" ? (terms.length ? Object.values(lists).flat() : mixed) : lists[category];
  const list = terms.length ? selection.filter((item) => {
    const text = searchable(`${item.title} ${item.creator ?? ""}`);
    return terms.every((term) => text.includes(term));
  }) : selection;
  const visible = list.slice(0, visibleCount);
  const detailCount = detail ? listeningLabel(detail) : null;
  const updateQuery = (value) => {
    dismissDetail();
    setQuery(value);
    setVisibleCount(36);
    if (rail.current) rail.current.scrollLeft = 0;
  };
  useEffect(() => {
    if (!more.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => count + 36);
    }, { root: rail.current, rootMargin: "0px 240px 0px 0px" });
    observer.observe(more.current);
    return () => observer.disconnect();
  }, [category, query, visibleCount]);
  return (
    <section
      className={`page-grid concept-archive personal-taste${detailOpen ? " is-open" : ""}`}
      id="taste"
      aria-labelledby="taste-title"
      onMouseLeave={(event) => {
        if (activeCard.current !== event.currentTarget.ownerDocument.activeElement) dismissDetail();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismissDetail();
      }}
    >
      <header className="concept-taste-head">
        <div className="concept-archive-head">
          <h2 id="taste-title">Taste Library</h2>
        </div>
        <div className="taste-tools">
          {searchOpen ? <div className="taste-search-field">
            <Search size={15} aria-hidden="true" />
            <input autoFocus type="search" aria-label="Search the taste library" placeholder="Search the library" value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  updateQuery("");
                  setSearchOpen(false);
                  requestAnimationFrame(() => searchButton.current?.focus());
                }
              }} />
            <button type="button" aria-label="Close taste search" onClick={() => { updateQuery(""); setSearchOpen(false); requestAnimationFrame(() => searchButton.current?.focus()); }}><X size={15} aria-hidden="true" /></button>
          </div> : <button className="taste-search-toggle" type="button" ref={searchButton} onClick={() => setSearchOpen(true)}><Search size={15} aria-hidden="true" /><span>Search</span></button>}
          <RailControls rail={rail} label="Taste" controls="taste-rail" />
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
              dismissDetail();
              setCategory(id);
              setVisibleCount(36);
              if (rail.current) rail.current.scrollLeft = 0;
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {terms.length ? <p className="taste-search-status" role="status">{list.length ? `${list.length.toLocaleString()} ${list.length === 1 ? "match" : "matches"}${category === "all" ? " across the library" : ""}` : "No matches. Try another title or creator."}</p> : null}
      <div className="personal-taste-rail" id="taste-rail" ref={rail}>
        {visible.map((item) => {
          const count = listeningLabel(item);
          return (
            <article
              className="personal-taste-card"
              data-kind={item.kind}
              tabIndex={0}
              key={`${item.kind}-${tasteItemKey(item)}`}
              aria-label={`${item.title}${item.creator ? `, ${item.creator}` : ""}. ${listeningDescription(item)}`}
              data-listens={item.plays}
              data-album-id={item.kind === "music" ? item.id : undefined}
              onMouseEnter={(event) => {
                if (matchMedia("(hover: hover)").matches) revealDetail(item, event.currentTarget);
              }}
              onFocus={(event) => revealDetail(item, event.currentTarget)}
              onBlur={(event) => {
                if (!rail.current?.contains(event.relatedTarget)) dismissDetail();
              }}
            >
              <span className="personal-taste-art">
                <TasteArtwork item={item} />
              </span>
              <span className="personal-taste-caption">
                <span className="personal-taste-title">{item.title}</span>
                {item.creator ? <span className="personal-taste-creator">{item.creator}</span> : null}
                {count ? <span className="personal-taste-mobile-count">{count.value} {count.label}</span> : null}
              </span>
            </article>
          );
        })}
        {visible.length < list.length ? (
          <button className="taste-load-more" type="button" ref={more} onClick={() => setVisibleCount((count) => count + 36)}>
            More {terms.length ? "results" : category === "music" ? "albums" : "podcasts"} <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
      <IndexReveal
        open={detailOpen}
        itemKey={detail ? `${detail.kind}-${tasteItemKey(detail)}` : "empty"}
        rail={rail}
        getAnchor={() => activeCard.current}
        onUnavailable={dismissDetail}
        accent={detail ? `rgb(${groups.find(([id]) => id === detail.kind)[2]})` : undefined}
        id="taste-detail"
        className="personal-taste-detail-shell"
        panelClassName="personal-taste-detail"
      >
        {detail ? <>
          <strong>{detail.title}</strong>
          {detail.creator ? <span>{detail.creator}</span> : null}
          {detailCount ? <p className="personal-taste-detail-count"><strong>{detailCount.value}</strong> {detailCount.label}</p> : null}
        </> : null}
      </IndexReveal>
      {(category === "music" || searchOpen) && (loading || loadError) ? <p className="taste-load-status" role="status">
        {loadError ? <>The full album history couldn’t load. <button type="button" onClick={retry}>Try again</button></> : "Loading the full album history…"}
      </p> : null}
    </section>
  );
}
