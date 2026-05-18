import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
