import { AboutPage } from "@/components/pages/about-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.about,
  description:
    "Ten years of BI, now pointed at AI-assisted systems for reporting, workflow and private knowledge. Plus the toolkit and the obsessions behind it."
};

export default function AboutRoute() {
  return <AboutPage />;
}
