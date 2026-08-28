import { RouteRedirect } from "@/components/route-redirect";

/* The site is one page now: every set that used to be its own route lives on
   the wall, surfaced by the nav rather than navigated to. Kept as a redirect
   rather than deleted so existing links and bookmarks still land somewhere. */
export const metadata = {
  robots: { index: false },
  alternates: { canonical: "/" }
};

export default function AboutRoute() {
  return <RouteRedirect to="/" label="akibwa.com" />;
}
