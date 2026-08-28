"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
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
      <span className="card-sheen" aria-hidden="true" />
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




  /* A rail name holds a lens over its own row — the same machinery as the
     sentence's bucket words, one interaction language across the site.
     Clicking again lets go. */
  const focusSet = useCallback(
    (id) => {
      setHeldBucket((current) => {
        const key = `set:${id}`;
        const next = current === key ? null : key;
        setLens(next ? [id] : null);
        return next;
      });
    },
    []
  );

  /* Which bucket's lens is held, if any. Rail-name panels clear it. */
  const [heldBucket, setHeldBucket] = useState(null);

  const bucketHeld = useCallback((bucket) => heldBucket === bucket.id, [heldBucket]);

  const openBucket = useCallback(
    (bucket) => {
      setHeldBucket((current) => {
        const next = current === bucket.id ? null : bucket.id;
        setLens(next ? bucket.lens : null);
        return next;
      });
    },
    []
  );


  useEffect(() => {
    if (!lit) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") closeLit();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lit, closeLit]);

  useEffect(() => {
    if (!lens) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      setHeldBucket(null);
      setLens(null);
    };
    document.addEventListener("keydown", onKey);
    /* The stream has folded to the lit collection; go to its word. */
    const word = document.getElementById(`set-${lens[0]}`);
    word?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => document.removeEventListener("keydown", onKey);
  }, [lens]);

  const dim = useCallback((id) => Boolean(lens) && !lens.includes(id), [lens]);

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

  /* While a lens is held, any press on open paper — anything that is not a
     button or a link — lets the site back in. */
  const releaseOnPaper = useCallback(
    (event) => {
      if (!lens) return;
      if (event.target.closest("button, a")) return;
      setHeldBucket(null);
      setLens(null);
    },
    [lens]
  );

  return (
    <section className="akibwa-home" onClick={releaseOnPaper}>
      {inkOn ? <InkPaper /> : null}
      <div
        className={`page-grid deck${lens ? " is-lensed" : ""}`}
        ref={deckRef}
        aria-label="Everything on one wall"
      >

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

        {sets.map((set) => {
          const cards = cardsFor(set.id);
          /* One library: the word leads its collection and the next
             collection continues in the same stream — a single wrapping
             flow, no blocks, no rows of its own. */
          const flow =
            set.id === "jobs" ? (
              <>
                {cards}
                {cardsFor("tools", { as: "jobs" })}
              </>
            ) : set.id === "sites" ? (
              <>
                {cards}
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
                {cardsFor("creations", { as: "sites" })}
              </>
            ) : (
              cards
            );

          return (
            <Fragment key={set.id}>
              <h2 className="set-name" id={`set-${set.id}`}>
                <button
                  type="button"
                  className={`rail-word${dim(set.id) ? "" : " is-lit"}`}
                  style={{ "--index-accent-rgb": INDEX_ACCENT[set.id] }}
                  aria-expanded={heldBucket === `set:${set.id}`}
                  onClick={() => focusSet(set.id)}
                >
                  {set.label}
                </button>
              </h2>
              {flow}
            </Fragment>
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
