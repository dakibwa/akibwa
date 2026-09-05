"use client";

import { useEffect, useMemo, useState } from "react";
import { acceptsAlbumPacket, albumSnapshot } from "./album-catalogue.mjs";
import { fetchSessionJson, readSessionJson } from "./remote-data-cache";
import { albumPlaysDataUrl } from "./site-data";

// The homepage and archive share the same count provenance and cache rules.
export function useAlbumCatalogue(initialCatalogue, refreshedAt) {
  const [snapshots, setSnapshots] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const cached = readSessionJson(albumPlaysDataUrl);
    const cachedIsUsable = acceptsAlbumPacket(cached, initialCatalogue, refreshedAt);
    const cacheFloor = cachedIsUsable ? cached.refreshedAt : refreshedAt;
    const accept = (data) => acceptsAlbumPacket(data, initialCatalogue, cacheFloor);
    const apply = (data, origin) => {
      if (cancelled || !accept(data)) return;
      setSnapshots((current) => [
        ...current.filter((item) => item.origin !== origin),
        { data, origin },
      ]);
    };
    if (cachedIsUsable) apply(cached, "session");
    fetchSessionJson(albumPlaysDataUrl, { accept })
      .then((data) => apply(data, "network"))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [initialCatalogue, refreshedAt]);
  return useMemo(
    () => albumSnapshot(initialCatalogue, refreshedAt, snapshots),
    [initialCatalogue, refreshedAt, snapshots],
  );
}
