import { PaperHome } from "@/components/paper/paper-home";
import { musicPreview, careerTrajectory, trekSketch } from "@/lib/paper-home.mjs";
import { websites } from "@/data/websites.mjs";
import ranking from "@/public/music-ranking.json";
import curation from "@/data/taste-curation.json";
import trekDays from "@/data/trek-days.json";
import atlas from "@/data/trek-atlas.json";
import route from "@/public/trek/route-detail.json";
import photos from "@/public/trek/photos/manifest.json";

export const metadata = {
  title: { absolute: "Akibwa" },
  alternates: { canonical: "/" },
  description:
    "Daniel, online as Akibwa. The music I listen to, a puzzle I made, websites I’ve built, how I got here, and a walk from Paris to Sofia.",
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

// Everything below runs once, during the static export. Only the shaped
// results reach the page.
export default function IndexPage() {
  return (
    <PaperHome
      music={musicPreview(ranking)}
      career={careerTrajectory(curation.career)}
      trek={trekSketch({ days: trekDays.days, atlas, route, photos, facts: trekDays.facts })}
      websites={websites}
    />
  );
}
