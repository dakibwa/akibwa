"use client";

import { Fragment, PureComponent, createRef, memo, startTransition, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlbumArtImage } from "../site-image";
import { flushSync } from "react-dom";
import { useMusicRanking } from "../use-music-ranking";
import { LARGE_ART } from "./music-art.mjs";
import { indexItems, relatedRecords, search } from "./music-search.mjs";
import { ORDERS, arrange, listened, mergeShelf, rowsFor, songTitle } from "./music-shelf.mjs";

// Albums and the records behind the top songs share one shelf. Sorting,
// searching and opening a track sheet all work in place.

// A public file the room fetches once it opens: the search's genres and
// years, the hours by year, the kinds, or where each album can be heard.
function useRoomFile(active, path) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  useEffect(() => {
    if (!active || data) return undefined;
    const controller = new AbortController();
    setFailed(false);
    fetch(path, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((packet) => { if (!controller.signal.aborted) setData(packet); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    window.addEventListener("online", retry);
    return () => {
      controller.abort();
      window.removeEventListener("online", retry);
    };
  }, [active, data, path, attempt, retry]);
  return { data, failed, retry };
}

// Where to hear it: the release found on each service, or a search there.
function listenLinks(found, artist, title) {
  const term = encodeURIComponent(`${artist} ${title}`);
  return [
    ["Spotify", found?.spotify ?? `https://open.spotify.com/search/${term}`],
    ["Apple Music", found?.apple ?? `https://music.apple.com/gb/search?term=${term}`]
  ];
}

// Paper tints for the songs, one to an artist.
const TINTS = ["#f6efdd", "#f1dcd4", "#dfe8ef", "#e3ead6", "#f4e3b8", "#e8dff0", "#f0d9c2", "#d9e6e0"];
const tintFor = (artist) => TINTS[[...artist].reduce((hash, letter) => (hash * 31 + letter.charCodeAt(0)) >>> 0, 7) % TINTS.length];

const plays = (count) => `${count.toLocaleString("en-GB")} ${count === 1 ? "play" : "plays"}`;

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
function visibleTiles(list) {
  const visible = new Map();
  for (const tile of list.querySelectorAll(".music-tile")) {
    const box = tile.getBoundingClientRect();
    if (box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth) {
      visible.set(tile.dataset.key, { tile, box, opacity: Number(getComputedStyle(tile).opacity) });
    }
  }
  return visible;
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
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.motion.addEventListener("change", this.stop);
    this.ready = document.documentElement.classList.contains("ready");
    if (!this.ready) addEventListener("paperready", this.whenReady, { once: true });
    this.opening();
    this.settle();
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
    const fold = window.innerHeight;
    let index = 0;
    for (const face of list.querySelectorAll(".music-face")) {
      const box = face.getBoundingClientRect();
      if (box.top >= fold) break;
      face.animate(
        [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
        { duration: 620, delay: Math.min(index++ * 16, 520), easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }
      );
    }
  };

  // Each cover fades in when it has arrived, rather than appearing in pieces.
  settle = () => {
    const list = this.list.current;
    if (!list) return;
    for (const image of list.querySelectorAll(".music-face img")) {
      if (image.complete || image.dataset.loading) continue;
      image.dataset.loading = "true";
      const done = () => delete image.dataset.loading;
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
    }
  };

  /*
   * The wall comes alive as it scrolls (Dan, 18 November 2026: "make the
   * wall feel more dynamic"): a row that comes into view lifts in, a sleeve
   * after its neighbour. Rows already on screen are left alone, so nothing
   * that has been seen ever blinks.
   */
  revealed = new WeakSet();

  watch = () => {
    const list = this.list.current;
    // Rows have no place of their own until the shelf has been measured.
    if (!list || !this.props.measured || this.motion.matches || typeof IntersectionObserver === "undefined") return;
    if (!this.seer) {
      this.seer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const row = entry.target;
          this.seer.unobserve(row);
          this.revealed.add(row);
          delete row.dataset.waiting;
          if (this.motion.matches) continue;
          row.querySelectorAll(".music-face").forEach((face, index) => {
            face.animate(
              [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }],
              { duration: 560, delay: Math.min(index, 14) * 32, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }
            );
          });
        }
      }, { rootMargin: "0px 0px -4% 0px" });
    }
    const fold = window.innerHeight;
    for (const row of list.querySelectorAll(".music-row")) {
      if (this.revealed.has(row) || row.dataset.waiting) continue;
      // Only a row still below the screen waits to be revealed.
      if (row.getBoundingClientRect().top < fold) {
        this.revealed.add(row);
        continue;
      }
      row.dataset.waiting = "true";
      this.seer.observe(row);
    }
  };

  getSnapshotBeforeUpdate(previous) {
    if (!previous.measured || previous.arrangement === this.props.arrangement || this.motion.matches) return null;
    return visibleTiles(this.list.current);
  }

  componentDidUpdate(previous, state, before) {
    if (previous.arrangement === this.props.arrangement && previous.count === this.props.count && previous.measured === this.props.measured) return;
    this.opening();
    this.settle();
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
    const { order, arrangement, count, reference, measured, onOpen, onPoint, openTile, tracks } = this.props;
    let drawn = 0;
    return (
      <div
        ref={this.list}
        data-measured={measured}
        className={`music-map is-by-${order}`}
        role="region"
        aria-label={`The records I play most, ${order === "hours" ? "most listened first" : order === "name" ? "a to z" : `by ${order}`}`}
      >
        {arrangement.map((group, groupIndex) => {
          const rows = group.rows.map((row) => ({ ...row, shown: row.entries.filter(() => drawn++ < count) })).filter((row) => row.shown.length);
          if (!rows.length) return null;
          return (
            <section key={group.key} className="music-group">
              {group.label ? (
                <h2 className="music-group-head">
                  <span>{group.label}</span>
                  <span className="music-group-figures">{group.figures}</span>
                </h2>
              ) : null}
              <div className="music-shelf">
                {rows.map((row, at) => (
                  <Fragment key={at}>
                    <ol className="music-row">
                      {row.shown.map(({ item }, position) => (
                        <Tile key={item.key} item={item} expanded={item.key === openTile} side={row.side} share={Math.min(1, Math.sqrt(item.minutes / reference))} priority={groupIndex === 0 && at === 0 && position === 0} onOpen={onOpen} onPoint={onPoint} />
                      ))}
                    </ol>
                    {openTile && row.shown.some(({ item }) => item.key === openTile) ? tracks : null}
                  </Fragment>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }
}

/*
 * The shelf is drawn in one pass, so the page holds every record before
 * scripting runs; a longer list would draw the rest a frame later.
 */
const FIRST = 1000;

function useProgressive(list) {
  const [shown, setShown] = useState({ list, count: Math.min(list.length, FIRST) });
  const current = shown.list === list ? shown : { list, count: Math.min(list.length, FIRST) };
  if (current !== shown) setShown(current);
  useEffect(() => {
    if (current.count >= list.length) return undefined;
    const frame = requestAnimationFrame(() => startTransition(() => setShown({ list, count: list.length })));
    return () => cancelAnimationFrame(frame);
  }, [list, current.count]);
  return current.count;
}

// Each sleeve catches the light its own way: an angle, a speed and a side
// the gloss comes from, fixed by its record so it is the same every visit.
function sheenFor(key) {
  let hash = 2166136261;
  for (let at = 0; at < key.length; at += 1) hash = Math.imul(hash ^ key.charCodeAt(at), 16777619);
  hash >>>= 0;
  const fromLeft = hash & 1;
  return {
    "--sheen-angle": `${96 + (hash >>> 1) % 44}deg`,
    "--sheen-time": `${(0.85 + ((hash >>> 7) % 7) * 0.1).toFixed(2)}s`,
    "--sheen-from": fromLeft ? "130%" : "-30%",
    "--sheen-to": fromLeft ? "-30%" : "130%",
    "--gloss-x": `${12 + (hash >>> 11) % 70}%`
  };
}

const Tile = memo(function Tile({ item, expanded, side, share, priority, onOpen, onPoint }) {
  const described = `${item.title}, ${item.artist}. ${listened(item.allMinutes ?? item.minutes)} listened, ${plays(item.plays)}.`;
  return (
    <li className="music-tile" data-key={item.key} data-record={item.record} style={{ "--side": side, "--share": share, "--tint": item.art ? undefined : tintFor(item.artist), ...sheenFor(item.record ?? item.key) }}>
      <button
        type="button"
        className="music-face"
        aria-expanded={expanded}
        aria-controls={expanded ? "record-tracks" : undefined}
        onClick={(event) => onOpen(item, event.currentTarget)}
        onPointerEnter={(event) => { if (event.pointerType !== "touch") onPoint(item, 45); }}
        onPointerLeave={(event) => {
          if (event.pointerType === "touch") return;
          // In a gutter cancel the pending hover and keep the last settled sleeve.
          if (event.relatedTarget?.closest?.(".music-shelf")) onPoint();
          else onPoint(null);
        }}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onPoint(item); }}
        onBlur={() => onPoint(null)}
        aria-label={`${described} ${item.kind === "single" ? "Show it" : "Show its tracks"}.`}
      >
        {item.art ? (
          <AlbumArtImage id={item.art} alt="" priority={priority} large={LARGE_ART[item.art]} sizes={`${Math.ceil(side)}px`} />
        ) : (
          <span className="music-type" aria-hidden="true">
            <b className="music-initial">{item.title.charAt(0)}</b>
            {side >= 96 ? <strong>{item.title}</strong> : null}
          </span>
        )}
      </button>
    </li>
  );
});

// One quiet caption at the shelf edge, shared by pointer and keyboard.
function Now({ say, order, kinds, meta, hidden }) {
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
    main = item.title;
    hours = listened(item.allMinutes ?? item.minutes);
    const facts = [item.artist];
    if (order === "kind" && kinds) {
      const name = kinds.kinds?.[kinds.artists?.[item.artist]];
      if (name) facts.push(name);
    } else if (item.year || meta?.years?.[item.art]) {
      facts.push(item.year || meta.years[item.art]);
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

// Tracks expand in place immediately after the selected shelf row.
function AlbumTracks({ album, links, loading, loadError, retry, onClose }) {
  const panel = useRef(null);
  const known = album.tracks ?? (loading || loadError ? null : album.fallback);
  const tracks = useMemo(() => known && [...known].sort((a, b) => b.minutes - a.minutes), [known]);

  const list = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [columns, setColumns] = useState(1);
  const count = tracks?.length ?? 0;
  const maxColumns = Math.max(1, Math.ceil(count / 3));
  const limit = count > 12 * columns ? 10 * columns : count;
  // A single's matching title and time are already in the header.
  const duplicate = count === 1 && songTitle(tracks[0].title) === album.title && tracks[0].minutes === album.minutes;

  useLayoutEffect(() => {
    const element = list.current;
    if (!element || count <= 12) return;
    const measure = () => {
      const style = getComputedStyle(element);
      const gap = parseFloat(style.columnGap);
      const width = parseFloat(style.columnWidth);
      setColumns(Math.max(1, Math.min(maxColumns, Math.floor((element.clientWidth + gap) / (width + gap)))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [count, maxColumns]);

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
        <h2 id="music-tracks-title">{album.title}</h2>
        <div className="music-release-meta">
          <p className="music-release-info">
            <span className="music-release-by">{album.artist}</span>
            <span className="music-release-total"><b>{listened(album.minutes, "long")}</b> listened</span>
          </p>
          <span className="music-listen">
            {links.map(([service, href]) => (
              <a key={service} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Listen on ${service} (opens in a new tab)`}>{service}</a>
            ))}
          </span>
        </div>
      </header>
      <button type="button" className="music-tracks-close" onClick={() => onClose()} aria-label="Close the track list">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 3.5 9 9m0-9-9 9" /></svg>
      </button>
      {count > 0 && !duplicate && (
        <ol id="record-songs" ref={list} className="music-track-list" aria-label="Songs, most listened first" style={{ "--song-columns": maxColumns }}>
          {(expanded ? tracks : tracks.slice(0, limit)).map((track, index) => (
            <li key={index}>
              <span className="music-track-title">{songTitle(track.title)}</span>
              <span className="music-track-hours"><strong>{listened(track.minutes)}</strong><span className="visually-hidden"> listened, {plays(track.plays)}</span></span>
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
          {loading ? "Fetching the tracks…" : "The tracks could not be loaded."}
          {loadError && !loading && <button type="button" className="chip" onClick={retry}>try again</button>}
        </div>
      )}
    </section>
  );
}

export function MusicRoom({ initial, active }) {
  const music = useMusicRanking(initial, active);
  const { data: meta } = useRoomFile(active, "/music-meta.json");
  const yearFile = useRoomFile(active, "/music-years.json");
  const kindFile = useRoomFile(active, "/music-kinds.json");
  const { data: links } = useRoomFile(active, "/music-links.json");
  const years = yearFile.data;
  const kinds = kindFile.data;
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
  const orderFile = shown === "year" ? yearFile : shown === "kind" ? kindFile : null;

  // One shelf of records, albums and the records his songs come from, the
  // most listened first (mergeShelf in music-shelf.mjs).
  const records = useMemo(
    () => mergeShelf(music.albums, music.songs, music.sleeves, music.singles).map((item) => ({ item })),
    [music.albums, music.songs, music.sleeves, music.singles]
  );
  const index = useMemo(
    () =>
      indexItems(records.map((entry) => entry.item), {
        meta,
        yearOf: (record) => Number(record.year) || meta?.years?.[record.art] || null,
        extraText: (record) => [...(record.tracks ?? []), ...(record.songs ?? [])].map((track) => track.title).join(" ")
      }),
    [records, meta]
  );
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
  const arrangement = useMemo(
    () => arrange(shown, entries, { years, kinds, reverse: reversed[shown] ?? false }).map((group) => ({ ...group, rows: rowsFor(group.entries, width, group.reference ?? reference) })),
    [entries, width, reference, shown, years, kinds, reversed]
  );
  const flat = useMemo(() => arrangement.flatMap((group) => group.entries), [arrangement]);
  const count = useProgressive(flat);

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
        if (isIntersecting) near.add(target);
        else if (!near.delete(target)) continue;
        markRelatedRow(target, isIntersecting ? currentMatches.current : null);
      }
    }, { rootMargin: "120px 0px" });
    for (const row of rows) {
      if (observer) observer.observe(row);
      else near.add(row);
    }
    return () => {
      if (observer) observer.disconnect();
      for (const row of near) markRelatedRow(row, null);
      near.clear();
    };
  }, [arrangement, count]);

  const highlight = open?.record ?? pointed;
  useLayoutEffect(() => {
    const visible = new Set();
    if (highlight && active) {
      for (const row of nearRows.current) {
        const box = row.getBoundingClientRect();
        if (box.bottom <= 0 || box.top >= innerHeight) continue;
        for (const tile of row.children) visible.add(tile.dataset.record ?? tile.dataset.key);
      }
    }
    const matches = highlight && active ? relatedRecords(entries, highlight, kinds, visible) : null;
    matches?.add(highlight);
    currentMatches.current = matches;
    for (const row of nearRows.current) markRelatedRow(row, matches);
  }, [active, highlight, entries, kinds, arrangement, count]);

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
      links={listenLinks(record.kind === "album" ? links?.albums?.[record.id] : null, record.artist, record.title)}
      loading={music.loading}
      loadError={music.loadError}
      retry={music.retry}
      onClose={close}
    />
  ) : null, [active, record, links, music.loading, music.loadError, music.retry, close]);

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
        <Now say={say} hidden={Boolean(open)} order={shown} kinds={kinds} meta={meta} />
        <div className="music-tools" data-finding={finding || Boolean(query)}>
          <div className="music-order" role="group" aria-label="Order">
            {ORDERS.map(([name, label]) => {
              const on = !searching && pressedOrder === name;
              const word = name === "name" && reversed.name ? "z–a" : label;
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
            <button
              type="button"
              className="music-singles"
              aria-label="singles"
              aria-pressed={!searching && singlesOn}
              onClick={() => {
                clearSelection();
                setQuery("");
                startTransition(() => setSinglesOn((on) => !on));
              }}
            >
              singles
            </button>
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
              placeholder="search"
              aria-label="Search the records by artist, song, genre or era"
              autoComplete="off"
              spellCheck={false}
            />
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

      {orderFile?.failed && (
        <div className="music-more">
          <p role="status">Couldn’t load the {shown} order.</p>
          <button type="button" className="chip" onClick={orderFile.retry}>try again</button>
        </div>
      )}

      {/* Measured here, around the shelf. */}
      <div className="music-map-frame" ref={map} onPointerLeave={() => onPoint(null)}>
        <GlidingShelf tracks={tracks} openTile={open?.tile} arrangement={arrangement} measured={measured} order={shown} count={count} reference={reference} onOpen={onOpen} onPoint={onPoint} />
      </div>

      {filter && filter === query.trim() && !entries.length ? <p className="music-none" role="status">Nothing matches.</p> : null}

      {music.loadError ? (
        <div className="music-more">
          <button type="button" className="chip" onClick={music.retry}>
            try loading again
          </button>
        </div>
      ) : null}


    </div>
  );
}
