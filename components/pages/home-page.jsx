"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HeroFlipName } from "@/components/hero-word-cycle";
import { InkPaper } from "@/components/ink-paper";
import { PageFooter } from "@/components/page-footer";
import { AlbumArtImage, SiteImage, SLOT_SIZES, resolveBackground } from "@/components/site-image";
import { deck, sites, life, games, tv, sets, instagramUrl } from "@/components/deck-data";

const nf = new Intl.NumberFormat("en-GB");

/* Hobbies and Lived share one photograph across every card in the row, which
   printed the same tile six times over and read as art nobody had got round to
   making. Walking the crop across the frame gives each card its own piece of
   the picture instead. */
const crop = (i, n) => `${n > 1 ? Math.round((i / (n - 1)) * 100) : 50}% 50%`;

/* Pixels a second, the speed every travelling row is held to. Slow enough to
   read a card as it passes and to sit under text without pulling at it. */
const DRIFT = 22;

/* Every set counts something, and its title card says how many. Counted off the
   arrays at render rather than written into the data, so the figure on the wall
   cannot outlive what is behind it. */

/* The whole site is one wall of identically sized cards. Every card shows one
   thing face up and turns over to say how — hover on a pointer, tap on touch. */
function Card({ suit, ground, accent, crop, href, label, face, back, held, dim, onActivate }) {
  const props = {
    className: `card card--${suit}${dim ? "" : " is-lit"}`,
    "data-suit": suit,
    "aria-label": label,
    hidden: held || undefined,
    style:
      ground || accent || crop
        ? { "--ground": ground, "--accent": accent, "--crop": crop }
        : undefined
  };
  /* Every card steps forward when pressed — one grammar for the whole wall.
     A card with somewhere to go carries its door into the spotlight. */
  return (
    <button
      {...props}
      type="button"
      onClick={(event) =>
        onActivate?.({ suit, ground, accent, crop, label, face, back, href }, event.currentTarget)
      }
    >
      <span className="card-face">{face}</span>
      <span className="card-back">{back}</span>
    </button>
  );
}

/* The spotlight: the picked card, played large in the middle of a dimmed,
   stilled page — the same face, the same detail, just brought forward. It
   arrives FROM its place on the wall and returns TO it. */
function Spotlight({ lit, onClose }) {
  const figureRef = useRef(null);
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    const fig = figureRef.current;
    if (!fig) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }
    /* FLIP: render at final size, start inverted over the wall card, release. */
    const to = fig.getBoundingClientRect();
    const { from } = lit;
    const dx = from.x + from.w / 2 - (to.left + to.width / 2);
    const dy = from.y + from.h / 2 - (to.top + to.height / 2);
    const scale = from.w / to.width;
    fig.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    fig.style.transition = "none";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fig.style.transition = "";
        fig.style.transform = "";
        setEntered(true);
      });
    });
  }, [lit]);

  const { card } = lit;
  return (
    <div
      className={`spotlight${entered ? " is-entered" : ""}`}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <figure className="spotlight-figure" ref={figureRef}>
        <div
          className={`card card--${card.suit} card--spotlight`}
          data-suit={card.suit}
          style={
            card.ground || card.accent || card.crop
              ? { "--ground": card.ground, "--accent": card.accent, "--crop": card.crop }
              : undefined
          }
        >
          <span className="card-face">{card.face}</span>
        </div>
        <figcaption className="spotlight-caption" data-suit={card.suit}>
          {card.back}
          {card.href ? (
            <a
              className="spotlight-visit"
              href={card.href}
              target={/^https?:/.test(card.href) ? "_blank" : undefined}
              rel={/^https?:/.test(card.href) ? "noopener noreferrer" : undefined}
            >
              Open it ↗
            </a>
          ) : null}
        </figcaption>
      </figure>
      <button type="button" className="spotlight-close" onClick={onClose} aria-label="Close">
        Close
      </button>
    </div>
  );
}

function sizeClass(text, serif) {
  const n = text.length;
  if (serif) return n <= 11 ? "s1" : n <= 19 ? "s2" : n <= 30 ? "s3" : "s4";
  return n <= 10 ? "s1" : n <= 18 ? "s2" : n <= 27 ? "s3" : "s4";
}

function Mark({ src, tile }) {
  if (!src) return null;
  return (
    <span className={`c-mark${tile ? " c-mark--tile" : ""}`}>
      <img src={src} alt="" loading="lazy" decoding="async" />
    </span>
  );
}

export function HomePage() {
  const [lens, setLens] = useState(null);
  /* One set opened out into the page — the row rides to the top and the whole
     collection unfolds beneath it, detail showing. */
  /* The roving light in the hero index: one set word at a time lifts to full
     colour, on the same pulse as the flipping words above it. */
  const [spot, setSpot] = useState(-1);
  /* The ink prototype rides behind ?ink only — off for everyone else. */
  const [inkOn, setInkOn] = useState(false);
  useEffect(() => {
    setInkOn(new URLSearchParams(window.location.search).has("ink"));
  }, []);
  /* One card, brought forward: everything else dims and comes to rest. */
  const [lit, setLit] = useState(null);
  const litOriginRef = useRef(null);
  const deckRef = useRef(null);

  const openLit = useCallback((card, element) => {
    const from = element.getBoundingClientRect();
    element.style.visibility = "hidden";
    litOriginRef.current = element;
    setLit({ card, from: { x: from.left, y: from.top, w: from.width, h: from.height } });
  }, []);

  const closeLit = useCallback(() => {
    if (litOriginRef.current) litOriginRef.current.style.visibility = "";
    litOriginRef.current = null;
    setLit(null);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = window.setInterval(() => setSpot((v) => (v + 1) % BUCKETS.length), 1400);
    return () => window.clearInterval(id);
  }, []);

  /* FLIP: note where every card is before the order changes, then invert the
     difference and let it play out. Re-ordering a grid is not animatable on its
     own — without this the cards would teleport. */
  const before = useRef(null);

  useLayoutEffect(() => {
    const rects = before.current;
    before.current = null;
    if (!rects || !deckRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    deckRef.current.querySelectorAll(".card").forEach((card) => {
      const was = rects.get(card);
      if (!was) return;
      const now = card.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (!dx && !dy) return;
      card.classList.remove("is-sliding");
      card.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        card.classList.add("is-sliding");
        card.style.transform = "";
      });
    });
  }, [lens]);

  /* Travelling is a property of overflow, not a style choice.

     A track loops by running the cards twice and sliding one full run; that
     only reads as motion if a run is wider than the rail it moves through.
     Seven of the nine sets were narrower — Contact fitted nearly twice over —
     so both copies sat on screen at once and the wall looked like it was
     stuttering rather than turning. Anything that fits now simply sits still,
     which leaves the motion to the three sets that have the material for it. */
  useEffect(() => {
    const deckEl = deckRef.current;
    if (!deckEl) return undefined;

    const measure = () => {
      deckEl.querySelectorAll(".set-rail").forEach((rail) => {
        const run = rail.querySelector(".track-run");
        if (!run) return;
        /* One gap of slack: a run that overflows by less than the gutter would
           travel a few pixels and read as a twitch. */
        const slack = parseFloat(getComputedStyle(run).gap) || 0;
        const travels = run.offsetWidth > rail.clientWidth + slack;
        rail.classList.toggle("is-travelling", travels);
        /* The physics loop below reads the run width to know where to wrap. */
        rail.dataset.runw = run.offsetWidth;
      });
    };

    measure();
    /* Fonts and lazy art both land after first paint and both change the run
       width, so measure again once the page has settled. */
    const settled = window.setTimeout(measure, 400);
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(settled);
      window.removeEventListener("resize", measure);
    };
  }, []);

  /* Note where every card is before the order changes, so the FLIP pass can
     carry them to their new places instead of teleporting. */
  const capture = useCallback(() => {
    if (!deckRef.current) return;
    before.current = new Map(
      Array.from(deckRef.current.querySelectorAll(".card"))
        .map((card) => [card, card.getBoundingClientRect()])
    );
  }, []);

  /* A rail name holds a lens over its own row — the same machinery as the
     sentence's bucket words, one interaction language across the site.
     Clicking again lets go. */
  const focusSet = useCallback(
    (id) => {
      capture();
      setHeldBucket((current) => {
        const key = `set:${id}`;
        const next = current === key ? null : key;
        setLens(next ? [id] : null);
        return next;
      });
    },
    [capture]
  );

  /* Which bucket's lens is held, if any. Rail-name panels clear it. */
  const [heldBucket, setHeldBucket] = useState(null);

  const bucketHeld = useCallback((bucket) => heldBucket === bucket.id, [heldBucket]);

  const openBucket = useCallback(
    (bucket) => {
      capture();
      setHeldBucket((current) => {
        const next = current === bucket.id ? null : bucket.id;
        setLens(next ? bucket.lens : null);
        return next;
      });
    },
    [capture]
  );

  /* The travel itself. Not a CSS keyframe — a velocity loop, which is how
     the marquees worth copying do it: position integrates a velocity, and the
     velocity only ever EASES toward its target, so a change of pace is a
     glide rather than a cut. Hovering a row slows it to reading pace; a
     spotlight brings the whole wall to rest; scrolling the page gives every
     row a kick that decays. */
  const spotRef = useRef(null);
  useEffect(() => {
    spotRef.current = lit;
    document.body.style.overflow = lit ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lit]);

  useEffect(() => {
    const deckEl = deckRef.current;
    if (!deckEl) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const state = new Map(); // rail -> { x, v }
    let raf = 0;
    let last = performance.now();
    let scrollKick = 0;
    let lastScroll = window.scrollY;
    let hovered = null;

    const onScroll = () => {
      scrollKick = Math.min(2.2, Math.abs(window.scrollY - lastScroll) / 90);
      lastScroll = window.scrollY;
    };
    const onOver = (event) => {
      hovered = event.target.closest?.(".set-rail") ?? null;
    };
    const onOut = () => {
      hovered = null;
    };

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      scrollKick *= 0.94;

      deckEl.querySelectorAll(".set-rail.is-travelling").forEach((rail, i) => {
        const runW = Number(rail.dataset.runw) || 0;
        if (!runW) return;
        let st = state.get(rail);
        if (!st) {
          st = { x: 0, v: DRIFT };
          state.set(rail, st);
        }
        /* The world holds its breath while something is in the spotlight;
           a hovered row slows to reading pace; scroll hurries everything. */
        const target = spotRef.current
          ? 0
          : (rail === hovered ? DRIFT * 0.22 : DRIFT) * (1 + scrollKick);
        st.v += (target - st.v) * Math.min(1, dt * 5);
        const rtl = rail.querySelector(".track--rtl") !== null;
        st.x -= (rtl ? -st.v : st.v) * dt;
        /* Wrap on the run width — the clone makes the seam invisible. */
        if (st.x <= -runW) st.x += runW;
        if (st.x > 0) st.x -= runW;
        const track = rail.querySelector(".track");
        if (track) track.style.transform = `translate3d(${st.x.toFixed(2)}px,0,0)`;
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    deckEl.addEventListener("pointerover", onOver);
    deckEl.addEventListener("pointerleave", onOut);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      deckEl.removeEventListener("pointerover", onOver);
      deckEl.removeEventListener("pointerleave", onOut);
    };
  }, []);

  useEffect(() => {
    if (!lit) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") closeLit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lit, closeLit]);

  useEffect(() => {
    if (!lens) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      capture();
      setHeldBucket(null);
      setLens(null);
    };
    document.addEventListener("keydown", onKey);
    /* The gathered rows have been carried to the top of the wall; follow. */
    const section = deckRef.current?.querySelector(`.set[data-set="${lens[0]}"]`);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => document.removeEventListener("keydown", onKey);
  }, [lens, capture]);

  const dim = useCallback((id) => Boolean(lens) && !lens.includes(id), [lens]);
  /* Lit sets take the low orders so they gather at the top; everything else is
     pushed below them, still there and still readable, just stepped back.
     A section that carries several collections rises when the lens names any
     of them — Projects & Life share a row, each with its own light. */
  const SECTION_OWNS = { sites: ["sites", "creations", "life"], jobs: ["jobs", "tools"] };
  const orderOf = useCallback(
    (id) => {
      const rank = sets.findIndex((s) => s.id === id);
      const owns = SECTION_OWNS[id] ?? [id];
      return lens ? (owns.some((o) => lens.includes(o)) ? rank : 100 + rank) : rank;
    },
    [lens]
  );

  const cardsFor = (id, { all = false, as } = {}) => {
    /* `as` renders one collection inside another set's row — the toolkit
       rides with Jobs, so its cards dim, light and open as Jobs does. */
    const owner = as ?? id;
    const set = sets.find((s) => s.id === owner);
    const isDim = dim(owner);
    const cap = all ? Infinity : set?.cap ?? Infinity;
    /* A card steps into the spotlight — itself, large, with the page dimmed
       and stilled behind it. One interaction for every card on the site. */
    const shared = { onActivate: openLit };

    if (id === "jobs") {
      return deck.jobs.map((job) => (
        <Card
          key={job.name}
          suit="jobs"
          dim={isDim}
          {...shared}
          accent={job.accent}
          label={`${job.name}, ${job.role}`}
          face={
            <>
              {job.art ? (
                <>
                  <SiteImage src={job.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
                  <span className="card-scrim" aria-hidden="true" />
                </>
              ) : job.tile ? null : (
                <span
                  className="c-ghost"
                  aria-hidden="true"
                  style={{ "--mark": `url(${resolveBackground(job.logo, "logo")})` }}
                />
              )}
              <span className="card-face-stack">
                <span className="c-foot">
                  <span className={`c-title ${sizeClass(job.name)}`}>{job.name}</span>
                  {job.span ? <span className="c-sub">{job.span}</span> : null}
                </span>
              </span>
            </>
          }
          back={
            <>
              <span className="b-eyebrow">{job.role}</span>
              <span className="b-body">{job.back}</span>
            </>
          }
        />
      ));
    }

    if (id === "tools") {
      return deck.tools.map((tool) => (
        <Card
          key={tool.name}
          suit="tools"
          dim={isDim}
          {...shared}
          ground={TOOL_GROUND[tool.name]}
          label={tool.name}
          face={
            <>
              {tool.art ? (
                <>
                  <SiteImage src={tool.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
                  <span className="card-scrim" aria-hidden="true" />
                </>
              ) : (
                <span className="card-face-stack card-face-stack--solo">
                  {/* Just the mark — the name waits in the spotlight. */}
                  <Mark src={tool.mark} tile={tool.mark?.endsWith(".png")} />
                </span>
              )}
            </>
          }
          back={
            <>
              <span className="b-eyebrow">{tool.group} · {tool.name}</span>
              <span className="b-body">{tool.line}</span>
            </>
          }
        />
      ));
    }

    if (id === "sites") {
      return sites.map((site) => (
        <Card
          key={site.name}
          suit="sites"
          dim={isDim}
          {...shared}
          ground={site.ground}
          href={site.href ?? undefined}
          label={site.name}
          face={
            <SiteImage src={site.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          back={
            <>
              <span className="b-eyebrow">{site.name}</span>
              <span className="b-body">{site.note}</span>
            </>
          }
        />
      ));
    }

    if (id === "life") {
      return life.map((piece) => (
        <Card
          key={piece.name}
          suit="sites"
          dim={isDim}
          {...shared}
          ground={piece.ground}
          href={piece.href ?? undefined}
          label={piece.name}
          face={
            <SiteImage src={piece.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          back={
            <>
              <span className="b-eyebrow">{piece.name}</span>
              <span className="b-body">{piece.note}</span>
            </>
          }
        />
      ));
    }

    if (id === "music") {
      return deck.music.slice(0, cap === Infinity ? deck.music.length : cap).map((album) => (
        <Card
          key={album.id}
          suit="music"
          dim={isDim}
          {...shared}
          label={`${album.artist} — ${album.album}`}
          face={<AlbumArtImage id={album.id} rung="wall" className="c-art" />}
          back={
            <>
              <span className="b-eyebrow">{album.artist}</span>
              <span className="b-body b-body--tight">{album.album}</span>
              <span className="b-figure">
                <strong>{nf.format(album.plays)}</strong> plays{album.year ? ` · ${album.year}` : ""}
              </span>
            </>
          }
        />
      ));
    }

    if (id === "creations") {
      return deck.creations.slice(0, cap === Infinity ? deck.creations.length : cap).map((post) => {
        const [a, b] = post.title.split(" × ");
        return (
          <Card
            key={post.number}
            suit="creations"
            dim={isDim}
          {...shared}
          dim={isDim}
          {...shared}
            label={`Cover Collision ${post.number}: ${post.title}`}
            face={
              <SiteImage src={post.image} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
            }
            back={
              <>
                <span className="b-eyebrow">No. {post.number}</span>
                <span className="b-body b-body--tight">
                  {a}
                  <br />
                  <span className="b-x">×</span> {b ?? ""}
                </span>
              </>
            }
          />
        );
      });
    }

    if (id === "films") {
      return deck.films.slice(0, cap === Infinity ? deck.films.length : cap).map((film) => (
        <Card
          key={film.title}
          suit="films"
          dim={isDim}
          {...shared}
          label={film.title}
          face={
            <SiteImage src={film.poster} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          back={
            <>
              <span className="b-eyebrow">{film.title}</span>
              <span className="b-body b-body--tight">{film.director}</span>
              {film.sameDirector > 1 ? (
                <span className="b-figure">
                  <strong>{film.sameDirector}</strong> of their films here
                </span>
              ) : null}
            </>
          }
        />
      ));
    }

    if (id === "games") {
      return games.slice(0, cap === Infinity ? games.length : cap).map((game) => (
        <Card
          key={game.title}
          suit="games"
          dim={isDim}
          {...shared}
          label={game.title}
          face={
            <SiteImage src={game.cover} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          back={
            <>
              <span className="b-eyebrow">{game.studio}</span>
              <span className="b-body">{game.note}</span>
            </>
          }
        />
      ));
    }

    if (id === "tv") {
      return tv.slice(0, cap === Infinity ? tv.length : cap).map((show) => (
        <Card
          key={show.title}
          suit="tv"
          dim={isDim}
          {...shared}
          label={show.title}
          face={
            <SiteImage src={show.poster} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          back={
            <>
              <span className="b-eyebrow">{show.year}{show.creator ? ` · ${show.creator}` : ""}</span>
              <span className="b-body b-body--tight">{show.title}</span>
            </>
          }
        />
      ));
    }

    return null;
  };

  return (
    <section className="akibwa-home">
      {inkOn ? <InkPaper /> : null}
      <div
        className={`page-grid deck${lens ? " is-lensed" : ""}`}
        ref={deckRef}
        aria-label="Everything on one wall"
      >
        {/* Holding a lens drops the room lights: everything but the lit rows
            falls into the dark. A real element, not a pseudo — it needs to sit
            between the dimmed sets and the lit ones in the stack. */}
        {lens ? (
          <div
            className="deck-veil"
            onClick={() => {
              capture();
              setHeldBucket(null);
              setLens(null);
            }}
          />
        ) : null}
        <div className="card card--hero">
          {/* One sentence across the whole top of the page, and the menu is
              simply three of its words. Nothing else up here at all. */}
          <h1 className="hero-sentence">
            <HeroFlipName /> — here&rsquo;s my website containing my{" "}
            {BUCKETS.map((bucket, i) => (
              <span key={bucket.id} className="hero-bucket">
                <button
                  type="button"
                  className={`hero-index-word${bucketHeld(bucket) ? " is-held" : ""}${!lens && spot === i ? " is-spot" : ""}`}
                  style={{ "--index-accent-rgb": bucket.accent }}
                  aria-expanded={bucketHeld(bucket)}
                  onClick={() => openBucket(bucket)}
                >
                  {bucket.label.toLowerCase()}
                </button>
                <span className="hero-sep">{i < BUCKETS.length - 1 ? ", " : "."}</span>
              </span>
            ))}
          </h1>
        </div>

        {sets.map((set, i) => {
          const cards = (
            <>
              {cardsFor(set.id)}
            </>
          );

          /* Jobs carries two rails: the roles, and the toolkit they run on —
             smaller cards, travelling against the row above. The collisions
             ride the Projects rail: made things among the made things. */
          const rails =
            set.id === "jobs"
              ? [{ cards }, { cards: cardsFor("tools", { as: "jobs" }), sub: true }]
              : set.id === "sites"
                ? [{ cards: (
                    <>
                      {cards}
                      {/* Life rides the rail in person — the word sits in
                          front of the walk and the map, an opener like every
                          other word on the page, travelling with its cards. */}
                      <button
                        type="button"
                        className={`rail-word${dim("life") ? "" : " is-lit"}`}
                        style={{ "--index-accent-rgb": INDEX_ACCENT.life }}
                        aria-expanded={heldBucket === "set:life"}
                        onClick={() => focusSet("life")}
                      >
                        Life
                      </button>
                      {cardsFor("life")}
                    </>
                  ) }, { cards: cardsFor("creations", { as: "sites" }), sub: true }]
                : [{ cards }];

          return (
            <section
              className="set"
              data-set={set.id}
              key={set.id}
              style={{ "--order": orderOf(set.id) }}
              aria-labelledby={`set-${set.id}`}
            >
              {/* The name sits in a fixed rail rather than riding the track.
                  A signpost that travels at the speed of the thing it names is
                  not a signpost, and with the labels adrift the wall had no
                  left edge to read down. */}
              <div className="set-label">
                <h2 className="set-name" id={`set-${set.id}`}>
                  {/* The word alone, in the set's own colour — no tally, no
                      caption. The wall is the statement; the detail comes from
                      enquiring. The merged row carries both its words. */}
                  <button
                    type="button"
                    className="set-open"
                    style={{ "--index-accent-rgb": INDEX_ACCENT[set.id] }}
                    aria-expanded={heldBucket === `set:${set.id}`}
                    onClick={() => focusSet(set.id)}
                  >
                    {set.label}
                  </button>
                </h2>
              </div>

              <div className="set-rails">
                {rails.map((rail, r) => (
                  <div className={`set-rail${rail.sub ? " set-rail--sub" : ""}`} key={r}>
                    <div className={`track${(i + r) % 2 ? " track--rtl" : ""}`}>
                      <div className="track-run">{rail.cards}</div>
                      {/* The run is repeated once so the loop closes on itself:
                          at -50% the copy sits exactly where the original began.
                          It is hidden from assistive tech and taken out of the
                          tab order so the wall is not read or tabbed through
                          twice. Only a rail that actually overflows renders it
                          as visible — see the overflow measurement above. */}
                      <div className="track-run" aria-hidden="true" data-clone="1">
                        {rail.cards}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </section>
          );
        })}
      </div>

      {lit ? <Spotlight lit={lit} onClose={closeLit} /> : null}

      <PageFooter />
    </section>
  );
}

/* One accent per set for the hero index — drawn from the same families the
   cycling words use, so the index reads as part of the sentence above it. */
/* The name flip owns blue and orange outright; nothing else repeats them.
   Down the rail the hues alternate warm and cool, each a clear step from
   its neighbours: teal, rose, amber, olive, violet, sky. */
const INDEX_ACCENT = {
  sites: "27, 148, 125",
  jobs: "203, 66, 94",
  life: "61, 90, 128",
  music: "224, 122, 26",
  films: "94, 142, 103",
  games: "115, 112, 255",
  tv: "0, 154, 205"
};

/* The menu is four buckets, and every one behaves the same way: it gathers
   its rows to the top and lets the rest of the page recede — no unfolding,
   no reflow. The rows themselves are the content; the panels wait behind the
   rail names. */
const TASTE = ["music", "films", "games", "tv"];
const BUCKETS = [
  { id: "projects", label: "Projects", accent: "27, 148, 125", lens: ["sites"] },
  { id: "life", label: "Life", accent: "61, 90, 128", lens: ["life"] },
  { id: "career", label: "Career", accent: "203, 66, 94", lens: ["jobs"] },
  { id: "taste", label: "Taste", accent: "115, 112, 255", lens: TASTE }
];

/* Each tool card fills with its own brand ground. Picked for accuracy and for
   variety: five near-black brands in a row is one flat stripe. */
const TOOL_GROUND = {
  "Claude Code": "#c96442",
  Codex: "#0e8f70",
  "Grok Bot": "#4a4a52",
  GitHub: "#24292f",
  Cloudflare: "#e8761c",
  Figma: "#8b4dff",
  SQL: "#3d5a80",
  "Power BI": "#b78500",
  "Microsoft Fabric": "#117865",
  /* The Oracle wordmark is itself red, so its card holds a neutral slate. */
  "Oracle BI": "#33383d",
  Excel: "#1a7343",
  PowerPoint: "#c43e1c"
};
