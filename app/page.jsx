import { MusicRoom } from "@/components/paper/music-room";

export const metadata = {
  title: { absolute: "Akibwa" },
  alternates: { canonical: "/" },
  description: "The music Akibwa plays most: 150 albums and 1,000 songs, each as large as the hours listened.",
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
      "max-video-preview": 0,
      "max-image-preview": "none",
      "max-snippet": 120,
    },
  },
};

// Akibwa is one page: the music shelf (Dan, 16 November 2026). Everything
// here runs once, during the static export.
export default function IndexPage() {
  return (
    <div className="music-page">
      <h1 className="visually-hidden">Akibwa: the music I play most</h1>
      <MusicRoom active />
    </div>
  );
}
