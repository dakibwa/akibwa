import variants from "./image-variants.json";

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

function versionedSrc(src, version) {
  if (!version || src.includes("?")) return src;
  return `${src}?v=${version}`;
}

// The generator names every file `_img/<source>-<slot>-<width>.<format>`, so
// the manifest carries only widths and formats rather than each path.
function variantSrc(src, slot, width, format) {
  return `/_img${src.slice(0, src.lastIndexOf("."))}-${slot}-${width}.${format}`;
}

function srcSet(src, slot, entry, format, version) {
  if (!(entry.formats ?? ["avif", "webp"]).includes(format)) return "";
  return entry.widths
    .map((width) => `${versionedSrc(variantSrc(src, slot, width, format), version)} ${width}w`)
    .join(", ");
}

/*
 * `priority` and `above` answer two different questions. `priority` means
 * "fetch this first" (fetchpriority="high"); `above` means "this tile is on the
 * first screen", so it loads eagerly. Conflating them put fetchpriority="high"
 * on images nobody had asked for while every visible tile waited behind lazy
 * loading.
 */
export function SiteImage({
  src,
  slot,
  revision,
  sizes,
  alt = "",
  priority = false,
  above = false,
  aboveSync = false,
  className,
  style,
  draggable,
  ...rest
}) {
  const entry = variants[`${slot}:${src}`];
  // A new crop can reuse the source bytes. Give those derived images an
  // explicit revision so returning visitors receive the updated framing.
  const version = [entry?.sourceHash, revision].filter(Boolean).join("-");

  const img = (
    <img
      src={versionedSrc(src, version)}
      alt={alt}
      // The slot ladder tops out at 1.5x DPR, so let the browser know the
      // intrinsic dimensions either way — it keeps the aspect ratio reserved.
      width={entry?.sourceWidth}
      height={entry?.sourceHeight}
      // A lazy image above the fold is late twice over: the preload scanner
      // skips lazy images entirely, so the request is not even issued until
      // the HTML has parsed and the element's position is known.
      loading={above || priority ? "eager" : "lazy"}
      // Deliberately NOT fetchpriority="high" on the wall: fifty high-priority
      // tiles flatten the priority curve and starve the CSS. Eager alone is
      // the win.
      fetchPriority={priority ? "high" : undefined}
      // Synchronous decode presents the tile on the frame it lands rather
      // than whenever an off-thread decode happens to finish — which is what
      // turned one printed sheet into forty independent pops. Main-thread
      // work, so it is capped well below the eager count.
      decoding={aboveSync ? "sync" : "async"}
      className={className}
      style={style}
      draggable={draggable ?? false}
      {...rest}
    />
  );

  if (!entry) return img;

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(src, slot, entry, "avif", version)} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(src, slot, entry, "webp", version)} sizes={sizes} />
      {img}
    </picture>
  );
}

/*
 * Album sleeves for the Music shelf.
 *
 * They do not go through the slot manifest above, and deliberately so: every
 * source there is a file committed to `public/`, while the printed sleeves come
 * from print masters that live outside the repo. scripts/build-album-art.mjs
 * (printed), fetch-lastfm-art.mjs and build-listening-artwork.mjs write one
 * 264px rung straight to `public/album-art/<id>-wall.<fmt>`, so the paths are
 * derivable from the id and need no manifest lookup. AVIF first, WebP behind.
 */
export function AlbumArtImage({
  id,
  alt = "",
  priority = false,
  above = false,
  aboveSync = false,
  className,
  ...rest
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={`/album-art/${id}-wall.avif`} />
      <img
        src={`/album-art/${id}-wall.webp`}
        alt={alt}
        loading={above || priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding={aboveSync ? "sync" : "async"}
        draggable="false"
        className={className}
        {...rest}
      />
    </picture>
  );
}
