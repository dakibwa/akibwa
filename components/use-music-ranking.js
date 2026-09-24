"use client";

import { useEffect, useRef, useState } from "react";
import { unpackRanking } from "./paper/music-ranking.mjs";

/*
 * The top 1,000 songs and top 100 artists (public/music-ranking.json). The page
 * prints a seed — the first songs and every artist — so the wall and the first
 * screen of each shelf need no request; the full list loads once, on demand.
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
        setRanking({ songs: full.songs, artists: full.artists });
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
