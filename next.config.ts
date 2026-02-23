import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Images domains for OG images (Phase 6)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
