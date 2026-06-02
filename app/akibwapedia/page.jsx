import { AkibwapediaPage } from "@/components/pages/akibwapedia-page";

export const metadata = {
  title: "Akibwapedia",
  description:
    "A public-safe Personal Knowledge System page showing the architecture, counts, retrieval routes, and privacy boundaries behind Dan's private source-backed memory system.",
};

export default function AkibwapediaRoute() {
  return <AkibwapediaPage />;
}
