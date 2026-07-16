import { RouteRedirect } from "@/components/route-redirect";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.professional,
  robots: { index: false },
  alternates: { canonical: "/professional/" }
};

export default function SystemsRoute() {
  return <RouteRedirect to="/professional/" label="akibwa.com/professional" />;
}
