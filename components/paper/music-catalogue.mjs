import { fold } from "./music-search.mjs";

// Artist facts are shared by every release with that credit. Track titles
// remain in their packed rows until the sheet or a text search needs them.
export function openCatalogue({ artists, credited, genres, rows }) {
  const years = { albums: Object.create(null) };
  const kinds = { kinds: genres, artists: Object.create(null) };
  for (const [name, , , , kind] of artists) {
    if (kind !== null) kinds.artists[name] = kind;
  }
  const entries = rows.map(([key, title, artistId, year, plays, minutes, cover, version, tracks, otherTitles, history]) => {
    const [name, artist, circle, tags] = artists[artistId];
    const separator = key.indexOf("-");
    const id = key.slice(separator + 1);
    const item = {
      key, id, kind: key.slice(0, separator), title, year, artist: name,
      plays, minutes, art: cover === "" ? id : cover, version, tracks
    };
    years.albums[id] = history;
    let searchable;
    return {
      item, artist, circle, genres: tags, year,
      get text() {
        return searchable ??= fold([title, name, ...tracks.map(track => track[0]), ...otherTitles].join(" "));
      }
    };
  });
  return { entries, credited, kinds, years };
}
