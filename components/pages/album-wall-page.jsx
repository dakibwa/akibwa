"use client";

import { useMemo, useState } from "react";
import { PageFooter } from "@/components/page-footer";
import { AlbumCover } from "@/components/album-cover";
import { ListeningSummary } from "@/components/listening-summary";
import { browseAlbums } from "@/components/album-catalogue.mjs";
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
  method,
  totals,
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("plays"),
    [page, setPage] = useState(0);
  const { catalogue, loading, loadError, retry } = useAlbumCatalogue(initialCatalogue, refreshedAt);
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
            artist or album, or browse the covers.
          </p>
        </header>
        <div className="album-catalogue-summary">
          <span>
            <strong>{number(totals.albums)}</strong> albums in the catalogue
          </span>
          <span>
            <strong>{number(totals.artists)}</strong> artists
          </span>
          <span>
            <strong>{number(totals.printed)}</strong> printed cards
          </span>
        </div>
        <ListeningSummary />
        {loading || loadError ? <p className="taste-load-status" role="status">
          {loadError ? <>The full album history couldn’t load. <button type="button" onClick={retry}>Try again</button></> : "Loading the full album history…"}
        </p> : null}
        <div className="album-browser-controls">
          <label className="album-search">
            Find a record
            <input
              type="search"
              disabled={loading || loadError}
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
              disabled={loading || loadError}
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All albums</option>
              <option value="printed">Printed cards</option>
              <option value="recorded">With recorded plays</option>
            </select>
          </label>
          <label>
            Order
            <select
              aria-label="Order"
              disabled={loading || loadError}
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(0);
              }}
            >
              <option value="plays">Most played</option>
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
          <span>Available history · {dateLabel(refreshedAt)}</span>
        </div>
        {results.length ? (
          <div className="album-browser-grid">
            {visible.map((album) => (
              <article
                tabIndex={0}
                className="album-browser-card"
                key={album.id}
                data-album-id={album.id}
                onKeyDown={(event) => {
                  if (event.key === "Escape") event.currentTarget.dataset.countDismissed = "true";
                }}
                onMouseLeave={(event) => { delete event.currentTarget.dataset.countDismissed; }}
                onBlur={(event) => { delete event.currentTarget.dataset.countDismissed; }}
                aria-label={`${album.artist} — ${album.album}. ${listeningDescription({ ...album, kind: "music" })}`}
              >
                <span className="album-browser-art">
                  <AlbumCover album={album} />
                  <ListeningHover item={{ ...album, kind: "music" }} />
                </span>
                <strong>{album.album}</strong>
                <span>{album.artist || "Artist unknown"}</span>
              </article>
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
          <p>{method.music}</p>
          <p>{method.overlap}</p>
          <p>{method.coverage}</p>
          <p>{method.unknown}</p>
        </details>
      </section>
      <PageFooter />
    </>
  );
}
