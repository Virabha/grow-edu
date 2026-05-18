import type { Metadata } from "next";
import { LandingPageClient } from "@/components/sections/landing-page-client";
import { siteConfig } from "@/lib/site-config";
const siteUrl = siteConfig.url;
const siteName = siteConfig.name;
export const metadata: Metadata = {
    title: "Loshi Edu | Learn Smarter. Grow Faster. Lead With Purpose.",
    description: "Premium online courses for learners, professionals, and organisations. Build real-world skills through expert-led programs designed to help you grow faster and stay future-ready.",
    keywords: [
        "online courses",
        "professional development",
        "career growth",
        "upskilling",
        "reskilling",
        "business and leadership",
        "technology and data",
        "finance and accounting",
        "creative and design",
        "project management",
        "test preparation",
    ],
    alternates: {
        canonical: siteUrl,
    },
    openGraph: {
        title: "Loshi Edu | Unlock Skills That Drive Your Future",
        description: "Premium, outcomes-driven online learning for learners, professionals, and organisations.",
        url: siteUrl,
        siteName: siteName,
        type: "website",
        images: [
            {
                url: `${siteUrl}/og-image.png`,
                width: 1200,
                height: 630,
                alt: "Loshi Edu - Learn Smarter. Grow Faster. Lead With Purpose.",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Loshi Edu | Unlock Skills That Drive Your Future",
        description: "Premium, outcomes-driven online learning for learners, professionals, and organisations.",
        images: [`${siteUrl}/og-image.png`],
    },
};
export default function HomePage() {
    const courseListJsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Featured Courses at Loshi Edu",
        description: "Explore popular, outcomes-driven courses designed to build real-world skills.",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                item: {
                    "@type": "Course",
                    name: "Business Strategy and Leadership",
                    description: "Develop strategic thinking and leadership capabilities for real-world impact.",
                    provider: {
                        "@type": "Organization",
                        name: siteName,
                        url: siteUrl,
                    },
                    educationalLevel: "All levels",
                    teaches: [
                        "Strategy",
                        "Leadership",
                        "Decision Making",
                    ],
                },
            },
            {
                "@type": "ListItem",
                position: 2,
                item: {
                    "@type": "Course",
                    name: "Python for Data Science",
                    description: "Build strong foundations and create real projects using Python and data tools.",
                    provider: {
                        "@type": "Organization",
                        name: siteName,
                        url: siteUrl,
                    },
                    educationalLevel: "Beginner to Intermediate",
                    teaches: [
                        "Python",
                        "Data Analysis",
                        "Projects",
                    ],
                },
            },
            {
                "@type": "ListItem",
                position: 3,
                item: {
                    "@type": "Course",
                    name: "Digital Marketing Essentials",
                    description: "Master modern marketing channels, tools, and measurement frameworks.",
                    provider: {
                        "@type": "Organization",
                        name: siteName,
                        url: siteUrl,
                    },
                    educationalLevel: "All levels",
                    teaches: [
                        "Marketing Channels",
                        "Content Strategy",
                        "Analytics",
                    ],
                },
            },
        ],
    };
    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
            {
                "@type": "Question",
                name: "What is Loshi Edu?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Loshi Edu is a premium, outcomes-driven learning platform that blends academic rigor with practical application. Courses are designed to deliver skills you can use immediately.",
                },
            },
            {
                "@type": "Question",
                name: "Can I learn at my own pace?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Learn on your schedule with flexible, on-demand access across desktop, tablet, and mobile.",
                },
            },
            {
                "@type": "Question",
                name: "What topics do you cover?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "We offer courses across business and leadership, technology and data, finance and accounting, creative and design, professional skills, and academic and test preparation—plus career pathways and certifications.",
                },
            },
            {
                "@type": "Question",
                name: "Do you provide certificates?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Track progress across your learning journey and earn certificates upon completion.",
                },
            },
        ],
    };
    return (<>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
            __html: JSON.stringify(courseListJsonLd),
        }}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd),
        }}/>
      <LandingPageClient />
    </>);
}
