import { preload } from "react-dom";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SiteShell } from "@/components/site-shell";

// Dan's own words for the page's name and its one line (26 November 2026:
// "can it be Akibwa's Listening History too?", "then put Dan's", "rather
// than my full name"). His first name, and no more of him.
const title = "Akibwa’s Listening History";
const description = "Dan’s most played 1,000 records by hours listened.";

export const metadata = {
  metadataBase: new URL("https://akibwa.com"),
  applicationName: "Akibwa",
  title: { default: title, template: "Akibwa | %s" },
  description,
  openGraph: {
    title,
    description,
    url: "https://akibwa.com",
    siteName: "Akibwa",
    type: "website",
    // The mark at the top left of a wall of the most played records, in
    // their own sleeves (scripts/build-share-card.mjs). A new filename, not a
    // replaced image, so link previews stop serving their cached copy of
    // the old card.
    images: [
      {
        url: "/share-card-mosaic.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "The Akibwa mark, a haloed figure holding a globe, beside a wall of record sleeves"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/share-card-mosaic.jpg"]
  },
  // The sized .ico serves browsers without SVG icons and requests that skip
  // the page (feeds, robots.txt); iOS draws its own corners on the touch icon.
  icons: {
    icon: [
      { url: "/favicon.ico?v=globe", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon.svg?v=globe", type: "image/svg+xml", sizes: "any" }
    ],
    shortcut: [{ url: "/favicon.svg?v=globe", type: "image/svg+xml", sizes: "any" }],
    apple: [{ url: "/apple-touch-icon.png?v=globe", sizes: "180x180" }]
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Browser chrome that tints to the page uses the same warm paper.
  themeColor: "#f3ecdf",
  colorScheme: "light"
};

/* Old room bookmarks open the same shelf at its canonical address. */
const boot = `(function(){
  var page = document.documentElement;
  page.classList.add("js");
  // The signature shows itself once its picture has arrived, so it comes in
  // whole and its light never stands alone (app/globals.css).
  document.addEventListener("load", function (event) {
    var loaded = event.target;
    if (loaded && loaded.classList && loaded.classList.contains("music-mark")) page.classList.add("signed");
  }, true);
  // The page shows itself once its typeface has arrived, so the bar
  // never flashes in a stand-in face (Dan, 18 November 2026: "super smooth").
  function ready() {
    if (page.classList.contains("ready")) return;
    page.classList.add("ready");
    dispatchEvent(new Event("paperready"));
  }
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('700 16px "Akibwa Sans"'),
      new Promise(function (done) { setTimeout(done, 900); })
    ]).then(ready, ready);
  } else ready();
  if (location.pathname !== "/") return;
  function clearBookmark() {
    if (location.hash || location.search) history.replaceState(history.state, "", "/");
  }
  clearBookmark();
  addEventListener("hashchange", clearBookmark);
})()`;

export default function RootLayout({ children }) {
  // The page's one font arrives with it.
  preload("/fonts/nunito-sans-latin.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
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
