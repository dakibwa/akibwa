"use client";

import { useEffect, useState } from "react";

/*
 * Remounts on every route change so the incoming page plays its entry
 * animation (see globals.css).
 *
 * First load and later navigations get different classes. A navigation has an
 * outgoing page to replace, so `.route-fade` cross-fades it. A first load has
 * nothing to replace, and fading it in would only hold back the paint —
 * Largest Contentful Paint ignores an element at opacity 0, so an entry fade
 * lands on the metric almost in full. `.route-enter` rises without fading.
 *
 * The flag is module-level rather than state because it has to survive the
 * remount: each route change mounts a fresh Template. It is read during mount
 * and only written in an effect, so the server render and the hydrating client
 * render always agree on the class.
 */
let hasMountedOnce = false;

export default function Template({ children }) {
  const [isNavigation] = useState(() => hasMountedOnce);

  useEffect(() => {
    hasMountedOnce = true;
  }, []);

  return <div className={isNavigation ? "route-fade" : "route-enter"}>{children}</div>;
}
