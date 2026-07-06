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
        <h1 aria-label="I’m Daniel — I build small AI-assisted systems that turn messy workflows into useful tools.">
          I’m Daniel — I build small AI‑assisted systems{" "}
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
        {areaTiles.map((tile, index) => {
          const cardImage = tile.cardImage ?? tile.image;
          const cardAlt = tile.cardAlt ?? tile.alt;
          const cardImagePosition = tile.cardImagePosition ?? tile.imagePosition;

          return (
            <Link
              href={tile.href}
              prefetch
              className="area-card"
              key={tile.title}
              style={tile.accent ? { "--area-accent": tile.accent } : undefined}
            >
              <div className="area-art">
                <Image
                  src={cardImage}
                  alt={cardAlt}
                  fill
                  priority={index < 2}
                  sizes="(max-width: 760px) 100vw, 48vw"
                  style={cardImagePosition ? { objectPosition: cardImagePosition } : undefined}
                />
              </div>
              <div className="area-caption">
                <div>
                  <h2>{tile.title}</h2>
                  <p>{tile.descriptor}</p>
                  {tile.detail ? (
                    <div className="area-caption__more">
                      <p>{tile.detail}</p>
                    </div>
                  ) : null}
                </div>
                <ArrowRight size={19} strokeWidth={1.8} />
              </div>
            </Link>
          );
        })}
      </div>

      <PageFooter />
    </section>
  );
}
