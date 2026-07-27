import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Post previews pull thumbnails scraped from the org websites.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
