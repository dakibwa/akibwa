/*
 * Album sleeves for the music shelf, the only artwork on the site. The static
 * export cannot use next/image's optimiser, so the rungs are pre-rendered:
 * scripts/build-album-art.mjs (printed), fetch-lastfm-art.mjs and
 * build-listening-artwork.mjs write one 264px rung straight to
 * `public/album-art/<id>-wall.<fmt>`, so the paths are derivable from the id
 * and need no manifest lookup. AVIF first, WebP behind.
 *
 * Sleeves the room can draw large also have a `-large` rung
 * (scripts/build-music-art.mjs); `large` is its width, and `sizes`, the width
 * the sleeve is drawn at, lets the browser choose between the two.
 */
export function AlbumArtImage({
  id,
  alt = "",
  large,
  sizes,
  priority = false,
  above = false,
  aboveSync = false,
  className,
  ...rest
}) {
  const ladder = (format) =>
    large ? `/album-art/${id}-wall.${format} 264w, /album-art/${id}-large.${format} ${large}w` : `/album-art/${id}-wall.${format}`;
  return (
    <picture>
      <source type="image/avif" srcSet={ladder("avif")} sizes={large ? sizes : undefined} />
      <img
        src={`/album-art/${id}-wall.webp`}
        srcSet={large ? ladder("webp") : undefined}
        sizes={large ? sizes : undefined}
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
