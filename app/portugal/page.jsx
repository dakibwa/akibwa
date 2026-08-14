import { RouteRedirect } from "@/components/route-redirect";

const destination = "https://portuguesewithines.com/";

export const metadata = {
  title: "Português com a Inês",
  description: "European Portuguese lessons with Inês Dias Baía.",
  robots: { index: false },
  alternates: { canonical: destination }
};

export default function PortugueseWithInesRedirect() {
  return <RouteRedirect to={destination} label="portuguesewithines.com" />;
}
