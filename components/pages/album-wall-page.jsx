"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageFooter } from "@/components/page-footer";
import { AlbumArtImage } from "@/components/site-image";
import { MediaDialog } from "@/components/media-dialog";
import { ListeningSummary } from "@/components/listening-summary";
import {
  browseAlbums,
  snapshotCoverage,
} from "@/components/album-catalogue.mjs";
import { useAlbumCatalogue } from "@/components/use-album-catalogue";
import { ListeningHover, listeningDescription } from "@/components/listening-hover";

const PAGE_SIZE = 36;
const number = (value) => value.toLocaleString("en-GB");
function dateLabel(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "the saved snapshot";
}
export function AlbumWallPage({
  initialCatalogue,
  refreshedAt,
  scrobblingSince,
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("plays"),
    [page, setPage] = useState(0);
  const [openId, setOpenId] = useState(null);
  const catalogue = useAlbumCatalogue(initialCatalogue, refreshedAt);
  const coverage = snapshotCoverage(catalogue);
  const sources = Object.entries(coverage).filter(([, count]) => count > 0);
  const originLabel = {
    saved: "Saved catalogue",
    session: "Session snapshot",
    network: "Fetched snapshot",
  };
  const coverageLabel =
    sources.length > 1
      ? `Mixed snapshots · ${sources.map(([source, count]) => `${number(count)} ${source === "network" ? "fetched" : source === "session" ? "cached" : "saved"}`).join(" / ")}`
      : `${originLabel[sources[0]?.[0] || "saved"]} · ${dateLabel(catalogue[0]?.countAsOf || refreshedAt)}`;
  const results = useMemo(
    () => browseAlbums(catalogue, { query, filter, sort }),
    [catalogue, query, filter, sort],
  );
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE)),
    currentPage = Math.min(page, pages - 1);
  const visible = results.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const selected = catalogue.find((album) => album.id === openId);
  const selectedIndex = results.findIndex((album) => album.id === openId);
  const printedCount = catalogue.filter((album) => album.printed).length;
  const artists = new Set(
    catalogue.map((album) => album.artist).filter(Boolean),
  ).size;

  useEffect(() => {
    const sync = () => {
      const match = location.hash.match(/^#album=(.+)$/);
      let id = null;
      try {
        id = match ? decodeURIComponent(match[1]) : null;
      } catch {}
      setOpenId(initialCatalogue.some((album) => album.id === id) ? id : null);
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [initialCatalogue]);
  const open = useCallback((id) => {
    history.pushState(
      { ...history.state, albumDialog: true },
      "",
      `#album=${encodeURIComponent(id)}`,
    );
    setOpenId(id);
  }, []);
  const close = useCallback(() => {
    if (history.state?.albumDialog) history.back();
    else {
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
      setOpenId(null);
    }
  }, []);
  const step = (delta) => {
    if (!results.length) return;
    const item =
      results[(selectedIndex + delta + results.length) % results.length];
    history.replaceState(
      history.state,
      "",
      `#album=${encodeURIComponent(item.id)}`,
    );
    setOpenId(item.id);
  };
  const changePage = (next) => {
    setPage(next);
    document
      .getElementById("album-results")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  return (
    <>
      <section className="page-grid album-library" aria-label="Album archive">
        <a className="archive-back" href="/#taste">
          ← Back to Taste Library
        </a>
        <header className="album-library-head">
          <p className="archive-eyebrow">Music / the collection</p>
          <h1>The album archive</h1>
          <p>
            Printed sleeves and a much larger listening history. Search by
            artist or album, or just follow a cover.
          </p>
        </header>
        <div className="album-catalogue-summary">
          <span>
            <strong>{number(catalogue.length)}</strong> albums in the catalogue
          </span>
          <span>
            <strong>{number(artists)}</strong> artists
          </span>
          <span>
            <strong>{number(printedCount)}</strong> printed cards
          </span>
        </div>
        <ListeningSummary />
        <div className="album-browser-controls">
          <label className="album-search">
            Find a record
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Artist, album or year"
            />
          </label>
          <label>
            Collection
            <select
              aria-label="Collection"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All albums</option>
              <option value="printed">Printed cards</option>
              <option value="recorded">With recorded scrobbles</option>
            </select>
          </label>
          <label>
            Order
            <select
              aria-label="Order"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(0);
              }}
            >
              <option value="plays">Most scrobbled</option>
              <option value="artist">Artist A–Z</option>
              <option value="year">Release year, newest first</option>
            </select>
          </label>
        </div>
        <div className="album-results-heading" id="album-results">
          <p aria-live="polite">
            {results.length
              ? `${number(currentPage * PAGE_SIZE + 1)}–${number(Math.min((currentPage + 1) * PAGE_SIZE, results.length))} of ${number(results.length)} albums`
              : "No matching albums"}
          </p>
          <span>{coverageLabel}</span>
        </div>
        {results.length ? (
          <div className="album-browser-grid">
            {visible.map((album) => (
              <button
                type="button"
                className="album-browser-card"
                key={album.id}
                onClick={() => open(album.id)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") event.currentTarget.dataset.countDismissed = "true";
                }}
                onMouseLeave={(event) => { delete event.currentTarget.dataset.countDismissed; }}
                onBlur={(event) => { delete event.currentTarget.dataset.countDismissed; }}
                aria-label={`${album.artist} — ${album.album}. ${listeningDescription({ ...album, kind: "music" })} Open details`}
              >
                <span className="album-browser-art">
                  <AlbumArtImage id={album.id} rung="wall" alt="" />
                  <ListeningHover item={{ ...album, kind: "music" }} />
                </span>
                <strong>{album.album}</strong>
                <span>{album.artist || "Artist unknown"}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="album-empty">
            <h2>Nothing on this shelf yet.</h2>
            <p>
              Try a shorter title, another spelling, or the full collection.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
                setPage(0);
              }}
            >
              Clear the search
            </button>
          </div>
        )}
        {pages > 1 ? (
          <nav className="album-pagination" aria-label="Album pages">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => changePage(currentPage - 1)}
            >
              ← Previous
            </button>
            <span>
              Page {currentPage + 1} of {pages}
            </span>
            <button
              type="button"
              disabled={currentPage === pages - 1}
              onClick={() => changePage(currentPage + 1)}
            >
              Next →
            </button>
          </nav>
        ) : null}
        <details className="album-source">
          <summary>Sources, coverage and missing records</summary>
          <p>
            The catalogue counts are Last.fm track scrobbles from{" "}
            {dateLabel(scrobblingSince)}, not full-album listens. Zero means no
            scrobbles in that record; an unmatched sleeve has no reliable count.
            The saved catalogue excludes unprinted albums with fewer than two
            scrobbles, so it is not every album ever heard. A live refresh
            updates counts for these catalogue entries; if it cannot answer, the
            saved snapshot stays usable.
          </p>
          <p>
            The separate Spotify summary above includes older history and actual
            recorded duration. Album matching between those sources is not
            complete: their counts are not combined, and no listening time is
            guessed for an album.
          </p>
        </details>
      </section>
      {selected ? (
        <MediaDialog
          title={`${selected.album} — ${selected.artist}`}
          onClose={close}
        >
          <div className="archive-detail-art">
            <AlbumArtImage id={selected.id} rung="card" alt="" priority />
          </div>
          <div className="archive-detail-copy">
            <p className="archive-eyebrow">
              {selected.printed
                ? "From the printed card collection"
                : "From the listening catalogue"}
            </p>
            <h2>{selected.album}</h2>
            <p>
              {selected.artist || "Artist unknown"}
              {selected.year ? ` · ${selected.year}` : ""}
            </p>
            {selected.lastfmUrl ? (
              <a
                href={selected.lastfmUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Album on Last.fm ↗
              </a>
            ) : null}
            <nav className="album-detail-nav" aria-label="Browse album details">
              <button type="button" onClick={() => step(-1)}>
                ← Previous
              </button>
              <button type="button" onClick={() => step(1)}>
                Next →
              </button>
            </nav>
          </div>
        </MediaDialog>
      ) : null}
      <PageFooter />
    </>
  );
}
