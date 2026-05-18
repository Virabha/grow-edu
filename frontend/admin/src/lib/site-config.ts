export const siteConfig = {
  name: "grotutor",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://grotutor.com",
  description:
    "Premium, outcomes-driven online learning for learners, professionals, and organisations. Build real-world skills through expert-led courses designed to help you grow faster and stay future-ready.",
  contactEmail: "info@grotutor.com",
  supportEmail: "support@grotutor.com",
  social: {
    facebook: "https://www.facebook.com/grotutor",
    linkedin: "https://www.linkedin.com/company/grotutor",
    instagram: "https://www.instagram.com/grotutor",
    twitter: "@grotutor",
  },
} as const;
