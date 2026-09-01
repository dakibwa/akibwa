"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroFlipName } from "@/components/hero-word-cycle";
import { PageFooter } from "@/components/page-footer";
import { AlbumArtImage, SiteImage, SLOT_SIZES } from "@/components/site-image";
import { deck, sites, life, games, tv, podcasts, sets, graceland } from "@/components/deck-data";

/* Every set counts something, and its title card says how many. Counted off the
   arrays at render rather than written into the data, so the figure on the wall
   cannot outlive what is behind it. */

const PROJECTS_LENS = ["sites", "life"];
const CAREER_LENS = ["jobs"];

function resolveLens(hash, legend = LEGEND) {
  if (!hash) return null;
  if (hash === "everything") return null;
  const item = legend.find((entry) => entry.id === hash || entry.lens?.includes(hash));
  if (item) return { id: item.id, lens: item.lens };
  return null;
}

function lensFromLocation(legend) {
  const hash = window.location.hash.replace(/^#/, "");
  return (
    resolveLens(hash, legend) ??
    resolveLens(new URLSearchParams(window.location.search).get("set"), legend)
  );
}

function lensHref(id) {
  const url = new URL(window.location.href);
  url.searchParams.delete("set");
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}${id ? `#${id}` : ""}`;
}

function Card({ suit, keySet, ground, accent, crop, href, label, title, creator, meta, detail, onPreview, onSelect, selected, face, held, dim, size }) {
  const hasDetails = Boolean(title || creator);
  const accessibleLabel = hasDetails ? [title, creator, meta].filter(Boolean).join(", ") : label;
  const props = {
    className: `card card--${suit}${size === "small" ? " card--small" : ""}${href ? " card--link" : ""}${onSelect ? " card--detail" : ""}${selected ? " is-selected" : ""}${dim ? "" : " is-lit"}`,
    "data-suit": suit,
    "data-key": keySet ?? suit,
    hidden: held || undefined,
    style:
      ground || accent || crop
        ? { "--ground": ground, "--accent": accent, "--crop": crop }
        : undefined
  };

  const content = (
    <>
      <span className="card-face">{typeof face === "function" ? face() : face}</span>
      {href ? (
        <span className="card-label" aria-hidden="true">
          <span>{label}</span>
          <span className="card-label-arrow">↗</span>
        </span>
      ) : null}
      {hasDetails ? (
        <span className="card-info" aria-hidden="true">
          <strong>{title}</strong>
          <span>{creator}</span>
          {meta ? <small>{meta}</small> : null}
        </span>
      ) : null}
    </>
  );

  if (href) {
    const external = /^https?:/.test(href);
    return (
      <a
        {...props}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        aria-label={accessibleLabel}
      >
        {content}
      </a>
    );
  }

  if (onSelect && detail) {
    return (
      <button
        {...props}
        type="button"
        aria-label={accessibleLabel}
        aria-expanded={selected}
        aria-controls="taste-detail"
        onMouseEnter={() => onPreview(detail)}
        onFocus={() => onPreview(detail)}
        onBlur={() => onPreview(null)}
        onClick={() => onSelect(detail)}
      >
        {content}
      </button>
    );
  }

  return (
    <div {...props} role="img" aria-label={accessibleLabel} tabIndex={hasDetails ? 0 : undefined}>
      {content}
    </div>
  );
}

/* Taste behaves like the Career index: one compact visual row rather than a
   second page-length composition. Native horizontal overflow keeps the rail
   directly swipeable, while a filter change returns its new list to the start. */
function HorizontalTasteRail({ cards, activeId, label, onPreview }) {
  const railRef = useRef(null);

  useEffect(() => {
    railRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [activeId]);

  return (
    <div
      className="taste-wall"
      ref={railRef}
      role="list"
      aria-label={`${label} taste list`}
      data-card-count={cards.length}
      onMouseLeave={() => onPreview(null)}
    >
      {cards.map((card, index) => (
        <div className="taste-rail-item" role="listitem" key={card.key ?? `taste-${index}`}>
          {card}
        </div>
      ))}
    </div>
  );
}

/* The blend: each collection is dealt evenly through the whole stream rather
   than standing as its own block — item i of a collection of n lands at
   (i + φ) / n, and one sort by that position shuffles every collection through
   every other, deterministically. φ staggers the collections so equal-length
   lists do not zipper, and the leads (low i) still surface near the top. */
const PHASE = { music: 0.5, films: 0.23, games: 0.71, tv: 0.37, podcasts: 0.88, jobs: 0.81, tools: 0.11, creations: 0.61 };

/* The same deal, over counts rather than elements, so the first screen can
   be known before a single card is built. Identical maths and identical
   list order, and Array.sort is stable, so the two agree exactly. */
function blendOrder(lists) {
  return lists
    .flatMap(([id, n]) => Array.from({ length: n }, (_, i) => ({ id, i, at: (i + PHASE[id]) / n })))
    .sort((a, b) => a.at - b.at);
}

function blend(lists) {
  return lists
    .flatMap(([id, cards]) => cards.map((card, i) => ({ at: (i + PHASE[id]) / cards.length, card })))
    .sort((a, b) => a.at - b.at)
    .map((dealt) => dealt.card);
}

/* The proposition stays still; only the personal name alternates, preserving
   the small Daniel/Akibwa signature without bringing back a changing pitch. */
function HeroSentence() {
  return (
    <h1 className="hero-sentence">
      <HeroFlipName /> — this is what I’ve made, done and loved.
    </h1>
  );
}
function Mark({ src, tile }) {
  if (!src) return null;
  return (
    <span className={`c-mark${tile ? " c-mark--tile" : ""}`}>
      <img src={src} alt="" loading="lazy" decoding="async" />
    </span>
  );
}

const TASTE_ART_PATHS = [
  ["/film-posters/", "/taste-art/films/"],
  ["/game-covers/", "/taste-art/games/"],
  ["/tv-posters/", "/taste-art/tv/"]
];

function tasteArtSource(source) {
  const route = TASTE_ART_PATHS.find(([from]) => source.startsWith(from));
  return route ? source.replace(route[0], route[1]) : null;
}

/* Film, television and game cards use the title-specific editorial scene at
   every quilt scale. The hover label supplies the literal title and creator;
   the image can therefore stay expressive, edge-to-edge and free of poster
   boxes, inset covers and unnecessary display text. */
function TasteVisual({ source, above, aboveSync }) {
  const art = tasteArtSource(source);
  if (!art) {
    return (
      <SiteImage
        src={source}
        slot="deckTile"
        sizes={SLOT_SIZES.deckTile}
        alt=""
        className="c-art"
        above={above}
        aboveSync={aboveSync}
      />
    );
  }

  return (
    <span className="taste-visual" aria-hidden="true">
      <span className="taste-visual__scene">
        <SiteImage
          src={art}
          slot="tasteArt"
          sizes={SLOT_SIZES.tasteArt}
          alt=""
          className="c-art"
          above={above}
          aboveSync={aboveSync}
        />
      </span>
    </span>
  );
}

export function HomePage({ tasteOnly = false }) {
  const legend = tasteOnly ? TASTE_LEGEND : LEGEND;
  const [activeId, setActiveId] = useState("everything");
  const [previewTaste, setPreviewTaste] = useState(null);
  const [selectedTaste, setSelectedTaste] = useState(null);
  const activeFilter = legend.find((item) => item.id === activeId) ?? legend[0];
  const lens = activeFilter.lens;

  const selectFilter = useCallback((item, { replace = false } = {}) => {
    const nextId = item?.id ?? "everything";
    const href = lensHref(nextId === "everything" ? null : nextId);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (href !== current) {
      history[replace ? "replaceState" : "pushState"]({ lens: nextId }, "", href);
    }
    setPreviewTaste(null);
    setSelectedTaste(null);
    setActiveId(nextId);
  }, []);

  useEffect(() => {
    const applyLocation = () => {
      const locationFilter = lensFromLocation(legend);
      const available = locationFilter && legend.some((item) => item.id === locationFilter.id);
      setActiveId(available ? locationFilter.id : "everything");
    };
    applyLocation();
    window.addEventListener("popstate", applyLocation);
    return () => window.removeEventListener("popstate", applyLocation);
  }, [legend]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (selectedTaste) {
        setSelectedTaste(null);
        setPreviewTaste(null);
      } else if (activeId !== "everything") {
        selectFilter(legend[0]);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeId, legend, selectFilter, selectedTaste]);

  const dim = useCallback((id) => Boolean(lens) && !lens.includes(id), [lens]);
  const selectTaste = useCallback((detail) => {
    setSelectedTaste((current) => current?.id === detail.id ? current : detail);
  }, []);
  const activeTaste = selectedTaste ?? previewTaste;
  const tasteDetails = (id, kind, title, creator, meta) =>
    tasteOnly
      ? {
          title,
          creator,
          meta,
          detail: { id, kind, title, creator, meta },
          onPreview: setPreviewTaste,
          onSelect: selectTaste,
          selected: selectedTaste?.id === id
        }
      : {};

  /* How many of a collection lead at full size before the rest pack small —
     four small tiles to one large. The making sets stay large throughout.
     BEAT then lifts one tail card in every so many back to full size, so the
     deep wall keeps varying instead of settling into a uniform grain. */
  const LEAD = { music: 12, films: 8, games: 6, tv: 6, podcasts: 5, creations: 2, tools: 0 };
  const BEAT = { music: 24, films: 12, games: 9, tv: 11, podcasts: 5, creations: 6, tools: 7 };
  const sizeFor = (id, index) => {
    if (index < LEAD[id]) return undefined;
    return (index - LEAD[id]) % BEAT[id] === BEAT[id] - 1 ? undefined : "small";
  };
  const legacySizeFor = (id, index) => (tasteOnly ? undefined : sizeFor(id, index));

  const ABOVE_FOLD = 52;
  const SYNC_FOLD = 24;
  /* The eight cards at the front of the wall are always on the first screen;
     the rest of the budget is spent on whatever the blend deals first. */
  const FRONT = 8;
  const aboveOrder = blendOrder([
    ["music", deck.music.length],
    ["films", deck.films.length],
    ["games", games.length],
    ["tv", tv.length],
    ["jobs", Math.max(0, deck.jobs.length - 2)],
    ["tools", deck.tools.length],
    ["creations", deck.creations.length]
  ]);
  const aboveKeys = new Set(
    aboveOrder.slice(0, Math.max(0, ABOVE_FOLD - FRONT)).map((o) => `${o.id}:${o.i}`)
  );
  const syncKeys = new Set(
    aboveOrder.slice(0, Math.max(0, SYNC_FOLD - FRONT)).map((o) => `${o.id}:${o.i}`)
  );
  const firstScreen = (id, index) => ({
    above: aboveKeys.has(`${id}:${index}`),
    aboveSync: syncKeys.has(`${id}:${index}`)
  });

  const cardsFor = (id, { all = false, as, limit } = {}) => {
    /* `as` renders one collection inside another set's row — the toolkit
       rides with Jobs, so its cards dim, light and open as Jobs does. */
    const owner = as ?? id;
    const set = sets.find((s) => s.id === owner);
    const isDim = dim(owner);
    const cap = limit ?? (all ? Infinity : set?.cap ?? Infinity);
    if (id === "jobs") {
      /* Career is context rather than navigation, so these marks are visual
         objects with an accessible label, not 8 buttons that go nowhere. */
      return deck.jobs.map((job) => (
        <Card
          key={`job-${job.name}`}
          suit="jobs"
          dim={isDim}
          accent={job.accent}
          label={`${job.name}, ${job.role}`}
          face={
            job.logo ? (
              <span className="card-face-stack card-face-stack--solo">
                <Mark src={job.logo} tile={job.tile} />
              </span>
            ) : (
              <SiteImage src={job.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" />
            )
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
                  {/* The mark is the card; its accessible name supplies the rest. */}
                  <Mark src={tool.mark} tile={tool.mark?.endsWith(".png")} />
                </span>
              )}
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
          ground={site.ground}
          href={site.href ?? undefined}
          label={site.name}
          face={
            <SiteImage src={site.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" above aboveSync />
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
          ground={piece.ground}
          href={piece.href ?? undefined}
          label={piece.name}
          face={
            <SiteImage src={piece.art} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" above aboveSync />
          }
        />
      ));
    }

    if (id === "music") {
      return deck.music.slice(0, cap === Infinity ? deck.music.length : cap).map((album, index) => (
        <Card
          size={legacySizeFor("music", index)}
          key={`album-${album.id}`}
          suit="music"
          dim={isDim}
          label={`${album.artist} — ${album.album}`}
          {...tasteDetails(
            `music-${album.id}`,
            "Album",
            album.album || (album.artist ? "Untitled artwork" : "Unidentified sleeve"),
            album.artist || "Artist unknown",
            album.plays > 0 ? `${album.plays.toLocaleString("en-GB")} plays on Last.fm` : null
          )}
          face={<AlbumArtImage id={album.id} rung="wall" className="c-art" {...firstScreen("music", index)} />}
        />
      ));
    }

    if (id === "creations") {
      return deck.creations.slice(0, cap === Infinity ? deck.creations.length : cap).map((post, index) => {
        return (
          <Card
            size={sizeFor("creations", index)}
            key={`collision-${post.number}`}
            suit="creations"
            keySet="sites"
            dim={isDim}
            label={`Cover Collision ${post.number}: ${post.title}`}
            face={
              <SiteImage src={post.image} slot="deckTile" sizes={SLOT_SIZES.deckTile} alt="" className="c-art" {...firstScreen("creations", index)} />
            }
          />
        );
      });
    }

    if (id === "films") {
      return deck.films.slice(0, cap === Infinity ? deck.films.length : cap).map((film, index) => (
        <Card
          size={legacySizeFor("films", index)}
          key={`film-${film.title}`}
          suit="films"
          dim={isDim}
          label={film.title}
          {...tasteDetails(`film-${film.title}`, "Film", film.title, film.director)}
          face={() => <TasteVisual source={film.poster} {...firstScreen("films", index)} />}
        />
      ));
    }

    if (id === "games") {
      return games.slice(0, cap === Infinity ? games.length : cap).map((game, index) => (
        <Card
          size={legacySizeFor("games", index)}
          key={`game-${game.title}`}
          suit="games"
          dim={isDim}
          label={game.title}
          {...tasteDetails(`game-${game.title}`, "Game", game.title, game.studio)}
          face={() => <TasteVisual source={game.cover} {...firstScreen("games", index)} />}
        />
      ));
    }

    if (id === "tv") {
      return tv.slice(0, cap === Infinity ? tv.length : cap).map((show, index) => (
        <Card
          size={legacySizeFor("tv", index)}
          key={`tv-${show.title}`}
          suit="tv"
          dim={isDim}
          label={show.title}
          {...tasteDetails(`tv-${show.title}`, "Television", show.title, show.creator)}
          face={() => <TasteVisual source={show.poster} {...firstScreen("tv", index)} />}
        />
      ));
    }

    if (id === "podcasts") {
      return podcasts.slice(0, cap === Infinity ? podcasts.length : cap).map((podcast, index) => (
        <Card
          size={legacySizeFor("podcasts", index)}
          key={`podcast-${podcast.title}`}
          suit="podcasts"
          dim={isDim}
          label={`${podcast.title} — ${podcast.creator}`}
          {...tasteDetails(`podcast-${podcast.title}`, "Podcast", podcast.title, podcast.creator)}
          face={
            <SiteImage
              src={podcast.cover}
              slot="deckTile"
              sizes={SLOT_SIZES.deckTile}
              alt=""
              className="c-art"
            />
          }
        />
      ));
    }

    return null;
  };

  /* The wall only changes when the selected word changes. */
  /* The first screen, resolved before anything renders. Thirteen columns by
     four rows at the widest frame; the front of the wall always leads, and
     the rest comes off the blend in DOM order. Sync decoding is main-thread
     work, so it is capped well below the eager count. */
  const wall = useMemo(() => {
    const gracelandCard = (
      <Card
        key="graceland"
        suit="music"
        dim={dim("music")}
        label={`${graceland.artist} — ${graceland.album}`}
        {...tasteDetails("music-graceland", "Album", graceland.album, graceland.artist)}
        face={
          <SiteImage
            src={graceland.art}
            slot="deckTile"
            sizes={SLOT_SIZES.deckTile}
            alt=""
            className="c-art"
            above
            aboveSync
          />
        }
      />
    );

    if (tasteOnly) {
      /* The opening edit is deliberately finite: ten favourites from each
         medium, with Graceland first. Choosing a medium replaces that edit
         with its complete shelf, so the archive remains intact without
         asking every visitor to load and scan all 330 pieces at once. */
      const selectedTaste = activeId === "everything" ? null : activeId;
      const tasteLists = selectedTaste
        ? [[selectedTaste, cardsFor(selectedTaste, { all: true })]]
        : [
            ["music", cardsFor("music", { limit: TASTE_HIGHLIGHTS_PER_SECTION })],
            ["films", cardsFor("films", { limit: TASTE_HIGHLIGHTS_PER_SECTION })],
            ["games", cardsFor("games", { limit: TASTE_HIGHLIGHTS_PER_SECTION })],
            ["tv", cardsFor("tv", { limit: TASTE_HIGHLIGHTS_PER_SECTION })],
            ["podcasts", cardsFor("podcasts", { all: true })]
          ];

      return [
        !selectedTaste || selectedTaste === "music" ? gracelandCard : null,
        ...blend(tasteLists)
      ].filter(Boolean);
    }

    /* Career leads the front of the wall with its two current roles; the
       six past ones are dealt through the blend below with everything
       else. */
    const jobCards = cardsFor("jobs");
    return (
      <>
        {/* The front of the wall: the things made, the life pieces, the two
            current roles — and Graceland, important without breaking scale. */}
        {cardsFor("sites")}
        {gracelandCard}
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
  }, [activeId, lens, selectedTaste?.id, tasteOnly]);

  return (
    <section className={`akibwa-home${tasteOnly ? " akibwa-home--taste" : ""}`}>
      <div
        className={`page-grid deck${lens ? " is-lensed" : ""}`}
        aria-label={tasteOnly ? "Music, films, games, television and podcasts" : "Everything on one wall"}
      >
        <div className="deck-hero">
          <HeroSentence />
          <nav className="deck-legend" aria-label="Filter the wall">
            {legend.map((set) => (
              <button
                key={set.id}
                id={`set-${set.id}`}
                type="button"
                className={`rail-word${activeId === set.id ? " is-active" : ""}`}
                style={{ "--index-accent-rgb": set.accent }}
                aria-pressed={activeId === set.id}
                aria-label={
                  tasteOnly
                    ? set.id === "everything"
                      ? "Show Taste highlights"
                      : `Show all ${set.label}`
                    : undefined
                }
                onClick={() => selectFilter(set)}
              >
                {set.label}
              </button>
            ))}
          </nav>
        </div>

        {tasteOnly ? (
          <>
            <HorizontalTasteRail
              cards={wall}
              activeId={activeId}
              label={activeFilter.label}
              onPreview={setPreviewTaste}
            />
            <div
              className={`taste-detail-shell${activeTaste ? " is-open" : ""}`}
              id="taste-detail"
              aria-hidden={!activeTaste}
            >
              <div className="taste-detail-clip">
                {activeTaste ? (
                  <div className="taste-detail">
                    <span className="taste-detail-kind">{activeTaste.kind}</span>
                    <strong>{activeTaste.title}</strong>
                    <span>{activeTaste.creator}</span>
                    {activeTaste.meta ? <small>{activeTaste.meta}</small> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : wall}
      </div>

      {tasteOnly ? null : <PageFooter />}
    </section>
  );
}

/* One accent per set for the legend — the same ink each card wears on its
   baseline, so the key and the wall agree. */
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
  tv: "0, 154, 205",
  podcasts: "164, 74, 126"
};

/* Projects is the one word for the work and life pieces Dan has made. The
   unfiltered wall stays explicit, so a selected word never has to double as
   a hidden reset control. */
const LEGEND = [
  { id: "everything", label: "Everything", lens: null, accent: "32, 32, 30" },
  { id: "projects", label: "Projects", lens: PROJECTS_LENS, accent: INDEX_ACCENT.sites },
  { id: "career", label: "Career", lens: CAREER_LENS, accent: INDEX_ACCENT.jobs },
  ...sets.slice(2).map((set) => ({ ...set, lens: [set.id], accent: INDEX_ACCENT[set.id] }))
];

const TASTE_LEGEND = LEGEND.filter((item) =>
  ["everything", "music", "films", "games", "tv"].includes(item.id)
)
  .map((item) => (item.id === "everything" ? { ...item, label: "Highlights" } : item))
  .concat({ id: "podcasts", label: "Podcasts", lens: ["podcasts"], accent: INDEX_ACCENT.podcasts });

const TASTE_HIGHLIGHTS_PER_SECTION = 10;


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
