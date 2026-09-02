import { AlbumWallPage } from "@/components/pages/album-wall-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.albums,
  description:
    "A personal album archive.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true
    }
  }
};

export default function AlbumsRoute() {
  return <AlbumWallPage />;
}
