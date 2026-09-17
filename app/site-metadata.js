export const siteSectionTitles = Object.freeze({
  projects: "Projects",
  professional: "Professional",
  about: "About",
  contact: "Contact",
  albums: "The album archive"
});

/* Next replaces the parent's openGraph wholesale, so a page that overrides the
   title and url has to carry the shared image with it. */
export const pageOpenGraph = ({ title, description, path }) => ({
  title: `Akibwa | ${title}`,
  description,
  url: path,
  siteName: "Akibwa",
  type: "website",
  images: [
    {
      url: "/og.jpg",
      width: 1200,
      height: 630,
      alt: "Sunlit mountain meadow with a layered data texture"
    }
  ]
});
