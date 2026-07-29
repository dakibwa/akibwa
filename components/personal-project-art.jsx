import styles from "./personal-project-art.module.css";
import { SiteImage, SLOT_SIZES } from "@/components/site-image";

const artworkBySlug = {
  chorus: {
    src: "/project-art/personal/chorus-symbol.webp",
    bannerSrc: "/project-art/personal/chorus-symbol.webp",
    navBannerSrc: "/brand-art/nav/projects/chorus.webp",
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
  "one-bag": {
    src: "/project-art/personal/one-bag-symbol.webp",
    bannerSrc: "/project-art/personal/one-bag-symbol.webp",
    navBannerSrc: "/brand-art/nav/projects/one-bag.webp",
    variant: "symbol",
    detailBannerPosition: "50% 50%",
    selectorBannerPosition: "50% 50%",
    selectorSubjectPosition: "50% 50%",
    expandedBannerPosition: "50% 50%"
  },
  "portuguese-with-ines": {
    src: "/project-art/personal/portuguese-with-ines-symbol.webp",
    bannerSrc: "/project-art/personal/portuguese-with-ines-symbol.webp",
    navBannerSrc: "/portugal/visuals/generated-splats/cream-blue-fan-splat.webp",
    variant: "symbol",
    detailBannerPosition: "50% 50%",
    selectorBannerPosition: "50% 50%",
    selectorSubjectPosition: "50% 50%",
    expandedBannerPosition: "50% 50%"
  },
  fellrun: {
    src: "/project-art/personal/fellrun-ridge.webp",
    bannerSrc: "/project-art/personal/fellrun-ridge-banner.webp",
    navBannerSrc: "/project-art/personal/fellrun-ridge-banner.webp",
    variant: "knowledge",
    detailBannerPosition: "50% 52%",
    selectorBannerPosition: "50% 52%",
    selectorSubjectPosition: "50% 52%",
    expandedBannerPosition: "50% 52%"
  },
  fellblade: {
    src: "/project-art/personal/fellblade-encounter.webp",
    bannerSrc: "/project-art/personal/fellblade-encounter-banner.webp",
    navBannerSrc: "/project-art/personal/fellblade-encounter-banner.webp",
    variant: "cover",
    detailBannerPosition: "50% 46%",
    selectorBannerPosition: "50% 46%",
    selectorSubjectPosition: "50% 46%",
    expandedBannerPosition: "50% 46%"
  },
  meditator: {
    src: "/project-art/personal/meditator-symbol.webp",
    bannerSrc: "/project-art/personal/meditator-symbol.webp",
    navBannerSrc: "/brand-art/nav/projects/meditator.webp",
    variant: "symbol",
    detailBannerPosition: "50% 50%",
    selectorBannerPosition: "50% 50%",
    selectorSubjectPosition: "50% 50%",
    expandedBannerPosition: "50% 50%"
  }
};

export function getPersonalProjectArt(project) {
  return artworkBySlug[project.slug] ?? artworkBySlug.chorus;
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
