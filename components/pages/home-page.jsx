"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HeroFlipName } from "@/components/hero-word-cycle";
import { InkPaper } from "@/components/ink-paper";
import { PageFooter } from "@/components/page-footer";
import { AlbumArtImage, SiteImage, SLOT_SIZES } from "@/components/site-image";
import { deck, sites, life, games, tv, sets, graceland, instagramUrl } from "@/components/deck-data";

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
  const figureRef = useRef(null);
  const [entered, setEntered] = useState(false);
  const closingRef = useRef(false);

  /* Leaving is the arrival played backwards: the card returns to its slot on
     the wall, the paper clears, and only then does the overlay unmount. */
  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const fig = figureRef.current;
    if (!fig || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    const to = fig.getBoundingClientRect();
    const { from } = lit;
    const dx = from.x + from.w / 2 - (to.left + to.width / 2);
    const dy = from.y + from.h / 2 - (to.top + to.height / 2);
    const scale = from.w / to.width;
    setEntered(false);
    fig.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    window.setTimeout(onClose, 420);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  /* The wall's faces load lazily, and a face replayed inside this overlay
     keeps that attribute — where, mid-FLIP, the lazy gate never fires and the
     image simply never fetches. The spotlight is the one place the visitor
     has explicitly asked for the picture, so everything in it loads now —
     and the full-size layer announces itself the moment it has pixels. */
  useLayoutEffect(() => {
    const fig = figureRef.current;
    if (!fig) return;
    fig.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      img.loading = "eager";
    });
    fig.querySelectorAll(".card-face--hi img").forEach((img) => {
      const ready = () => img.classList.add("is-ready");
      if (img.complete && img.naturalWidth > 0) ready();
      else img.addEventListener("load", ready, { once: true });
    });
  }, [lit]);

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
      onClick={(event) => event.target === event.currentTarget && close()}
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

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = window.setInterval(() => setSpot((v) => (v + 1) % SPOT_ORDER.length), 1400);
    return () => window.clearInterval(id);
  }, []);




  /* Grid reflows snap; a view transition morphs them — and a morph is only
     as good as its names. Every card near the viewport gets a transition
     name for the duration, so survivors glide to their packed slots and
     leavers dissolve in place, instead of one flat crossfade. Capped and
     viewport-scoped: naming all 366 would ask the compositor to track
     hundreds of layers for cards nobody can see. Progressive: browsers
     without the API just get the plain state change. */
  const withMorph = useCallback((apply) => {
    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      apply();
      return;
    }
    const cards = [...(deckRef.current?.querySelectorAll(".card") ?? [])];
    const near = [];
    for (const el of cards) {
      if (near.length >= 120) break;
      const r = el.getBoundingClientRect();
      if (r.bottom > -window.innerHeight && r.top < window.innerHeight * 2.5) near.push(el);
    }
    near.forEach((el, i) => {
      el.style.viewTransitionName = `deck-${i}`;
    });
    const transition = document.startViewTransition(apply);
    transition.finished.finally(() => {
      near.forEach((el) => {
        el.style.viewTransitionName = "";
      });
    });
  }, []);

  /* A rail name holds a lens over its own row — the same machinery as the
     sentence's bucket words, one interaction language across the site.
     Clicking again lets go. */
  const focusSet = useCallback(
    (id) => {
      withMorph(() => {
      setHeldBucket((current) => {
        const key = `set:${id}`;
        const next = current === key ? null : key;
        setLens(next ? [id] : null);
        return next;
      });
      });
    },
    [withMorph]
  );

  /* Which bucket's lens is held, if any. Rail-name panels clear it. */
  const [heldBucket, setHeldBucket] = useState(null);

  const bucketHeld = useCallback((bucket) => heldBucket === bucket.id, [heldBucket]);

  const openBucket = useCallback(
    (bucket) => {
      withMorph(() => {
      setHeldBucket((current) => {
        const next = current === bucket.id ? null : bucket.id;
        setLens(next ? bucket.lens : null);
        return next;
      });
      });
    },
    [withMorph]
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
    /* The stream has folded to the lit collection — go to the top of the
       wall, hero and key included. Scrolling to the held word instead put it
       at the very top of the viewport, which shoved the hero off screen for
       any collection tall enough to scroll and stayed put for the rest: the
       one word with a long collection seemed to behave differently. */
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  /* The sentence's own words are its menu: a noun opens one collection, a
     verb holds a lens over its half of the wall. */
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

  const BucketWord = ({ bucket, children }) => (
    <button
      type="button"
      className={`hero-index-word hero-index-word--verb${bucketHeld(bucket) ? " is-held" : ""}`}
      style={{ "--index-accent-rgb": bucket.accent }}
      aria-expanded={bucketHeld(bucket)}
      onClick={() => openBucket(bucket)}
    >
      {children}
    </button>
  );

  /* Career leads the front of the wall with its two current roles; the six
     past ones are dealt through the blend below with everything else. */
  const jobCards = cardsFor("jobs");

  return (
    <section className="akibwa-home" onClick={releaseOnPaper}>
      {inkOn ? <InkPaper /> : null}
      <div
        className={`page-grid deck${lens ? " is-lensed" : ""}`}
        ref={deckRef}
        aria-label="Everything on one wall"
      >

        <div className="deck-hero">
          {/* One sentence across the whole top of the page, and the menu is
              simply three of its words. Nothing else up here at all. */}
          {/* The sentence is the menu. Every coloured noun opens its
              collection, and the two verbs hold a lens over their halves —
              nothing separate below it, no second row of words. */}
          <h1 className="hero-sentence">
            <HeroFlipName /> — the things I{" "}
            <BucketWord bucket={BUCKETS[0]}>built</BucketWord>:{" "}
            <SetWord set={SET.sites}>projects</SetWord>, a <SetWord set={SET.jobs}>career</SetWord>, a{" "}
            <SetWord set={SET.life}>life</SetWord>. The things I{" "}
            <BucketWord bucket={BUCKETS[1]}>love</BucketWord>:{" "}
            <SetWord set={SET.music}>music</SetWord>, <SetWord set={SET.films}>films</SetWord>,{" "}
            <SetWord set={SET.games}>games</SetWord>, <SetWord set={SET.tv}>TV</SetWord>.
          </h1>
        </div>


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


/* The menu is four buckets, and every one behaves the same way: it gathers
   its rows to the top and lets the rest of the page recede — no unfolding,
   no reflow. The rows themselves are the content; the panels wait behind the
   rail names. */
const TASTE = ["music", "films", "games", "tv"];
/* Two verbs carry the sentence: "built" holds a lens over everything made —
   the sites, the career, the life pieces — and "love" over the four taste
   collections. They wear the ink rather than a collection's colour, because
   each is an umbrella over several. */
const BUCKETS = [
  { id: "built", accent: "40, 42, 48", lens: ["sites", "jobs", "life"] },
  { id: "love", accent: "40, 42, 48", lens: TASTE }
];

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
