import { stripEdition } from "./album-key.mjs";

export const normalizeListeningText = (value) => String(value || "")
  .normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en")
  .replace(/&/g, " and ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export const albumIdentity = (artist, album) =>
  `${normalizeListeningText(artist)}::${normalizeListeningText(stripEdition(album))}`;
export const songIdentity = (artist, track) =>
  `${normalizeListeningText(artist)}::${normalizeListeningText(track)}`;

const showAliases = new Map(Object.entries({
  "Making Sense with Sam Harris": "Making Sense",
  "Making Sense with Sam Harris - Subscriber Content": "Making Sense",
  "All-In with Chamath, Jason, Sacks & Friedberg": "All-In Podcast",
  "Moonshots with Peter Diamandis": "Moonshots",
}).map(([alias, title]) => [normalizeListeningText(alias), title]));
export const podcastTitle = (title) => showAliases.get(normalizeListeningText(title)) || String(title || "").trim();
export const excludedPodcastCollections = new Set([
  "some songs", "SESI BACOT", ".", "Dumb Songs", "Just some music", "My Audiobook",
  "music songs and etcetera", "Livethroughfuckingthis", "YeezyWarrior246", "Assume Form: A Short Film",
].map(normalizeListeningText));

// Exact source channel identities, with title requirements for mixed channels.
// A clip remains a recorded view of its show, never a completed episode.
const podcastChannels = new Map(Object.entries({
  "Chris Williamson": "Modern Wisdom",
  "Peter H. Diamandis": "Moonshots",
  "Moonshots Highlights": "Moonshots",
  "Dwarkesh Patel": "Dwarkesh Podcast",
  "Lex Fridman": "Lex Fridman Podcast",
  "Lex Clips": "Lex Fridman Podcast",
  "Sam Harris": "Making Sense",
  "All-In Podcast": "All-In Podcast",
  "The Diary Of A CEO": "The Diary Of A CEO with Steven Bartlett",
  "The Ezra Klein Show": "The Ezra Klein Show",
  "Huberman Lab": "Huberman Lab",
  "Core Memory": "Core Memory",
  "Dish Podcast": "Dish",
  "The Tim Dillon Show": "The Tim Dillon Show",
  "Rich Roll": "The Rich Roll Podcast",
  "JRE Daily Clips": "The Joe Rogan Experience",
  "JRE Classics": "The Joe Rogan Experience",
  "JRE Clips": "The Joe Rogan Experience",
  "PowerfulJRE": "The Joe Rogan Experience",
}).map(([channel, show]) => [normalizeListeningText(channel), show]));
const mixedChannels = [
  ["Stripe", /\bcheeky pint\b/i, "Cheeky Pint"],
  ["OpenAI", /\bopenai podcast\b/i, "The OpenAI Podcast"],
  ["Vampire Weekend", /\bvampire campfire\b/i, "Vampire Campfire"],
  ["A24", /\ba24 podcast\b/i, "The A24 Podcast"],
  ["Andrew Huberman", /\bhuberman lab\b/i, "Huberman Lab"],
];
export function youtubePodcast(event) {
  if (event.eventType !== "watch") return null;
  const channel = normalizeListeningText(event.creator);
  const exact = podcastChannels.get(channel);
  if (exact) return exact;
  return mixedChannels.find(([name, title]) =>
    channel === normalizeListeningText(name) && title.test(event.title || ""))?.[2] || null;
}
