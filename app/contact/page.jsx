import { ContactPage } from "@/components/pages/contact-page";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.contact,
  description:
    "Tell me what's going on and I'm sure I can help. If it can be done on a computer, I can help you do it — one sentence is enough to start."
};

export default function ContactRoute() {
  return <ContactPage />;
}
