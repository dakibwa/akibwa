import { RouteRedirect } from "@/components/route-redirect";

export const metadata = {
  title: "Work",
  robots: { index: false },
  alternates: { canonical: "/personal/" }
};

export default function WorkRoute() {
  return <RouteRedirect to="/personal/" label="akibwa.com/personal" />;
}
