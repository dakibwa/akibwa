"use client";

import { useEffect, useState } from "react";

// The dev server does not serve a folder's index.html at the folder itself.
const page = (path) => (process.env.NODE_ENV === "development" ? `${path}index.html` : path);

/*
 * A page of its own, framed in a room (Dan, 25 September 2026): the trek's
 * journey at /trek/ and the Features game at /features/, each in a paper frame
 * that fills the room under the bar. It loads the first time the room opens
 * and then stays, so coming back finds it where it was left. Framed, /trek/
 * hides its own masthead and sends its links to the whole window.
 *
 * The Features game is the Features repository's client, copied as it is, so
 * the room trims its welcome card's inset and border from outside when it
 * loads (same origin): in the paper frame, like the trek's, the game reaches
 * the frame's edges and corners (Dan, 25 September 2026). On a visit of its
 * own the game moves to features.games, which cannot be framed here, so the
 * room asks it to stay (its `?stay=1`).
 */
const BLEED = {
  features: "#introveil{padding:0!important}#introcard{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border:0!important;box-shadow:none!important;border-radius:0!important}"
};

function bleed(name) {
  return (event) => {
    const css = BLEED[name];
    const doc = event.currentTarget.contentDocument;
    if (!css || !doc?.head || doc.getElementById("akibwa-bleed")) return;
    const style = doc.createElement("style");
    style.id = "akibwa-bleed";
    style.textContent = css;
    doc.head.append(style);
  };
}
export function FramedRoom({ active, name, path, search = "", title }) {
  const [opened, setOpened] = useState(active);
  useEffect(() => {
    if (active) setOpened(true);
  }, [active]);
  return (
    <div className={`room-body framed-room is-${name}`}>
      {opened ? (
        <iframe className="room-frame" src={`${page(path)}${search}`} title={title} allow="fullscreen" onLoad={bleed(name)} />
      ) : (
        <div className="room-frame" aria-hidden="true" />
      )}
    </div>
  );
}
