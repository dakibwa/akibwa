import { ContactPage } from "@/components/pages/contact-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.contact,
  description:
    "Send Akibwa the messy bit — a manual workflow, a broken report, a dashboard nobody trusts. One sentence is enough to start."
};

export default function ContactRoute() {
  return <ContactPage />;
}
