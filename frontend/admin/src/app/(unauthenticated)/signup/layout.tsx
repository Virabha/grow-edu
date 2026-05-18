import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
const siteUrl = siteConfig.url;
const siteName = siteConfig.name;
export const metadata: Metadata = {
    title: "Sign Up | Loshi Edu",
    description: "Create your Loshi Edu account. Start learning with expert-led courses, progress tracking, and certificates.",
    alternates: {
        canonical: `${siteUrl}/signup`,
    },
    openGraph: {
        title: "Sign Up | Loshi Edu",
        description: "Start learning today with Loshi Edu. Create your account in minutes.",
        url: `${siteUrl}/signup`,
        siteName: siteName,
        type: "website",
    },
    robots: {
        index: true,
        follow: true,
    },
};
export default function SignupLayout({ children, }: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
