import { OfferPage } from "@/components/pages/offer-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.professional,
  description:
    "If it can be done on a computer, I can help you do it. Work done by hand, spreadsheets and reports, tools and websites. One sentence is enough to start."
};

export default function ProfessionalRoute() {
  return <OfferPage />;
}
