import { RouteRedirect } from "@/components/route-redirect";

export const metadata = {
  title: "Systems",
  robots: { index: false },
  alternates: { canonical: "/professional/" }
};

export default function SystemsRoute() {
  return <RouteRedirect to="/professional/" label="akibwa.com/professional" />;
}
