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
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Sunlit mountain meadow with a layered data texture"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Akibwa",
    description:
      "Daniel, online as Akibwa. Projects, a working history, and a collection of music, films, games, television and podcasts.",
    images: ["/og.jpg"]
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }]
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>
        <SiteShell>{children}</SiteShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
