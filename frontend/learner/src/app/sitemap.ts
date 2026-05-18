import { MetadataRoute } from "next";

const BASE_URL = "https://grotutor.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/courses`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/instructors`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/about-us`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/become-teacher`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/careers`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
