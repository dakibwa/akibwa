import { PersonalPage } from "@/components/pages/personal-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.personal,
  description:
    "Explore Akibwa personal projects including Chorus, Cover Collision, and public-safe experiments with AI memory systems."
};

export default function PersonalRoute() {
  return <PersonalPage />;
}
