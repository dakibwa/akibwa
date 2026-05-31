import { PersonalPage } from "@/components/pages/personal-page";

export const metadata = {
  title: "Personal",
  description:
    "Personal projects by Daniel, including Sonic FM, Vitals, cover-art experiments, and a private knowledge system."
};

export default function ProjectsRoute() {
  return <PersonalPage />;
}
