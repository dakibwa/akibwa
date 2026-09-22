import "./globals.css";
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
    "Daniel, online as Akibwa. Projects, a working history, and a collection of music, films, games, television and podcasts.",
  openGraph: {
    title: "Akibwa",
    description:
      "Daniel, online as Akibwa. Projects, a working history, and a collection of music, films, games, television and podcasts.",
    url: "https://akibwa.com",
    siteName: "Akibwa",
    type: "website",
    // A new filename, not a replaced og.jpg, so link previews stop serving
    // their cached copy of the old artwork. Source: scripts/share-card.html.
    images: [
      {
        url: "/share-card.jpg",
        width: 1200,
        height: 630,
        alt: "I'm Daniel, building in the age of AI, above the features, Português com a Inês and The Trek project cards"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Akibwa",
    description:
      "Daniel, online as Akibwa. Projects, a working history, and a collection of music, films, games, television and podcasts.",
    images: ["/share-card.jpg"]
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
  themeColor: "#faf8f3",
  colorScheme: "light"
};

/* Taste covers fade in over their paper placeholder once decoded. This runs
   before any cover is parsed, so it sees every load — including covers that
   arrive before the page's JavaScript on a slow connection — and the fade only
   applies when it has run. */
const fadeCovers = `document.documentElement.classList.add("fade-covers");
["load","error"].forEach(function(type){document.addEventListener(type,function(event){
var image=event.target;if(image.tagName!=="IMG"||!image.closest(".personal-taste-art"))return;
var show=function(){image.setAttribute("data-shown","")};
if(type==="load"&&image.decode)image.decode().then(show,show);else show();},true)});`;

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>
        <script dangerouslySetInnerHTML={{ __html: fadeCovers }} />
        <SiteShell>{children}</SiteShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
