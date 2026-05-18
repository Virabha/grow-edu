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

export interface CreateBannerDto {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  textAlign?: string;
  ctaText?: string;
  ctaLink?: string;
  ctaStyle?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  badgeText?: string;
  badgeColor?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateBannerDto extends Partial<CreateBannerDto> {}

export interface Faq {
  faqId: string;
  question: string;
  answer: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFaqDto {
  question: string;
  answer: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateFaqDto extends Partial<CreateFaqDto> {}

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

export interface CreateWhyChooseUsDto {
  iconName: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateWhyChooseUsDto extends Partial<CreateWhyChooseUsDto> {}

export interface Testimonial {
  testimonialId: string;
  name: string;
  role: string | null;
  company: string | null;
  rating: number;
  text: string;
  course: string | null;
  avatarUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestimonialDto {
  name: string;
  role?: string;
  company?: string;
  rating?: number;
  text: string;
  course?: string;
  avatarUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateTestimonialDto extends Partial<CreateTestimonialDto> {}

// ==================== FORM SCHEMA TYPES ====================

export interface FormFieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  min?: number;
  max?: number;
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export type FormFieldType = "text" | "email" | "tel" | "number" | "date" | "select" | "textarea" | "radio" | "checkbox";

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required: boolean;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  defaultValue?: string;
  width?: "full" | "half";
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormSchema {
  title: string;
  description?: string;
  sections: FormSection[];
}

// ==================== SERVICE TYPES ====================

export interface Service {
  serviceId: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  screenshots: string[];
  iconName: string | null;
  formSchema: FormSchema | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceDto {
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  screenshots?: string[];
  iconName?: string;
  formSchema?: FormSchema | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateServiceDto extends Partial<CreateServiceDto> {}

// ==================== SERVICE APPLICATION TYPES ====================

export type ApplicationStatus = "NEW" | "REVIEWED" | "CONTACTED" | "ACCEPTED" | "REJECTED";

export interface ServiceApplication {
  applicationId: string;
  serviceId: string;
  formData: Record<string, unknown>;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string | null;
  status: ApplicationStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  serviceTitle: string | null;
  formSchema?: FormSchema | null;
}

export interface ServiceApplicationsResponse {
  data: ServiceApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SiteSetting {
  settingId: string;
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
}

export interface UpsertSiteSettingDto {
  key: string;
  value: Record<string, unknown>;
}

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
