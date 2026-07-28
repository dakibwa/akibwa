import { AboutPage } from "@/components/pages/about-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.about,
  description:
    "Daniel — I make computers do the work people are doing by hand. Ten years of it inside banks and building societies. Now for anyone who asks."
};

export default function AboutRoute() {
  return <AboutPage />;
}
