import { oneBaggerAppUrl } from "@/components/site-data";

export const metadata = {
  title: "One-Bag Planner",
  description:
    "One-Bag Planner is an Akibwa travel and gear app for planning compact loadouts, comparing gear, and keeping recommendations accountable."
};

export default function OneBaggerPage() {
  return (
    <section className="project-surface-page chorus-page" aria-label="One-Bag Planner">
      <div className="chorus-app-shell">
        <iframe
          src={oneBaggerAppUrl}
          title="One-Bag Planner live app"
          className="chorus-app-frame"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </section>
  );
}
