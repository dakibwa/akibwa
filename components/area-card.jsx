"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PointerResponseLink } from "@/components/pointer-response";

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
        <Image
          src={cardImage}
          alt={cardAlt}
          fill
          priority={index < 2}
          sizes="(max-width: 760px) 100vw, 48vw"
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
          <ArrowRight size={19} strokeWidth={1.8} />
        </span>
      </div>
    </PointerResponseLink>
  );
}
