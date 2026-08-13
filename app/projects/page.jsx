import { PersonalPage } from "@/components/pages/personal-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.projects,
  description:
    "Things I wanted to exist: Chorus, a listening archive; Probe, a daily untangling puzzle; and four more."
};

export default function ProjectsRoute() {
  return <PersonalPage />;
}
