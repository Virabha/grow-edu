import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS app.
  // Next.js otherwise infers a root by walking up looking for lockfiles, and
  // picking the wrong one resolves PostCSS/Tailwind from the wrong
  // node_modules — which made Turbopack panic on globals.css. Keep this even
  // though the repo-root workspace that first caused it has been removed.
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.b-cdn.net" },
      { protocol: "https", hostname: "*.bunny.net" },
      { protocol: "https", hostname: "drive.google.com" },
    ],
  },
  async rewrites() {
    const backendBase = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    ).replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${backendBase}/:path*` }];
  },
};

export default nextConfig;
