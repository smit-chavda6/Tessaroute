import type { NextConfig } from "next";

// Static export: the site is pure marketing/showcase content with no server
// code, so it deploys to Vercel, GitHub Pages or any static host.
const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
