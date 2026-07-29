"use client";

import { ArrowRight } from "lucide-react";
import { PointerResponseLink } from "@/components/pointer-response";
import { SiteImage, SLOT_SIZES } from "@/components/site-image";

export function AreaCard({ tile, index }) {
  const cardImage = tile.cardImage ?? tile.image;
  const cardAlt = tile.cardAlt ?? tile.alt;
  const cardImagePosition = tile.cardImagePosition ?? tile.imagePosition;

  return (
    <PointerResponseLink
      href={tile.href}
      prefetch
      className="area-card"
      style={tile.accent ? { "--area-accent": tile.accent } : undefined}
      pointerXProperty="--card-mx"
      pointerYProperty="--card-my"
    >
      <div className="area-art">
        {/* next/image was emitting a bare <img> here — `unoptimized` is forced
            by output: export — so its `sizes` was decorative until the
            pre-rendered variants existed. */}
        <SiteImage
          src={cardImage}
          slot="areaTile"
          alt={cardAlt}
          priority={index < 2}
          sizes={SLOT_SIZES.areaTile}
          style={cardImagePosition ? { objectPosition: cardImagePosition } : undefined}
        />
        {tile.detail ? (
          <div className="area-art__detail">
            <p>{tile.detail}</p>
          </div>
        ) : null}
      </div>
      <div className="area-caption">
        <div>
          <h2>{tile.title}</h2>
          <p>{tile.descriptor}</p>
        </div>
        <span className="area-caption__arrow" aria-hidden="true">
          <ArrowRight size={18} strokeWidth={1.8} />
        </span>
      </div>
    </PointerResponseLink>
  );
}
