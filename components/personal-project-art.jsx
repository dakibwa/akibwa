import styles from "./personal-project-art.module.css";

const artworkBySlug = {
  chorus: {
    src: "/project-art/personal/music-intelligence.jpg",
    bannerSrc: "/project-art/personal/music-intelligence-banner.jpg",
    variant: "music"
  },
  "sonic-fm": {
    src: "/project-art/personal/music-intelligence.jpg",
    bannerSrc: "/project-art/personal/music-intelligence-banner.jpg",
    variant: "music"
  },
  vitals: {
    src: "/project-art/personal/health-visualisation.jpg",
    bannerSrc: "/project-art/personal/health-visualisation-banner.jpg",
    variant: "health"
  },
  "cover-collision": {
    src: "/project-art/personal/cover-collision.jpg",
    bannerSrc: "/project-art/personal/cover-collision-banner.jpg",
    variant: "cover"
  },
  "personal-knowledge-base": {
    src: "/project-art/personal/personal-knowledge-base.jpg",
    bannerSrc: "/project-art/personal/personal-knowledge-base-banner.jpg",
    variant: "knowledge"
  },
  akibwapedia: {
    src: "/project-art/personal/personal-knowledge-base.jpg",
    bannerSrc: "/project-art/personal/personal-knowledge-base-banner.jpg",
    variant: "knowledge"
  }
};

export function getPersonalProjectArt(project) {
  return artworkBySlug[project.slug] ?? artworkBySlug["personal-knowledge-base"];
}

export function PersonalProjectArt({ project, className = "" }) {
  const artwork = getPersonalProjectArt(project);

  return (
    <div className={`${styles.art} ${styles[artwork.variant]} ${className}`} aria-hidden="true">
      <img src={artwork.src} alt="" draggable="false" />
    </div>
  );
}
