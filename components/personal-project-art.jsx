import styles from "./personal-project-art.module.css";

const artworkBySlug = {
  chorus: {
    src: "/project-art/personal/chorus-trio.webp",
    bannerSrc: "/project-art/personal/chorus-trio-banner.webp",
    navBannerSrc: "/brand-art/nav/projects/chorus.webp",
    variant: "music",
    detailBannerPosition: "50% 45%",
    selectorBannerPosition: "50% 48%",
    selectorSubjectPosition: "50% 48%",
    expandedBannerPosition: "50% 45%"
  },
  "cover-collision": {
    src: "/project-art/personal/cover-collision-saint.webp",
    bannerSrc: "/project-art/personal/cover-collision-saint-banner.webp",
    navBannerSrc: "/brand-art/nav/projects/cover-collision.webp",
    variant: "cover",
    detailBannerPosition: "50% 48%",
    selectorBannerPosition: "50% 48%",
    selectorSubjectPosition: "54% 48%",
    expandedBannerPosition: "50% 48%"
  },
  "one-bag": {
    src: "/project-art/personal/one-bag-traveller.webp",
    bannerSrc: "/project-art/personal/one-bag-traveller-banner.webp",
    navBannerSrc: "/brand-art/nav/projects/one-bag.webp",
    variant: "cover",
    detailBannerPosition: "50% 44%",
    selectorBannerPosition: "50% 42%",
    selectorSubjectPosition: "50% 38%",
    expandedBannerPosition: "50% 42%"
  },
  meditator: {
    src: "/project-art/personal/albion-rose-card.webp",
    bannerSrc: "/project-art/personal/albion-rose-banner.webp",
    navBannerSrc: "/brand-art/nav/projects/meditator.webp",
    variant: "knowledge",
    detailBannerPosition: "47% 42%",
    selectorBannerPosition: "47% 42%",
    selectorSubjectPosition: "47% 42%",
    expandedBannerPosition: "47% 42%"
  }
};

export function getPersonalProjectArt(project) {
  return artworkBySlug[project.slug] ?? artworkBySlug.chorus;
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
