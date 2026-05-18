import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
const siteUrl = siteConfig.url;
const siteName = siteConfig.name;
export const metadata: Metadata = {
    title: "Login | Loshi Edu",
    description: "Sign in to your Loshi Edu account. Access your courses, learning progress, and certificates.",
    alternates: {
        canonical: `${siteUrl}/login`,
    },
    openGraph: {
        title: "Login | Loshi Edu",
        description: "Sign in to access your courses and learning tools at Loshi Edu.",
        url: `${siteUrl}/login`,
        siteName: siteName,
        type: "website",
    },
    robots: {
        index: true,
        follow: true,
    },
};
export default function LoginLayout({ children, }: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
