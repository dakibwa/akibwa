import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata = {
  title: "Daniel | Small AI-assisted systems",
  description:
    "A refined portfolio of small AI-assisted systems for messy workflows, data, music, and private knowledge."
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
