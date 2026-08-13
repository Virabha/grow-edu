import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
const siteName = siteConfig.name;
export const metadata: Metadata = {
    robots: {
        index: true,
        follow: true,
    },
    openGraph: {
        siteName: siteName,
        locale: "en_US",
        type: "website",
    },
};
export default function UnauthenticatedLayout({ children, }: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
