/*
 * What the Music room's search knows beyond titles: each artist's genres and
 * the artists they belong to or work as (Paul Simon → Simon & Garfunkel,
 * Panda Bear → Animal Collective), and the year each sleeve was released, so
 * a search can ask for a genre or an era (Dan, 25 September 2026).
 *
 * From MusicBrainz, whose core data is CC0: an artist search and a lookup
 * with genres and artist relationships for every artist in
 * public/music-ranking.json, and a release-group search for every sleeve the
 * catalogue gives no year. Requests are spaced to MusicBrainz's one a second
 * and cached in .album-art-cache/, which is not committed.
 *
 *   node scripts/build-music-meta.mjs
 *
 * Writes public/music-meta.json: { artists: { name: { genres, related } },
 * years: { sleeve id: year } }.
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

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
  "history-9e830d85733e4b9d": 1966, // A Quick One While He's Away
  "history-022a91697b97e650": 1984, // Vision Songs, Vol. 1
  "history-5d835f4b713424fd": 1982, // Sports Men, from Philharmony
  "history-748cc7dbd367a6d7": 2003, // Campfire Songs
  "lf-16558fc2f1cbbe85": 2014, // High Life
  "history-9cff02ad4c23aa27": 2020, // Laugh Now Cry Later
  "history-d571239fb426cbd4": 2021, // I Shall Wear a Crown
  "history-3ce2e814cedcf7f5": 1997, // Acetone
  "lf-095f0e9a1d8c9096": 2017, // Steve Lacy's Demo
  "history-0d2532f9f419aea6": 2008, // The Best of The Specials
  "history-f192d06f1d075585": 1970, // I Just Can't Help Believin'
  "history-52aff6674b51b837": 2017, // The Concert in Hyde Park
  "lf-78f63e80b2fc2365": 2003, // Magnolia Electric Co.
  "lf-c399b0cf206fd715": 2020, // Your Hero Is Not Dead
  "history-32343960640cea10": 2005, // Prisoners of Love
  "history-86ec3e03217dc6be": 1975, // The Word II
  "lf-8d5423b976893dc8": 2025, // New Threats from the Soul
  "history-95187d23f9e69633": 2012, // Moonrise Kingdom
  "lf-0e3454285be7519e": 2024, // Brat and it's completely different but also still brat
  "history-4d6849d687381239": 2023 // 7s
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

let last = 0;
async function ask(url) {
  const cached = path.join(cacheDir, `mb-${sha(url)}.json`);
  if (await exists(cached)) return JSON.parse(await readFile(cached, "utf8"));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const wait = last + SPACING - Date.now();
    if (wait > 0) await pause(wait);
    last = Date.now();
    const response = await fetch(url, { headers: { "User-Agent": AGENT, Accept: "application/json" } });
    if (response.status === 503 || response.status === 429) {
      await pause(3000 * (attempt + 1));
      continue;
    }
    if (!response.ok) return null;
    const body = await response.json();
    await writeFile(cached, JSON.stringify(body));
    return body;
  }
  return null;
}

const RELATED = new Set(["member of band", "is person", "collaboration", "founder", "subgroup"]);

async function artistFacts(name) {
  const found = await ask(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${name.replace(/"/g, "")}"`)}&fmt=json&limit=5`);
  const candidates = found?.artists ?? [];
  const pick = candidates.find((artist) => fold(artist.name) === fold(name) && artist.score >= 90) ?? candidates.find((artist) => artist.score >= 98);
  if (!pick) return null;
  const facts = await ask(`https://musicbrainz.org/ws/2/artist/${pick.id}?inc=genres+artist-rels&fmt=json`);
  if (!facts) return null;
  const genres = (facts.genres ?? [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((genre) => genre.name);
  const related = [
    ...new Set(
      (facts.relations ?? [])
        .filter((relation) => relation["target-type"] === "artist" && RELATED.has(relation.type) && relation.artist?.name)
        .map((relation) => relation.artist.name)
    )
  ].slice(0, 8);
  return { genres, related };
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

  const artists = {};
  for (const [index, name] of ranking.names.entries()) {
    artists[name] = previous.artists[name] ?? (await artistFacts(name)) ?? { genres: [], related: [] };
    if ((index + 1) % 25 === 0) process.stderr.write(`  artists ${index + 1}/${ranking.names.length}\n`);
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
  console.log(`music-meta: ${known}/${ranking.names.length} artists with genres or relations, ${Object.keys(years).length}/${ids.length} sleeves with a year`);
}

await main();
