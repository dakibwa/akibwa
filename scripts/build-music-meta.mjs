/*
 * What the Music room knows beyond titles: each artist's genres, the artists
 * they belong to or work as (Paul Simon → Simon & Garfunkel, Panda Bear →
 * Animal Collective), the other artists on the shelf their records belong
 * with, and the year each sleeve was released, so a search can ask for a
 * genre or an era (Dan, 25 September 2026) and a record lights the records
 * that go with it.
 *
 * From MusicBrainz, whose core data is CC0. For every artist in
 * public/music-ranking.json:
 * - who they are: the artists MusicBrainz credits on one of their own records
 *   here, each by its id. A name alone finds the wrong act too often (there
 *   are many called Girls, Low or Love), and a joint credit such as "Nick
 *   Cave & Warren Ellis" is no artist of its own: its record names both.
 * - every band, member, alias and collaboration of each, with none left out.
 *   The first eight used to be kept, which lost Ringo from The Beatles and
 *   Jason Pierce from Spiritualized.
 * and a release-group search for every sleeve the catalogue gives no year.
 * Requests are spaced to MusicBrainz's one a second and cached in
 * .album-art-cache/, which is not committed.
 *
 *   node scripts/build-music-meta.mjs                    new artists, and any not found before
 *   node scripts/build-music-meta.mjs --all              every artist again
 *   node scripts/build-music-meta.mjs "--again=A|B"      those artists again
 *
 * Writes data/music-links.json, what MusicBrainz said, kept so the next run
 * asks only about new artists; and public/music-meta.json: { artists: {
 * name: { genres, related, kin } }, years: { sleeve id: year } }, where `kin`
 * is worked out by lib/music-kin.mjs.
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { unpackRanking } from "../components/paper/music-ranking.mjs";
import { mergeShelf } from "../components/paper/music-shelf.mjs";
import { kinOf } from "../lib/music-kin.mjs";

const root = new URL("../", import.meta.url).pathname;
const cacheDir = path.join(root, ".album-art-cache");
const AGENT = "akibwa-music-search/1.0 (https://akibwa.com)";
const SPACING = 1250;

// Release years checked by hand where MusicBrainz finds no match for the
// catalogue's title (26 September 2026). Her's score came out in 2021.
const REVIEWED_YEARS = {
  "lf-8e9c2fc439ba2bd6": 2015, // Surf
  "lf-f145710c4a0a4cee": 2011, // Submarine
  "lf-b1e6e583a5575429": 1993, // Red House Painters I
  "history-7abaf827ee921950": 1978, // Music for Airports
  "history-cbcfb31c92d03017": 1983, // Apollo
  "history-e1cbfbc8406426ee": 2021, // Her (Original Score)
  // 25 November 2026: the shelf can be ordered by release date, so the
  // records MusicBrainz could not date were dated by hand where the year
  // is certain: an album's first release, or a single's own.
  "lf-734713a64f1317e0": 2016, // Blackstar
  "lf-e6ca4651bb113f0a": 1967, // The Velvet Underground & Nico
  "lf-26dab1d3cb3c9703": 2025, // The Smashing Machine
  "history-82b9331b1b906c11": 2011, // Bon Iver
  "lf-39d2b6e8f955090e": 2016, // Big Baby DRAM
  "history-59ece965436669f1": 2016, // Friends
  "history-f45109d580f514ea": 2018, // Distant Sky
  "lf-7cd84b1e6880c848": 1969, // David Bowie (Space Oddity)
  "lf-2ad7c49d0d91f474": 1996, // Crash into Me
  "history-eabf33a9a7f1576a": 2000, // Spirit They're Gone, Spirit They've Vanished
  "history-6f9dab5d7389f2bc": 2000, // Spirit They're Gone, Spirit They've Vanished
  "lf-513e4e5c8f8a7288": 1962, // Just in Time, from At the Village Gate
  "lf-46ee63f559fc19d9": 2020, // Windswept Adan
  "history-6688fd90b153a034": 1992, // 40oz. to Freedom
  "history-e67106254c447eae": 2014, // the long goodbye
  "lf-831d5595c20d1454": 1991, // Recurring
  "history-9719a50a406aa823": 2013, // Run the Jewels
  "history-5c30b1533c3a9180": 2014, // Caravan, from Whiplash
  "lf-bbf25bc9b7af52c7": 2000, // Fan-Tas-Tic, Vol. 2
  "lf-3c328bc4ed3868b7": 2021, // family ties
  "history-88b06b7a67e2b972": 1975, // Evening Star
  "history-cb1c83a47e307a95": 1973, // The Sun, from Now
  "lf-6ea6431256995d9c": 2014, // Birdman
  "lf-81afd4f845f2b073": 1972, // Bobby Charles
  "history-a249da7ce5de47c0": 2000, // Lift Your Skinny Fists Like Antennas to Heaven
  "history-637389a0c8332d7f": 2009, // All for the Best
  "lf-5dd31c66cb5f5122": 1990, // Wrong Way Up
  "history-2de425358d830775": 2020, // Idiot Prayer
  "history-d154abcf17484ffa": 1972, // Emergency Ward
  "lf-6d9b7e519f2dd34a": 2019, // All the Mirrors in the House
  "lf-035c97133b9e44ff": 1997, // Tracks and Traces
  "history-54693515f674dd5f": 2002, // Mali Music
  "history-ffa37883db60d7cd": 2024, // I Saw the TV Glow
  "single-404f64e6da391bce": 1992, // Godsend, from You Turn Me On
  "history-4163bafc9656006a": 1969, // Witchi Tai To
  "history-b56296ff9821e180": 2010, // An Introduction to Syd Barrett
  "history-e5cb8c1fb486e0d6": 1993, // Neroli
  "single-fddf5573a4536614": 2005, // Lower Your Eyelids to Die with the Sun
  "history-6b9304777d70b68b": 2011, // Shadows
  "single-436ac7035ebaa09e": 2008, // ManWomanBoogie, from The Renaissance
  "lf-97b4b712eba2f100": 2021, // Licorice Pizza
  "history-6de7b0630ccc55ce": 1960, // Eden's Island
  "single-5470eea1bffbc2a3": 1975, // Deluxe (Immer wieder)
  "lf-676c0edddc743675": 2020, // Welcome to Conceptual Beach
  "lf-b45d8e3ebc1187c7": 2003, // Speakerboxxx/The Love Below
  "lf-a7d0032ffa5d09dc": 2011, // The English Riviera
  "history-8beab64d99984cc0": 2001, // Haunt Me, Haunt Me Do It Again
  "history-9e830d85733e4b9d": 1979, // A Quick One While He's Away, the Rock and Roll Circus performance, first out on The Kids Are Alright
  "history-022a91697b97e650": 1984, // Vision Songs, Vol. 1
  "history-5d835f4b713424fd": 1982, // Sports Men, from Philharmony
  "history-748cc7dbd367a6d7": 2003, // Campfire Songs
  "lf-16558fc2f1cbbe85": 2014, // High Life
  "history-9cff02ad4c23aa27": 2020, // Laugh Now Cry Later
  "history-d571239fb426cbd4": 2021, // I Shall Wear a Crown
  "history-3ce2e814cedcf7f5": 1997, // Acetone
  "lf-095f0e9a1d8c9096": 2017, // Steve Lacy's Demo
  "history-0d2532f9f419aea6": 2008, // The Best of The Specials
  "history-f192d06f1d075585": 2016, // I Just Can't Help Believin', from The Wonder of You with the Royal Philharmonic Orchestra
  "history-52aff6674b51b837": 2017, // The Concert in Hyde Park
  "lf-78f63e80b2fc2365": 2003, // Magnolia Electric Co.
  "lf-c399b0cf206fd715": 2020, // Your Hero Is Not Dead
  "history-32343960640cea10": 2005, // Prisoners of Love
  "history-86ec3e03217dc6be": 1975, // The Word II
  "lf-8d5423b976893dc8": 2025, // New Threats from the Soul
  "history-95187d23f9e69633": 2012, // Moonrise Kingdom
  "lf-0e3454285be7519e": 2024, // Brat and it's completely different but also still brat
  "history-4d6849d687381239": 2023, // 7s
  // The same day, the 23 still without a year were researched one by one
  // with sources (an Astra pass Dan asked for: "there will definitely be a
  // date associated"), and the hand-dated list above was checked: two of
  // its years were of the song, not of the version on the shelf.
  "history-5b85bf0232dbbc17": 2017, // Interstellar, Main Theme (Geek Music's cover)
  "history-d5d6a516e23598d9": 2015, // Marhaba
  "history-bd96361cbb6d3d47": 1993, // Einstein on the Beach (the Nonesuch recording)
  "lf-b7f7a895511b1d2b": 2012, // Evans Pyramid (1978-1994)
  "lf-1c7b872e8927e4b6": 1975, // The Sinking of the Titanic / Jesus' Blood Never Failed Me Yet
  "lf-87e924c5f76107ba": 2009, // The Breeze / My Baby Cries, from Loving Takes This Course
  "history-c5b835d38ea99a0e": 2022, // Call You / Under Your Spell
  "history-fc9a20965d72f454": 2021, // Starlight
  "single-6cdb8657f0ceead2": 2001, // Plays John Cassavetes 2
  "lf-80a49b0f189b31cb": 1972, // Tezeta (Nostalgia)
  "history-6dd1c6fe02337d6c": 1994, // Une barque sur l'océan (André Laplante's Ravel)
  "history-80ef02bcb97939ce": 2016, // Day One Two, from Tag Eins Tag Zwei
  "history-3c5e0b9c1fbc1157": 2010, // Baby, from Light
  "history-b9bf81293c00f57c": 2015, // Hello!, from Manglehorn
  "lf-3f0098f60aff1b7e": 2026, // Far Away
  "lf-c3e95a437ff977ea": 2026, // BULLY
  "history-b0cba242bbf01908": 2015, // Embrace the Future EP
  "history-7bc15ad3959a8b49": 2011, // 30 Greatest Classical Symphonies, Vol. 2
  "history-de52c546b8441c60": 1982, // The Goldberg Variations (Glenn Gould, 1981 recording)
  "history-018c873c43954f19": 2011, // (David Bowie I Love You) Since I Was Six
  "history-2d655a5ccb044c84": 2001, // The Abtomatic Miesterzinger Mambo Chic (medium confidence)
  "history-8393ec1a6a0f94ef": 2002, // There's a Better Place, from The Wicked Is Music (medium confidence)
  "history-e9e25cf6087ea513": 2010 // The Next Big Thing
};

const sha = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);
const exists = (file) => access(file).then(() => true, () => false);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fold = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*[([].*?(remaster|deluxe|edition|version|anniversary|expanded).*?[)\]]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/*
 * One question of MusicBrainz, answered from .album-art-cache/ if it has been
 * asked before. MusicBrainz is often busy and says so (503): that is waited
 * out and asked again, and a question it never answers stops the run, which
 * can be started again and carries on from the cache. A failure is never
 * written down as "nothing found": that left Kanye West and George Harrison
 * with no one beside them.
 */
let last = 0;
async function ask(url) {
  const cached = path.join(cacheDir, `mb-${sha(url)}.json`);
  if (await exists(cached)) return JSON.parse(await readFile(cached, "utf8"));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const wait = last + SPACING - Date.now();
    if (wait > 0) await pause(wait);
    last = Date.now();
    let response;
    try {
      response = await fetch(url, { headers: { "User-Agent": AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    } catch {
      await pause(4000);
      continue;
    }
    if (response.status === 503 || response.status === 429 || response.status >= 500) {
      await pause(Math.min(1500 * (attempt + 1), 12000));
      continue;
    }
    // A question MusicBrainz will not take (a title it cannot parse) finds nothing.
    const body = response.ok ? await response.json() : {};
    await writeFile(cached, JSON.stringify(body));
    return body;
  }
  throw new Error(`MusicBrainz gave no answer after twelve tries. Run this again: what it has answered is kept.\n  ${url}`);
}

// How one artist stands to another, as far as the shelf cares: in a band, a
// band's part, the same person under another name, or a named collaboration.
const LINKS = new Set(["member of band", "is person", "collaboration", "founder", "subgroup"]);
const quoted = (text) => text.replace(/["\\]/g, " ").trim();
// A title as its record is known, without an edition's note.
const plain = (title) => title.replace(/\s*[([][^)\]]*(remaster|deluxe|edition|version|anniversary|expanded|soundtrack|bonus|mono|stereo|re-?record)[^)\]]*[)\]]/gi, "").replace(/\s+-\s+.*(remaster|deluxe|edition|version|anniversary).*$/i, "").trim();
const within = (whole, part) => Boolean(part) && ` ${whole} `.includes(` ${part} `);
// A name as it can be compared: folded to plain letters or, for a name in
// another script, as it stands.
const called = (text) => fold(text) || String(text).normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
// The names in a joint credit: "Lou Reed & John Cale", "Eno • Hyde".
const partsOf = (credit) => credit.split(/\s*(?:&|•|\/|,|\+|\band\b|\bwith\b)\s*/i).map((part) => part.trim()).filter(Boolean);

/*
 * Who made a record, as MusicBrainz credits it: each artist by id, and how
 * sure that is. The record is looked for as an album or single, then as a
 * recording, under the shelf's credit or any one name in it, since
 * MusicBrainz joins a joint credit in its own way ("Lou Reed / John Cale").
 * - 3: an artist of the credit's very name.
 * - 2: an artist credited on the record under that name (Ye, as Kanye West),
 *   or the artists named within a joint credit (Eno and Hyde, on "Eno •
 *   Hyde"). A guest is not taken for the record's maker: caroline's song
 *   with Caroline Polachek is caroline's.
 * - 1: the record's one artist, whose name holds the credit (Charlie Megira
 *   und the Hefker Girl, for Charlie Megira).
 */
async function creditedOn(artist, title) {
  const name = called(artist);
  const parts = partsOf(artist);
  const by = [...new Set([artist, ...(parts.length > 1 ? parts : [])])].map((part) => `artist:"${quoted(part)}"`).join(" OR ");
  let best = null;
  const keep = (sure, credits) => {
    if (credits.length && sure > (best?.sure ?? 0)) best = { sure, made: credits.map((credit) => ({ id: credit.artist.id, name: credit.artist.name })) };
  };
  for (const [entity, field, list] of [["release-group", "releasegroup", "release-groups"], ["recording", "recording", "recordings"]]) {
    const query = `${field}:"${quoted(plain(title))}" AND (${by})`;
    const found = await ask(`https://musicbrainz.org/ws/2/${entity}/?query=${encodeURIComponent(query)}&fmt=json&limit=12`);
    for (const hit of found?.[list] ?? []) {
      if (hit.score < 80 || called(plain(hit.title)) !== called(plain(title))) continue;
      const credits = (hit["artist-credit"] ?? []).filter((credit) => credit.artist?.id);
      keep(3, credits.filter((credit) => called(credit.artist.name) === name));
      keep(2, credits.filter((credit) => [credit.name, credit.artist.name].some((known) => { const own = called(known ?? ""); return own && (own === name || within(name, own)); })));
      if (credits.length === 1) keep(1, credits.filter((credit) => within(called(credit.artist.name), name)));
    }
    if (best?.sure === 3) break;
  }
  return best;
}

// Failing a record, the one artist of exactly that name, or known by it:
// MusicBrainz files 青葉市子 under her own script and Ichiko Aoba as another
// name for her. Two artists of the name are no answer.
async function namedExactly(name) {
  const found = await ask(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${quoted(name)}" OR alias:"${quoted(name)}"`)}&fmt=json&limit=8`);
  const known = (artist) => [artist.name, ...(artist.aliases ?? []).map((alias) => alias.name)].some((other) => called(other) === called(name));
  const candidates = (found?.artists ?? []).filter((artist) => artist.score >= 85 && known(artist));
  return candidates.length === 1 || (candidates.length > 1 && candidates[0].score - candidates[1].score >= 10) ? [{ id: candidates[0].id, name: candidates[0].name }] : null;
}

/*
 * One artist's facts: its kind, its genres, and every artist it stands in
 * one of LINKS to. `groups` are what it belongs to (a band it is in, a
 * collaboration it is part of, the band it is a part of); `members` are what
 * belongs to it; `same` are its other names.
 */
async function artistFacts(id) {
  const facts = await ask(`https://musicbrainz.org/ws/2/artist/${id}?inc=genres+artist-rels&fmt=json`);
  if (!facts?.name) return null;
  const out = { name: facts.name, type: facts.type ?? null, genres: [], groups: {}, members: {}, same: {} };
  out.genres = (facts.genres ?? []).sort((a, b) => b.count - a.count).slice(0, 5).map((genre) => genre.name);
  for (const relation of facts.relations ?? []) {
    const other = relation.artist;
    if (relation["target-type"] !== "artist" || !LINKS.has(relation.type) || !other?.id || !other.name) continue;
    const forward = relation.direction !== "backward";
    const side = relation.type === "is person" ? out.same : forward === (relation.type !== "subgroup") ? out.groups : out.members;
    // A year it began and a year it ended, where MusicBrainz knows them: a
    // charity single's one-day band is not a band someone was in.
    const span = [relation.begin, relation.end].map((date) => Number.parseInt(date ?? "", 10) || null);
    side[other.id] = { name: other.name, type: other.type ?? null, ...(span[0] || span[1] ? { span } : {}), ...(relation.attributes?.length ? { as: relation.attributes } : {}) };
  }
  return out;
}

async function releaseYear(artist, album) {
  const query = `releasegroup:"${album.replace(/"/g, "")}" AND artist:"${artist.replace(/"/g, "")}"`;
  const found = await ask(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=5`);
  const groups = (found?.["release-groups"] ?? []).filter((group) => group.score >= 85 && fold(group.title) === fold(album));
  const years = groups.map((group) => Number.parseInt(group["first-release-date"] ?? "", 10)).filter((year) => year > 1900);
  return years.length ? Math.min(...years) : null;
}

async function main() {
  await mkdir(cacheDir, { recursive: true });
  const ranking = JSON.parse(await readFile(path.join(root, "public/music-ranking.json"), "utf8"));
  const catalogue = JSON.parse(await readFile(path.join(root, "public/listening-catalogue.json"), "utf8"));
  const sleeves = new Map(catalogue.albums.map((album) => [album.id, album]));
  const previous = (await exists(path.join(root, "public/music-meta.json")))
    ? JSON.parse(await readFile(path.join(root, "public/music-meta.json"), "utf8"))
    : { artists: {}, years: {} };

  // Who each credited name is, by one of their own records here: the most
  // listened first, up to four of them, then by the name alone.
  const all = process.argv.includes("--all");
  const linksFile = path.join(root, "data/music-links.json");
  const links = !all && (await exists(linksFile)) ? JSON.parse(await readFile(linksFile, "utf8")) : { credits: {}, artists: {} };
  const shelf = unpackRanking(ranking);
  const records = mergeShelf(shelf.albums, shelf.songs, shelf.sleeves, shelf.singles);
  const works = new Map();
  for (const item of [...records, ...shelf.songs]) {
    if (!works.has(item.artist)) works.set(item.artist, []);
    if (!works.get(item.artist).includes(item.title)) works.get(item.artist).push(item.title);
  }
  // A name MusicBrainz did not know last time is asked about again, and so
  // is any named with --again=One name|Another.
  const again = new Set((process.argv.find((flag) => flag.startsWith("--again="))?.slice(8) ?? "").split("|").filter(Boolean));
  for (const [index, name] of ranking.names.entries()) {
    if (!links.credits[name]?.length || again.has(name)) {
      let best = null;
      for (const title of (works.get(name) ?? []).slice(0, 4)) {
        const found = await creditedOn(name, title);
        if (found && found.sure > (best?.sure ?? 0)) best = found;
        // A joint credit is no artist of its own, so its parts will do.
        if (best?.sure === 3 || (best?.sure === 2 && partsOf(name).length > 1)) break;
      }
      const made = best?.made ?? (await namedExactly(name));
      links.credits[name] = (made ?? []).map((artist) => artist.id);
    }
    for (const id of links.credits[name]) links.artists[id] ??= await artistFacts(id);
    if ((index + 1) % 25 === 0) process.stderr.write(`  artists ${index + 1}/${ranking.names.length}\n`);
  }
  // A band two artists here are both in, though it has no record here
  // itself: asked about too, so a charity single's band of forty can be told
  // from a band (lib/music-kin.mjs).
  const here = new Set(Object.values(links.credits).flat());
  const shared = new Map();
  for (const id of here) for (const group of Object.keys(links.artists[id]?.groups ?? {})) shared.set(group, (shared.get(group) ?? 0) + 1);
  const outside = [...shared].filter(([group, count]) => count > 1 && !here.has(group)).map(([group]) => group);
  for (const [index, id] of outside.entries()) {
    links.artists[id] ??= await artistFacts(id);
    if ((index + 1) % 25 === 0) process.stderr.write(`  shared bands ${index + 1}/${outside.length}\n`);
  }
  // Only what the shelf still stands on is kept.
  for (const id of Object.keys(links.artists)) if (!links.artists[id] || !(here.has(id) || outside.includes(id))) delete links.artists[id];
  await writeFile(linksFile, `${JSON.stringify({ schemaVersion: 1, note: "Who each credited name on the shelf is and whom they stand with, from MusicBrainz (CC0), kept by scripts/build-music-meta.mjs so it need only ask about new artists.", ...links })}\n`);

  const kin = kinOf(ranking.names, links);
  const artists = {};
  for (const name of ranking.names) {
    const known = links.credits[name].map((id) => links.artists[id]).filter(Boolean);
    const genres = previous.artists[name]?.genres?.length ? previous.artists[name].genres : [...new Set(known.flatMap((artist) => artist.genres))].slice(0, 5);
    artists[name] = { genres, related: kin.related[name] ?? [], kin: kin.kin[name] ?? [] };
  }

  // Every record's id and cover (18 November 2026: other albums and singles too).
  const others = [...(ranking.sleeves ?? []), ...(ranking.singles ?? [])].flatMap((row) => [row[0], row[7]]).filter(Boolean);
  const ids = [...new Set([...ranking.albums.map((album) => album[0]), ...others, ...ranking.songs.map((song) => song[4]).filter(Boolean)])];
  const years = {};
  for (const [index, id] of ids.entries()) {
    const sleeve = sleeves.get(id);
    const known = Number.parseInt(sleeve?.year ?? "", 10);
    if (known > 1900) years[id] = known;
    else if (REVIEWED_YEARS[id]) years[id] = REVIEWED_YEARS[id];
    else if (previous.years[id]) years[id] = previous.years[id];
    else if (sleeve) {
      const year = await releaseYear(sleeve.artist, sleeve.album);
      if (year) years[id] = year;
    }
    if ((index + 1) % 50 === 0) process.stderr.write(`  sleeves ${index + 1}/${ids.length}\n`);
  }

  const packet = {
    schemaVersion: 1,
    note: "Artist genres and relationships and sleeve release years from MusicBrainz (CC0), built by scripts/build-music-meta.mjs.",
    artists,
    years
  };
  await writeFile(path.join(root, "public/music-meta.json"), `${JSON.stringify(packet)}\n`);
  const known = Object.values(artists).filter((artist) => artist.genres.length || artist.related.length).length;
  const unknown = ranking.names.filter((name) => !links.credits[name].length);
  console.log(`music-meta: ${known}/${ranking.names.length} artists with genres or relations, ${Object.values(artists).filter((artist) => artist.kin.length).length} with other artists here to stand with, ${Object.keys(years).length}/${ids.length} sleeves with a year`);
  if (unknown.length) console.log(`  not found on MusicBrainz (${unknown.length}): ${unknown.join(" | ")}`);
}

await main();
