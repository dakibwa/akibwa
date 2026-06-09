import { PersonalPage } from "@/components/pages/personal-page";

export const metadata = {
  title: "Projects",
  description:
    "Browse Akibwa projects that turn listening history, health signals, visual experiments, and private context into useful tools."
};

export default function ProjectsRoute() {
  return <PersonalPage />;
}
