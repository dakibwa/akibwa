/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // A dev server can keep its own build directory, so `next build` for the
  // export never pulls its files out from under it.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
