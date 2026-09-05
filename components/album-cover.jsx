import { AlbumArtImage } from "./site-image";

export function AlbumCover({ album }) {
  if (album.artwork !== false) return <AlbumArtImage id={album.id} rung="wall" alt="" />;
  const tint = [...album.album].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 6;
  return <span className={`podcast-type-cover podcast-type-cover-${tint}`} aria-hidden="true">
    <small>{album.artist}</small>
    <strong>{album.album}</strong>
    <span>◉</span>
  </span>;
}
