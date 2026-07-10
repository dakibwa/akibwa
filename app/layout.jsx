import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SiteShell } from "@/components/site-shell";
import { chorusAppUrl, oneBaggerAppUrl, publicSurfaces } from "@/components/site-data";

function toOrigins(urls) {
  return [
    ...new Set(
      urls
        .filter(Boolean)
        .map((url) => {
          try {
            return new URL(url).origin;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    )
  ];
}

// Iframe embeds navigate on credentialed connections; data refreshes fetch over
// anonymous CORS connections. Preconnect each origin with the matching mode.
const embedOrigins = toOrigins([chorusAppUrl, oneBaggerAppUrl]);
const dataOrigins = toOrigins(
  publicSurfaces.flatMap((surface) => [surface.refresh?.dataUrl, surface.refresh?.statusUrl])
).filter((origin) => !embedOrigins.includes(origin));

export const metadata = {
  metadataBase: new URL("https://akibwa.com"),
  applicationName: "Akibwa",
  title: {
    default: "Akibwa",
    template: "Akibwa | %s"
  },
  description:
    "Akibwa builds small AI-assisted systems, dashboards, automations, and personal tools that turn messy information into useful workflows.",
  openGraph: {
    title: "Akibwa",
    description:
      "Small AI-assisted systems, dashboards, automations, and personal tools for turning messy information into useful workflows.",
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
      "Small AI-assisted systems, dashboards, automations, and personal tools for turning messy information into useful workflows.",
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
    <html lang="en">
      <body>
        {embedOrigins.map((origin) => (
          <link rel="preconnect" href={origin} key={origin} />
        ))}
        {dataOrigins.map((origin) => (
          <link rel="preconnect" href={origin} crossOrigin="anonymous" key={origin} />
        ))}
        <SiteShell>{children}</SiteShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
