import { AlbumWallPage } from "@/components/pages/album-wall-page";
import { siteSectionTitles } from "@/app/site-metadata";
import data from "@/data/album-wall.json";
import { albumCatalogue } from "@/components/album-catalogue.mjs";

export const metadata = {
  title: siteSectionTitles.albums,
  description: "A personal album archive.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AlbumsRoute() {
  return (
    <AlbumWallPage
      initialCatalogue={albumCatalogue(data)}
      refreshedAt={data.refreshedAt}
      scrobblingSince={data.scrobblingSince}
    />
  );
}
