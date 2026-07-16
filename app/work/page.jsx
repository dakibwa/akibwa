import { RouteRedirect } from "@/components/route-redirect";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.personal,
  robots: { index: false },
  alternates: { canonical: "/personal/" }
};

export default function WorkRoute() {
  return <RouteRedirect to="/personal/" label="akibwa.com/personal" />;
}
