"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const placements = ["bottom-start", "top-end", "right", "bottom-end", "top-start", "left"];
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

function placeBeside(card, bounds, width, height, index, obstacles) {
  const gap = 12;
  const preferred = Math.max(0, index) % placements.length;
  const candidates = placements.map((_, step) => {
    const placement = placements[(preferred + step) % placements.length];
    const top = placement.startsWith("top"), bottom = placement.startsWith("bottom");
    const x = top || bottom
      ? clamp(placement.endsWith("end") ? card.right - width : card.left, bounds.left, bounds.right - width)
      : placement === "right" ? card.right + gap : card.left - width - gap;
    const y = top ? card.top - height - gap : bottom ? card.bottom + gap
      : clamp(card.top + (card.height - height) / 2, 12, innerHeight - height - 12);
    return { x, y, placement };
  });
  const fits = ({ x, y }) => x >= bounds.left && x + width <= bounds.right + 1 && y >= 12 && y + height <= innerHeight - 12;
  const clear = ({ x, y }) => obstacles.every(box => x + width <= box.left - 6 || x >= box.right + 6 || y + height <= box.top - 6 || y >= box.bottom + 6);
  // A heading may occupy only the left of a row. Use the remaining space
  // above/below the card before falling back to covering that heading.
  const shifted = candidates.filter(candidate => candidate.placement.startsWith("top") || candidate.placement.startsWith("bottom"))
    .flatMap(candidate => obstacles.flatMap(box => [box.right + gap, box.left - width - gap].map(x => ({ ...candidate, x: clamp(x, bounds.left, bounds.right - width) }))));
  return candidates.find(candidate => fits(candidate) && clear(candidate))
    ?? shifted.find(candidate => fits(candidate) && clear(candidate))
    ?? candidates.find(fits)
    ?? { ...candidates[0], x: clamp(candidates[0].x, bounds.left, bounds.right - width), y: clamp(candidates[0].y, 12, innerHeight - height - 12) };
}

// One moving box: the rail supplies its position, the text supplies its height.
// Keeping both mounted lets an interrupted reveal continue from where it is.
export function IndexReveal({ open, itemKey, rail, getAnchor, onUnavailable, accent, id, shellId, contentId, label, fitAnchor = false, floating = false, placementIndex = 0, avoid, reserveAbove = false, reserveBelow = false, className = "", panelClassName = "", children }) {
  const content = useRef(null);
  const track = useRef(null);
  const above = useRef(null);
  const anchorViewport = useRef(false);
  const previous = useRef(null);
  const glide = useRef(false);
  const [outgoing, setOutgoing] = useState(null);
  const [layout, setLayout] = useState({ height: 0, offset: 0, top: 0, width: null, travel: false, placement: "bottom-start", space: 0, above: 0 });

  useLayoutEffect(() => {
    const space = above.current;
    const shelf = rail.current;
    const shell = track.current?.parentElement;
    if (!reserveAbove || !space || !shelf || !shell) return;
    let previousHeight = space.getBoundingClientRect().height;
    let scrollRemainder = 0;
    const followSpace = () => {
      const height = space.getBoundingClientRect().height;
      const change = height - previousHeight;
      previousHeight = height;
      // Reveal only the space already opened, keeping the heading clear
      // throughout the animation. Scroll with that space to anchor the role.
      shell.style.setProperty("--reveal-above-space", `${height}px`);
      const bounds = shelf.getBoundingClientRect();
      if (change && anchorViewport.current && bounds.bottom > 0 && bounds.top < innerHeight) {
        const beforeScroll = window.scrollY;
        const distance = change + scrollRemainder;
        window.scrollBy({ top: distance, behavior: "instant" });
        const remainder = distance - (window.scrollY - beforeScroll);
        scrollRemainder = Math.abs(remainder) < 1 ? remainder : 0;
      } else {
        scrollRemainder = 0;
      }
    };
    followSpace();
    const observer = new ResizeObserver(followSpace);
    observer.observe(space);
    return () => observer.disconnect();
  }, [reserveAbove, rail]);

  useLayoutEffect(() => {
    const before = previous.current;
    glide.current = Boolean(open && before?.open && before.itemKey !== itemKey);
    if (open && before?.open && before.itemKey !== itemKey &&
        performance.now() - before.since > 160 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOutgoing(before);
    } else if (!open || before?.itemKey !== itemKey) {
      setOutgoing(null);
    }
    previous.current = { itemKey, children, open, since: before?.itemKey === itemKey && before.open === open ? before.since : performance.now() };
  }, [itemKey, open, children]);

  useEffect(() => {
    if (!outgoing) return;
    const timer = setTimeout(() => setOutgoing(null), 180);
    return () => clearTimeout(timer);
  }, [outgoing]);

  useLayoutEffect(() => {
    const shelf = rail.current;
    const body = content.current;
    const movingBox = track.current;
    if (!shelf || !body || !movingBox) return;
    const measure = (travel = false) => {
      const anchor = getAnchor();
      const shelfBox = shelf.getBoundingClientRect();
      const cardBox = anchor?.getBoundingClientRect();
      const height = Math.ceil(body.getBoundingClientRect().height) + 2;
      const left = cardBox ? Math.max(cardBox.left, shelfBox.left) : 0;
      const visibleWidth = cardBox ? Math.max(0, Math.min(cardBox.right, shelfBox.right) - left) : 0;
      const inViewport = cardBox && Math.min(cardBox.bottom, innerHeight) - Math.max(cardBox.top, 0) >= 24;
      const available = cardBox && visibleWidth >= Math.min(fitAnchor ? 200 : 24, cardBox.width) &&
        (!floating || inViewport);
      if (!inViewport) anchorViewport.current = false;
      else if (open) anchorViewport.current = true;
      const obstacles = avoid ? [...shelf.closest("section").querySelectorAll(avoid)].filter(node => node !== anchor).map(node => node.getBoundingClientRect()) : [];
      if (open && !available) onUnavailable();
      setLayout((before) => {
        const width = fitAnchor && available ? visibleWidth : before.width;
        const position = floating && available ? placeBeside(cardBox, shelfBox, movingBox.offsetWidth, height, placementIndex, obstacles) : null;
        // A closed, off-screen box still contributes to scroll overflow. Keep
        // its retained position inside the rail when the viewport narrows.
        const offset = position ? position.x - shelfBox.left : available ? fitAnchor ? left - shelfBox.left : clamp(cardBox.left - shelfBox.left, 0, shelfBox.width - movingBox.offsetWidth) : clamp(before.offset, 0, Math.max(0, shelfBox.width - movingBox.offsetWidth));
        const top = position ? position.y - movingBox.parentElement.getBoundingClientRect().top - 9 : before.top;
        const placement = position?.placement ?? before.placement;
        const space = reserveBelow && position ? Math.max(0, position.y + height - shelfBox.bottom) : 0;
        const above = reserveAbove && position ? Math.max(0, shelfBox.top - position.y + 12) : 0;
        const moved = before.offset !== offset || before.top !== top || before.width !== width;
        return before.height === height && !moved && before.placement === placement && before.space === space && before.above === above
          ? before : { height, offset, top, width, placement, space, above, travel: moved ? travel : before.travel };
      });
    };
    // Moving between cards glides; scrolling/resizing stays attached to the rail.
    measure(glide.current);
    const followRail = () => measure(false);
    const observer = new ResizeObserver(followRail);
    observer.observe(shelf);
    observer.observe(body);
    const anchor = getAnchor();
    if (anchor) observer.observe(anchor);
    shelf.addEventListener("scroll", followRail, { passive: true });
    if (floating) window.addEventListener("scroll", followRail, { passive: true });
    window.addEventListener("resize", followRail, { passive: true });
    return () => {
      observer.disconnect();
      shelf.removeEventListener("scroll", followRail);
      window.removeEventListener("scroll", followRail);
      window.removeEventListener("resize", followRail);
    };
  }, [itemKey, open, fitAnchor, floating, placementIndex, avoid, reserveAbove, reserveBelow]);

  return (
    <>
    {reserveAbove ? <div ref={above} className={`index-reveal-reserve is-above${open ? " is-open" : ""}`} aria-hidden="true" style={{ "--reveal-space": `${layout.above}px` }} /> : null}
    <div
      className={`index-reveal-shell ${className}${floating ? " is-floating" : ""}${reserveAbove ? " reserves-above" : ""}${open ? " is-open" : ""}`}
      id={shellId}
      role={label ? "region" : undefined}
      aria-label={label}
      aria-hidden={!open}
      inert={!open}
      data-reveal-key={itemKey}
      data-placement={layout.placement}
      style={{ "--reveal-height": `${layout.height + 9}px`, "--reveal-content-height": `${layout.height}px`, "--hover-detail-accent": accent,
        "--reveal-enter-x": layout.placement === "right" ? "-5px" : layout.placement === "left" ? "5px" : "0px",
        "--reveal-enter-y": layout.placement.startsWith("top") ? "5px" : layout.placement.startsWith("bottom") ? "-5px" : "0px" }}
    >
      <div
        className="index-reveal-track"
        ref={track}
        data-follow-rail={!layout.travel}
        style={{ transform: `translate(${layout.offset}px, ${layout.top}px)`, width: fitAnchor && layout.width ? `${layout.width}px` : undefined }}
      >
        <div className={`index-hover-detail index-reveal-panel ${panelClassName}${open ? " is-open" : ""}`} id={id} aria-live="polite">
          {outgoing ? <div className="index-reveal-content is-outgoing" key={`out-${outgoing.itemKey}`} aria-hidden="true" inert>{outgoing.children}</div> : null}
          <div className="index-reveal-content" key={itemKey} ref={content} id={contentId}>{children}</div>
        </div>
      </div>
    </div>
    {reserveBelow ? <div className={`index-reveal-reserve${open ? " is-open" : ""}`} aria-hidden="true" style={{ "--reveal-space": `${layout.space}px` }} /> : null}
    </>
  );
}
