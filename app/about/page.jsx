import { AboutPage } from "@/components/pages/about-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.about,
  description:
    "Learn how Daniel turns BI experience into practical AI-assisted systems for reporting, workflow, and private knowledge problems."
};

export default function AboutRoute() {
  return <AboutPage />;
}
