import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
const siteUrl = siteConfig.url;
const siteName = siteConfig.name;
export const metadata: Metadata = {
    title: "Sign Up | grotutor",
    description: "Create your grotutor account. Start learning with expert-led courses, progress tracking, and certificates.",
    alternates: {
        canonical: `${siteUrl}/signup`,
    },
    openGraph: {
        title: "Sign Up | grotutor",
        description: "Start learning today with grotutor. Create your account in minutes.",
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
