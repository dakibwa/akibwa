"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function RailControls({ rail, label, controls }) {
  const [edges, setEdges] = useState({ overflow: false, start: true, end: true });
  useEffect(() => {
    const shelf = rail.current;
    if (!shelf) return;
    const measure = () => {
      const remaining = shelf.scrollWidth - shelf.clientWidth;
      const bounds = shelf.getBoundingClientRect();
      // Snap points can start after the rail's focus-ring padding. The first
      // fully visible card is the start even when scrollLeft is a few pixels.
      const next = { overflow: remaining > 2,
        start: !shelf.firstElementChild || shelf.firstElementChild.getBoundingClientRect().left >= bounds.left - 1,
        end: !shelf.lastElementChild || shelf.lastElementChild.getBoundingClientRect().right <= bounds.right + 1 };
      setEdges((old) => Object.keys(next).every((key) => next[key] === old[key]) ? old : next);
    };
    measure();
    const resize = new ResizeObserver(measure);
    const children = new MutationObserver(measure);
    resize.observe(shelf);
    children.observe(shelf, { childList: true });
    shelf.addEventListener("scroll", measure, { passive: true });
    return () => { resize.disconnect(); children.disconnect(); shelf.removeEventListener("scroll", measure); };
  }, [rail]);
  const move = (direction) => {
    const shelf = rail.current;
    if (!shelf) return;
    shelf.scrollBy({ left: direction * shelf.clientWidth * .8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <div className="rail-controls" hidden={!edges.overflow} aria-label={`${label} navigation`}>
    <button type="button" aria-label={`Previous ${label.toLowerCase()}`} aria-controls={controls} disabled={edges.start} onClick={() => move(-1)}><ChevronLeft size={17} aria-hidden="true" /></button>
    <button type="button" aria-label={`Next ${label.toLowerCase()}`} aria-controls={controls} disabled={edges.end} onClick={() => move(1)}><ChevronRight size={17} aria-hidden="true" /></button>
  </div>;
}
