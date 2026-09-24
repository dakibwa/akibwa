import { PaperHome } from "@/components/paper/paper-home";
import { listeningSeed } from "@/components/listening-catalogue.mjs";
import { musicSeed } from "@/lib/paper-home.mjs";
import { websites } from "@/data/websites.mjs";
import listening from "@/public/listening-catalogue.json";
import ranking from "@/public/music-ranking.json";
import curation from "@/data/taste-curation.json";

export const metadata = {
  title: { absolute: "Akibwa" },
  alternates: { canonical: "/" },
  description:
    "Daniel, online as Akibwa. My taste in songs, albums, films and games, a puzzle I made, websites I’ve built, how I got here, and a walk from Paris to Sofia.",
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
      "max-video-preview": 0,
      "max-image-preview": "none",
      "max-snippet": 120,
    },
  },
};

// Everything here runs once, during the static export.
export default function IndexPage() {
  return (
    <PaperHome
      taste={{
        initialCatalogue: listeningSeed(listening, curation.albumIds),
        refreshedAt: listening.asOf,
        podcasts: listening.podcasts,
        initialRanking: musicSeed(ranking),
      }}
      websites={websites}
    />
  );
}
