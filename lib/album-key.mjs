/*
 * The one normalisation the album wall joins on.
 *
 * This module exists because the key is computed in three places that must
 * agree exactly — the build-time matcher, the Last.fm art fetcher, and the
 * Cloudflare Worker that refreshes play counts. It was copied into all three
 * first, with a comment in each saying "must stay identical", which is a
 * standing invitation for them to drift. When they drift the failure is silent:
 * every sleeve reads zero plays and the wall looks abandoned rather than broken.
 * Wrangler bundles with esbuild, so the Worker imports this file like anything
 * else.
 *
 * What it has to absorb: a printed sleeve says "Graceland", and Last.fm holds
 * "Graceland" and "Graceland (25th Anniversary Deluxe Edition)" as separate
 * albums with separate play counts. Left alone that splits 123 plays into 70 and
 * 53 and drops the record thirty places down a wall whose entire purpose is the
 * ranking. Forty-one rows in Dan's library collapse this way.
 */

// Words that mark a parenthetical as an edition label rather than part of the
// title. "Bitches Brew (Legacy Edition)" is an edition; "(What's the Story)
// Morning Glory?" is not, and survives because it contains none of these.
const EDITION_WORDS = [
  "deluxe",
  "expanded",
  "remaster(?:ed)?",
  "anniversary",
  "edition",
  "version",
  "bonus track",
  "mono",
  "stereo",
  "reissue",
  "re-issue",
  "special",
  "extended",
  "explicit",
  "clean",
  "original motion picture soundtrack",
  "motion picture soundtrack",
  "soundtrack",
  "ost",
  "remix(?:ed)?",
  "instrumental",
  "acoustic"
].join("|");

/*
 * Drop the whole bracketed group when an edition word appears anywhere inside
 * it. Matching only from the keyword onwards was the original bug: in
 * "(25th Anniversary Deluxe Edition)" the group opens with "25th", so a pattern
 * anchored at the bracket never fires and one anchored at "Anniversary" eats
 * only the tail — leaving "Graceland (25th" as the key.
 */
const BRACKETED_EDITION = new RegExp(`\\s*[([][^)\\]]*\\b(?:${EDITION_WORDS})\\b[^)\\]]*[)\\]]`, "gi");

// The same label written with a dash instead of brackets, which Last.fm also
// does: "Madame George - 2015 Remaster".
const TRAILING_EDITION = new RegExp(`\\s*[-–—]\\s*[^-–—]*\\b(?:${EDITION_WORDS})\\b[^-–—]*$`, "i");

export function stripEdition(title) {
  return String(title || "")
    .replace(BRACKETED_EDITION, " ")
    .replace(TRAILING_EDITION, "");
}

export function clean(value) {
  return String(value || "")
    .normalize("NFKD")
    // Strip combining marks so "Sigur Rós" and "Sigur Ros" are one artist.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    // A leading article is the most common single difference between a printed
    // sleeve and a scrobble.
    .replace(/^\s*(?:the|a|an)\s+/, "")
    .trim();
}

export function normaliseKey(artist, album) {
  return `${clean(artist)}::${clean(stripEdition(album))}`;
}
