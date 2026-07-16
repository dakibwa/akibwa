import { OfferPage } from "@/components/pages/offer-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.professional,
  description:
    "Commission Akibwa to design and build a focused AI-assisted system, dashboard, automation, or workflow tool."
};

export default function ProfessionalRoute() {
  return <OfferPage />;
}
