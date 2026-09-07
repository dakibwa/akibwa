"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SiteImage } from "./site-image";
import { AlbumCover } from "./album-cover";
import curation from "@/data/taste-curation.json";
import { browseAlbums } from "./album-catalogue.mjs";
import { useAlbumCatalogue } from "./use-album-catalogue";
import { listeningLabel, rankPodcasts } from "./listening-label.mjs";
import { listeningDescription } from "./listening-hover";
import { tasteItemKey } from "./taste-identity.mjs";
import { stackArtwork } from "./taste-layout.mjs";
import { RailControls } from "./rail-controls";
import { Search, X } from "lucide-react";

const groups = [
  ["music", "Music", "224, 122, 26"],
  ["films", "Films", "94, 142, 103"],
  ["games", "Games", "115, 112, 255"],
  ["tv", "TV", "0, 154, 205"],
  ["podcasts", "Podcasts", "164, 74, 126"],
];
const searchable = (value) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
const artworkKey = item => `${item.kind}-${tasteItemKey(item)}`;
const estimatedHeight = item => 132 * (item.kind === "films" || item.kind === "tv" ? 1.5 : item.kind === "games" ? 4 / 3 : 1);

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
    [visibleCount, setVisibleCount] = useState(48);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButton = useRef(null);
  const searchInput = useRef(null);
  const rail = useRef(null);
  const more = useRef(null);
  const activeCard = useRef(null);
  const enteredView = useRef(false);
  const pointerPosition = useRef(null);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [wallLayout, setWallLayout] = useState(null);
  const lastLayout = useRef("");
  const restorePosition = useRef(null);
  useLayoutEffect(() => {
    // Reset after the new artwork is mounted so scroll snap cannot retain a
    // cover that moved to a later column when the medium was cleared.
    if (rail.current) rail.current.scrollLeft = 0;
  }, [category, query]);
  const dismissDetail = () => {
    activeCard.current = null;
    setDetailOpen(false);
  };
  const cardVisible = (card) => {
    const box = card?.getBoundingClientRect();
    const bounds = rail.current?.getBoundingClientRect();
    return box && bounds && Math.min(box.right, bounds.right) - Math.max(box.left, bounds.left) >= 24 &&
      Math.min(box.bottom, innerHeight) - Math.max(box.top, 0) >= 24;
  };
  const revealDetail = (item, card) => {
    if (!matchMedia("(hover: hover)").matches) return;
    if (activeCard.current === card) return;
    activeCard.current = card;
    enteredView.current = cardVisible(card);
    setDetail(`${item.kind}-${tasteItemKey(item)}`);
    setDetailOpen(true);
  };
  useEffect(() => {
    if (!detailOpen) return;
    const onEscape = (event) => { if (event.key === "Escape") dismissDetail(); };
    const shelf = rail.current;
    const keepVisible = (event) => {
      if (event.type === "resize" && activeCard.current === document.activeElement) return;
      const visible = cardVisible(activeCard.current);
      // Keyboard focus can start a native smooth scroll. Let the card arrive
      // before treating a later move out of view as dismissal.
      if (visible) enteredView.current = true;
      if (!activeCard.current || !matchMedia("(hover: hover)").matches ||
          (!visible && enteredView.current)) dismissDetail();
    };
    window.addEventListener("keydown", onEscape);
    shelf?.addEventListener("scroll", keepVisible, { passive: true });
    window.addEventListener("scroll", keepVisible, { passive: true });
    window.addEventListener("resize", keepVisible, { passive: true });
    return () => {
      window.removeEventListener("keydown", onEscape);
      shelf?.removeEventListener("scroll", keepVisible);
      window.removeEventListener("scroll", keepVisible);
      window.removeEventListener("resize", keepVisible);
    };
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
    music: music.filter((item) => curation.albumIds.includes(item.id)).slice(0, 16),
  };
  const mixed = Array.from({ length: 48 }, (_, index) => {
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
  const keys = visible.map(artworkKey);
  const selectionKey = keys.join("|");
  const measurementKey = visible.map(item => `${artworkKey(item)}:${item.title}:${item.creator}:${item.plays}`).join("|");
  const mixedArtwork = list.some(item => item.kind !== list[0]?.kind);
  const initialColumns = useMemo(() => stackArtwork(visible.map(estimatedHeight), { mixed: mixedArtwork }), [selectionKey, mixedArtwork]);
  const appending = wallLayout && wallLayout.keys.length < keys.length && wallLayout.keys.every((key, index) => key === keys[index]);
  const columns = wallLayout?.selectionKey === selectionKey ? wallLayout.columns : appending ? [
    ...wallLayout.columns,
    ...stackArtwork(visible.slice(wallLayout.keys.length).map(estimatedHeight), { mixed: mixedArtwork })
      .map(column => ({ ...column, indices: column.indices.map(index => index + wallLayout.keys.length) })),
  ] : initialColumns;
  useLayoutEffect(() => {
    const shelf = rail.current;
    if (!shelf || !visible.length) return;
    let frame = 0, disposed = false, responsive = false;
    let previousWidth = shelf.getBoundingClientRect().width;
    const measure = () => {
      frame = 0;
      if (disposed) return;
      const keepFocusedView = responsive;
      responsive = false;
      const cards = [...shelf.querySelectorAll('.personal-taste-card')];
      const byKey = new Map(cards.map(card => [card.dataset.tasteKey, card]));
      const bounds = shelf.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(shelf).columnGap);
      const width = cards[0]?.querySelector('.personal-taste-art').getBoundingClientRect().width;
      if (!width || keys.some(key => !byKey.has(key))) return;
      const heights = keys.map(key => {
        const card = byKey.get(key), art = card.querySelector('.personal-taste-art');
        return art.getBoundingClientRect().height + parseFloat(getComputedStyle(art).marginBottom) +
          card.querySelector('.personal-taste-caption').getBoundingClientRect().height;
      });
      const nextColumns = stackArtwork(heights, {
        gap, viewportHeight: innerHeight, visibleColumns: Math.max(1, Math.floor((bounds.width + gap) / (width + gap))), mixed: mixedArtwork,
      });
      const nextKey = JSON.stringify([selectionKey, nextColumns]);
      if (lastLayout.current === nextKey) {
        if (keepFocusedView && activeCard.current === document.activeElement && !cardVisible(activeCard.current)) {
          activeCard.current.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
        }
        return;
      }
      const anchor = cards.find(card => card.getBoundingClientRect().right > bounds.left + 24);
      restorePosition.current = {
        anchor: anchor?.dataset.tasteKey, offset: anchor ? anchor.getBoundingClientRect().left - bounds.left : 0,
        focus: shelf.contains(document.activeElement) ? document.activeElement.dataset.tasteKey : null,
        preview: activeCard.current === document.activeElement,
        keepFocusedView,
      };
      dismissDetail();
      lastLayout.current = nextKey;
      setWallLayout({ selectionKey, keys, columns: nextColumns });
    };
    const queueMeasure = () => {
      responsive = true;
      if (!disposed && !frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(([entry]) => {
      // Opening a hover detail changes the rail's height, never its packing.
      if (Math.abs(entry.contentRect.width - previousWidth) < .5) return;
      previousWidth = entry.contentRect.width;
      queueMeasure();
    });
    observer.observe(shelf);
    const touch = matchMedia('(hover: none)');
    touch.addEventListener('change', queueMeasure);
    window.addEventListener('resize', queueMeasure);
    document.fonts.ready.then(queueMeasure);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      touch.removeEventListener('change', queueMeasure);
      window.removeEventListener('resize', queueMeasure);
    };
  }, [measurementKey, mixedArtwork]);
  useLayoutEffect(() => {
    const restore = restorePosition.current, shelf = rail.current;
    if (!restore || !shelf) return;
    restorePosition.current = null;
    const cards = [...shelf.querySelectorAll('.personal-taste-card')];
    const anchor = cards.find(card => card.dataset.tasteKey === restore.anchor);
    if (anchor) shelf.scrollLeft += anchor.getBoundingClientRect().left - shelf.getBoundingClientRect().left - restore.offset;
    const focused = cards.find(card => card.dataset.tasteKey === restore.focus);
    if (focused) {
      focused.focus({ preventScroll: true });
      if (restore.preview && restore.keepFocusedView && !cardVisible(focused)) {
        focused.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      }
      if (restore.preview && cardVisible(focused)) revealDetail(visible[keys.indexOf(restore.focus)], focused);
      else dismissDetail();
    }
  }, [wallLayout]);
  const updateQuery = (value) => {
    dismissDetail();
    setQuery(value);
    setVisibleCount(48);
  };
  const closeSearch = () => {
    updateQuery("");
    setSearchOpen(false);
    requestAnimationFrame(() => searchButton.current?.focus({ preventScroll: true }));
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
      <header className={`concept-taste-head${searchOpen ? " is-searching" : ""}`}>
        <div className="concept-archive-head">
          <h2 id="taste-title">Taste Library</h2>
        </div>
        <div className="taste-tools">
          <div className={`taste-search${searchOpen ? " is-open" : ""}`}>
          <button className="taste-search-toggle" type="button" aria-label="Search" aria-expanded={searchOpen} aria-controls="taste-search-field" aria-hidden={searchOpen} inert={searchOpen} ref={searchButton} onClick={() => {
            setSearchOpen(true);
            requestAnimationFrame(() => searchInput.current?.focus({ preventScroll: true }));
          }}><Search size={15} aria-hidden="true" /><span>Search</span></button>
          <div className="taste-search-field" id="taste-search-field" aria-hidden={!searchOpen} inert={!searchOpen}>
            <Search size={15} aria-hidden="true" />
            <input ref={searchInput} type="search" aria-label="Search the taste library" placeholder="Search the library" value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  closeSearch();
                }
              }} />
            <button type="button" aria-label="Close taste search" onClick={closeSearch}><X size={15} aria-hidden="true" /></button>
          </div>
          </div>
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
              setCategory((current) => current === id ? "all" : id);
              setVisibleCount(48);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {terms.length > 0 && list.length === 0 ? <p className="taste-search-status" role="status">No matches.</p> : null}
      <div className="taste-wall-stage">
      <div className="personal-taste-rail" id="taste-rail" ref={rail}>
        {columns.map((column) => <div className="taste-wall-column" key={keys[column.indices[0]]} style={{ gap: `${column.gap}px` }}>
        {column.indices.map((index) => {
          const item = visible[index];
          const count = listeningLabel(item);
          const itemKey = `${item.kind}-${tasteItemKey(item)}`;
          const expanded = detailOpen && detail === itemKey;
          return (
            <article
              className="personal-taste-card"
              data-kind={item.kind}
              data-taste-key={itemKey}
              data-detail-open={expanded}
              tabIndex={0}
              key={itemKey}
              aria-label={`${item.title}${item.creator ? `, ${item.creator}` : ""}. ${listeningDescription(item)}`}
              data-listens={item.plays}
              data-album-id={item.kind === "music" ? item.id : undefined}
              onMouseMove={(event) => {
                // Scrolling artwork beneath a stationary pointer must not
                // reopen a dismissed box. Preview follows deliberate movement.
                const before = pointerPosition.current;
                const next = { x: event.clientX, y: event.clientY };
                if (before?.x === next.x && before?.y === next.y) return;
                pointerPosition.current = next;
                revealDetail(item, event.currentTarget);
              }}
              onFocus={(event) => revealDetail(item, event.currentTarget)}
              onBlur={(event) => {
                if (!rail.current?.contains(event.relatedTarget)) dismissDetail();
              }}
            >
              <span className="personal-taste-art">
                <TasteArtwork item={item} />
              </span>
              <div className={`personal-taste-detail-shell${expanded ? " is-open" : ""}`} aria-hidden={!expanded} inert={!expanded}
                style={{ "--hover-detail-accent": `rgb(${groups.find(([id]) => id === item.kind)[2]})` }}>
                <div className="taste-detail-clip">
                  <div className="personal-taste-detail" id={expanded ? "taste-detail" : undefined}>
                    <div className="taste-detail-copy">
                      <strong>{item.title}</strong>
                      {item.creator ? <span>{item.creator}</span> : null}
                      {count ? <p className="personal-taste-detail-count"><strong>{count.value}</strong> {count.label}</p> : null}
                    </div>
                  </div>
                </div>
              </div>
              <span className="personal-taste-caption">
                <span className="personal-taste-title">{item.title}</span>
                {item.creator ? <span className="personal-taste-creator">{item.creator}</span> : null}
                {count ? <span className="personal-taste-mobile-count">{count.value} {count.label}</span> : null}
              </span>
            </article>
          );
        })}
        </div>)}
        {visible.length < list.length ? (
          <button className="taste-load-more" type="button" ref={more} onClick={() => setVisibleCount((count) => count + 36)}>
            More {terms.length ? "results" : category === "music" ? "albums" : "podcasts"} <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
      </div>
      {(category === "music" || searchOpen) && (loading || loadError) ? <p className="taste-load-status" role="status">
        {loadError ? <>The full album history couldn’t load. <button type="button" onClick={retry}>Try again</button></> : "Loading the full album history…"}
      </p> : null}
    </section>
  );
}
