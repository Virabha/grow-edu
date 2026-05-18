import type { NextConfig } from "next";
const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: "50mb",
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
    },
    async rewrites() {
        const backendBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
        return [
            {
                source: "/api/:path*",
                destination: `${backendBase}/:path*`,
            },
        ];
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=63072000; includeSubDomains; preload",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
            {
                source: "/sitemap.xml",
                headers: [
                    {
                        key: "Content-Type",
                        value: "application/xml",
                    },
                    {
                        key: "Cache-Control",
                        value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
                    },
                ],
            },
            {
                source: "/robots.txt",
                headers: [
                    {
                        key: "Content-Type",
                        value: "text/plain",
                    },
                    {
                        key: "Cache-Control",
                        value: "public, max-age=86400",
                    },
                ],
            },
        ];
    },
    async redirects() {
        return [
            {
                source: "/home",
                destination: "/",
                permanent: true,
            },
            {
                source: "/courses",
                destination: "/learner/courses",
                permanent: true,
            },
        ];
    },
};
export default nextConfig;
