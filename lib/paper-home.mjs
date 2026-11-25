// Compile the public sources once during export. The page gets one catalogue
// with the facts it displays, including track lists and each record's years.
import { unpackRanking } from "../components/paper/music-ranking.mjs";
import { indexItems } from "../components/paper/music-search.mjs";
import { mergeShelf, yearPairs } from "../components/paper/music-shelf.mjs";

export function compileCatalogue(packet, meta, years, kinds, versionOf) {
  const { albums, songs, sleeves, singles } = unpackRanking(packet);
  const records = mergeShelf(albums, songs, sleeves, singles);
  const index = indexItems(records, { meta, yearOf: item => Number(item.year) || meta.years?.[item.art] || null });
  const artists = [];
  const artistIds = new Map();
  const rows = index.entries.map(({ item, artist, circle, genres, year }) => {
    if (!artistIds.has(item.artist)) {
      artistIds.set(item.artist, artists.length);
      artists.push([item.artist, artist, circle, genres, kinds.artists[item.artist] ?? null, kinds.subs?.[item.artist] ?? null]);
    }
    const tracks = item.tracks ?? item.fallback ?? [];
    const titles = new Set(tracks.map(track => track.title));
    const otherTitles = [...new Set(item.songs.map(song => song.title).filter(title => !titles.has(title)))];
    return [
      item.key, item.title, artistIds.get(item.artist), year, item.plays, item.minutes,
      item.art === item.id ? "" : item.art, versionOf(item.art),
      tracks.map(track => [track.title, track.plays, track.minutes]), otherTitles,
      (yearPairs(item, years) ?? []).filter(([, minutes]) => minutes >= 60)
    ];
  });
  return { artists, credited: index.credited, genres: kinds.kinds, subgenres: kinds.subkinds ?? null, rows };
}
