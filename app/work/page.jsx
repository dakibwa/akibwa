import { RouteRedirect } from "@/components/route-redirect";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.projects,
  robots: { index: false },
  alternates: { canonical: "/projects/" }
};

export default function WorkRoute() {
  return <RouteRedirect to="/projects/" label="akibwa.com/projects" />;
}
