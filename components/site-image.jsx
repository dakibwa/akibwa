import ReactDOM from "react-dom";
import variants from "./image-variants.json";

/*
 * The `sizes` each slot resolves against, mirroring the widths
 * scripts/generate-image-variants.mjs laddered for it.
 *
 * These live here, in a module with no "use client", because both server and
 * client components need them: a preload declared server-side must resolve to
 * the same rung the client-rendered <picture> settles on, or the browser
 * fetches the artwork twice. Exporting them from a client component instead
 * hands the server a client-reference proxy rather than the string, and the
 * sizes silently vanish from the preload.
 */
export const SLOT_SIZES = {
  // Four-up above 1060px, two-up to 760, then full-bleed — and the frame's
  // gutter tightens from 48px to 32px at that last step. Each term is the art
  // box, so the card's 22px of padding and border comes off every one.
  areaTile:
    "(max-width: 760px) calc(100vw - 54px), (max-width: 1060px) calc(50vw - 59px), (max-width: 1358px) calc(25vw - 53.5px), 286px",
  projectCard: "(max-width: 760px) calc(100vw - 48px), 202px",
  heroPanel16: "(max-width: 760px) calc(100vw - 48px), (max-width: 1060px) 520px, 425px",
  heroPanel43: "(max-width: 760px) calc(100vw - 48px), (max-width: 1060px) 520px, 425px",
  portrait: "(max-width: 1060px) calc(100vw - 48px), 411px",
  aboutIntro: "(max-width: 1060px) calc(100vw - 48px), 768px"
};

/*
 * The static export cannot use next/image's optimiser, so `<SiteImage>` serves
 * the ladder that scripts/generate-image-variants.mjs pre-rendered: AVIF first,
 * WebP behind it, and the untouched original as the last resort for anything
 * the generator does not know about.
 *
 * `slot` names the layout the image renders into — the same key the generator
 * cropped and laddered against. Passing a slot the manifest has no entry for
 * falls back to a plain <img> on the original file, so a missing binding
 * degrades to today's behaviour rather than a broken image.
 */

function srcSet(entries, format) {
  return entries
    .filter((entry) => entry[format])
    .map((entry) => `${entry[format].src} ${entry.width}w`)
    .join(", ");
}

/*
 * The one-rung path, for art painted as a CSS background where srcset does not
 * apply. Returns the WebP rung rather than the AVIF one: these are already a
 * few KB, and a background cannot fall back per-format without image-set(),
 * which is awkward to express in an inline style object. Unknown sources pass
 * straight through, so an unregistered background keeps working.
 */
export function resolveBackground(src, slot) {
  const entry = variants[`${slot}:${src}`];
  return entry?.variants[0]?.webp?.src ?? src;
}

/*
 * Preload a CSS background, which the browser cannot discover until the
 * stylesheet has resolved. Resolves to the same single rung as
 * resolveBackground, so the preload and the paint agree.
 */
export function preloadBackground(src, slot) {
  ReactDOM.preload(resolveBackground(src, slot), { as: "image", fetchPriority: "high" });
}

export function SiteImage({
  src,
  slot,
  sizes,
  alt = "",
  priority = false,
  className,
  style,
  draggable,
  ...rest
}) {
  const entry = variants[`${slot}:${src}`];

  const img = (
    <img
      src={src}
      alt={alt}
      // The ladder tops out at 1.5x DPR, so let the browser know the intrinsic
      // box either way — it keeps the aspect ratio reserved before bytes land.
      width={entry?.sourceWidth}
      height={entry?.sourceHeight}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
      style={style}
      draggable={draggable}
      {...rest}
    />
  );

  if (!entry) return img;

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(entry.variants, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(entry.variants, "webp")} sizes={sizes} />
      {img}
    </picture>
  );
}

/*
 * Preload the rung a given viewport will actually pick, so an above-the-fold
 * image starts downloading with the stylesheet rather than after it.
 *
 * This goes through ReactDOM.preload rather than rendering a <link>: React
 * hoists resources declared this way into <head>, whereas a plain <link> from
 * a component stays where it is rendered, in the body, which is later than the
 * <picture> it was meant to get ahead of.
 */
export function preloadSiteImage({ src, slot, sizes }) {
  const entry = variants[`${slot}:${src}`];
  if (!entry) {
    ReactDOM.preload(src, { as: "image", fetchPriority: "high" });
    return;
  }

  // AVIF only: every browser that lacks AVIF also ignores the preload's
  // imagesrcset, so it would otherwise pull the original as a second copy.
  ReactDOM.preload(entry.variants[0].avif.src, {
    as: "image",
    type: "image/avif",
    imageSrcSet: srcSet(entry.variants, "avif"),
    imageSizes: sizes,
    fetchPriority: "high"
  });
}
