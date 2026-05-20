import { apiClient } from "../client";

export interface Banner {
  bannerId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string;
  overlayColor: string | null;
  overlayOpacity: number | null;
  textColor: string | null;
  textAlign: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  ctaStyle: string | null;
  secondaryCtaText: string | null;
  secondaryCtaLink: string | null;
  badgeText: string | null;
  badgeColor: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Faq {
  faqId: string;
  question: string;
  answer: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhyChooseUs {
  id: string;
  iconName: string;
  iconColor: string | null;
  iconBg: string | null;
  title: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SiteSettings = Record<string, unknown>;

export interface Instructor {
  profileId: string;
  userId: string;
  name: string;
  bio: string | null;
  expertise: string[];
  experience: string | null;
  education: string | null;
  avatarUrl: string | null;
  displayOrder: number;
}

export const cmsApi = {
  getInstructors: () =>
    apiClient.get<Instructor[]>("/cms/instructors").then((r) => r.data),
  getBanners: () => apiClient.get<Banner[]>("/cms/banners").then((r) => r.data),
  getFaqs: () => apiClient.get<Faq[]>("/cms/faqs").then((r) => r.data),
  getWhyChooseUs: () =>
    apiClient.get<WhyChooseUs[]>("/cms/why-choose-us").then((r) => r.data),
  getAllSiteSettings: () =>
    apiClient.get<SiteSettings>("/cms/site-settings").then((r) => r.data),
};
