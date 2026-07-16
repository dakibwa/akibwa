"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const trackCardLight = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--card-mx", `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty("--card-my", `${event.clientY - rect.top}px`);

  if (event.pointerType !== "touch") {
    event.currentTarget.classList.add("is-hovering");
  }
};

const startCardHover = (event) => {
  if (event.pointerType !== "touch") {
    event.currentTarget.classList.add("is-hovering");
  }
};

const endCardInteraction = (event) => {
  event.currentTarget.classList.remove("is-hovering", "is-pressing");
};

const startCardPress = (event) => {
  trackCardLight(event);
  event.currentTarget.classList.add("is-pressing");
};

const endCardPress = (event) => {
  event.currentTarget.classList.remove("is-pressing");

  if (event.pointerType === "touch") {
    event.currentTarget.classList.remove("is-hovering");
  }
};

export function AreaCard({ tile, index }) {
  const cardImage = tile.cardImage ?? tile.image;
  const cardAlt = tile.cardAlt ?? tile.alt;
  const cardImagePosition = tile.cardImagePosition ?? tile.imagePosition;

  return (
    <Link
      href={tile.href}
      prefetch
      className="area-card"
      style={tile.accent ? { "--area-accent": tile.accent } : undefined}
      onPointerEnter={startCardHover}
      onPointerMove={trackCardLight}
      onPointerLeave={endCardInteraction}
      onPointerDown={startCardPress}
      onPointerUp={endCardPress}
      onPointerCancel={endCardPress}
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
}
