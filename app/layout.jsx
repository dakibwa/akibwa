import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata = {
  title: "Daniel | Small AI-assisted systems",
  description:
    "Small AI-assisted systems that turn messy workflows, listening history, health signals, and private context into useful tools."
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
