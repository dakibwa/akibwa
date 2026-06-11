import { RouteRedirect } from "@/components/route-redirect";

export const metadata = {
  title: "Offer",
  robots: { index: false },
  alternates: { canonical: "/professional/" }
};

export default function OfferRoute() {
  return <RouteRedirect to="/professional/" label="akibwa.com/professional" />;
}
