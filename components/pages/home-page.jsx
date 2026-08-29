"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { HeroFlipName } from "@/components/hero-word-cycle";
import { InkPaper } from "@/components/ink-paper";
import { PageFooter } from "@/components/page-footer";
import { AlbumArtImage, SiteImage, SLOT_SIZES } from "@/components/site-image";
import { deck, sites, life, games, tv, sets, graceland, instagramUrl } from "@/components/deck-data";

const nf = new Intl.NumberFormat("en-GB");

/* Every set counts something, and its title card says how many. Counted off the
   arrays at render rather than written into the data, so the figure on the wall
   cannot outlive what is behind it. */

/* The whole site is one wall of identically sized cards. Every card shows one
   thing face up and turns over to say how — hover on a pointer, tap on touch. */
function Card({ suit, keySet, ground, accent, crop, href, label, face, spotFace, back, held, dim, size, onActivate }) {
  const props = {
    className: `card card--${suit}${size === "small" ? " card--small" : ""}${size === "grand" ? " card--grand" : ""}${dim ? "" : " is-lit"}`,
    "data-suit": suit,
    /* The key: which legend word this card answers to. Its colour is worn
       as the card's baseline, so a blended wall still reads at a glance. */
    "data-key": keySet ?? suit,
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
        onActivate?.({ suit, ground, accent, crop, label, face, spotFace, back, href }, event.currentTarget)
      }
    >
      <span className="card-face">{face}</span>
      <span className="card-back">{back}</span>
      <span className="card-sheen" aria-hidden="true" />
    </button>
  );
}

/* The spotlight: the picked card, played large in the middle of a dimmed,
   stilled page — the same face, the same detail, just brought forward. It
   arrives FROM its place on the wall and returns TO it. */
function Spotlight({ lit, onClose }) {
  /* The CARD is the shared element, not the figure that wraps it. The figure
     is a flex column holding the card AND the caption, so centring it on the
     wall tile put the card half a caption too high — measured at 21.3px above
     its own slot, so it launched from thin air and slid down as it grew. */
  const cardRef = useRef(null);
  const restRef = useRef(null);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const bailRef = useRef(0);

  /* The wall tile is 1.0497:1 and the spotlight card is 1:1, so one
     width-derived scale leaves the height wrong by ~7px. Scale each axis. */
  const invert = (from, rest) => {
    const snap = (v) => (Math.abs(v - 1) <= 1e-4 ? 1 : v);
    const sx = snap(Math.max(from.w, 1) / Math.max(rest.width, 1));
    const sy = snap(Math.max(from.h, 1) / Math.max(rest.height, 1));
    /* transform-origin is 0 0, so this is a plain affine composition and no
       half-caption offset can creep back in. */
    return `translate(${from.x - rest.left}px, ${from.y - rest.top}px) scale(${sx}, ${sy})`;
  };

  /* Leaving is the arrival played backwards — but it can be interrupted, so
     it restarts from wherever the card visually IS rather than refusing. */
  const close = useCallback(() => {
    const card = cardRef.current;
    const rest = restRef.current;
    if (!card || !rest || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    /* A mid-flight rect is where the eye last saw the card: the correct
       origin for an interrupted close. The destination is always the cached
       rest box, never a fresh measurement of a moving element. */
    const live = card.getBoundingClientRect();
    if (!closingRef.current) {
      closingRef.current = true;
      setClosing(true);
      setEntered(false);
    }
    card.style.transition = "none";
    card.style.transform =
      `translate(${live.left - rest.left}px, ${live.top - rest.top}px) ` +
      `scale(${live.width / rest.width}, ${live.height / rest.height})`;
    void card.offsetWidth;
    card.style.transition = "";
    card.style.transform = invert(lit.from, rest);

    const done = (event) => {
      if (event && (event.target !== card || event.propertyName !== "transform")) return;
      window.clearTimeout(bailRef.current);
      card.removeEventListener("transitionend", done);
      onClose();
    };
    card.addEventListener("transitionend", done);
    /* transitionend never fires when the computed transform already equals
       the target, and a backgrounded tab can hold it for seconds. */
    window.clearTimeout(bailRef.current);
    bailRef.current = window.setTimeout(done, 520);
  }, [lit, onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => () => window.clearTimeout(bailRef.current), []);

  /* The wall's faces load lazily, and a face replayed inside this overlay
     keeps that attribute — where, mid-FLIP, the lazy gate never fires and the
     image simply never fetches. The spotlight is the one place the visitor
     has explicitly asked for the picture, so everything in it loads now —
     and the full-size layer announces itself the moment it has pixels. */
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    card.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      img.loading = "eager";
    });
    card.querySelectorAll(".card-face--hi img").forEach((img) => {
      const ready = () => img.classList.add("is-ready");
      if (img.complete && img.naturalWidth > 0) ready();
      else img.addEventListener("load", ready, { once: true });
    });
  }, [lit]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    /* Cache the card's own untransformed box once: every later inversion
       measures against this, so nothing ever reads a moving element. */
    const rest = card.getBoundingClientRect();
    restRef.current = rest;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }
    card.style.transition = "none";
    card.style.transform = invert(lit.from, rest);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.transition = "";
        card.style.transform = "";
        setEntered(true);
      });
    });
  }, [lit]);

  const { card } = lit;
  return (
    <div
      className={`spotlight${entered ? " is-entered" : ""}${closing ? " is-closing" : ""}`}
      onClick={(event) =>
        (event.target === event.currentTarget ||
          event.target.classList?.contains("spotlight-scrim")) &&
        close()
      }
    >
      {/* The paper thickens on its own layer: fading a pre-blurred scrim is
          compositor work, where animating the blur radius itself re-blurred
          the whole viewport every frame. */}
      <span className="spotlight-scrim" aria-hidden="true" />
      <figure className="spotlight-figure">
        <div
          ref={cardRef}
          className={`card card--${card.suit} card--spotlight`}
          data-suit={card.suit}
          style={
            card.ground || card.accent || card.crop
              ? { "--ground": card.ground, "--accent": card.accent, "--crop": card.crop }
              : undefined
          }
        >
          {/* The wall face opens the spotlight — its file is already in
              cache, so the card is never blank — and the full-size artwork
              fades in over it. Without the base layer, suits whose large
              face is a fresh fetch opened dark and popped in late, while
              the sleeves arrived instantly: one suit seemed to animate
              differently from the rest. */}
          <span className="card-face">{card.face}</span>
          {card.spotFace ? (
            <span className="card-face card-face--hi" aria-hidden="true">
              {card.spotFace}
            </span>
          ) : null}
        </div>
        {/* The caption never travels and never scales: it sits at its final
            place and arrives, like a label set down under a poster that has
            just been hung. */}
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
      <button type="button" className="spotlight-close" onClick={close} aria-label="Close">
        Close
      </button>
    </div>
  );
}

/* The blend: each collection is dealt evenly through the whole stream rather
   than standing as its own block — item i of a collection of n lands at
   (i + φ) / n, and one sort by that position shuffles every collection through
   every other, deterministically. φ staggers the collections so equal-length
   lists do not zipper, and the leads (low i) still surface near the top. */
const PHASE = { music: 0.5, films: 0.23, games: 0.71, tv: 0.37, jobs: 0.81, tools: 0.11, creations: 0.61 };

function blend(lists) {
  return lists
    .flatMap(([id, cards]) => cards.map((card, i) => ({ at: (i + PHASE[id]) / cards.length, card })))
    .sort((a, b) => a.at - b.at)
    .map((dealt) => dealt.card);
}

/* The sentence owns its own pulse. The roving light used to be HomePage
   state, which re-rendered the entire 366-card wall every 1.4 seconds — a
   metronome of jank. Isolated here, the pulse re-renders one heading. */
function HeroSentence({ lens, heldBucket, focusSet }) {
  const [spot, setSpot] = useState(-1);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = window.setInterval(() => setSpot((v) => (v + 1) % SPOT_ORDER.length), 1400);
    return () => window.clearInterval(id);
  }, []);

  /* The sentence's own words are its menu: each coloured noun opens its
     collection; plain text is just the sentence. */
  const SetWord = ({ set, children }) => (
    <button
      type="button"
      className={`hero-index-word${heldBucket === `set:${set.id}` ? " is-held" : ""}${
        !lens && SPOT_ORDER[spot] === set.id ? " is-spot" : ""
      }`}
      style={{ "--index-accent-rgb": INDEX_ACCENT[set.id] }}
      aria-expanded={heldBucket === `set:${set.id}`}
      onClick={() => focusSet(set.id)}
    >
      {children}
    </button>
  );

  return (
    <h1 className="hero-sentence">
      <HeroFlipName /> — the things I built:{" "}
      <SetWord set={SET.sites}>projects</SetWord>, a <SetWord set={SET.jobs}>career</SetWord>, a{" "}
      <SetWord set={SET.life}>life</SetWord>. The things I love:{" "}
      <SetWord set={SET.music}>music</SetWord>, <SetWord set={SET.films}>films</SetWord>,{" "}
      <SetWord set={SET.games}>games</SetWord>, <SetWord set={SET.tv}>TV</SetWord>.
    </h1>
  );
}

/* Snapshot capture is the whole cost of a fold — measured on this wall at
   roughly 0.85ms per named card — so the budget gets spent deliberately.

   Two passes, because the wall that leaves and the wall that arrives are
   different sets of cards. Pass one runs before the update and names what is
   on screen now: the survivors and the leavers. Pass two runs inside the
   update, after a synchronous commit, and names what exists only in the new
   state: the arrivers, which then carry a `new` snapshot and no `old` one —
   precisely what ::view-transition-new(*):only-child is written to animate.

   Without pass two, every release and every switch between words spent its
   entire budget before the change, and a measured 22 of 56 names went to
   display:none cards — whose zero-size boxes pass any viewport test while
   producing no snapshot at all. So the half of the interaction that hands
   300 cards back to the wall was falling through to the browser's flat
   default crossfade. */
/* Tuned by measurement, three runs per candidate: 32/52 gave 0.3 long
   frames on a fold where 40/64 gave 2.7, and raising the budget to 80 made
   both directions worse. Pass one is deliberately the smaller share — the
   arrivers are what the eye follows when a word is released. */
const PASS_ONE_NAMES = 32;
const TOTAL_NAMES = 52;

function nameVisible(deck, named, start, limit) {
  const vh = window.innerHeight;
  const cards = deck.querySelectorAll(".card");
  /* Read every box, then write every name. Interleaving the two forced a
     synchronous layout per card, inside the click's own frame. */
  const rects = new Array(cards.length);
  for (let i = 0; i < cards.length; i += 1) rects[i] = cards[i].getBoundingClientRect();

  let n = start;
  for (let i = 0; i < cards.length && n < limit; i += 1) {
    const el = cards[i];
    const r = rects[i];
    if (el.style.viewTransitionName) continue;
    /* Not rendered: a name here buys an inert group and wastes the budget. */
    if (r.width === 0 || r.height === 0) continue;
    if (r.bottom <= vh * -0.25 || r.top >= vh * 1.25) continue;
    el.style.viewTransitionName = `deck-${n}`;
    /* The wave: banded by where the card sits, each band a beat behind. */
    const band = Math.min(7, Math.max(0, Math.floor((r.top + vh * 0.25) / (vh / 5))));
    el.style.viewTransitionClass = `vt-band-${band}`;
    named.push(el);
    n += 1;
  }
  return n;
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
    /* The card is mid-tilt under the cursor — measure it at rest, or the
       zoom launches from a skewed box. */
    const priorTransition = element.style.transition;
    element.style.transition = "none";
    element.style.transform = "none";
    const from = element.getBoundingClientRect();
    element.style.visibility = "hidden";
    element.style.transition = priorTransition;
    element.style.transform = "";
    litOriginRef.current = element;
    setLit({ card, from: { x: from.left, y: from.top, w: from.width, h: from.height } });
  }, []);

  const closeLit = useCallback(() => {
    if (litOriginRef.current) litOriginRef.current.style.visibility = "";
    litOriginRef.current = null;
    setLit(null);
  }, []);


  /* Which word's lens is held, if any. Declared above focusSet, which reads
     it: a useCallback dependency is evaluated during render, so a state
     declared below would sit in the temporal dead zone and throw. */
  const [heldBucket, setHeldBucket] = useState(null);

  /* Grid reflows snap; a view transition morphs them — and a morph is only
     as good as its names. See nameVisible above for why this runs in two
     passes rather than one. Progressive: browsers without the API, and
     anyone who asked for less motion, get the plain state change. */
  const withMorph = useCallback((apply, { toTop = false } = {}) => {
    const deck = deckRef.current;
    if (
      !deck ||
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      apply();
      if (toTop) window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    const named = [];
    const afterPassOne = nameVisible(deck, named, 0, PASS_ONE_NAMES);

    const transition = document.startViewTransition(() => {
      /* Commit synchronously, so pass two measures the wall that is about to
         be captured rather than the one that just left. It also makes the
         ordering explicit: without it the fold worked only because React's
         scheduler happened to land in the right place. */
      flushSync(apply);
      /* Scroll inside the callback, before the new state is captured. A
         fold can remove 300 cards, so the document collapses and the
         browser clamps scrollTop on its own; doing it here — rather than
         in an effect that may land after the capture — keeps every group's
         destination fixed instead of moving under the animation. */
      if (toTop) window.scrollTo({ top: 0, behavior: "instant" });
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (window.scrollY > max) window.scrollTo({ top: max, behavior: "instant" });
      nameVisible(deck, named, afterPassOne, TOTAL_NAMES);
    });

    transition.finished.finally(() => {
      for (const el of named) {
        el.style.viewTransitionName = "";
        el.style.viewTransitionClass = "";
      }
    });
  }, []);

  /* A rail name holds a lens over its own row — the same machinery as the
     sentence's bucket words, one interaction language across the site.
     Clicking again lets go. */
  const focusSet = useCallback(
    (id) => {
      const opening = heldBucket !== `set:${id}`;
      withMorph(
        () => {
          setHeldBucket((current) => {
            const key = `set:${id}`;
            const next = current === key ? null : key;
            setLens(next ? [id] : null);
            return next;
          });
        },
        { toTop: opening }
      );
    },
    [withMorph, heldBucket]
  );


  useEffect(() => {
    if (!lit) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lit]);

  useEffect(() => {
    if (!lens) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      withMorph(() => {
        setHeldBucket(null);
        setLens(null);
      });
    };
    document.addEventListener("keydown", onKey);
    /* The scroll itself happens inside the morph (see withMorph): doing it
       here meant it landed after the new state was captured, which drags
       every group's destination while it is animating. */
    return () => document.removeEventListener("keydown", onKey);
  }, [lens]);

  const dim = useCallback((id) => Boolean(lens) && !lens.includes(id), [lens]);

  /* How many of a collection lead at full size before the rest pack small —
     four small tiles to one large. The making sets stay large throughout.
     BEAT then lifts one tail card in every so many back to full size, so the
     deep wall keeps varying instead of settling into a uniform grain. */
  const LEAD = { music: 12, films: 8, games: 6, tv: 6, creations: 2, tools: 0 };
  const BEAT = { music: 24, films: 12, games: 9, tv: 11, creations: 6, tools: 7 };
  const sizeFor = (id, index) => {
    if (index < LEAD[id]) return undefined;
    return (index - LEAD[id]) % BEAT[id] === BEAT[id] - 1 ? undefined : "small";
  };

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
      /* A job card is the company's mark on the company's colour — the
         logo IS the face, white where a silhouette exists, kept as its own
         tile where the logo is a filled block (Sky). Freelance is Dan's own
         practice with no mark to wear, so its generated art carries it.
         The name waits in the spotlight, like everywhere else. */
      return deck.jobs.map((job) => (
        <Card
          key={`job-${job.name}`}
          suit="jobs"
          dim={isDim}
          {...shared}
          accent={job.accent}
          label={`${job.name}, ${job.role}`}
          spotFace={
            job.logo ? undefined : <SiteImage src={job.art} priority alt="" className="c-art" />
          }
          face={
            job.logo ? (
              <span className="card-face-stack card-face-stack--solo">
                <Mark src={job.logo} tile={job.tile} />
              </span>
            ) : (
              <SiteImage src={job.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
            )
          }
          back={
            <>
              <span className="b-eyebrow">{job.name}</span>
              <span className="b-body">{job.back}</span>
              <span className="b-figure">
                {job.role}
                {job.span ? ` · ${job.span}` : ""}
              </span>
            </>
          }
        />
      ));
    }

    if (id === "tools") {
      return deck.tools.map((tool, index) => (
        <Card
          size={sizeFor("tools", index)}
          key={`tool-${tool.name}`}
          suit="tools"
          keySet="jobs"
          dim={isDim}
          {...shared}
          ground={TOOL_GROUND[tool.name]}
          label={tool.name}
          spotFace={
            tool.art ? <SiteImage src={tool.art} priority alt="" className="c-art" /> : undefined
          }
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
          key={`site-${site.name}`}
          suit="sites"
          dim={isDim}
          {...shared}
          ground={site.ground}
          href={site.href ?? undefined}
          label={site.name}
          face={
            <SiteImage src={site.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          spotFace={<SiteImage src={site.art} priority alt="" className="c-art" />}
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
          key={`life-${piece.name}`}
          suit="sites"
          keySet="life"
          dim={isDim}
          {...shared}
          ground={piece.ground}
          href={piece.href ?? undefined}
          label={piece.name}
          face={
            <SiteImage src={piece.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          spotFace={<SiteImage src={piece.art} priority alt="" className="c-art" />}
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
      return deck.music.slice(0, cap === Infinity ? deck.music.length : cap).map((album, index) => (
        <Card
          size={sizeFor("music", index)}
          key={`album-${album.id}`}
          suit="music"
          dim={isDim}
          {...shared}
          label={`${album.artist} — ${album.album}`}
          face={<AlbumArtImage id={album.id} rung="wall" className="c-art" />}
          spotFace={<AlbumArtImage id={album.id} rung="card" priority className="c-art" />}
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
      return deck.creations.slice(0, cap === Infinity ? deck.creations.length : cap).map((post, index) => {
        const [a, b] = post.title.split(" × ");
        return (
          <Card
            size={sizeFor("creations", index)}
            key={`collision-${post.number}`}
            suit="creations"
            keySet="sites"
            dim={isDim}
            {...shared}
            label={`Cover Collision ${post.number}: ${post.title}`}
            face={
              <SiteImage src={post.image} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
            }
            spotFace={<SiteImage src={post.image} priority alt="" className="c-art" />}
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
      return deck.films.slice(0, cap === Infinity ? deck.films.length : cap).map((film, index) => (
        <Card
          size={sizeFor("films", index)}
          key={`film-${film.title}`}
          suit="films"
          dim={isDim}
          {...shared}
          label={film.title}
          face={
            <SiteImage src={film.poster} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          spotFace={<SiteImage src={film.poster} priority alt="" className="c-art" />}
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
      return games.slice(0, cap === Infinity ? games.length : cap).map((game, index) => (
        <Card
          size={sizeFor("games", index)}
          key={`game-${game.title}`}
          suit="games"
          dim={isDim}
          {...shared}
          label={game.title}
          face={
            <SiteImage src={game.cover} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          spotFace={<SiteImage src={game.cover} priority alt="" className="c-art" />}
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
      return tv.slice(0, cap === Infinity ? tv.length : cap).map((show, index) => (
        <Card
          size={sizeFor("tv", index)}
          key={`tv-${show.title}`}
          suit="tv"
          dim={isDim}
          {...shared}
          label={show.title}
          face={
            <SiteImage src={show.poster} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
          }
          spotFace={<SiteImage src={show.poster} priority alt="" className="c-art" />}
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

  /* While a lens is held, any press on open paper — anything that is not a
     button or a link — lets the site back in. */
  const releaseOnPaper = useCallback(
    (event) => {
      if (!lens) return;
      if (event.target.closest("button, a")) return;
      withMorph(() => {
        setHeldBucket(null);
        setLens(null);
      });
    },
    [lens, withMorph]
  );

  /* The wall itself only changes when a lens changes — 366 cards need no
     rebuilding when the spotlight opens or the sentence pulses. */
  const wall = useMemo(() => {
    /* Career leads the front of the wall with its two current roles; the
       six past ones are dealt through the blend below with everything
       else. */
    const jobCards = cardsFor("jobs");
    return (
      <>
        {/* The front of the wall: the things made, the life pieces, the two
            current roles — and Graceland, grand, because it matters most. */}
        {cardsFor("sites")}
        <Card
          key="graceland"
          suit="music"
          size="grand"
          dim={dim("music")}
          onActivate={openLit}
          label={`${graceland.artist} — ${graceland.album}`}
          face={
            <SiteImage
              src={graceland.art}
              slot="grandTile"
              sizes="(max-width: 560px) calc(60vw - 16px), 250px"
              alt=""
              className="c-art"
            />
          }
          spotFace={<SiteImage src={graceland.art} priority alt="" className="c-art" />}
          back={
            <>
              <span className="b-eyebrow">{graceland.artist}</span>
              <span className="b-body b-body--tight">{graceland.album}</span>
              <span className="b-figure">{graceland.year} · the one that matters most</span>
            </>
          }
        />
        {cardsFor("life")}
        {jobCards.slice(0, 2)}

        {/* Everything else, dealt together: one long blended collage, each
            collection spread through the others, sizes varying all the way
            down. The key above is what keeps it legible. */}
        {blend([
          ["music", cardsFor("music")],
          ["films", cardsFor("films")],
          ["games", cardsFor("games")],
          ["tv", cardsFor("tv")],
          ["jobs", jobCards.slice(2)],
          ["tools", cardsFor("tools", { as: "jobs" })],
          ["creations", cardsFor("creations", { as: "sites" })]
        ])}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens]);

  return (
    <section className="akibwa-home" onClick={releaseOnPaper}>
      {inkOn ? <InkPaper /> : null}
      <div
        className={`page-grid deck${lens ? " is-lensed" : ""}${lit ? " is-receded" : ""}`}
        ref={deckRef}
        aria-label="Everything on one wall"
      >

        <div className="deck-hero">
          <HeroSentence lens={lens} heldBucket={heldBucket} focusSet={focusSet} />
        </div>

        {wall}
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

/* The legend's order mirrors the wall: the things made, the life pieces, the
   career, then the taste collections. Life is not one of the data sets — its
   cards ride in the sites flow — but it is very much one of the keys. */
const LEGEND = [sets[0], { id: "life", label: "Life" }, ...sets.slice(1)];


/* The seven collection words, addressable by id for the sentence. */
const SET = Object.fromEntries(LEGEND.map((entry) => [entry.id, entry]));

/* The roving light passes over the coloured nouns only. */
const SPOT_ORDER = ["sites", "jobs", "life", "music", "films", "games", "tv"];


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
