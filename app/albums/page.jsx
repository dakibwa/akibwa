import { AlbumWallPage } from "@/components/pages/album-wall-page";
import { siteSectionTitles } from "@/app/site-metadata";
import listening from "@/public/listening-catalogue.json";
import { listeningSeed } from "@/components/listening-catalogue.mjs";

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
      initialCatalogue={listeningSeed(listening, [])}
      refreshedAt={listening.asOf}
      method={listening.method}
      totals={{ albums: listening.albums.length, artists: new Set(listening.albums.map((album) => album.artist).filter(Boolean)).size, printed: listening.albums.filter((album) => album.printed).length }}
    />
  );
}
