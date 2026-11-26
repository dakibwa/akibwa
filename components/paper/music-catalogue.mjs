import { fold } from "./music-search.mjs";

// Artist facts are shared by every release with that credit. Track titles
// remain in their packed rows until the sheet or a text search needs them.
export function openCatalogue({ artists, credited, genres, subgenres, refiled, rows }) {
  const years = { albums: Object.create(null) };
  // Each artist's genre, and its sub-genre within that genre; and the few
  // records filed apart from their artist, by id.
  const kinds = { kinds: genres, subkinds: subgenres ?? null, artists: Object.create(null), subs: Object.create(null), records: refiled ?? null };
  for (const [name, , , , kind, sub] of artists) {
    if (kind !== null) kinds.artists[name] = kind;
    if (sub !== null && sub !== undefined) kinds.subs[name] = sub;
  }
  const entries = rows.map(([key, title, artistId, year, plays, minutes, cover, version, tracks, otherTitles, history]) => {
    const [name, artist, circle, tags, , , kin] = artists[artistId];
    const separator = key.indexOf("-");
    const id = key.slice(separator + 1);
    const item = {
      key, id, kind: key.slice(0, separator), title, year, artist: name,
      plays, minutes, art: cover === "" ? id : cover, version, tracks
    };
    years.albums[id] = history;
    let searchable;
    return {
      item, artist, circle, kin: kin ?? [], genres: tags, year,
      get text() {
        return searchable ??= fold([title, name, ...tracks.map(track => track[0]), ...otherTitles].join(" "));
      }
    };
  });
  return { entries, credited, kinds, years };
}
