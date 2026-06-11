import { RouteRedirect } from "@/components/route-redirect";

export const metadata = {
  title: "Projects",
  robots: { index: false },
  alternates: { canonical: "/personal/" }
};

export default function ProjectsRoute() {
  return <RouteRedirect to="/personal/" label="akibwa.com/personal" />;
}
