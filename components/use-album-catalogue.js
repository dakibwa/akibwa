"use client";

import { useEffect, useState } from "react";
import { acceptsListeningCatalogue } from "./listening-catalogue.mjs";
import { fetchSessionJson, readSessionJson } from "./remote-data-cache";
const catalogueUrl = "/listening-catalogue.json";

// Only reconciled packets can replace the seed. A Last.fm-only response or an
// old session packet must never overwrite counts from the combined history.
export function useAlbumCatalogue(initialCatalogue, refreshedAt, enabled = true) {
  const [catalogue, setCatalogue] = useState(initialCatalogue);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const cached = readSessionJson(catalogueUrl);
    const cachedIsUsable = acceptsListeningCatalogue(cached, refreshedAt, initialCatalogue);
    const cacheFloor = cachedIsUsable ? cached.asOf : refreshedAt;
    const accept = (data) => acceptsListeningCatalogue(data, cacheFloor, initialCatalogue);
    const apply = (data) => {
      if (cancelled) return;
      setCatalogue(data.albums);
      setLoadError(false);
      setLoading(false);
    };
    if (cachedIsUsable) apply(cached);
    else { setLoading(true); setLoadError(false); }
    // The page and its catalogue deploy together, so a session copy from this
    // build is already current and needs no second 450KB download.
    if (cachedIsUsable && cached.asOf === refreshedAt) return () => { cancelled = true; };
    // fetchSessionJson has already applied `accept` to anything it returns.
    fetchSessionJson(catalogueUrl, { accept })
      .then((data) => {
        if (!data) throw new Error("The full catalogue could not be loaded");
        apply(data);
      })
      .catch(() => {
        if (!cancelled) { setLoading(false); setLoadError(!cachedIsUsable); }
      });
    return () => { cancelled = true; };
  }, [initialCatalogue, refreshedAt, request, enabled]);
  return { catalogue, loading, loadError, retry: () => setRequest((value) => value + 1) };
}
