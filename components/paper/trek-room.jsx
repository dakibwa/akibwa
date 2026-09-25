"use client";

import { useEffect, useState } from "react";

// The dev server does not serve a folder's index.html at the folder itself.
const TREK = process.env.NODE_ENV === "development" ? "/trek/index.html" : "/trek/";

/*
 * The trek, in place (Dan, 25 September 2026): the standalone journey at
 * /trek/ in a paper frame that fills the room under the bar. It loads the
 * first time the room opens and then stays, so coming back keeps the walk
 * where it was. Framed, /trek/ hides its own masthead — the bar is the way
 * home — and sends its links to the whole window.
 */
export function TrekRoom({ active }) {
  const [opened, setOpened] = useState(active);
  useEffect(() => {
    if (active) setOpened(true);
  }, [active]);
  return (
    <div className="room-body trek-room">
      {opened ? (
        <iframe className="trek-frame" src={TREK} title="The trek: Paris to Sofia on foot, autumn 2019" allow="fullscreen" />
      ) : (
        <div className="trek-frame" aria-hidden="true" />
      )}
    </div>
  );
}
