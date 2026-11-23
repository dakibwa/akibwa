"use client";

import { Fragment, PureComponent, createRef, startTransition, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ShelfTiles, firstCoverHint, initialRow, plays, recordLabel } from "./music-tiles.mjs";
import { flushSync } from "react-dom";
import catalogue from "@/.shelf-build/catalogue.json";
import { openCatalogue } from "./music-catalogue.mjs";
import { relatedLookup, search } from "./music-search.mjs";
import { ORDERS, arrange, listened, rowsFor, songLabel } from "./music-shelf.mjs";

// Albums and the records behind the top songs share one shelf. Sorting,
// searching and opening a track sheet all work in place.

/*
 * The width the shelf is laid out at. A room opening is laid out at once; a
 * resize waits until the window has been still for a moment, so the sleeves
 * are not sized again at every pixel, then they glide to their new sizes.
 */
const SETTLE = 80;

function useSettledWidth(ref, initial = 1100) {
  // Laid out for a laptop (or the given width) until it has been measured.
  const [width, setWidth] = useState(initial);
  const [measured, setMeasured] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const read = () => Math.floor(element.clientWidth);
    let last = read();
    if (last > 0) {
      setWidth(last);
      setMeasured(true);
    }
    let timer = 0;
    const observer = new ResizeObserver(() => {
      const next = read();
      if (next === last) return;
      const shown = last > 0;
      last = next;
      if (next <= 0) return;
      clearTimeout(timer);
      if (!shown) {
        setWidth(next);
        setMeasured(true);
        return;
      }
      timer = setTimeout(() => setWidth(read()), SETTLE);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [ref]);
  return [width, measured];
}

// Read the painted positions before React moves records between rows. This
// includes any in-flight transform, even if the next sort replaces the node.
function visibleTiles(list, animations = []) {
  const candidates = new Set();
  const height = window.innerHeight;
  for (const row of list.querySelectorAll(".music-row")) {
    const box = row.getBoundingClientRect();
    if (box.top >= height) break;
    if (box.bottom <= 0) continue;
    for (const tile of row.children) candidates.add(tile);
  }
  // A second sort can catch a moving cover outside its destination row.
  for (const animation of animations) candidates.add(animation.effect.target);
  const visible = new Map();
  for (const tile of candidates) {
    const box = tile.getBoundingClientRect();
    if (box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth) {
      visible.set(tile.dataset.key, { tile, box, opacity: Number(getComputedStyle(tile).opacity) });
    }
  }
  return visible;
}

function imageSettled(event) {
  delete event.target.dataset.loading;
}

// An older open tab can outlive the deployment that supplied its hashed
// artwork. The original album URL still serves that cover on the new site.
function imageFailed(event) {
  const image = event.target;
  imageSettled(event);
  if (image.tagName !== "IMG" || !image.currentSrc.includes("/_next/static/sleeves/")) return;
  for (const element of image.parentElement.children) {
    for (const name of ["srcset", "src"]) {
      const value = element.getAttribute(name);
      if (value?.includes("/_next/static/sleeves/")) {
        element.setAttribute(name, value.replace(/\/_next\/static\/sleeves\/[a-f0-9]+\//g, "/album-art/"));
      }
    }
  }
}

function markRelatedRow(row, matches) {
  for (const tile of row.children) {
    const related = matches?.has(tile.dataset.record ?? tile.dataset.key) ?? false;
    tile.classList.toggle("is-related", related);
  }
  row.toggleAttribute("data-inspecting", Boolean(matches));
}

class GlidingShelf extends PureComponent {
  list = createRef();
  animations = new Set();

  stop = () => {
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
  };

  componentDidMount() {
    this.props.tiles.arrange(this.list.current, this.props.arrangement);
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.motion.addEventListener("change", this.stop);
    this.ready = document.documentElement.classList.contains("ready");
    if (!this.ready) addEventListener("paperready", this.whenReady, { once: true });
    this.opening();
    this.watch();
  }

  whenReady = () => {
    this.ready = true;
    this.opening();
  };

  /*
   * The first screen lifts in once, a sleeve after its neighbour, when the
   * shelf has been measured and its type has arrived; before then it is not
   * shown at all, so nothing jumps.
   */
  opening = () => {
    const list = this.list.current;
    if (this.opened || !list || !this.props.measured || !this.ready) return;
    this.opened = true;
    if (this.motion.matches) return;
    const visible = visibleTiles(list);
    let index = 0;
    for (const { tile } of visible.values()) {
      tile.firstElementChild.animate(
        [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
        { duration: 620, delay: Math.min(index++ * 16, 520), easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }
      );
    }
  };

  // After the opening sequence, each newly visible row arrives together.
  revealed = new WeakSet();
  below = new WeakSet();

  watch = () => {
    if (!this.props.measured) return;
    const visible = this.props.tiles.visibleRows;
    visible.clear();
    const rows = this.list.current.querySelectorAll(".music-row");
    if (typeof IntersectionObserver === "undefined") {
      for (const row of rows) visible.add(row);
      return;
    }
    this.seer?.disconnect();
    this.seer = new IntersectionObserver(entries => {
      for (const { target: row, isIntersecting, boundingClientRect } of entries) {
        if (isIntersecting) {
          visible.add(row);
          if (this.below.has(row) && !this.revealed.has(row) && !this.motion.matches) row.dataset.arriving = "";
          this.revealed.add(row);
        } else {
          visible.delete(row);
          if (boundingClientRect.top >= window.innerHeight) this.below.add(row);
        }
      }
    });
    for (const row of rows) this.seer.observe(row);
  };

  getSnapshotBeforeUpdate(previous) {
    if (!this.opened || !previous.measured || previous.arrangement === this.props.arrangement || this.motion.matches) return null;
    return visibleTiles(this.list.current, this.animations);
  }

  componentDidUpdate(previous, state, before) {
    const { tiles, openTile, arrangement, measured } = this.props;
    if (openTile !== previous.openTile) tiles.select(previous.openTile, false);
    const changed = arrangement !== previous.arrangement;
    if (changed) tiles.arrange(this.list.current, arrangement);
    if (openTile !== previous.openTile || changed) tiles.select(openTile, true);
    if (!changed && measured === previous.measured) return;
    this.opening();
    this.watch();
    if (!before) return;
    this.stop();
    // All destination reads precede the first write. A cover coming from
    // another screen arrives locally instead of flying across the viewport.
    const after = visibleTiles(this.list.current);
    for (const [key, { tile, box }] of after) {
      const from = before.get(key);
      let transform = "translateY(6px) scale(0.985)";
      if (from) {
        const dx = from.box.left - box.left;
        const dy = from.box.top - box.top;
        const scale = from.box.width / box.width;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(scale - 1) < 0.005 && from.opacity === 1) continue;
        transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      }
      const animation = tile.animate(
        [{ transform, opacity: from?.opacity ?? 0 }, { transform: "none", opacity: 1 }],
        { duration: from ? 300 : 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
      );
      this.animations.add(animation);
      animation.onfinish = () => this.animations.delete(animation);
    }
  }

  componentWillUnmount() {
    this.motion.removeEventListener("change", this.stop);
    this.stop();
    this.seer?.disconnect();
    removeEventListener("paperready", this.whenReady);
  }

  render() {
    const { order, arrangement, reference, measured, onOpen, onPoint, openTile, tracks, tiles } = this.props;
    const firstRow = !measured && arrangement[0]?.rows[0];
    const first = firstRow?.entries?.[0]?.item;
    let drawn = 0;
    return (
      <div
        ref={this.list}
        onClick={event => {
          const face = event.target.closest(".music-face");
          const entry = face && tiles.records.get(face.parentElement.dataset.key);
          if (entry) onOpen(entry.item, face);
        }}
        onPointerOver={event => {
          if (event.pointerType === "touch") return;
          const face = event.target.closest(".music-face");
          if (!face || face.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) return;
          const entry = tiles.records.get(face.parentElement.dataset.key);
          if (entry) {
            prepareSheen(face, entry.item.record ?? entry.item.key);
            onPoint(entry.item, 45);
          }
        }}
        onPointerOut={event => {
          const face = event.target.closest(".music-face");
          if (event.pointerType === "touch" || !face || face.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) return;
          onPoint(event.relatedTarget?.closest?.(".music-shelf") ? undefined : null);
        }}
        onFocus={event => {
          const face = event.target.closest(".music-face:focus-visible");
          const entry = face && tiles.records.get(face.parentElement.dataset.key);
          if (entry) {
            prepareSheen(face, entry.item.record ?? entry.item.key);
            onPoint(entry.item);
          }
        }}
        onBlur={event => { if (event.target.closest(".music-face")) onPoint(null); }}
        onLoadCapture={imageSettled}
        onErrorCapture={imageFailed}
        data-measured={measured}
        className={`music-map is-by-${order}`}
        role="region"
        aria-label={`The records I play most, ${order === "hours" ? "most listened first" : order === "name" ? "a to z" : `by ${order}`}`}
      >
        {first?.art && <link rel="preload" {...firstCoverHint(first, firstRow.side)} />}
        {arrangement.length > 1 && arrangement[0].label && (
          <nav aria-label={`Jump to a ${order === "kind" ? "genre" : order === "name" ? "letter" : "year"}`}>
            <ul className="music-index">
              {arrangement.map((group, index) => (
                <li key={group.key}><button type="button" onClick={() => {
                  const heading = document.getElementById(`shelf-group-${index}`);
                  heading?.focus({ preventScroll: true });
                  heading?.scrollIntoView({ block: "start", behavior: this.motion.matches ? "instant" : "smooth" });
                }}>{group.label}</button></li>
              ))}
            </ul>
          </nav>
        )}
        {arrangement.map((group, groupIndex) => {
          return (
            <section key={group.key} className="music-group" id={`shelf-group-${groupIndex}`} tabIndex={-1} aria-label={group.label || undefined}>
              {group.label ? (
                <h2 className="music-group-head">
                  <span className="music-group-label">{group.label}</span>
                  <span className="music-group-figures">{group.figures}</span>
                </h2>
              ) : null}
              <div className="music-shelf">
                {group.rows.map((row, at) => {
                  const start = drawn;
                  drawn += row.entries.length;
                  const selected = openTile && row.entries.some(({ item }) => item.key === openTile) ? openTile : null;
                  return (
                    <Fragment key={at}>
                      <ShelfRow row={row} start={start} reference={reference} tiles={tiles} />
                      {selected ? tracks : null}
                    </Fragment>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  }
}

// The initial HTML also works with JavaScript disabled. Keep this prop stable:
// subsequent moves inside the row belong to ShelfTiles.
class ShelfRow extends PureComponent {
  html = { __html: this.props.tiles.ready ? "" : initialRow(this.props.row, this.props.reference, this.props.start) };

  render() {
    return <ol className="music-row" style={{ "--side": this.props.row.side }} dangerouslySetInnerHTML={this.html} />;
  }
}

// Each sleeve catches the light its own way: an angle, a speed and a side
// the gloss comes from, fixed by its record so it is the same every visit.
function prepareSheen(face, key) {
  if (face.hasAttribute("data-gloss")) return;
  face.dataset.gloss = "";
  const gloss = document.createElement("span");
  gloss.className = "music-gloss";
  gloss.setAttribute("aria-hidden", "true");
  face.append(gloss);
  let hash = 2166136261;
  for (let at = 0; at < key.length; at += 1) hash = Math.imul(hash ^ key.charCodeAt(at), 16777619);
  hash >>>= 0;
  const fromLeft = hash & 1;
  face.style.setProperty("--sheen-angle", `${96 + (hash >>> 1) % 44}deg`);
  face.style.setProperty("--sheen-time", `${(0.85 + ((hash >>> 7) % 7) * 0.1).toFixed(2)}s`);
  face.style.setProperty("--sheen-from", fromLeft ? "-80%" : "18.46154%");
  face.style.setProperty("--sheen-to", fromLeft ? "18.46154%" : "-80%");
  face.style.setProperty("--gloss-x", `${12 + (hash >>> 11) % 70}%`);
}

// One quiet caption at the shelf edge, shared by pointer and keyboard.
function Now({ say, order, kinds, hidden }) {
  const [{ item, visible }, setLabel] = useState({ item: null, visible: false });
  useEffect(() => {
    say.current = (next) => setLabel((last) => next
      ? { item: next, visible: true }
      : last.visible ? { ...last, visible: false } : last);
    return () => { say.current = null; };
  }, [say]);
  let main = "";
  let hours = "";
  let side = "";
  if (item) {
    main = recordLabel(item);
    hours = listened(item.allMinutes ?? item.minutes);
    const facts = [item.artist];
    if (order === "kind" && kinds) {
      const name = kinds.kinds?.[kinds.artists?.[item.artist]];
      if (name) facts.push(name);
    } else if (item.year) {
      facts.push(item.year);
    }
    side = facts.join(" · ");
  }
  // Nothing to say until something is pointed at (Dan, 16 November 2026:
  // “super minimalist and simple”).
  return (
    <output className="music-now" aria-live="off" aria-hidden={!visible || hidden} data-empty={!visible || hidden}>
      <strong>{main}</strong>
      <b className="music-now-hours">{hours}</b>
      <span>{side}</span>
    </output>
  );
}

function TrackLabel({ track }) {
  const [title, note] = track.label.split(/\s+(?=\((?:demo|live|early version|take \d+|\d{4} mix)\b[^()]*\)$|[-–—] (?:demo|live|early version|take \d+|\d{4} mix)\b.*$)/i, 2);
  const [amount, unit] = listened(track.minutes).split(" ");
  return (
    <>
      <span className="music-track-title" title={track.title}>
        {title}{note && <> <span className="music-track-sub">{note}</span></>}
      </span>
      <span className="music-track-hours"><strong>{amount}</strong> <small>{unit}</small><span className="visually-hidden"> listened, {plays(track.plays)}</span></span>
    </>
  );
}

// Tracks expand in place immediately after the selected shelf row.
function AlbumTracks({ album, onClose }) {
  const panel = useRef(null);
  const tracks = useMemo(() => {
    const sorted = album.tracks.map(([title, plays, minutes]) => ({ title, plays, minutes, label: songLabel(title) }))
      .sort((a, b) => b.minutes - a.minutes);
    const counts = new Map();
    for (const { label } of sorted) counts.set(label, (counts.get(label) ?? 0) + 1);
    // Keep the original credit when two recordings would share a label.
    for (const track of sorted) if (counts.get(track.label) > 1) track.label = track.title;
    return sorted;
  }, [album.tracks]);

  const list = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [foldAt, setFoldAt] = useState(Infinity);
  const count = tracks?.length ?? 0;
  const mostMinutes = tracks?.[0]?.minutes || 1;
  const limit = Math.min(count, foldAt);
  // A single's matching title and time are already in the header.
  const duplicate = count === 1 && tracks[0].label === recordLabel(album) && tracks[0].minutes === album.minutes;

  useLayoutEffect(() => {
    const element = list.current;
    if (!element || count <= 12) {
      setFoldAt(Infinity);
      return;
    }
    let alive = true;
    let width = 0;
    const measure = () => {
      if (!alive) return;
      element.dataset.measuring = "";
      const rows = [];
      let previousTop;
      for (const [index, song] of Array.from(element.children).entries()) {
        const top = song.offsetTop;
        if (top !== previousTop) rows.push(index);
        previousTop = top;
        if (rows.length > 12) break;
      }
      delete element.dataset.measuring;
      setFoldAt(rows.length > 12 ? rows[10] : Infinity);
      width = element.clientWidth;
    };
    measure();
    if (document.fonts.status === "loading") document.fonts.ready.then(measure);
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) measure();
    });
    observer.observe(element);
    return () => { alive = false; observer.disconnect(); };
  }, [tracks]);


  useLayoutEffect(() => {
    panel.current.focus({ preventScroll: true });
  }, [album.key]);

  useEffect(() => {
    const escape = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onClose();
      }
    };
    const outside = (event) => {
      if (!panel.current?.contains(event.target) && !event.target.closest(".music-face")) onClose(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("click", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("click", outside);
    };
  }, [onClose]);

  return (
    <section id="record-tracks" className="music-tracks" ref={panel} tabIndex={-1} aria-labelledby="music-tracks-title">
      <header className="music-release">
        <h2 id="music-tracks-title">{recordLabel(album)}</h2>
        <p className="music-release-info">
          <span className="music-release-by">{album.artist}</span>
          <span className="music-release-total"><b>{listened(album.minutes, "long")}</b> listened</span>
        </p>
      </header>
      <button type="button" className="music-tracks-close" onClick={() => onClose()} aria-label="Close the track list">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 3.5 9 9m0-9-9 9" /></svg>
      </button>
      {count > 0 && !duplicate && (
        <ol id="record-songs" ref={list} className="music-track-list" aria-label="Songs, most listened first">
          {tracks.map((track, index) => (
            <li key={index} hidden={!expanded && index >= limit} style={{ "--listening-share": track.minutes / mostMinutes }}>
              <TrackLabel track={track} />
            </li>
          ))}
        </ol>
      )}
      {limit < count && (
        <button type="button" className="music-tracks-more" aria-controls="record-songs" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Fewer songs" : `${count - limit} more songs`}
        </button>
      )}
      {count === 0 && (
        <div className="music-tracks-note" role="status">
          No individual song times are available for this record.
        </div>
      )}
    </section>
  );
}

export function MusicRoom({ active }) {
  const [index] = useState(() => openCatalogue(catalogue));
  const { entries: records, kinds, years } = index;
  // The orders answer at once; the shelf follows as a transition.
  const [pressedOrder, setPressedOrder] = useState("hours");
  const [order, setOrder] = useState("hours");
  // The year and a to z orders turn round when pressed again.
  const [reversed, setReversed] = useState({ year: false, name: false });
  // The shelf holds the albums, or the singles.
  const [singlesOn, setSinglesOn] = useState(false);
  const [query, setQuery] = useState("");
  const filter = useDeferredValue(query.trim());
  // On a phone the search waits behind its mark and slides out over the
  // orders (Dan, 16 November 2026), so everything fits in one row.
  const [finding, setFinding] = useState(false);
  const finder = useRef(null);
  const findButton = useRef(null);
  useEffect(() => {
    const shortcut = event => {
      if (event.key !== "/" || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
          event.target.closest?.("input, textarea, [contenteditable=true]")) return;
      event.preventDefault();
      flushSync(() => setFinding(true));
      finder.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const endSearch = () => {
    flushSync(() => {
      setQuery("");
      setFinding(false);
    });
    const target = findButton.current?.offsetWidth ? findButton.current : finder.current;
    target?.focus({ preventScroll: true });
  };
  // The record a sheet shows, by its key.
  const [open, setOpen] = useState(null);
  const opener = useRef(null);
  const map = useRef(null);
  useEffect(() => {
    if (!active) {
      setOpen(null);
      opener.current = null;
    } else if (!open) {
      // Return focus to the sleeve when the reader dismisses its details.
      const origin = opener.current;
      if (origin) {
        const button = origin.button.isConnected ? origin.button
          : map.current?.querySelector(`[data-key="${CSS.escape(origin.key)}"] .music-face`);
        button?.focus({ preventScroll: true });
      }
      opener.current = null;
    }
  }, [active, open]);
  const say = useRef(null);
  const [pointed, setPointed] = useState(null);
  const hoverTimer = useRef(0);
  useEffect(() => () => clearTimeout(hoverTimer.current), [active]);
  const onPoint = useCallback((item, delay = 0) => {
    clearTimeout(hoverTimer.current);
    if (item === undefined) return;
    const point = () => {
      say.current?.(item);
      setPointed(item?.record ?? item?.key ?? null);
    };
    if (delay) hoverTimer.current = setTimeout(point, delay);
    else point();
  }, []);
  const [width, measured] = useSettledWidth(map);
  const clearSelection = () => {
    opener.current = null;
    setOpen(null);
    onPoint(null);
  };
  // Choosing an order ends a search; while searching, the shelf is one
  // plain group, most listened first (Dan, 16 November 2026).
  const searching = Boolean(query.trim());
  const sort = (name) => {
    clearSelection();
    const turn = name === pressedOrder && !searching && name in reversed;
    setQuery("");
    setPressedOrder(name);
    startTransition(() => setOrder(name));
    if (turn) startTransition(() => setReversed((last) => ({ ...last, [name]: !last[name] })));
  };
  const shown = filter ? "hours" : order;
  // The albums, or the singles (Dan, 18 November 2026: "can we add a singles
  // menu button too"), or what the search finds among both.
  const entries = useMemo(() => {
    const found = search(index, filter);
    if (!found) return index.entries.filter((entry) => (entry.item.kind === "single") === singlesOn);
    const kept = new Set(found.map((record) => record.key));
    return index.entries.filter((entry) => kept.has(entry.item.key));
  }, [index, filter, singlesOn]);

  // Sizes come from the whole shelf, so a search or an order never rescales
  // them; each row's size comes from its records' hours (rowsFor in
  // music-shelf.mjs).
  const reference = records[Math.min(2, records.length - 1)]?.item.minutes || 1;
  const layouts = useMemo(() => {
    const cached = new Map();
    return (order, reverse) => {
      const key = `${order}:${reverse}`;
      if (!cached.has(key)) {
        const groups = arrange(order, entries, { years, kinds, reverse });
        cached.set(key, groups.map(group => ({
          ...group, rows: rowsFor(group.entries, width, group.reference ?? reference)
        })));
      }
      return cached.get(key);
    };
  }, [entries, width, reference, years, kinds]);
  const arrangement = layouts(shown, reversed[shown] ?? false);
  const [tiles] = useState(() => new ShelfTiles());

  // Reuse the rows around the viewport as the pointer moves. Newly visible
  // rows pick up the current selection before their artwork scrolls into view.
  const nearRows = useRef(new Set());
  const currentMatches = useRef(null);
  useLayoutEffect(() => {
    const near = nearRows.current;
    const rows = map.current.querySelectorAll(".music-row");
    const observe = typeof IntersectionObserver !== "undefined";
    const observer = observe && new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) {
          near.add(target);
          tiles.prepare(target);
        } else if (!near.delete(target)) continue;
        target.toggleAttribute("data-near", isIntersecting);
        markRelatedRow(target, isIntersecting ? currentMatches.current : null);
      }
    }, { rootMargin: "160px 0px" });
    for (const row of rows) {
      if (observer) observer.observe(row);
      else {
        near.add(row);
        row.dataset.near = "";
        tiles.prepare(row);
      }
    }
    return () => {
      if (observer) observer.disconnect();
      for (const row of near) {
        row.removeAttribute("data-near");
        markRelatedRow(row, null);
      }
      near.clear();
    };
  }, [arrangement, tiles]);

  const related = useMemo(() => relatedLookup(entries, kinds), [entries, kinds]);
  const highlight = open?.record ?? pointed;
  useLayoutEffect(() => {
    const visible = new Set();
    if (highlight && active) {
      for (const row of tiles.visibleRows) {
        for (const tile of row.children) visible.add(tile.dataset.record ?? tile.dataset.key);
      }
    }
    const matches = highlight && active ? related(highlight, visible) : null;
    matches?.add(highlight);
    currentMatches.current = matches;
    for (const row of nearRows.current) markRelatedRow(row, matches);
  }, [active, highlight, related, arrangement, tiles]);

  const onOpen = useCallback((item, button) => {
    clearTimeout(hoverTimer.current);
    say.current?.(null);
    opener.current = { button, key: item.key };
    // A year's square opens its record.
    const key = item.record ?? item.key;
    setPointed(key);
    setOpen((last) => last?.tile === item.key ? null : { tile: item.key, record: key });
  }, []);
  const record = open ? records.find((entry) => entry.item.key === open.record)?.item ?? null : null;

  const close = useCallback((restoreFocus = true) => {
    clearTimeout(hoverTimer.current);
    if (!restoreFocus) opener.current = null;
    say.current?.(null);
    setPointed(restoreFocus ? open?.record : null);
    setOpen(null);
  }, [open]);

  const tracks = useMemo(() => active && record ? (
    <AlbumTracks
      key={record.key}
      album={record}
      onClose={close}
    />
  ) : null, [active, record, close]);

  return (
    <div className="room-body music">
      <noscript><p className="music-tracks-note">Enable JavaScript to search music and open track lists.</p></noscript>
      <div className="music-bar">
        {/* The signature returns to the shelf as it opens (Dan, 16 November
            2026): no search, most listened first, at the top. */}
        <a
          className="music-sign"
          href="/"
          aria-label="Akibwa, back to the start"
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            sort("hours");
            setSinglesOn(false);
            setFinding(false);
            window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          }}
        >
          {/* The logo is Dan's drawing of himself (Dan, 18 November 2026: "the
              little character should be the logo"), redrawn in his own strokes,
              colours and hatched ground, cropped to his head, halo and record so
              it reads small, inside a thin gold border, the dark panel a perfect
              square with the halo and rays above it, the sheet in his hand a
              page of handwriting (Dan, 19 November 2026), with no wordmark
              beside it. */}
          <img className="music-mark" src="/akibwa-mark.svg?v=writing" alt="" width="42" height="52" draggable="false" />
        </a>
        <Now say={say} hidden={Boolean(open)} order={shown} kinds={kinds} />
        <div className="music-tools" data-finding={finding || Boolean(query)}>
          <div className="music-crate" role="group" aria-label="Albums or singles">
            <button type="button" className="music-albums" aria-pressed={!searching && !singlesOn} onClick={() => {
              clearSelection();
              setQuery("");
              startTransition(() => setSinglesOn(false));
            }}>Albums</button>
            <button
              type="button"
              className="music-singles"
              aria-label="Singles"
              aria-pressed={!searching && singlesOn}
              onClick={() => {
                clearSelection();
                setQuery("");
                startTransition(() => setSinglesOn((on) => !on));
              }}
            >
              Singles
            </button>
          </div>
          <div className="music-order" role="group" aria-label="Order">
            {ORDERS.map(([name, label]) => {
              const on = !searching && pressedOrder === name;
              const word = name === "name" && reversed.name ? "Z–A" : label;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  aria-label={name === "year" && on ? `year, ${reversed.year ? "oldest" : "newest"} first` : word}
                  onClick={() => sort(name)}
                >
                  {word}
                  {/* The year's way round: newest first, or oldest. */}
                  {name === "year" ? <span className="music-order-way" data-on={on} data-up={reversed.year} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="music-find"
            ref={findButton}
            aria-controls="record-search"
            aria-label="Search"
            aria-expanded={finding}
            onClick={() => {
              // Shown at once, so the phone's keyboard opens with the tap.
              flushSync(() => setFinding(true));
              finder.current?.focus();
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <circle cx="10.5" cy="10.5" r="6.2" />
              <path d="M15.2 15.4l5 5" />
            </svg>
          </button>
          <div
            id="record-search"
            role="search"
            className="music-search"
            onBlur={(event) => {
              // Leaving an empty search puts it away again.
              if (!query && !event.currentTarget.contains(event.relatedTarget)) setFinding(false);
            }}
          >
            <label htmlFor="record-query" className="music-search-mark">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                <circle cx="10.5" cy="10.5" r="6.2" />
                <path d="M15.2 15.4l5 5" />
              </svg>
            </label>
            <input
              ref={finder}
              id="record-query"
              type="search"
              name="search"
              value={query}
              onFocus={clearSelection}
              onChange={(event) => {
                clearSelection();
                setQuery(event.target.value);
                if (window.scrollY) window.scrollTo({ top: 0, behavior: "instant" });
              }}
              onKeyDown={(event) => {
                // Escape clears the search.
                if (event.key === "Escape" && (query || finding)) {
                  event.preventDefault();
                  event.stopPropagation();
                  endSearch();
                }
              }}
              placeholder="Search artists, genres, eras"
              aria-label="Search the records by artist, song, genre or era"
              autoComplete="off"
              spellCheck={false}
            />
            {!query && !finding && <kbd aria-hidden="true">/</kbd>}
            {query || finding ? (
              <button type="button" className="music-search-clear" onClick={endSearch} aria-label="Clear the search">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Measured here, around the shelf. */}
      <div className="music-map-frame" ref={map} onPointerLeave={() => onPoint(null)}>
        {filter && filter === query.trim() && (
          <div className="music-found" role="status">
            <q className="music-group-label">{filter}</q>
            <span className="music-group-figures">{entries.length ? `${entries.length} ${entries.length === 1 ? "record" : "records"} · ${listened(entries.reduce((sum, entry) => sum + entry.item.minutes, 0), "long")}` : "Nothing on the shelf"}</span>
          </div>
        )}
        <GlidingShelf tracks={tracks} openTile={open?.tile} arrangement={arrangement} measured={measured} order={shown} tiles={tiles} reference={reference} onOpen={onOpen} onPoint={onPoint} />
      </div>


    </div>
  );
}
