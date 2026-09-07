"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// One moving box: the rail supplies its position, the text supplies its height.
// Keeping both mounted lets an interrupted reveal continue from where it is.
export function IndexReveal({ open, itemKey, rail, getAnchor, onUnavailable, accent, id, className = "", panelClassName = "", children }) {
  const content = useRef(null);
  const track = useRef(null);
  const previous = useRef(null);
  const glide = useRef(false);
  const [outgoing, setOutgoing] = useState(null);
  const [layout, setLayout] = useState({ height: 0, offset: 0, travel: false });

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
      const available = cardBox && Math.min(cardBox.right, shelfBox.right) - Math.max(cardBox.left, shelfBox.left) >= Math.min(24, cardBox.width);
      if (open && !available) onUnavailable();
      setLayout((before) => {
        const offset = available ? Math.max(0, Math.min(cardBox.left - shelfBox.left, shelfBox.width - movingBox.getBoundingClientRect().width)) : before.offset;
        return before.height === height && before.offset === offset
          ? before : { height, offset, travel: before.offset === offset ? before.travel : travel };
      });
    };
    // Moving between cards glides; scrolling/resizing stays attached to the rail.
    measure(glide.current);
    const followRail = () => measure(false);
    const observer = new ResizeObserver(followRail);
    observer.observe(shelf);
    observer.observe(body);
    shelf.addEventListener("scroll", followRail, { passive: true });
    return () => {
      observer.disconnect();
      shelf.removeEventListener("scroll", followRail);
    };
  }, [itemKey, open]);

  return (
    <div
      className={`index-reveal-shell ${className}${open ? " is-open" : ""}`}
      aria-hidden={!open}
      inert={!open}
      data-reveal-key={itemKey}
      style={{ "--reveal-height": `${layout.height + 9}px`, "--reveal-content-height": `${layout.height}px`, "--hover-detail-accent": accent }}
    >
      <div
        className="index-reveal-track"
        ref={track}
        data-follow-rail={!layout.travel}
        style={{ transform: `translateX(${layout.offset}px)` }}
      >
        <div className={`index-hover-detail index-reveal-panel ${panelClassName}${open ? " is-open" : ""}`} id={id} aria-live="polite">
          {outgoing ? <div className="index-reveal-content is-outgoing" key={`out-${outgoing.itemKey}`} aria-hidden="true" inert>{outgoing.children}</div> : null}
          <div className="index-reveal-content" key={itemKey} ref={content}>{children}</div>
        </div>
      </div>
    </div>
  );
}
