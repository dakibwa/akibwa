import { AlbumWallPage } from "@/components/pages/album-wall-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.albums,
  description:
    "Every album I've played, ranked by how often — including the 249 sleeves I had printed as cards and carry around instead of a record shelf."
};

export default function AlbumsRoute() {
  return <AlbumWallPage />;
}
