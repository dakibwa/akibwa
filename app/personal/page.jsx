import { PersonalPage } from "@/components/pages/personal-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.personal,
  description:
    "Things I wanted to exist: Chorus, a listening archive; Cover Collision, an album-art series; and three more in progress."
};

export default function PersonalRoute() {
  return <PersonalPage />;
}
