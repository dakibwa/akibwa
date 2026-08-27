"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { PageFooter } from "@/components/page-footer";
import { AlbumArtImage } from "@/components/site-image";
import { fetchSessionJson, readSessionJson } from "@/components/remote-data-cache";
import { albumPlaysDataUrl } from "@/components/site-data";
import wallData from "@/data/album-wall.json";

const numberFormat = new Intl.NumberFormat("en-GB");

// Degrees at the very corner of a card. Steep on purpose: at 104px a timid tilt
// is invisible, and the whole point of the wall is that the cards feel like
// physical objects you are pressing on rather than thumbnails that scale.
const TILT = 30;

/*
 * Last.fm has only been running on this account since April 2025, so a sleeve at
 * zero has almost certainly been played — just not inside the window Last.fm can
 * see. Saying "never played" would be a plain lie about a record collection, so
 * the wall says only what it actually knows.
 */
function playLabel(plays, since) {
  if (plays === null || plays === undefined) return { value: null, unit: "not on Last.fm" };
  if (plays === 0) return { value: null, unit: since ? `not since ${since}` : "no plays recorded" };
  return { value: numberFormat.format(plays), unit: plays === 1 ? "play" : "plays" };
}

function monthYear(iso) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function AlbumWallPage() {
  // { index, left, top, width } — the label is positioned from the card's own
  // box, so it follows the wall through resizes and reflows without measuring
  // anything on every mouse move.
  const [hovered, setHovered] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);
  const [livePlays, setLivePlays] = useState(null);
  const wallRef = useRef(null);
  const tiltedRef = useRef(null);
  const frameRef = useRef(0);

  // The baked counts ship with the page so the wall is never blank; the Worker's
  // hourly refresh overlays them when it answers.
  useEffect(() => {
    if (!albumPlaysDataUrl) return undefined;
    let cancelled = false;
    const apply = (data) => {
      if (!cancelled && data?.plays && typeof data.plays === "object") setLivePlays(data);
    };
    apply(readSessionJson(albumPlaysDataUrl));
    fetchSessionJson(albumPlaysDataUrl).then(apply).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const scrobblingSince = monthYear(livePlays?.scrobblingSince ?? wallData.scrobblingSince);

  /*
   * One wall, two populations: the sleeves Dan had printed as cards, and
   * everything else he has actually played. They are ranked together, so a
   * record he plays constantly sits above one he printed and never returned to.
   */
  const tiles = useMemo(() => {
    const overlay = livePlays?.plays ?? null;
    // A few records were saved into the folder twice under different filenames.
    // refresh-album-plays.mjs marks the lower-resolution copy rather than
    // deleting it, so the folder stays the source of truth; the wall shows one.
    const printed = wallData.sleeves
      .filter((sleeve) => !sleeve.duplicateOf)
      .map((sleeve) => ({
        id: sleeve.id,
        artist: sleeve.artist,
        album: sleeve.album,
        year: sleeve.year,
        lastfmUrl: sleeve.lastfmUrl,
        printed: true,
        plays: overlay && overlay[sleeve.id] !== undefined ? overlay[sleeve.id] : sleeve.plays
      }));
    const played = (wallData.played ?? []).map((album) => ({
      id: album.id,
      artist: album.artist,
      album: album.album,
      year: album.year,
      lastfmUrl: album.lastfmUrl,
      printed: false,
      plays: overlay && overlay[album.id] !== undefined ? overlay[album.id] : album.plays
    }));

    return [...printed, ...played].sort(
      (a, b) =>
        (b.plays ?? 0) - (a.plays ?? 0) ||
        // Ties at zero are the whole bottom of the wall, so fall through to the
        // artist rather than leaving a third of it in arbitrary order.
        (a.artist || a.album || "").localeCompare(b.artist || b.album || "", "en") ||
        (a.album || "").localeCompare(b.album || "", "en")
    );
  }, [livePlays]);

  const printedCount = wallData.sleeves.filter((sleeve) => !sleeve.duplicateOf).length;
  const open = openIndex === null ? null : tiles[openIndex];
  const readout = hovered ? tiles[hovered.index] : null;

  /*
   * The label is placed from the card's offset box rather than fixed to the
   * viewport, so it scrolls with the wall and needs no work on scroll. Measured
   * once per card entered, not per mouse move.
   */
  const anchorLabel = useCallback((index, element) => {
    const grid = wallRef.current;
    const centre = element.offsetLeft + element.offsetWidth / 2;
    // Half the widest the label is allowed to get. Clamping the centre by this
    // keeps a first- or last-column label inside the frame instead of hanging
    // off the page.
    const margin = 125;
    const limit = grid ? grid.offsetWidth : centre + margin;
    setHovered({
      index,
      x: Math.min(Math.max(centre, margin), Math.max(margin, limit - margin)),
      top: element.offsetTop,
      height: element.offsetHeight
    });
  }, []);

  /*
   * The tilt. The card is pressed away from the viewer at whatever point the
   * cursor is on it, so the far corner rises — cursor top-left, top-left corner
   * sinks, bottom-right lifts. Dragging across the wall leaves each card easing
   * back to flat behind you, which is what makes the sweep read as a wave rather
   * than a row of independent hovers.
   *
   * One listener on the grid, and the transform is written to CSS variables on a
   * single element per frame. Attaching pointermove to ~1,700 cards, or holding
   * the angles in React state, would re-render the whole wall on every mouse
   * move.
   */
  const clearTilt = useCallback(() => {
    const previous = tiltedRef.current;
    if (previous) {
      for (const name of ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y", "--shadow-x", "--shadow-y"]) {
        previous.style.removeProperty(name);
      }
      tiltedRef.current = null;
    }
  }, []);

  /*
   * mousemove rather than pointermove. Both fire for a real mouse, but mousemove
   * is the one every browser and automation layer agrees on, and the tilt is the
   * whole interaction — it is not worth losing on a technicality. Touch is gated
   * on the hover media query instead of on pointerType, so a device that reports
   * a coarse pointer never tilts at all rather than tilting once per tap.
   */
  const onMouseMove = useCallback(
    (event) => {
      if (typeof window !== "undefined" && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const card = event.target.closest(".album-card");
      if (!card) {
        clearTilt();
        return;
      }
      // React pools nothing in 18+, but the coordinates are read a frame later and
      // the card may have scrolled by then, so both are captured now.
      const { clientX, clientY } = event;
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        const box = card.getBoundingClientRect();
        const px = (clientX - box.left) / box.width;
        const py = (clientY - box.top) / box.height;
        if (tiltedRef.current && tiltedRef.current !== card) clearTilt();
        tiltedRef.current = card;
        // rotateX(+) pushes the top edge away; rotateY(+) pushes the right edge
        // away. Both are inverted against the cursor so the point under it sinks.
        card.style.setProperty("--tilt-x", `${(TILT * (1 - 2 * py)).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${(TILT * (2 * px - 1)).toFixed(2)}deg`);
        // The sheen sits on the corner that has risen — opposite the cursor —
        // because that is the face now angled towards the light. Without it the
        // card reads as a flat image being skewed rather than a lit object.
        card.style.setProperty("--glare-x", `${((1 - px) * 100).toFixed(1)}%`);
        card.style.setProperty("--glare-y", `${((1 - py) * 100).toFixed(1)}%`);
        // The drop shadow leans the way the card leans, so the light stays in
        // one place across the whole wall.
        card.style.setProperty("--shadow-x", `${((px - 0.5) * -26).toFixed(1)}px`);
        card.style.setProperty("--shadow-y", `${((py - 0.5) * -26 + 20).toFixed(1)}px`);
      });
    },
    [clearTilt]
  );

  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  const step = useCallback(
    (delta) => {
      setOpenIndex((current) => (current === null ? current : (current + delta + tiles.length) % tiles.length));
    },
    [tiles.length]
  );

  useEffect(() => {
    if (openIndex === null) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpenIndex(null);
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, step]);

  // Arrow keys walk the wall itself, which is the only sane way through
  // seventeen hundred cards with a keyboard. Tab order stays untouched.
  const onWallKeyDown = (event) => {
    const columns = getColumnCount(wallRef.current);
    const deltas = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
    const delta = deltas[event.key];
    if (!delta) return;
    const from = Number(event.target.dataset.index);
    if (Number.isNaN(from)) return;
    const to = from + delta;
    if (to < 0 || to >= tiles.length) return;
    event.preventDefault();
    wallRef.current?.querySelector(`[data-index="${to}"]`)?.focus();
  };

  return (
    <>
      <section className="album-wall" aria-label="Album wall">
        <h1 className="album-wall-accessible-title">
          Every album I&apos;ve played, ranked by how often
        </h1>

        <div
          ref={wallRef}
          className="album-wall-grid"
          onMouseMove={onMouseMove}
          onPointerLeave={() => {
            clearTilt();
            setHovered(null);
          }}
          onKeyDown={onWallKeyDown}
        >
          {tiles.map((tile, index) => {
            const label = tile.artist ? `${tile.artist} — ${tile.album}` : tile.album || "Unidentified sleeve";
            return (
              <button
                key={tile.id}
                type="button"
                data-index={index}
                className="album-card"
                aria-label={`${label}, ${tile.plays ? `${tile.plays} plays` : "no plays recorded"}`}
                onPointerEnter={(event) => anchorLabel(index, event.currentTarget)}
                onFocus={(event) => anchorLabel(index, event.currentTarget)}
                onBlur={() => setHovered(null)}
                onClick={() => setOpenIndex(index)}
              >
                <span className="album-card-face">
                  <AlbumArtImage id={tile.id} rung="wall" alt="" priority={index < 32} />
                  <span className="album-card-glare" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>

        {readout ? (
          <figcaption
            className="album-wall-label"
            style={{
              "--label-x": `${hovered.x}px`,
              "--label-y": `${hovered.top + hovered.height}px`
            }}
            aria-hidden="true"
          >
            <span className="album-wall-label-artist">{readout.artist || "Artist unknown"}</span>
            <span className="album-wall-label-album">{readout.album || "Unidentified"}</span>
            <span className="album-wall-label-plays">
              {(() => {
                const { value, unit } = playLabel(readout.plays, scrobblingSince);
                return value ? (
                  <>
                    {value} <span>{unit}</span>
                  </>
                ) : (
                  <span>{unit}</span>
                );
              })()}
            </span>
          </figcaption>
        ) : null}

        <p className="album-wall-note">
          {numberFormat.format(tiles.length)} albums, {printedCount} of them printed as cards. Counts are
          Last.fm scrobbles since {scrobblingSince ?? "April 2025"}, so a record at zero is one I have not
          played since then rather than one I have never played. Albums played only once are left off.
        </p>
      </section>

      {open ? (
        <div
          className="album-sleeve"
          role="dialog"
          aria-modal="true"
          aria-label={open.artist ? `${open.artist} — ${open.album}` : open.album || "Unidentified sleeve"}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpenIndex(null);
          }}
        >
          <div className="album-sleeve-inner">
            <button type="button" className="album-sleeve-close" onClick={() => setOpenIndex(null)} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>

            <div className="album-sleeve-art">
              <AlbumArtImage id={open.id} rung="card" alt="" priority />
            </div>

            <div className="album-sleeve-meta">
              <p className="album-sleeve-artist">{open.artist || "Artist unknown"}</p>
              <h2 className="album-sleeve-title">{open.album || "Unidentified"}</h2>
              {open.year ? <p className="album-sleeve-year">{open.year}</p> : null}

              <p className="album-sleeve-plays">
                {(() => {
                  const { value, unit } = playLabel(open.plays, scrobblingSince);
                  return value ? (
                    <>
                      <strong>{value}</strong> {unit}
                    </>
                  ) : (
                    unit
                  );
                })()}
              </p>

              {open.printed ? <p className="album-sleeve-printed">In the card wallet</p> : null}

              {open.lastfmUrl ? (
                <a className="album-sleeve-link" href={open.lastfmUrl} target="_blank" rel="noreferrer">
                  On Last.fm
                </a>
              ) : null}

              <div className="album-sleeve-steps">
                <button type="button" onClick={() => step(-1)} aria-label="Previous album">
                  ←
                </button>
                <span>
                  {numberFormat.format(openIndex + 1)} / {numberFormat.format(tiles.length)}
                </span>
                <button type="button" onClick={() => step(1)} aria-label="Next album">
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PageFooter />
    </>
  );
}

/*
 * The grid is auto-fill, so the column count is whatever the browser resolved
 * rather than anything the component chose. Reading it back is the only way for
 * ArrowUp/ArrowDown to land on the card directly above or below.
 */
function getColumnCount(grid) {
  if (!grid) return 1;
  const columns = window.getComputedStyle(grid).gridTemplateColumns;
  return columns ? columns.split(" ").filter(Boolean).length : 1;
}
