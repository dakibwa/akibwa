import { PaperHome } from "@/components/paper/paper-home";
import { musicSeed } from "@/lib/paper-home.mjs";
import { websites } from "@/data/websites.mjs";
import ranking from "@/public/music-ranking.json";

export const metadata = {
  title: { absolute: "Akibwa" },
  alternates: { canonical: "/" },
  description:
    "Daniel, online as Akibwa. The albums and songs I play most, a puzzle I made, websites I’ve built, how I got here, and a walk from Paris to Sofia.",
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
      music={{ initial: musicSeed(ranking) }}
      websites={websites}
    />
  );
}
