import styles from "./personal-project-art.module.css";

const artworkBySlug = {
  chorus: {
    src: "/project-art/personal/chorus-trio.webp",
    bannerSrc: "/project-art/personal/chorus-trio-banner.webp",
    variant: "music"
  },
  "cover-collision": {
    src: "/project-art/personal/cover-collision-saint.webp",
    bannerSrc: "/project-art/personal/cover-collision-saint-banner.webp",
    variant: "cover"
  },
  "canta-porto": {
    src: "/project-art/personal/music-intelligence.webp",
    bannerSrc: "/project-art/personal/music-intelligence-banner.webp",
    variant: "music"
  },
  "one-bag": {
    src: "/project-art/personal/albion-sunburst-hero.webp",
    bannerSrc: "/project-art/personal/albion-sunburst-banner.webp",
    variant: "cover"
  },
  meditator: {
    src: "/project-art/personal/albion-rose-card.webp",
    bannerSrc: "/project-art/personal/albion-rose-banner.webp",
    variant: "knowledge"
  },
  "personal-knowledge-base": {
    src: "/project-art/personal/knowledge-apple-card.webp",
    bannerSrc: "/project-art/personal/knowledge-apple-banner.webp",
    variant: "knowledge"
  }
};

export function getPersonalProjectArt(project) {
  return artworkBySlug[project.slug] ?? artworkBySlug["personal-knowledge-base"];
}

export function PersonalProjectArt({ project, className = "", priority = false }) {
  const artwork = getPersonalProjectArt(project);

  return (
    <div className={`${styles.art} ${styles[artwork.variant]} ${className}`} aria-hidden="true">
      <img
        src={artwork.src}
        alt=""
        draggable="false"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
      />
    </div>
  );
}
