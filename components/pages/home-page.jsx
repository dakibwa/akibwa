import { AreaCard } from "@/components/area-card";
import { HeroDynamicPhrase } from "@/components/hero-word-cycle";
import { PageFooter } from "@/components/page-footer";
import { areaTiles } from "@/components/site-data";

export function HomePage() {
  return (
    <section className="akibwa-home">
      <div className="page-grid akibwa-hero">
        <h1>
          <span className="hero-line">I’m Daniel — I build AI systems</span>{" "}
          <span className="hero-line hero-line--result">
            <HeroDynamicPhrase />
          </span>
        </h1>
      </div>

      <div className="page-grid featured-areas-head">
        <p>
          <strong>Featured areas</strong>
          <span>·</span>
          <em>2026</em>
        </p>
      </div>

      <div className="page-grid area-grid" aria-label="Featured areas">
        {areaTiles.map((tile, index) => (
          <AreaCard tile={tile} index={index} key={tile.title} />
        ))}
      </div>

      <PageFooter />
    </section>
  );
}
