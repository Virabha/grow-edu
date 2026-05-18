import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
const siteUrl = siteConfig.url;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const currentDate = new Date();
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: siteUrl,
            lastModified: currentDate,
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: `${siteUrl}/login`,
            lastModified: currentDate,
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${siteUrl}/signup`,
            lastModified: currentDate,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/learner/courses`,
            lastModified: currentDate,
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/forgot-password`,
            lastModified: currentDate,
            changeFrequency: "yearly",
            priority: 0.3,
        },
    ];
    return [...staticPages];
}
