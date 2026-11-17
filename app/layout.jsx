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
  document.documentElement.classList.add("js");
  if (location.pathname !== "/") return;
  function clearBookmark() {
    if (location.hash || location.search) history.replaceState(history.state, "", "/");
  }
  clearBookmark();
  addEventListener("hashchange", clearBookmark);
})()`;

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
