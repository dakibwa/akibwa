import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata = {
  title: {
    default: "Akibwa | Daniel",
    template: "Akibwa | %s"
  },
  description:
    "Small AI-assisted systems that turn messy workflows, listening history, health signals, and private context into useful tools."
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
