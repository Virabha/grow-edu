export const siteConfig = {
  name: "Loshi Edu",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://loshiedu.com",
  description:
    "Premium, outcomes-driven online learning for learners, professionals, and organisations. Build real-world skills through expert-led courses designed to help you grow faster and stay future-ready.",
  contactEmail: "info@loshiedu.com",
  supportEmail: "support@loshiedu.com",
  social: {
    facebook: "https://www.facebook.com/loshiedu",
    linkedin: "https://www.linkedin.com/company/loshiedu",
    instagram: "https://www.instagram.com/loshiedu",
    twitter: "@loshiedu",
  },
} as const;
