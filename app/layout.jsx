import { preload } from "react-dom";
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
      { url: "/favicon.ico?v=flower", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon.svg?v=flower", type: "image/svg+xml", sizes: "any" }
    ],
    shortcut: [{ url: "/favicon.svg?v=flower", type: "image/svg+xml", sizes: "any" }],
    apple: [{ url: "/apple-touch-icon.png?v=flower", sizes: "180x180" }]
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
  // The page shows itself once its small capitals have arrived, so the bar
  // never flashes in a stand-in face (Dan, 18 November 2026: "super smooth").
  function ready() {
    if (page.classList.contains("ready")) return;
    page.classList.add("ready");
    dispatchEvent(new Event("paperready"));
  }
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('500 16px "Alegreya SC"'), document.fonts.load('italic 400 16px "Alegreya"')]),
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
  // The bar's small capitals and the titles' italic arrive with the page.
  preload("/fonts/alegreya-sc-500-latin.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("/fonts/alegreya-italic-latin.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
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
