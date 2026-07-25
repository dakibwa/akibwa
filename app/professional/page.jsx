import { OfferPage } from "@/components/pages/offer-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.professional,
  description:
    "For small teams whose real work still runs on spreadsheets, copy-paste and memory. Workflow teardown, prototype, then a system you keep."
};

export default function ProfessionalRoute() {
  return <OfferPage />;
}
