import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroDynamicPhrase } from "@/components/hero-word-cycle";
import { PageFooter } from "@/components/page-footer";
import { areaTiles } from "@/components/site-data";

export function HomePage() {
  return (
    <section className="akibwa-home">
      <div className="page-grid akibwa-hero">
        <h1>
          I’m Daniel — I build small AI‑assisted systems for{" "}
          <HeroDynamicPhrase />
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
          <Link href={tile.href} prefetch className="area-card" key={tile.title}>
            <div className="area-art">
              <Image
                src={tile.image}
                alt={tile.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 760px) 100vw, 31vw"
              />
            </div>
            <div className="area-caption">
              <div>
                <h2>{tile.title}</h2>
                <p>{tile.descriptor}</p>
              </div>
              <ArrowRight size={19} strokeWidth={1.8} />
            </div>
          </Link>
        ))}
      </div>

      <PageFooter />
    </section>
  );
}
