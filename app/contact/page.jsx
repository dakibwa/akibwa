import { ContactPage } from "@/components/pages/contact-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.contact,
  description:
    "Contact Akibwa with a messy workflow, reporting, automation, dashboard, or private knowledge problem that needs a small useful system."
};

export default function ContactRoute() {
  return <ContactPage />;
}
