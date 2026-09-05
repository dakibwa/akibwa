import { EditorialHomeConcept } from "@/components/pages/editorial-home-concept";
import { albumCatalogue } from "@/components/album-catalogue.mjs";
import albums from "@/data/album-wall.json";

export const metadata = {
  title: { absolute: "Akibwa" },
  description:
    "Daniel, online as Akibwa. Projects, a working history, and a collection of music, films, games, television and podcasts.",
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

export default function IndexPage() {
  const catalogue = albumCatalogue(albums);
  return (
    <EditorialHomeConcept
      initialCatalogue={catalogue}
      refreshedAt={albums.refreshedAt}
    />
  );
}
