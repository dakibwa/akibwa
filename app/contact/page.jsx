import { ContactPage } from "@/components/pages/contact-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.contact,
  description:
    "If it can be done on a computer, I can help you do it. Tell me what's going on — one sentence is enough to start."
};

export default function ContactRoute() {
  return <ContactPage />;
}
