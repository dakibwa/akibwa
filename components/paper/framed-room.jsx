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
 */
export function FramedRoom({ active, name, path, title }) {
  const [opened, setOpened] = useState(active);
  useEffect(() => {
    if (active) setOpened(true);
  }, [active]);
  return (
    <div className={`room-body framed-room is-${name}`}>
      {opened ? (
        <iframe className="room-frame" src={page(path)} title={title} allow="fullscreen" />
      ) : (
        <div className="room-frame" aria-hidden="true" />
      )}
    </div>
  );
}
