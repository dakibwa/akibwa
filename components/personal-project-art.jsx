import styles from "./personal-project-art.module.css";

const artworkBySlug = {
  chorus: {
    src: "/project-art/personal/chorus-trio.webp",
    bannerSrc: "/project-art/personal/chorus-trio-banner.webp",
    variant: "music"
  },
  vitals: {
    src: "/project-art/personal/albion-rose-card.webp",
    bannerSrc: "/project-art/personal/albion-sunburst-banner.webp",
    variant: "health"
  },
  "cover-collision": {
    src: "/project-art/personal/cover-collision.webp",
    bannerSrc: "/project-art/personal/cover-collision-banner.webp",
    variant: "cover"
  },
  "personal-knowledge-base": {
    src: "/project-art/personal/knowledge-flame-card.webp",
    bannerSrc: "/project-art/personal/knowledge-flame-banner.webp",
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
