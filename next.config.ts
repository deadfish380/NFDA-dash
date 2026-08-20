import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Post previews pull thumbnails scraped from the org websites.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack: (config) => {
    // Vercel's build container intermittently crashes in webpack's WASM hasher
    // (WasmHash._updateWithBuffer → "Cannot read properties of undefined
    // (reading 'length')"). Use Node's native SHA-256 hashing to avoid the WASM
    // path entirely — slightly slower to build, but reliable.
    config.output.hashFunction = "sha256";
    return config;
  },
};

export default nextConfig;
