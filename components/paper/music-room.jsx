"use client";

import { PureComponent, createRef, memo, startTransition, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlbumArtImage } from "../site-image";
import { flushSync } from "react-dom";
import { useMusicRanking } from "../use-music-ranking";
import { LARGE_ART } from "./music-art.mjs";
import { indexItems, search } from "./music-search.mjs";
import { ORDERS, arrange, listened, mergeShelf, rowsFor, songTitle, trackMap } from "./music-shelf.mjs";

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
    const { order, arrangement, count, reference, measured, onOpen, onPoint } = this.props;
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
                  <ol key={at} className="music-row">
                    {row.shown.map(({ item }, position) => (
                      <Tile key={item.key} item={item} side={row.side} share={Math.min(1, Math.sqrt(item.minutes / reference))} priority={groupIndex === 0 && at === 0 && position === 0} onOpen={onOpen} onPoint={onPoint} />
                    ))}
                  </ol>
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

const Tile = memo(function Tile({ item, side, share, priority, onOpen, onPoint }) {
  const described = `${item.title}, ${item.artist}. ${listened(item.allMinutes ?? item.minutes)} listened, ${plays(item.plays)}.`;
  return (
    <li className="music-tile" data-key={item.key} style={{ "--side": side, "--share": share, "--tint": item.art ? undefined : tintFor(item.artist), ...sheenFor(item.record ?? item.key) }}>
      <button
        type="button"
        className="music-face"
        onClick={(event) => onOpen(item, event.currentTarget)}
        onPointerEnter={(event) => { if (event.pointerType !== "touch") onPoint(item); }}
        onPointerLeave={() => onPoint(null)}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onPoint(item, event.currentTarget.getBoundingClientRect()); }}
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

/*
 * What is under the pointer, in a small label that follows it a little
 * behind (Dan, 18 November 2026: "closer to where you are hovering"), or
 * under the sleeve the keyboard is on. It keeps its own state and moves by
 * transform alone, so pointing never draws the shelf again.
 */
const NEAR = 16;
function Now({ say, order, years, kinds, meta }) {
  const [{ item, visible }, setLabel] = useState({ item: null, visible: false });
  const box = useRef(null);
  const at = useRef({ x: 0, y: 0, tx: 0, ty: 0, px: null, py: null, anchor: null, frame: 0, jump: true });
  // Beside the pointer, or under the sleeve, turning back from the edges.
  const aim = useCallback(() => {
    const state = at.current;
    const label = box.current;
    if (!label) return;
    const width = label.offsetWidth;
    const height = label.offsetHeight;
    let x;
    let y;
    if (state.anchor) {
      x = state.anchor.left;
      y = state.anchor.bottom + 8;
      if (y + height > innerHeight - 8) y = state.anchor.top - height - 8;
    } else if (state.px !== null) {
      x = state.px + NEAR;
      y = state.py + NEAR + 4;
      if (x + width > innerWidth - 8) x = state.px - NEAR - width;
      if (y + height > innerHeight - 8) y = state.py - NEAR - height;
    } else {
      return;
    }
    state.tx = Math.max(8, Math.min(x, innerWidth - width - 8));
    state.ty = Math.max(8, y);
    const place = () => {
      label.style.transform = `translate3d(${Math.round(state.x)}px, ${Math.round(state.y)}px, 0)`;
    };
    if (state.jump) {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.x = state.tx;
      state.y = state.ty;
      state.jump = false;
      place();
      return;
    }
    if (state.frame) return;
    const glide = () => {
      const dx = state.tx - state.x;
      const dy = state.ty - state.y;
      if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) {
        state.x = state.tx;
        state.y = state.ty;
        state.frame = 0;
      } else {
        state.x += dx * 0.32;
        state.y += dy * 0.32;
        state.frame = requestAnimationFrame(glide);
      }
      place();
    };
    state.frame = requestAnimationFrame(glide);
  }, []);
  useEffect(() => {
    const state = at.current;
    const move = (event) => {
      if (event.pointerType === "touch") return;
      state.px = event.clientX;
      state.py = event.clientY;
      state.anchor = null;
      aim();
    };
    window.addEventListener("pointermove", move, { passive: true });
    say.current = (next, anchor = null) => setLabel((last) => {
      if (!next) return last.visible ? { ...last, visible: false } : last;
      state.anchor = anchor;
      // A label that appears starts where it is wanted, not where it was.
      if (!last.visible || anchor) state.jump = true;
      return { item: next, visible: true };
    });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(state.frame);
      state.frame = 0;
      say.current = null;
    };
  }, [say, aim]);
  // Its size changes with its words, so it is aimed once they are drawn.
  useLayoutEffect(() => {
    if (visible) aim();
  }, [item, visible, aim]);
  // The title with its total hours at the top right, then who and when, the
  // same in every order (Dan, 18 November 2026: "can the hours just go top
  // right and not have the word listened"; a year's own hours are not needed,
  // "it can just be total").
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
    <output className="music-now" ref={box} aria-live="off" aria-hidden={!visible} data-empty={!visible}>
      <strong>{main}</strong>
      <b className="music-now-hours">{hours}</b>
      <span>{side}</span>
    </output>
  );
}

// The colours the track bars take under the pointer, one after another: the
// cast's orange, periwinkle and raspberry among the rooms' inks.
const BARS = ["#fe7735", "#7d7afb", "#eb5772", "#2b5fb8", "#3f7634", "#e3a21a", "#24709f", "#a72d28"];

// The services' marks, drawn in the page's ink.
const SERVICE_MARKS = {
  Spotify: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm4.8 15.2a.65.65 0 0 1-.9.2c-2.5-1.5-5.6-1.9-9.3-1a.65.65 0 1 1-.3-1.3c4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9Zm1.3-2.9a.8.8 0 0 1-1.1.3c-2.8-1.7-7.2-2.3-10.6-1.2a.8.8 0 1 1-.5-1.6c3.9-1.2 8.7-.6 11.9 1.4.4.2.5.7.3 1.1Zm.1-3c-3.4-2-9-2.2-12.2-1.2a1 1 0 1 1-.6-1.9c3.7-1.1 9.9-.9 13.8 1.4a1 1 0 0 1-1 1.7Z" />
    </svg>
  ),
  "Apple Music": (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19 3.2v11.6a3 3 0 1 1-1.6-2.7V7.4l-8 1.8v7.9a3 3 0 1 1-1.6-2.7V6.6c0-.4.3-.8.7-.9l9.5-2.2c.5-.1 1 .2 1 .7Z" />
    </svg>
  )
};

// A sheet over the shelf, set as a mosaic like the shelf (Dan, 16 November
// 2026): the sleeve first at the top left, a card with everything about the
// record and the way out beside it, then the listens.
function Sheet({ cover, title, artist, byline, hours, count, links, label, onClose, head, from, children }) {
  const panel = useRef(null);
  useLayoutEffect(() => {
    const dialog = panel.current;
    // Opened from a sleeve, the view transition grows that sleeve into the
    // sheet's cover (Dan, 18 November 2026: "grow out into the middle").
    if (from?.grow) dialog.dataset.grow = "true";
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const dismiss = () => {
    const dialog = panel.current;
    if (!dialog?.open || dialog.dataset.closing) return;
    dialog.dataset.closing = "true";
    const transitions = dialog.querySelector(".music-tracks-sheet").getAnimations();
    Promise.allSettled(transitions.map((effect) => effect.finished)).then(() => {
      if (dialog.open) onClose();
    });
  };

  return (
    <dialog
      className="music-tracks"
      ref={panel}
      aria-labelledby="music-tracks-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === panel.current) dismiss();
      }}
    >
      <div className="music-tracks-sheet">
        <header className="music-tracks-head" ref={head}>
          <span className="music-tracks-cover">
            {cover ? <AlbumArtImage id={cover} alt="" large={LARGE_ART[cover]} sizes="200px" /> : <span className="music-blank" style={{ "--tint": tintFor(artist) }} aria-hidden="true">{title.charAt(0)}</span>}
          </span>
          <div className="music-tracks-card">
            <button type="button" className="music-tracks-close" onClick={dismiss} aria-label={label}>
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
            <h2 id="music-tracks-title">{title}</h2>
            <p className="music-tracks-artist">{byline}</p>
            <div className="music-tracks-foot">
              <p className="music-listen">
                {links.map(([service, href]) => (
                  <a key={service} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Listen on ${service}`} title={service}>
                    {SERVICE_MARKS[service]}
                  </a>
                ))}
              </p>
              {/* Hours and plays keep together, and part only on a narrow sheet. */}
              <p className="music-tracks-totals">
                <span>{hours}<span className="visually-hidden"> listened</span></span> · <span>{count}</span>
              </p>
            </div>
          </div>
        </header>
        {children}
      </div>
    </dialog>
  );
}

/*
 * A record's tracks share out the sheet by how much each was listened to,
 * as the shelf does (trackMap in music-shelf.mjs): soft tints, the name and
 * hours inside, a deeper tint under the pointer.
 */
// The room under a sheet's head, so the whole sheet fits the screen.
function useRoomUnder(head) {
  const [room, setRoom] = useState(Infinity);
  useLayoutEffect(() => {
    const top = head.current;
    if (!top) return undefined;
    const read = () => {
      const screen = window.visualViewport?.height ?? window.innerHeight;
      // The sheet's own height limit, less its padding, edge and the gap under its head.
      setRoom(Math.max(160, Math.floor(Math.min(screen * 0.88, 900) - top.offsetHeight - 16)));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(top);
    window.addEventListener("resize", read);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [head]);
  return room;
}

function AlbumTracks({ album, year, found, loading, loadError, retry, onClose, from }) {
  const frame = useRef(null);
  const head = useRef(null);
  const [width] = useSettledWidth(frame, 550);
  const room = useRoomUnder(head);
  // An album's own tracks, or once the ranking has loaded without them, the
  // songs of it among the top 1,000.
  const known = album.tracks ?? (loading || loadError ? null : album.fallback ?? null);
  const map = useMemo(() => trackMap(known ?? [], width, room), [known, width, room]);
  return (
    <Sheet
      cover={album.id}
      title={album.title}
      artist={album.artist}
      byline={`${album.artist}${year ? ` · ${year}` : ""}`}
      hours={listened(album.minutes)}
      count={plays(album.plays)}
      links={listenLinks(found, album.artist, album.title)}
      label="Close the track list"
      onClose={onClose}
      head={head}
      from={from}
    >
      <div className="music-track-frame" ref={frame}>
        {known ? (
          <ol className="music-track-list" style={{ height: map.height }}>
            {map.cells.map(({ track, x, y, w, h }, index) => {
              const size = Math.max(12, Math.min(24, Math.min(w, h * 1.8) * 0.085));
              const lines = Math.floor((h - 34) / (size * 1.15));
              // A box too short for the name above its hours sets both on one line.
              const tight = lines < 1;
              return (
                <li
                  key={track.rest ? "rest" : track.title}
                  title={track.rest ? track.rest.map(songTitle).join(", ") : track.title}
                  className={[tight ? "is-tight" : "", track.rest ? "is-rest" : ""].join(" ").trim() || undefined}
                  style={{
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    "--size": `${(tight ? Math.min(size, 14) : size).toFixed(1)}px`,
                    "--lines": Math.max(1, lines),
                    "--pad": `${Math.round(Math.max(6, Math.min(11, w * 0.09)))}px`,
                    "--bar": BARS[index % BARS.length]
                  }}
                >
                  <span className="music-track-title">{songTitle(track.title)}</span>
                  <span className="music-track-hours">
                    {listened(track.minutes)}
                    <span className="visually-hidden">, {plays(track.plays)}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="music-tracks-note">
            <p role="status">{loading ? "Fetching the tracks…" : "The tracks could not be loaded."}</p>
            {loadError && !loading ? <button type="button" className="chip" onClick={retry}>try loading again</button> : null}
          </div>
        )}
      </div>
    </Sheet>
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
      // Wait until the modal has been removed and the shelf accepts focus.
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
  const [width, measured] = useSettledWidth(map);
  // Choosing an order ends a search; while searching, the shelf is one
  // plain group, most listened first (Dan, 16 November 2026).
  const searching = Boolean(query.trim());
  const sort = (name) => {
    say.current?.(null);
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
    if (!found) return records.filter((entry) => (entry.item.kind === "single") === singlesOn);
    const kept = new Set(found.map((record) => record.key));
    return records.filter((entry) => kept.has(entry.item.key));
  }, [records, index, filter, singlesOn]);

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

  const launch = useRef(null);
  const onOpen = useCallback((item, button) => {
    say.current?.(null);
    opener.current = { button, key: item.key };
    // A year's square opens its record.
    const key = item.record ?? item.key;
    // The browser morphs the sleeve into the sheet's cover where it can;
    // elsewhere the sheet simply fades in.
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      launch.current = { grow: true };
      button.style.viewTransitionName = "record-sleeve";
      document.startViewTransition(() => {
        button.style.viewTransitionName = "";
        flushSync(() => setOpen(key));
      });
    } else {
      launch.current = null;
      setOpen(key);
    }
  }, []);
  const onPoint = useCallback((item, anchor) => say.current?.(item, anchor), []);
  const record = open ? records.find((entry) => entry.item.key === open)?.item ?? null : null;

  const close = () => {
    setOpen(null);
  };

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
          {/* The logo is Dan's drawing of himself, traced as he drew it (Dan,
              18 November 2026: "the little character should be the logo"),
              with no wordmark beside it. */}
          <img className="music-mark" src="/akibwa-mark.svg?v=drawing" alt="" width="34" height="40" draggable="false" />
        </a>
        <Now say={say} order={shown} years={years} kinds={kinds} meta={meta} />
        <div className="music-tools" data-finding={finding || Boolean(query)}>
          <div className="music-order" role="group" aria-label="Order">
            {ORDERS.map(([name, label]) => {
              const on = !searching && pressedOrder === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  aria-label={name === "year" && on ? `year, ${reversed.year ? "oldest" : "newest"} first` : undefined}
                  onClick={() => sort(name)}
                >
                  {name === "name" && reversed.name ? "z–a" : label}
                  {/* The year's way round: newest first, or oldest. */}
                  {name === "year" ? <span className="music-order-way" data-on={on} data-up={reversed.year} aria-hidden="true" /> : null}
                </button>
              );
            })}
            <button
              type="button"
              className="music-singles"
              aria-pressed={!searching && singlesOn}
              onClick={() => {
                say.current?.(null);
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
              onChange={(event) => {
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
      <div className="music-map-frame" ref={map} onPointerLeave={() => say.current?.(null)}>
        <GlidingShelf arrangement={arrangement} measured={measured} order={shown} count={count} reference={reference} onOpen={onOpen} onPoint={onPoint} />
      </div>

      {filter && filter === query.trim() && !entries.length ? <p className="music-none" role="status">Nothing matches.</p> : null}

      {music.loadError ? (
        <div className="music-more">
          <button type="button" className="chip" onClick={music.retry}>
            try loading again
          </button>
        </div>
      ) : null}

      {active && record ? (
        <AlbumTracks
          album={record}
          year={record.year || meta?.years?.[record.art] || null}
          found={record.kind === "album" ? links?.albums?.[record.id] : null}
          loading={music.loading}
          loadError={music.loadError}
          retry={music.retry}
          onClose={close}
          from={launch.current}
        />
      ) : null}
    </div>
  );
}
