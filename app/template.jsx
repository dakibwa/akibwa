"use client";

// Remounts on every route change so the incoming page plays the
// .route-fade entry animation (see globals.css). Opacity-only to avoid
// creating a containing block for fixed-position overlays.
export default function Template({ children }) {
  return <div className="route-fade">{children}</div>;
}
