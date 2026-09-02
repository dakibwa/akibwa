import { EditorialHomeConcept } from "@/components/pages/editorial-home-concept";

export const metadata = {
  title: { absolute: "Akibwa" },
  description: "Small AI-assisted systems for messy work.",
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
      "max-video-preview": 0,
      "max-image-preview": "none",
      "max-snippet": 120
    }
  }
};

export default function IndexPage() {
  return <EditorialHomeConcept />;
}
