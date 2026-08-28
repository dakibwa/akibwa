"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    if (window.location.hostname === "localhost") return undefined;

    /* Committed artwork is replaced in place — same URLs, new pixels — and a
       page opened under the previous worker keeps painting the previous
       cache generation. When a NEW worker takes control mid-session, reload
       once so everything comes from the new generation, instead of leaving
       the visitor a whole visit behind (or half old, half new).

       Guarded two ways: only when the page was already controlled by an old
       worker (a first-ever install also fires controllerchange, and fresh
       visitors must not be reloaded), and only once. */
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;
    const onControllerChange = () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
