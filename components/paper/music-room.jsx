"use client";

import { Fragment, PureComponent, createRef, startTransition, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ShelfTiles, firstCoverHint, initialRow, plays, recordLabel } from "./music-tiles.mjs";
import { flushSync } from "react-dom";
import catalogue from "@/.shelf-build/catalogue.json";
import { openCatalogue } from "./music-catalogue.mjs";
import { relatedLookup, search } from "./music-search.mjs";
import { GAP, ORDERS, arrange, listened, rowsFor, songLabel } from "./music-shelf.mjs";

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
    // The whole pixels it really has: a width of 780.6px is 780, where
    // clientWidth says 781 and a row laid out for that would not fit.
    const read = () => Math.floor(element.getBoundingClientRect().width);
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
    this.list.current.addEventListener("scroll", this.lineScrolled, { capture: true, passive: true });
    this.markLines();
    document.fonts?.ready.then(this.markLines);
  }

  // A heading keeps to one line, and its name stays put. Where the other
  // groups do not all fit beside the figures on any heading, every heading
  // says its hours alone (`data-fit="brief"`), so the headings match. Where
  // they still do not fit (`data-fit="scroll"`), they scroll sideways in the
  // room that is left and fade at the edge they run past (markMore, with the
  // song names it also serves).
  markLines = () => {
    const list = this.list.current;
    if (!list) return;
    const lines = [...list.querySelectorAll(".music-group-line")];
    const lists = lines.map(line => line.querySelector(".music-group-others"));
    const over = () => lines.some((line, at) => line.firstElementChild.offsetWidth > line.clientWidth
      || (lists[at] && lists[at].scrollWidth > lists[at].clientWidth + 1));
    list.removeAttribute("data-fit");
    if (over()) {
      list.setAttribute("data-fit", "brief");
      if (over()) list.setAttribute("data-fit", "scroll");
    }
    for (const others of lists) if (others) markMore(others);
  };
  lineScrolled = (event) => {
    if (event.target.classList?.contains("music-group-others")) markMore(event.target);
  };

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
    // The page's own script has already lifted the first screen in, before
    // this code arrived (app/page.jsx).
    if (this.motion.matches || window.__shelfOpening) return;
    const visible = visibleTiles(list);
    let index = 0;
    for (const { tile } of visible.values()) {
      tile.firstElementChild.animate(
        [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
        { duration: 620, delay: Math.min(index++ * 16, 520), easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }
      );
    }
  };

  /*
   * A new order turns the page (Dan, 25 November 2026: "rather than stuff
   * flashing in and stuff when you click the release date nd listen date can
   * we make it more beautiful"). The room has faded the shelf out and put
   * the new order in its place, unseen. Once the first screen's covers have
   * arrived, or after a moment if they are slow, its headings fade in and
   * its sleeves lift in as they do when the page opens: each row from its
   * left, one row after another down the screen.
   */
  turning = null;
  turn = () => {
    const list = this.list.current;
    const turning = (this.turning = {});
    this.stop();
    const inView = (element) => {
      const box = element.getBoundingClientRect();
      return box.bottom > 0 && box.top < window.innerHeight;
    };
    const reveal = () => {
      if (this.turning !== turning) return;
      this.turning = null;
      if (!this.motion.matches) {
        for (const heading of list.querySelectorAll(".music-group-top, .music-group-head.is-part")) {
          if (inView(heading)) heading.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 460, easing: "ease-out" });
        }
        const arriving = [...visibleTiles(list).values()];
        const rows = [...new Set(arriving.map(({ box }) => Math.round(box.top)))].sort((a, b) => a - b);
        for (const { tile, box } of arriving) {
          const delay = Math.min(rows.indexOf(Math.round(box.top)) * 50, 450) + (box.left / window.innerWidth) * 110;
          tile.firstElementChild.animate(
            [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
            { duration: 520, delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }
          );
        }
      }
      this.props.onTurned();
    };
    // Two frames on, the rows near the screen have been given their covers.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.turning !== turning) return;
      const arrivals = [];
      for (const { tile } of visibleTiles(list).values()) {
        const image = tile.querySelector("img");
        if (image && !image.complete) {
          arrivals.push(new Promise((done) => {
            image.addEventListener("load", done, { once: true });
            image.addEventListener("error", done, { once: true });
          }));
        }
      }
      Promise.race([Promise.all(arrivals), new Promise((done) => setTimeout(done, 360))]).then(reveal);
    }));
  };

  /*
   * A jump to a group far down the shelf turns the page too (Dan, 25
   * November 2026, of the jump to Undated: "it lagged when i CLICK Undated
   * and it went to the bottom fix this"). Scrolling there smoothly dragged
   * every row between through the screen, loading and drawing hundreds of
   * covers on the way. Now the shelf fades out, is put at the group at once,
   * and lifts in there. A group within a screen and a half still scrolls.
   */
  jumping = 0;
  jump = (group) => {
    if (!group) return;
    group.focus({ preventScroll: true });
    const near = Math.abs(group.getBoundingClientRect().top) < window.innerHeight * 1.5;
    if (this.motion.matches || near) {
      group.scrollIntoView({ block: "start", behavior: this.motion.matches ? "instant" : "smooth" });
      return;
    }
    this.props.onVeil();
    clearTimeout(this.jumping);
    this.jumping = setTimeout(() => {
      group.scrollIntoView({ block: "start", behavior: "instant" });
      this.turn();
    }, 150);
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
    // Where the rows and headings stand before a sheet opens, moves, changes
    // or closes, and the sheet as it was. The room reads this once the shelf
    // has updated, to hold the sleeve in hand still and carry everything
    // else smoothly to how it now is.
    const { before, tracks, arrangement } = this.props;
    before.current = null;
    if (this.opened && previous.tracks !== tracks && previous.arrangement === arrangement) {
      const list = this.list.current;
      const places = new Map();
      for (const element of list.querySelectorAll(".music-row[data-near], .music-group-top, .music-group-head.is-part")) {
        places.set(element, element.getBoundingClientRect().top);
      }
      const panel = list.querySelector(".music-tracks");
      before.current = {
        places,
        sheet: panel && {
          box: panel.getBoundingClientRect(),
          copy: this.motion.matches ? null : panel.cloneNode(true),
          upper: panel.previousElementSibling,
          lower: panel.nextElementSibling
        }
      };
    }
    // A new order does not glide: it turns the page (turn, below).
    if (!this.opened || !previous.measured || previous.arrangement === arrangement || this.motion.matches || this.props.veiled) return null;
    return visibleTiles(this.list.current, this.animations);
  }

  componentDidUpdate(previous, state, before) {
    const { tiles, pinnedTile, arrangement, measured } = this.props;
    if (pinnedTile !== previous.pinnedTile) tiles.select(previous.pinnedTile, false);
    const changed = arrangement !== previous.arrangement;
    if (changed) tiles.arrange(this.list.current, arrangement);
    if (pinnedTile !== previous.pinnedTile || changed) tiles.select(pinnedTile, true);
    if (!changed && measured === previous.measured) return;
    this.markLines();
    this.opening();
    this.watch();
    if (changed && this.props.veiled) this.turn();
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
    this.list.current?.removeEventListener("scroll", this.lineScrolled, { capture: true });
    clearTimeout(this.jumping);
    removeEventListener("paperready", this.whenReady);
  }

  /*
   * The shelf answers the pointer only when the pointer itself moves. A
   * sleeve that scrolls or slides under a resting pointer is left alone
   * until it does, so reading down the shelf never throws a sheet open.
   * `resting` (shared with the room, which sets it when it puts a sheet
   * away) says the sleeve under the pointer is waiting for that move.
   * Leaving a sleeve keeps its sheet: only leaving the shelf puts it away.
   */
  pointerX = NaN;
  pointerY = NaN;
  // What last pressed the shelf: a mouse stays on the sleeve it pressed.
  pressedBy = "";

  over(face, pointer) {
    const entry = this.props.tiles.records.get(face.parentElement.dataset.key);
    if (!entry) return;
    prepareSheen(face, entry.item.record ?? entry.item.key);
    this.props.onPoint(entry.item, face, pointer);
  }

  render() {
    const { order, arrangement, reference, measured, onOpen, onPoint, shownTile, above, tracks, tiles } = this.props;
    const firstRow = !measured && arrangement[0]?.rows[0];
    const first = firstRow?.entries?.[0]?.item;
    // The groups a heading can go to: every genre, decade or year, each by
    // the first of its sections.
    const stops = arrangement.map((group, index) => [group, index]).filter(([group]) => group.label && (!group.within || group.head));
    let drawn = 0;
    return (
      <div
        ref={this.list}
        onPointerDown={event => {
          this.pressedBy = event.pointerType;
          // A press says where the pointer is as well as a move does.
          this.pointerX = event.clientX;
          this.pointerY = event.clientY;
        }}
        onClick={event => {
          const face = event.target.closest(".music-face");
          const entry = face && tiles.records.get(face.parentElement.dataset.key);
          if (entry) onOpen(entry.item, face, event.detail > 0 && this.pressedBy === "mouse");
        }}
        onPointerMove={event => {
          if (event.pointerType === "touch") return;
          const still = this.pointerX === event.clientX && this.pointerY === event.clientY;
          this.pointerX = event.clientX;
          this.pointerY = event.clientY;
          if (!this.props.resting.current || still) return;
          this.props.resting.current = false;
          const face = event.target.closest?.(".music-face");
          if (face) this.over(face, true);
        }}
        onPointerOver={event => {
          if (event.pointerType === "touch") return;
          const face = event.target.closest(".music-face");
          if (!face || face.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) return;
          this.props.resting.current = this.pointerX === event.clientX && this.pointerY === event.clientY;
          if (!this.props.resting.current) this.over(face, true);
        }}
        onPointerOut={event => {
          const face = event.target.closest(".music-face");
          if (event.pointerType === "touch" || !face || face.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) return;
          this.props.resting.current = false;
          onPoint(undefined);
        }}
        onFocus={event => {
          const face = event.target.closest(".music-face:focus-visible");
          if (face) this.over(face, false);
        }}
        onBlur={event => { if (event.target.closest(".music-face")) onPoint(null); }}
        onLoadCapture={imageSettled}
        onErrorCapture={imageFailed}
        data-measured={measured}
        data-veiled={this.props.veiled || undefined}
        className={`music-map is-by-${order}`}
        role="region"
        aria-label={`The records I play most, ${{ hours: "most listened first", kind: "by genre", released: "by release date", year: "by listen date" }[order]}`}
      >
        {first?.art && <link rel="preload" {...firstCoverHint(first, firstRow.side)} />}
        {arrangement.map((group, groupIndex) => {
          // A group's heading: its genre's when it is the first of a
          // genre's sub-genres, its own otherwise, and none for a later
          // sub-genre, which stands under its smaller heading alone.
          const top = group.head ?? (group.within || !group.label ? null : group);
          // The first heading's words are the page's one landmark for going
          // about the shelf; under the other headings the same words are a
          // plain group, so a screen reader's list of landmarks stays short.
          const Others = stops[0]?.[0] === group ? "nav" : "div";
          return (
            <section key={group.key} className={`music-group${group.within && !group.head ? " is-part" : ""}`} id={`shelf-group-${groupIndex}`} tabIndex={-1} aria-label={group.label || undefined}>
              {/* One line does the heading's work and the jumps' (Dan, 25
                  November 2026: "is the genre bar placed somewhere better
                  that fit's with the more minimalist theme?"): the group's
                  tab and what it holds, then the other groups as quiet
                  words to go to. With more of them than there is room
                  for, they scroll sideways and the tab stays where it is. */}
              {top ? (
                <div className="music-group-top">
                  <div className="music-group-line">
                    <h2 className="music-group-head">
                      <span className="music-group-label">{top.label}</span>
                      <span className="music-group-figures">
                        <span className="music-group-full">{top.figures}</span>
                        <span className="music-group-brief">{top.brief}</span>
                      </span>
                    </h2>
                    {stops.length > 1 ? (
                      <Others className="music-group-others" role={Others === "div" ? "group" : undefined} aria-label={`Go to another ${order === "kind" ? "genre" : order === "released" ? "decade" : "year"}`}>
                        <ul className="music-index">
                          {stops.map(([other, index]) => (other === group ? null : (
                            <li key={other.key}><button type="button" onClick={() => this.jump(document.getElementById(`shelf-group-${index}`))}>{other.head?.label ?? other.label}</button></li>
                          )))}
                        </ul>
                      </Others>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {group.within && group.label ? (
                <h3 className="music-group-head is-part">
                  <span className="music-group-label">{group.label}</span>
                  <span className="music-group-figures">{group.figures}</span>
                </h3>
              ) : null}
              <div className="music-shelf">
                {group.rows.map((row, at) => {
                  const start = drawn;
                  drawn += row.entries.length;
                  // The sheet stands in the shelf straight after its sleeve's row,
                  // or straight before it when the screen has no room beneath.
                  const selected = shownTile && row.entries.some(({ item }) => item.key === shownTile);
                  return (
                    <Fragment key={at}>
                      {selected && above ? tracks : null}
                      <ShelfRow row={row} start={start} reference={reference} tiles={tiles} />
                      {selected && !above ? tracks : null}
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

/*
 * A song's name keeps to one line (Dan, 25 November 2026, of names that took
 * three: "allow it to scroll for these long ones"). A name longer than its
 * line fades at the edge it runs past, and the line scrolls sideways: under a
 * finger or a trackpad by itself, and by these under a mouse or a tap.
 */
// Which way a name has more to show: its end, its start or both.
function markMore(name) {
  const room = name.scrollWidth - name.clientWidth;
  const more = room <= 1 ? "" : name.scrollLeft <= 1 ? "end" : name.scrollLeft >= room - 1 ? "start" : "both";
  if (more) name.dataset.more = more;
  else delete name.dataset.more;
}

// Names being carried along their lines, each with the way to stop it.
const glides = new WeakMap();
const stopGlide = (name) => glides.get(name)?.();

// Carry a name to its end at a reading pace, or back to its start in a breath.
function glide(name, toEnd, wait = 0) {
  stopGlide(name);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let frame = 0;
  const timer = setTimeout(() => {
    const from = name.scrollLeft;
    const distance = (toEnd ? name.scrollWidth - name.clientWidth : 0) - from;
    if (Math.abs(distance) < 1) {
      glides.delete(name);
      return;
    }
    const time = toEnd ? Math.abs(distance) / 70 * 1000 : Math.min(520, 180 + Math.abs(distance));
    const began = performance.now();
    const step = (now) => {
      const part = Math.min(1, (now - began) / time);
      name.scrollLeft = from + distance * (toEnd ? part : 1 - (1 - part) ** 3);
      if (part < 1) frame = requestAnimationFrame(step);
      else glides.delete(name);
    };
    frame = requestAnimationFrame(step);
  }, wait);
  glides.set(name, () => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    glides.delete(name);
  });
}

const nameIn = (event) => event.target.closest?.("li")?.querySelector(".music-track-title") ?? null;

// A record's songs, most listened first, each under the name it goes by.
const songs = new WeakMap();
function songsOf(album) {
  let sorted = songs.get(album);
  if (!sorted) {
    sorted = album.tracks.map(([title, plays, minutes]) => ({ title, plays, minutes, label: songLabel(title) }))
      .sort((a, b) => b.minutes - a.minutes);
    const counts = new Map();
    for (const { label } of sorted) counts.set(label, (counts.get(label) ?? 0) + 1);
    // Keep the original credit when two recordings would share a label.
    for (const track of sorted) if (counts.get(track.label) > 1) track.label = track.title;
    songs.set(album, sorted);
  }
  return sorted;
}

// What a song's line says: its name, the note that tells two recordings
// apart (set quietly after the name, without its dash or brackets), and its
// time as an amount and a unit.
function lineOf(track) {
  const [title, note] = track.label.split(/\s+(?=\((?:demo|live|early version|take \d+|\d{4} mix)\b[^()]*\)$|[-–—] (?:demo|live|early version|take \d+|\d{4} mix)\b.*$)/i, 2);
  const [amount, unit] = listened(track.minutes).split(" ");
  return { title, mark: note?.replace(/^[-–—]\s*/, "").replace(/^\((.*)\)$/, "$1"), amount, unit };
}

/*
 * How many columns a record's songs stand in. Most records take the shelf's
 * own count, wide enough for most names: one on a phone, five at most (298
 * is a column of 270px and its 28px gap). A record whose songs all fit on
 * one line, each name in full with room to spare, stands on that one line,
 * however many columns it takes (Dan, 25 November 2026, of seven short names
 * on two lines: "can't this fit on one line comfortably?").
 */
// The narrowest a column on such a line may be, and the room a name keeps
// from its time beyond the line's own gap.
const LINE_COLUMN = 132;
const LINE_SLACK = 8;
const oneLines = new WeakMap();
function columnsFor(album, width, frame) {
  const usual = Math.max(1, Math.min(5, Math.floor(width / 298)));
  const count = album?.tracks.length ?? 0;
  // One line already, or more songs than any line this wide could hold.
  if (count <= usual || count > Math.floor(width / LINE_COLUMN) || !frame?.isConnected) return usual;
  let line = oneLines.get(album);
  if (line?.width !== width) {
    const { room, gap, widest } = songWidths(album, frame);
    const column = Math.max(LINE_COLUMN, widest + LINE_SLACK);
    line = { width, fits: count * column + (count - 1) * gap <= room };
    oneLines.set(album, line);
  }
  return line.fits ? count : usual;
}

// The room a sheet's songs have, the gap between its columns and the longest
// line among its songs, name to time. They are read from a copy of the songs
// set in the frame for a moment, unseen, each on a line of its own length
// (`.music-tracks-probe`), so the sheet's own styles give the answer. Its
// lines are built as TrackLabel builds them; keep the two alike.
function songWidths(album, frame) {
  const make = (tag, name, ...inside) => {
    const element = document.createElement(tag);
    if (name) element.className = name;
    element.append(...inside);
    return element;
  };
  const column = make("ol", "", ...songsOf(album).map((track) => {
    const { title, mark, amount, unit } = lineOf(track);
    return make("li", "",
      make("span", "music-track-title", title, ...(mark ? [" ", make("span", "music-track-sub", mark)] : [])),
      make("span", "music-track-hours", make("strong", "", amount), " ", make("small", "", unit)));
  }));
  const list = make("div", "music-track-list", column);
  const probe = make("div", "music-tracks music-tracks-probe", list);
  frame.append(probe);
  const room = list.clientWidth;
  const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
  let widest = 0;
  for (const line of column.children) widest = Math.max(widest, line.getBoundingClientRect().width);
  probe.remove();
  return { room, gap, widest };
}

function TrackLabel({ track }) {
  const { title, mark, amount, unit } = lineOf(track);
  return (
    <>
      <span className="music-track-title" title={track.title} tabIndex={-1}>
        {title}{mark && <> <span className="music-track-sub">{mark}</span></>}
      </span>
      <span className="music-track-hours"><strong>{amount}</strong> <small>{unit}</small><span className="visually-hidden"> listened, {plays(track.plays)}</span></span>
    </>
  );
}

/*
 * What a record's sheet says (Dan, 25 November 2026: "there must be a better
 * clean way of showing this information"): its name, who made it, when, and
 * how long and how often it has been played; then its songs, most listened
 * first, as a ledger in columns that read down. Each song stands on a ruled
 * line, and the line is drawn heavier for as far as its hours reach against
 * the record's favourite. Every column is the same width, so the lines can
 * be compared across the sheet, and every name keeps to its one line.
 */
function TrackSheet({ album, columns, pinned, onClose }) {
  const tracks = songsOf(album);
  const [expanded, setExpanded] = useState(false);
  const count = tracks.length;
  const mostMinutes = tracks[0]?.minutes || 1;
  // A single's matching title and time are already in the header.
  const duplicate = count === 1 && tracks[0].label === recordLabel(album) && tracks[0].minutes === album.minutes;
  // One column, as on a phone, folds above twelve songs to ten. Wider, the
  // sheet keeps six rows, or a seventh rather than a button for a few songs.
  const full = columns === 1 ? 10 : columns * 6;
  const folds = count > full + (columns === 1 ? 2 : columns);
  const limit = folds && !expanded ? full : count;
  const each = Math.ceil(limit / columns);
  const stacks = [];
  for (let at = 0; at < limit; at += each) stacks.push(tracks.slice(at, Math.min(limit, at + each)));

  // Find the names longer than their lines, again whenever the lines change
  // width, and keep each one's fade to the edge it runs past as it scrolls.
  const list = useRef(null);
  const pressedBy = useRef("");
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return undefined;
    const names = () => element.querySelectorAll(".music-track-title");
    const read = () => names().forEach(markMore);
    const scrolled = (event) => {
      if (event.target.classList?.contains("music-track-title")) markMore(event.target);
    };
    read();
    element.addEventListener("scroll", scrolled, { capture: true, passive: true });
    const observer = new ResizeObserver(read);
    observer.observe(element);
    let alive = true;
    document.fonts?.ready.then(() => alive && read());
    return () => {
      alive = false;
      observer.disconnect();
      element.removeEventListener("scroll", scrolled, { capture: true });
      names().forEach(stopGlide);
    };
  }, [limit, columns]);

  return (
    <div className="music-sheet">
      <header className="music-release">
        <h2 id="music-tracks-title">{recordLabel(album)}</h2>
        <p className="music-release-info">
          <span className="music-release-by">{album.artist}</span>
          {album.year ? <span>{album.year}</span> : null}
          {/* How long and how often keep together when the line wraps. */}
          <span className="music-release-total"><b>{listened(album.minutes, "long")}</b><span className="music-release-plays">{plays(album.plays)}</span></span>
        </p>
      </header>
      <button type="button" className="music-tracks-close" onClick={() => onClose()} aria-label="Close the track list" tabIndex={pinned ? undefined : -1}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 3.5 9 9m0-9-9 9" /></svg>
      </button>
      {count > 0 && !duplicate && (
        <div
          id="record-songs"
          ref={list}
          className="music-track-list"
          role="group"
          aria-label="Songs, most listened first"
          style={{ "--columns": columns }}
          // A finger, a wheel or a trackpad takes a name over from its glide.
          onPointerDown={(event) => {
            pressedBy.current = event.pointerType;
            const name = nameIn(event);
            if (name) stopGlide(name);
          }}
          onWheel={(event) => {
            const name = nameIn(event);
            if (name) stopGlide(name);
          }}
          // A mouse cannot swipe: resting on a song carries its name along,
          // and leaving brings it back.
          onPointerOver={(event) => {
            const row = event.pointerType === "mouse" ? event.target.closest("li") : null;
            if (!row || row.contains(event.relatedTarget)) return;
            const name = row.querySelector(".music-track-title");
            if (name.dataset.more) glide(name, true, 260);
          }}
          onPointerOut={(event) => {
            const row = event.pointerType === "mouse" ? event.target.closest("li") : null;
            if (!row || row.contains(event.relatedTarget)) return;
            glide(row.querySelector(".music-track-title"), false);
          }}
          // A tap carries it to its end, and another back.
          onClick={(event) => {
            const name = pressedBy.current === "mouse" ? null : nameIn(event);
            if (name?.dataset.more) glide(name, name.scrollLeft < (name.scrollWidth - name.clientWidth) / 2);
          }}
        >
          {stacks.map((stack, column) => (
            <ol key={column} start={column * each + 1}>
              {stack.map((track, index) => (
                <li key={index} style={{ "--listening-share": track.minutes / mostMinutes }}>
                  <TrackLabel track={track} />
                </li>
              ))}
            </ol>
          ))}
        </div>
      )}
      {folds && (
        <button type="button" className="music-tracks-more" aria-controls="record-songs" aria-expanded={expanded} tabIndex={pinned ? undefined : -1} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Fewer songs" : `${count - full} more songs`}
        </button>
      )}
      {count === 0 && (
        <div className="music-tracks-note" role="status">
          No individual song times are available for this record.
        </div>
      )}
    </div>
  );
}

/*
 * The sheet's panel, in the shelf beside its sleeve's row, where the rows
 * make room for it (Dan, 25 November 2026: "rather than it appearing over
 * can it push the albums below it down"). The pointer or the keyboard on a
 * sleeve opens it, and it goes again when they leave the shelf. A press
 * keeps it open until it is closed. One panel does both, so pressing changes
 * nothing the reader is looking at.
 */
function AlbumTracks({ album, tile, pinned, above, columns, onClose }) {
  const panel = useRef(null);
  useLayoutEffect(() => {
    if (pinned) panel.current.focus({ preventScroll: true });
  }, [pinned, album.key]);

  useEffect(() => {
    if (!pinned) return undefined;
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
  }, [pinned, onClose]);

  return (
    <section
      id={pinned ? "record-tracks" : "record-glance"}
      className="music-tracks"
      ref={panel}
      data-tile={tile}
      data-pinned={pinned}
      data-above={above || undefined}
      tabIndex={pinned ? -1 : undefined}
      aria-labelledby="music-tracks-title"
    >
      <TrackSheet key={album.key} album={album} columns={columns} pinned={pinned} onClose={onClose} />
    </section>
  );
}

export function MusicRoom({ active }) {
  const [index] = useState(() => openCatalogue(catalogue));
  const { entries: records, kinds, years } = index;
  const byKey = useMemo(() => new Map(records.map((entry) => [entry.item.key, entry.item])), [records]);
  const [tiles] = useState(() => new ShelfTiles());
  // The orders answer at once; the shelf follows as a transition.
  const [pressedOrder, setPressedOrder] = useState("hours");
  const [order, setOrder] = useState("hours");
  // The two orders by date turn round when pressed again.
  const [reversed, setReversed] = useState({ released: false, year: false });
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
  // The sheet a press has set into the shelf: its sleeve's tile and its record.
  const [open, setOpen] = useState(null);
  const opener = useRef(null);
  const map = useRef(null);
  const bar = useRef(null);
  // Focus the page puts back on a sleeve is not the reader pointing at it.
  const quiet = useRef(false);
  // A sheet put away under a resting pointer waits for the pointer to move.
  const resting = useRef(false);
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
        quiet.current = true;
        button?.focus({ preventScroll: true });
        quiet.current = false;
      }
      opener.current = null;
    }
  }, [active, open]);
  /*
   * The sleeve under the pointer or the keyboard: its tile, its record and
   * the side of its row its sheet opens on. The sheet stays until the sleeve
   * is pressed or the shelf is left (Dan, 25 November 2026: "rather than
   * clicking when you hover it should show the stats below it? and the name
   * etc").
   */
  const [pointed, setPointed] = useState(null);
  const pointedNow = useRef(null);
  pointedNow.current = pointed;
  const hoverTimer = useRef(0);
  const leaveTimer = useRef(0);
  // The sleeve the pointer has reached and is being given a moment on.
  const awaited = useRef(null);
  useEffect(() => () => {
    clearTimeout(hoverTimer.current);
    clearTimeout(leaveTimer.current);
  }, [active]);
  const widthNow = useRef(0);
  /*
   * Which side of its row a sheet opens on. The first opens under its row.
   * After that the sheet keeps to the gap the pointer has just crossed: over
   * the row when the pointer came down to it, under it when the pointer came
   * up. Moving to the next row then moves nothing, the sheet only turns to
   * point at the new sleeve, and it is never in the pointer's way. Either
   * way it takes the other side when the screen has room for it only there.
   */
  const standsAbove = (face, row, last, record) => {
    // Near enough how tall its sheet will stand: its header, its rows of
    // songs and the fold's button.
    const count = record?.tracks.length ?? 0;
    const across = columnsFor(record, widthNow.current, map.current);
    const full = across === 1 ? 10 : across * 6;
    const folds = count > full + (across === 1 ? 2 : across);
    const rows = count < 2 ? 0 : Math.ceil((folds ? full : count) / across);
    const needs = 62 + (rows ? 8 + rows * 33 : 0) + (folds ? 44 : 0) + GAP + 12;
    const box = face.getBoundingClientRect();
    const beneath = innerHeight - box.bottom >= needs;
    const over = box.top - (bar.current?.getBoundingClientRect().bottom ?? 0) >= needs;
    const cameDown = Boolean(last && last.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING);
    return cameDown ? over || !beneath : over && !beneath;
  };
  const onPoint = useCallback((item, face, byPointer) => {
    if (item && byPointer && awaited.current === item.key) return;
    clearTimeout(hoverTimer.current);
    awaited.current = null;
    if (item === undefined || quiet.current) return;
    if (!item) {
      // Out of the shelf for a moment is not gone; after that it closes.
      clearTimeout(leaveTimer.current);
      leaveTimer.current = setTimeout(() => setPointed(null), 120);
      return;
    }
    const rowOf = (tile) => tiles.records.get(tile)?.tile.parentElement ?? null;
    const show = () => {
      awaited.current = null;
      clearTimeout(leaveTimer.current);
      const last = pointedNow.current;
      if (last?.tile === item.key) return;
      // Along a row the sheet keeps the side it opened on.
      const row = face.parentElement.parentElement;
      const from = last ? rowOf(last.tile) : null;
      const record = item.record ?? item.key;
      setPointed({ tile: item.key, record, up: from === row ? last.up : standsAbove(face, row, from, byKey.get(record)) });
    };
    if (!byPointer) {
      show();
      return;
    }
    // A first glance waits for the pointer to settle. Along a row the sheet
    // follows at once, and a new row waits a little longer, so a pointer
    // crossing the shelf does not pull the rows about behind it.
    const last = pointedNow.current;
    const row = last ? rowOf(last.tile) : null;
    awaited.current = item.key;
    hoverTimer.current = setTimeout(show, !row ? 110 : row === face.parentElement.parentElement ? 50 : 120);
  }, [tiles, byKey]);
  const [width, measured] = useSettledWidth(map);
  const clearSelection = () => {
    opener.current = null;
    resting.current = true;
    awaited.current = null;
    clearTimeout(hoverTimer.current);
    clearTimeout(leaveTimer.current);
    setOpen(null);
    setPointed(null);
  };
  // Choosing an order ends a search; while searching, the shelf is one
  // plain group, most listened first (Dan, 16 November 2026).
  const searching = Boolean(query.trim());
  /*
   * A new order turns the page. The chosen word answers at once; the shelf
   * fades out, goes back to its top, takes the new order unseen, and lifts
   * in when its covers are ready (GlidingShelf.turn). The same order pressed
   * again changes nothing, and a reader who wants no motion gets the new
   * order at once.
   */
  const [veiled, setVeiled] = useState(false);
  const turnTimer = useRef(0);
  const veilTimer = useRef(0);
  useEffect(() => () => {
    clearTimeout(turnTimer.current);
    clearTimeout(veilTimer.current);
  }, []);
  const onTurned = useCallback(() => {
    clearTimeout(veilTimer.current);
    setVeiled(false);
  }, []);
  // The shelf fades out for a jump, which lifts it in again where it lands.
  const onVeil = useCallback(() => {
    setVeiled(true);
    clearTimeout(veilTimer.current);
    // Should the lift somehow never come, the shelf is not left unseen.
    veilTimer.current = setTimeout(() => setVeiled(false), 1500);
  }, []);
  const sort = (name) => {
    clearSelection();
    const turn = name === pressedOrder && !searching && name in reversed;
    const changes = searching || turn || name !== pressedOrder;
    setPressedOrder(name);
    const apply = () => {
      setQuery("");
      startTransition(() => setOrder(name));
      if (turn) startTransition(() => setReversed((last) => ({ ...last, [name]: !last[name] })));
    };
    if (!changes || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }
    setVeiled(true);
    clearTimeout(turnTimer.current);
    clearTimeout(veilTimer.current);
    turnTimer.current = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      apply();
    }, 150);
    // Should the new order somehow never arrive, the shelf is not left unseen.
    veilTimer.current = setTimeout(() => setVeiled(false), 1500);
  };
  const view = filter ? "hours" : order;
  // Albums and singles share the one shelf (Dan, 25 November 2026: "I do
  // think singles and albums should be combined"), or what the search finds.
  const entries = useMemo(() => {
    const found = search(index, filter);
    if (!found) return index.entries;
    const kept = new Set(found.map((record) => record.key));
    return index.entries.filter((entry) => kept.has(entry.item.key));
  }, [index, filter]);

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
  const arrangement = layouts(view, reversed[view] ?? false);

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

  // The sheet shown: the one pressed into the shelf, or else the one under
  // the pointer. The sleeves round it keep their light for either.
  const shown = open ?? pointed;
  const pinned = Boolean(open);
  const related = useMemo(() => relatedLookup(entries, kinds), [entries, kinds]);
  const highlight = (open ?? pointed)?.record ?? null;
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

  const onOpen = useCallback((item, button, hovering) => {
    awaited.current = null;
    clearTimeout(hoverTimer.current);
    clearTimeout(leaveTimer.current);
    opener.current = { button, key: item.key };
    // A year's square opens its record. A sheet already open for this
    // sleeve keeps its side of the row.
    const glanced = pointedNow.current?.tile === item.key ? pointedNow.current : null;
    const next = { tile: item.key, record: item.record ?? item.key, up: Boolean(glanced?.up) };
    // A mouse is still on the sleeve it pressed, so pressing again leaves
    // the sheet open under the pointer. A finger or a key leaves nothing.
    setPointed(hovering ? next : null);
    setOpen((last) => last?.tile === item.key ? null : next);
  }, []);

  const close = useCallback((restoreFocus = true) => {
    awaited.current = null;
    clearTimeout(hoverTimer.current);
    clearTimeout(leaveTimer.current);
    if (!restoreFocus) opener.current = null;
    resting.current = true;
    setPointed(null);
    setOpen(null);
  }, []);

  widthNow.current = width;
  const record = shown ? byKey.get(shown.record) ?? null : null;
  // The sheet's songs stand in the shelf's columns, or on one line where
  // they all fit on it (columnsFor).
  const columns = columnsFor(record, width, map.current);
  const shownTile = record ? shown.tile : undefined;
  const above = Boolean(record && shown.up);
  const tracks = useMemo(() => active && record ? (
    <AlbumTracks album={record} tile={shownTile} pinned={pinned} above={above} columns={columns} onClose={close} />
  ) : null, [active, record, shownTile, pinned, above, columns, close]);

  // The sheet's notch points at its sleeve.
  const place = useCallback(() => {
    const frame = map.current;
    const panel = frame?.querySelector(".music-tracks:not(.music-tracks-ghost)");
    const tile = panel && tiles.records.get(panel.dataset.tile)?.tile;
    if (!tile?.isConnected) return;
    const box = frame.getBoundingClientRect();
    const at = tile.getBoundingClientRect();
    panel.style.setProperty("--notch", `${Math.round(Math.max(20, Math.min(box.width - 20, at.left + at.width / 2 - box.left)))}px`);
    // The notch glides along a row, but a new sheet starts with it in place.
    if (!panel.hasAttribute("data-glide")) requestAnimationFrame(() => panel.setAttribute("data-glide", ""));
  }, [tiles]);
  /*
   * A sheet that opens, moves, changes or closes does it in one smooth move
   * (Dan, 25 November 2026: "can it feel much smoother too"). The shelf has
   * noted in `before` where every row and heading stood and how the sheet
   * looked. Then, all at one pace:
   * - the sleeve in hand is held where it is, the page scrolling by as much
   *   as the change would have carried it;
   * - every row and heading slides from where it stood to where it belongs;
   * - the sheet is uncovered edge by edge as the rows beside it draw back;
   * - and the sheet as it was fades out over the new one, or closes between
   *   its rows as they come together.
   */
  const before = useRef(null);
  const moving = useRef(new Set());
  const held = useRef(null);
  const arranged = useRef(arrangement);
  useLayoutEffect(() => {
    place();
    const was = before.current;
    before.current = null;
    if (arranged.current !== arrangement) {
      arranged.current = arrangement;
      held.current = null;
      // Sleeves glide to a new width's rows; the sheet finds its own again
      // once they have landed.
      const settled = setTimeout(place, 340);
      return () => clearTimeout(settled);
    }
    const frame = map.current;
    const tile = shownTile ? tiles.records.get(shownTile)?.tile : null;
    const row = tile?.isConnected ? tile.parentElement : held.current;
    held.current = tile?.isConnected ? tile.parentElement : null;
    if (!was) return undefined;
    for (const motion of moving.current) motion.cancel();
    moving.current.clear();
    for (const ghost of frame.querySelectorAll(".music-tracks-ghost")) ghost.remove();
    const stood = row?.isConnected ? was.places.get(row) : undefined;
    if (stood !== undefined) {
      const carried = row.getBoundingClientRect().top - stood;
      if (Math.abs(carried) >= 1) window.scrollBy({ top: carried, behavior: "instant" });
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const pace = { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
    const play = (element, frames, options = pace) => {
      const motion = element.animate(frames, options);
      moving.current.add(motion);
      motion.onfinish = motion.oncancel = () => moving.current.delete(motion);
      return motion;
    };
    // How far down each row or heading has gone (up is negative).
    const gone = new Map();
    for (const [element, top] of was.places) {
      if (!element.isConnected) continue;
      const down = element.getBoundingClientRect().top - top;
      gone.set(element, down);
      if (Math.abs(down) >= 1) play(element, [{ transform: `translateY(${-down}px)` }, { transform: "none" }]);
    }
    const went = (element) => (element && gone.has(element) ? gone.get(element) : null);
    const clip = (over, under) => `inset(${over}px 0px ${under}px 0px round 8px)`;
    const clear = clip(-10, -10);

    const panel = frame.querySelector(".music-tracks:not(.music-tracks-ghost)");
    const old = was.sheet;
    const sameGap = Boolean(old && panel && old.upper === panel.previousElementSibling && old.lower === panel.nextElementSibling);
    const same = sameGap && old.copy?.dataset.tile === panel.dataset.tile && Math.abs(old.box.height - panel.offsetHeight) < 1;

    // The sheet as it now is: uncovered as far as the rows beside it have
    // drawn back, the edge by its own sleeve staying where it is.
    if (panel && !same) {
      const height = panel.offsetHeight;
      const room = sameGap ? Math.max(0, height - old.box.height) : height + GAP;
      const above = went(panel.previousElementSibling);
      const below = went(panel.nextElementSibling);
      let over = above === null ? null : Math.max(0, -above);
      let under = below === null ? null : Math.max(0, below);
      if (over === null && under === null) {
        over = panel.hasAttribute("data-above") ? room : 0;
        under = room - over;
      } else if (over === null) over = Math.max(0, room - under);
      else if (under === null) under = Math.max(0, room - over);
      if (over >= 1 || under >= 1) play(panel, [{ clipPath: clip(over >= 1 ? over : -10, under >= 1 ? under : -10) }, { clipPath: clear }]);
    }

    // The sheet as it was: a copy of it, where it stood, over everything.
    if (old?.copy && !same) {
      const ghost = old.copy;
      const box = frame.getBoundingClientRect();
      ghost.removeAttribute("id");
      for (const named of ghost.querySelectorAll("[id]")) named.removeAttribute("id");
      ghost.classList.add("music-tracks-ghost");
      ghost.inert = true;
      ghost.setAttribute("aria-hidden", "true");
      Object.assign(ghost.style, {
        left: `${old.box.left - box.left}px`,
        top: `${old.box.top - box.top}px`,
        width: `${old.box.width}px`,
        height: `${old.box.height}px`
      });
      frame.append(ghost);
      const over = Math.max(0, went(old.upper) ?? 0);
      const under = Math.max(0, -(went(old.lower) ?? 0));
      const closing = play(ghost, [{ clipPath: clear }, { clipPath: clip(over, under) }]);
      closing.onfinish = () => {
        moving.current.delete(closing);
        ghost.remove();
      };
      play(ghost, [{ opacity: 1 }, { opacity: 0 }], { duration: panel && sameGap ? 200 : 260, easing: "ease-out", fill: "forwards" });
    }
    return undefined;
  }, [place, tracks, arrangement, shownTile, tiles]);

  return (
    <div className="room-body music">
      <noscript><p className="music-tracks-note">Enable JavaScript to search music and open track lists.</p></noscript>
      <div className="music-bar" ref={bar}>
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
          {/* The logo is Dan's drawing of himself (Dan, 18 November 2026: "the
              little character should be the logo"), redrawn in his own strokes,
              colours and hatched ground, cropped to his head, halo and sheet so
              it reads small, inside a thin gold border, the dark panel a perfect
              square with the halo and rays above it. The sheet in his hand has
              the globe on it, as he drew it: from 19 to 25 November it was a
              page of handwriting (Dan, 25 November 2026: "this isn't using the
              globe one"). No wordmark beside it. */}
          <img className="music-mark" src="/akibwa-mark.svg?v=globe" alt="" width="42" height="52" draggable="false" />
        </a>
        <div className="music-tools" data-finding={finding || Boolean(query)}>
          <div className="music-order" role="group" aria-label="Order">
            {ORDERS.map(([name, label]) => {
              const on = !searching && pressedOrder === name;
              const turns = name in reversed;
              return (
                <button key={name} type="button" data-order={name} aria-pressed={on} onClick={() => sort(name)}>
                  {label}
                  {turns && on ? <span className="visually-hidden">, {reversed[name] ? "oldest" : "newest"} first</span> : null}
                  {/* A date's way round: newest first, or oldest. */}
                  {turns ? <span className="music-order-way" data-on={on} data-up={reversed[name]} aria-hidden="true" /> : null}
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
        <GlidingShelf tracks={tracks} shownTile={shownTile} above={above} before={before} pinnedTile={open?.tile} arrangement={arrangement} measured={measured} order={view} tiles={tiles} reference={reference} onOpen={onOpen} onPoint={onPoint} resting={resting} veiled={veiled} onTurned={onTurned} onVeil={onVeil} />
      </div>
    </div>
  );
}
