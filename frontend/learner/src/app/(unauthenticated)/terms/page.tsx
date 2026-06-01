import type { Metadata } from "next";
import {
  FileCheck,
  Layers,
  UserCheck,
  CreditCard,
  RotateCcw,
  Copyright,
  AlertTriangle,
  ShieldAlert,
  Scale,
  Mail,
  BookOpen,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the Terms and Conditions governing your use of the grotutor platform operated by grotutor.",
};

const sections = [
  {
    icon: FileCheck,
    title: "1. Acceptance of Terms",
    paragraphs: [
      "By accessing or using the grotutor platform (grotutor.com), you agree to be bound by these Terms and Conditions, our Privacy Policy, and any additional guidelines or rules applicable to specific services. If you do not agree to these terms, you must not use the platform.",
      "We reserve the right to update these Terms at any time. Continued use of the platform after changes are posted constitutes acceptance of the revised Terms. We will notify registered users of material changes via email.",
    ],
  },
  {
    icon: Layers,
    title: "2. Description of Services",
    paragraphs: [
      "grotutor is an online education platform operated by grotutor. We provide access to a wide catalogue of courses, live sessions, recorded lectures, study materials, assessments, and certificates across various disciplines including IT, Business, Competitive Exams, Languages, and more.",
      "Our services are available to individual learners, educators, and institutional partners. The availability of specific courses, features, or content may vary and is subject to change without prior notice.",
    ],
  },
  {
    icon: UserCheck,
    title: "3. User Accounts",
    paragraphs: [
      "To access most features of grotutor, you must create an account by providing accurate and complete information. You are responsible for:",
    ],
    list: [
      "Maintaining the confidentiality of your account credentials.",
      "All activities that occur under your account.",
      "Notifying us immediately of any unauthorised access or security breach.",
      "Keeping your profile information accurate and up to date.",
    ],
    footer:
      "We reserve the right to suspend or terminate accounts that violate these Terms, provide false information, or engage in fraudulent activity.",
  },
  {
    icon: CreditCard,
    title: "4. Payments & Pricing",
    paragraphs: [
      "Course prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. Payment is processed through secure third-party gateways.",
    ],
    list: [
      "All prices are subject to change. Price changes do not affect courses already purchased.",
      "Promotional discounts, coupons, and offers are subject to specific terms and expiration dates.",
      "We accept payments via UPI, credit/debit cards, net banking, and select wallets.",
      "Upon successful payment, you will receive a confirmation email and immediate access to the enrolled course.",
      "Invoices and payment receipts are available in your account dashboard.",
    ],
  },
  {
    icon: RotateCcw,
    title: "5. Refund Policy",
    paragraphs: [
      "We want you to be satisfied with your learning experience. Our refund policy is as follows:",
    ],
    list: [
      "Refund requests must be submitted within 7 days of purchase.",
      "Courses with more than 25% content consumed are not eligible for refund.",
      "Refunds are processed to the original payment method within 7–10 business days.",
      "Free courses, promotional bundles, and courses purchased with coupons offering 50%+ discount are non-refundable.",
      "Subscription-based plans may be cancelled before the next billing cycle for a prorated refund.",
    ],
    footer:
      "To request a refund, contact us at contact@grotutor.com with your order details.",
  },
  {
    icon: Copyright,
    title: "6. Intellectual Property",
    paragraphs: [
      "All content on grotutor — including course materials, videos, text, graphics, logos, software, and design — is the intellectual property of grotutor or its content creators and is protected by Indian and international copyright laws.",
    ],
    list: [
      "You may not reproduce, distribute, modify, or create derivative works from any content without written permission.",
      "Course materials are licensed for personal, non-commercial use only.",
      "Downloading, screen-recording, or sharing course content is strictly prohibited.",
      "The grotutor name, logo, and branding are registered trademarks of grotutor.",
    ],
  },
  {
    icon: BookOpen,
    title: "7. User Conduct",
    paragraphs: ["When using grotutor, you agree not to:"],
    list: [
      "Share your account credentials or allow multiple users to access a single account.",
      "Post offensive, misleading, defamatory, or illegal content in forums, reviews, or messages.",
      "Attempt to hack, disrupt, or interfere with the platform's infrastructure or security.",
      "Use automated tools, bots, or scrapers to access the platform or extract data.",
      "Engage in academic dishonesty including plagiarism or cheating on assessments.",
      "Harass, threaten, or abuse other users, instructors, or staff.",
    ],
    footer:
      "Violations may result in immediate account suspension, content removal, and potential legal action.",
  },
  {
    icon: AlertTriangle,
    title: "8. Disclaimers",
    paragraphs: [
      "grotutor provides educational content on an \"as is\" and \"as available\" basis. While we strive for accuracy and quality:",
    ],
    list: [
      "We do not guarantee that courses will lead to specific employment outcomes, certifications, or career advancement.",
      "Course content reflects the instructor's knowledge and opinions and may not represent the views of grotutor.",
      "We do not warrant that the platform will be uninterrupted, error-free, or free from viruses or harmful components.",
      "External links provided in courses or materials are not endorsed by us and are accessed at your own risk.",
    ],
  },
  {
    icon: ShieldAlert,
    title: "9. Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by applicable law, grotutor, its directors, employees, and affiliates shall not be liable for:",
    ],
    list: [
      "Any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform.",
      "Loss of data, profits, or business opportunities resulting from platform use or inability to use.",
      "Any unauthorised access to or alteration of your data or transmissions.",
      "Actions or content of third-party service providers or other users.",
    ],
    footer:
      "Our total liability for any claim arising from these Terms shall not exceed the amount paid by you to grotutor in the 12 months preceding the claim.",
  },
  {
    icon: Scale,
    title: "10. Governing Law & Dispute Resolution",
    paragraphs: [
      "These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or relating to these Terms or the use of grotutor shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.",
      "Before initiating legal proceedings, parties agree to attempt resolution through good-faith negotiation and, if necessary, mediation.",
    ],
  },
  {
    icon: Mail,
    title: "11. Contact Information",
    paragraphs: [
      "For any questions, concerns, or requests regarding these Terms and Conditions, please contact us:",
    ],
    list: [
      "Company: grotutor",
      "Email: contact@grotutor.com",
      "Phone: +91-6309046611",
      "Address: House No# 2-13-58, Uppal, Hyderabad, Telangana, Pin - 500039",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="bg-background">
        <section className="border-b border-border bg-card py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                — Legal —
              </p>
              <h1 className="font-display mt-4 text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Terms &{" "}
                <em className="text-primary">Conditions.</em>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Please read these terms carefully before using grotutor. By
                using our services, you agree to them.
              </p>
              <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground/70">
                Effective February 2026
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.title} className="group">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <section.icon className="size-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-display text-xl font-medium leading-snug text-foreground sm:text-2xl">
                        {section.title}
                      </h2>
                      {section.paragraphs.map((p, i) => (
                        <p
                          key={i}
                          className="mt-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          {p}
                        </p>
                      ))}
                      {section.list && (
                        <ul className="mt-3 space-y-2">
                          {section.list.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                            >
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                      {section.footer && (
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground italic">
                          {section.footer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-2xl border border-border bg-card p-7 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Have questions about our terms?{" "}
                <a
                  href="mailto:contact@grotutor.com"
                  className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Email us
                </a>{" "}
                — we&apos;re happy to walk you through it.
              </p>
            </div>
          </div>
        </section>
    </main>
  );
}
