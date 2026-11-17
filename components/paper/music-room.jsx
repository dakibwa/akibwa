"use client";

import { PureComponent, createRef, memo, startTransition, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlbumArtImage } from "../site-image";
import { flushSync } from "react-dom";
import { useMusicRanking } from "../use-music-ranking";
import { LARGE_ART } from "./music-art.mjs";
import { indexItems, search } from "./music-search.mjs";
import { ORDERS, arrange, listened, mergeShelf, peakOf, rowsFor, songTitle, trackMap, yearPairs } from "./music-shelf.mjs";

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
  }

  getSnapshotBeforeUpdate(previous) {
    if (!previous.measured || previous.arrangement === this.props.arrangement || this.motion.matches) return null;
    return visibleTiles(this.list.current);
  }

  componentDidUpdate(previous, state, before) {
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
const FIRST = 640;

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

const Tile = memo(function Tile({ item, side, share, priority, onOpen, onPoint }) {
  const described = `${item.title}, ${item.artist}. ${listened(item.minutes)} listened, ${plays(item.plays)}.`;
  return (
    <li className="music-tile" data-key={item.key} style={{ "--side": side, "--share": share, "--tint": item.art ? undefined : tintFor(item.artist) }}>
      <button
        type="button"
        className="music-face"
        onClick={(event) => onOpen(item, event.currentTarget)}
        onPointerEnter={(event) => { if (event.pointerType !== "touch") onPoint(item); }}
        onPointerLeave={() => onPoint(null)}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onPoint(item); }}
        onBlur={() => onPoint(null)}
        aria-label={`${described} ${item.kind === "album" ? "Show its tracks" : "Show it"}.`}
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
 * The bar's one line of words: whatever is under the pointer or the
 * keyboard, and nothing otherwise. It keeps its own state, so pointing at a sleeve
 * does not draw the shelf again.
 */
function Now({ say, order, years, kinds }) {
  const [{ item, visible }, setLabel] = useState({ item: null, visible: false });
  useEffect(() => {
    say.current = (next) => setLabel((last) => next
      ? { item: next, visible: true }
      : last.visible ? { ...last, visible: false } : last);
    return () => {
      say.current = null;
    };
  }, [say]);
  let main = "";
  let side = "";
  if (item) {
    main = item.title;
    const facts = [item.artist, `${listened(item.minutes)} listened`];
    if (order === "year" && years) {
      const peak = peakOf(yearPairs(item, years));
      if (peak) facts.push(`most in ${peak[0]}`);
    } else if (order === "kind" && kinds) {
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
    <output className="music-now" aria-live="off" aria-hidden={!visible} data-empty={!visible}>
      <strong>{main}</strong>
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
function Sheet({ cover, title, artist, byline, hours, count, links, label, onClose, children }) {
  const panel = useRef(null);
  useLayoutEffect(() => {
    const dialog = panel.current;
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
        <header className="music-tracks-head">
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
              <p className="music-tracks-totals">
                {hours}
                <span className="visually-hidden"> listened</span> · {count}
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
function AlbumTracks({ album, year, found, loading, loadError, retry, onClose }) {
  const frame = useRef(null);
  const [width] = useSettledWidth(frame, 550);
  // An album's own tracks, or once the ranking has loaded without them, the
  // songs of it among the top 1,000.
  const known = album.tracks ?? (loading || loadError ? null : album.fallback ?? null);
  const map = useMemo(() => trackMap(known ?? [], width), [known, width]);
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
                  key={track.title}
                  title={track.title}
                  className={tight ? "is-tight" : undefined}
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
    setQuery("");
    setPressedOrder(name);
    startTransition(() => setOrder(name));
  };
  const shown = filter ? "hours" : order;
  const orderFile = shown === "year" ? yearFile : shown === "kind" ? kindFile : null;

  // One shelf of records, albums and the records his songs come from, the
  // most listened first (mergeShelf in music-shelf.mjs).
  const records = useMemo(() => mergeShelf(music.albums, music.songs, music.sleeves).map((item) => ({ item })), [music.albums, music.songs, music.sleeves]);
  const index = useMemo(
    () =>
      indexItems(records.map((entry) => entry.item), {
        meta,
        yearOf: (record) => Number(record.year) || meta?.years?.[record.art] || null,
        extraText: (record) => [...(record.tracks ?? []), ...(record.songs ?? [])].map((track) => track.title).join(" ")
      }),
    [records, meta]
  );
  // All of the shelf, or what the search finds in it.
  const entries = useMemo(() => {
    const found = search(index, filter);
    if (!found) return records;
    const kept = new Set(found.map((record) => record.key));
    return records.filter((entry) => kept.has(entry.item.key));
  }, [records, index, filter]);

  // Sizes come from the whole shelf, so a search or an order never rescales
  // them; each row's size comes from its records' hours (rowsFor in
  // music-shelf.mjs).
  const reference = records[Math.min(2, records.length - 1)]?.item.minutes || 1;
  const arrangement = useMemo(
    () => arrange(shown, entries, { years, kinds }).map((group) => ({ ...group, rows: rowsFor(group.entries, width, reference) })),
    [entries, width, reference, shown, years, kinds]
  );
  const flat = useMemo(() => arrangement.flatMap((group) => group.entries), [arrangement]);
  const count = useProgressive(flat);

  const onOpen = useCallback((item, button) => {
    say.current?.(null);
    opener.current = { button, key: item.key };
    setOpen(item.key);
  }, []);
  const onPoint = useCallback((item) => say.current?.(item), []);
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
            setFinding(false);
            window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          }}
        >
          <svg viewBox="-2.7 -2.8 5.4 5.15" aria-hidden="true" focusable="false">
            <use href="/favicon.svg?v=flower#flower" />
          </svg>
          Akibwa
        </a>
        <Now say={say} order={shown} years={years} kinds={kinds} />
        <div className="music-tools" data-finding={finding || Boolean(query)}>
          <div className="music-order" role="group" aria-label="Order">
            {ORDERS.map(([name, label]) => (
              <button key={name} type="button" aria-pressed={!searching && pressedOrder === name} onClick={() => sort(name)}>
                {label}
              </button>
            ))}
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
        />
      ) : null}
    </div>
  );
}
