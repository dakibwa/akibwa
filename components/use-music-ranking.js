"use client";

import { useEffect, useRef, useState } from "react";
import { unpackRanking } from "./paper/music-ranking.mjs";

/*
 * The top 1,000 songs and top 100 albums (public/music-ranking.json). The page
 * prints a seed — every album without its tracks and the first songs — so the
 * room draws at once; the full file loads once, when the room opens.
 */
export function useMusicRanking(seed, enabled) {
  const [ranking, setRanking] = useState(seed);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [request, setRequest] = useState(0);
  const loaded = useRef(false);

  useEffect(() => {
    if (!enabled || loaded.current) return undefined;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetch("/music-ranking.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((packet) => {
        if (cancelled) return;
        const full = unpackRanking(packet);
        loaded.current = true;
        setRanking({ asOf: full.asOf, songs: full.songs, albums: full.albums });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, request]);

  return { ...ranking, loading, loadError, retry: () => setRequest((value) => value + 1) };
}
