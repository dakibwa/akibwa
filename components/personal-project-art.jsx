import styles from "./personal-project-art.module.css";
import { SiteImage, SLOT_SIZES } from "@/components/site-image";

const artworkBySlug = {
  albums: {
    src: "/project-art/personal/albums-symbol.webp",
    bannerSrc: "/project-art/personal/albums-symbol.webp",
    navBannerSrc: "/brand-art/nav/projects/albums.webp",
    variant: "symbol",
    detailBannerPosition: "50% 50%",
    selectorBannerPosition: "50% 50%",
    selectorSubjectPosition: "50% 50%",
    expandedBannerPosition: "50% 50%"
  },
  "cover-collision": {
    src: "/project-art/personal/cover-collision-symbol.webp",
    bannerSrc: "/project-art/personal/cover-collision-symbol.webp",
    navBannerSrc: "/brand-art/nav/projects/cover-collision.webp",
    variant: "symbol",
    detailBannerPosition: "50% 50%",
    selectorBannerPosition: "50% 50%",
    selectorSubjectPosition: "50% 50%",
    expandedBannerPosition: "50% 50%"
  },
  "portuguese-with-ines": {
    src: "/project-art/personal/portuguese-with-ines-symbol.webp",
    bannerSrc: "/project-art/personal/portuguese-with-ines-symbol.webp",
    navBannerSrc: "/project-art/personal/portuguese-with-ines-symbol.webp",
    variant: "symbol",
    detailBannerPosition: "50% 50%",
    selectorBannerPosition: "50% 50%",
    selectorSubjectPosition: "50% 50%",
    expandedBannerPosition: "50% 50%"
  },
  features: {
    src: "/project-art/personal/features-symbol.webp",
    bannerSrc: "/project-art/personal/features-symbol.webp",
    navBannerSrc: "/project-art/personal/features-symbol.webp",
    variant: "symbol",
    detailBannerPosition: "50% 50%",
    selectorBannerPosition: "50% 50%",
    selectorSubjectPosition: "50% 50%",
    expandedBannerPosition: "50% 50%"
  }
};

export function getPersonalProjectArt(project) {
  return artworkBySlug[project.slug] ?? artworkBySlug.albums;
}

export function PersonalProjectArt({ project, className = "", priority = false }) {
  const artwork = getPersonalProjectArt(project);

  return (
    <div className={`${styles.art} ${styles[artwork.variant]} ${className}`} aria-hidden="true">
      {/* Six cards to a row at ~202 CSS px on desktop, one full-bleed card on
          mobile — so mobile is the wider request of the two, not desktop. */}
      <SiteImage
        src={artwork.src}
        slot="projectCard"
        sizes={SLOT_SIZES.projectCard}
        alt=""
        draggable="false"
        priority={priority}
      />
    </div>
  );
}
