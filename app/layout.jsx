import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SiteShell } from "@/components/site-shell";

const description = "The music Akibwa plays most: 150 albums and 1,000 songs, each as large as the hours listened.";

export const metadata = {
  metadataBase: new URL("https://akibwa.com"),
  applicationName: "Akibwa",
  title: {
    default: "Akibwa",
    template: "Akibwa | %s"
  },
  description,
  openGraph: {
    title: "Akibwa",
    description,
    url: "https://akibwa.com",
    siteName: "Akibwa",
    type: "website",
    // A new filename, not a replaced image, so link previews stop serving
    // their cached copy of the old card. It is the shelf's first screen,
    // captured at 1200×630.
    images: [
      {
        url: "/share-card-music.jpg",
        width: 1200,
        height: 630,
        alt: "Akibwa: album sleeves on a shelf, each as large as the hours listened"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Akibwa",
    description,
    images: ["/share-card-music.jpg"]
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

/* Runs before the first paint: marks the page as scripted, and keeps old
   links useful now that Akibwa is one page (16 November 2026): #trek goes to
   the trek's own page, #features to features.games, #websites to the studio,
   and #music or #career to the shelf itself. A future hash-based
   Content-Security-Policy must include this script's hash. */
const boot = `(function(d,h){d.classList.add("js");var t={trek:"/trek/",features:"https://features.games/",websites:"https://ohlifestudios.com/"}[h];if(t){location.replace(t)}else if(h==="music"||h==="career"){history.replaceState(null,"",location.pathname+location.search)}})(document.documentElement,location.hash.slice(1))`;

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <SiteShell>{children}</SiteShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
