import "./globals.css";
import { SiteShell } from "@/components/site-shell";

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
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Akibwa",
    description:
      "Small AI-assisted systems, dashboards, automations, and personal tools for turning messy information into useful workflows."
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
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
