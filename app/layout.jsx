import "./globals.css";
import "./archive.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SiteShell } from "@/components/site-shell";

export const metadata = {
  metadataBase: new URL("https://akibwa.com"),
  applicationName: "Akibwa",
  title: {
    default: "Akibwa",
    template: "Akibwa | %s"
  },
  description:
    "Daniel, online as Akibwa. The music I listen to, a puzzle I made, websites I’ve built, how I got here, and a walk from Paris to Sofia.",
  openGraph: {
    title: "Akibwa",
    description:
      "Daniel, online as Akibwa. The music I listen to, a puzzle I made, websites I’ve built, how I got here, and a walk from Paris to Sofia.",
    url: "https://akibwa.com",
    siteName: "Akibwa",
    type: "website",
    // A new filename, not a replaced image, so link previews stop serving
    // their cached copy of the old card. It is the front page's first screen,
    // captured at 1200×630 with reduced motion (see README).
    images: [
      {
        url: "/share-card-paper.jpg",
        width: 1200,
        height: 630,
        alt: "I'm Daniel, building in the age of AI, above five paper things: music, features, websites, career and trek"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Akibwa",
    description:
      "Daniel, online as Akibwa. The music I listen to, a puzzle I made, websites I’ve built, how I got here, and a walk from Paris to Sofia.",
    images: ["/share-card-paper.jpg"]
  },
  // The sized .ico serves browsers without SVG icons and requests that skip
  // the page (feeds, robots.txt); iOS draws its own corners on the touch icon.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg?v=ember-a", type: "image/svg+xml" }
    ],
    shortcut: [{ url: "/favicon.svg?v=ember-a", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Browser chrome that tints to the page uses the same warm paper.
  themeColor: "#f3ecdf",
  colorScheme: "light"
};

/* Runs before the first paint: marks the page as scripted and opens the room
   named in the hash, so a shared room link never flashes the front page. The
   same five names live in components/paper/paper-home.jsx. Without
   JavaScript, rooms open through :target instead. A future hash-based
   Content-Security-Policy must include this script's hash. */
const openRoom = `(function(d,r){d.classList.add("js");d.dataset.room=["music","features","websites","career","trek"].indexOf(r)>-1?r:"index"})(document.documentElement,location.hash.slice(1))`;

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: openRoom }} />
        <SiteShell>{children}</SiteShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
