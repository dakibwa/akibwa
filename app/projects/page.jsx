import { PersonalPage } from "@/components/pages/personal-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.projects,
  description:
    "Things I wanted to exist: The wall, a record collection ranked by play count; features, a daily untangling puzzle; and three more."
};

export default function ProjectsRoute() {
  return <PersonalPage />;
}
