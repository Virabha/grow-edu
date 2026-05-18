import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Cookie, Eye, Server, Baby, RefreshCw, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Loshi EduTech Pvt Ltd collects, uses, and protects your personal information on the Loshi Edu platform.",
};

const sections = [
  {
    icon: Eye,
    title: "1. Information We Collect",
    content: [
      "We collect information you provide directly when you create an account, enroll in courses, make purchases, or contact us. This includes:",
    ],
    list: [
      "Personal identifiers such as your full name, email address, phone number, and mailing address.",
      "Account credentials including your username and encrypted password.",
      "Payment information such as billing address and transaction details (processed securely via third-party payment gateways — we do not store card numbers).",
      "Educational data including course enrollments, progress, quiz scores, certificates earned, and instructor interactions.",
      "Communications you send us, including support requests, feedback, and survey responses.",
      "Device and usage data such as IP address, browser type, operating system, pages visited, and session duration collected automatically through log files.",
    ],
  },
  {
    icon: Server,
    title: "2. How We Use Your Information",
    content: [
      "We use the information we collect for the following purposes:",
    ],
    list: [
      "To create and manage your Loshi Edu account and authenticate your identity.",
      "To process course enrollments, payments, and issue certificates of completion.",
      "To personalise your learning experience by recommending courses based on your interests and progress.",
      "To communicate with you about account updates, course announcements, promotional offers, and support responses.",
      "To improve our platform, content quality, and user experience through analytics.",
      "To detect, prevent, and address fraud, abuse, or security issues.",
      "To comply with legal obligations and enforce our Terms of Service.",
    ],
  },
  {
    icon: Cookie,
    title: "3. Cookies & Tracking Technologies",
    content: [
      "Loshi Edu uses cookies and similar tracking technologies to enhance your browsing experience:",
    ],
    list: [
      "Essential cookies are required for core functionality such as authentication, session management, and security.",
      "Analytics cookies help us understand how visitors interact with our platform so we can improve performance and content.",
      "Preference cookies remember your settings such as language, theme, and notification preferences.",
      "Marketing cookies may be used to deliver relevant advertisements and measure campaign effectiveness.",
    ],
    footer:
      "You can manage your cookie preferences through your browser settings. Disabling certain cookies may affect platform functionality.",
  },
  {
    icon: Lock,
    title: "4. Third-Party Services",
    content: [
      "We may share limited information with trusted third-party service providers who assist us in operating the platform:",
    ],
    list: [
      "Payment processors (Razorpay, Stripe) for secure transaction handling.",
      "Cloud infrastructure providers (AWS, Google Cloud) for hosting and data storage.",
      "Analytics services (Google Analytics) for usage insights and performance monitoring.",
      "Email and notification services for transactional and promotional communications.",
      "Customer support tools for managing and responding to inquiries.",
    ],
    footer:
      "These providers are contractually obligated to protect your data and may only use it for the specific services they provide to us.",
  },
  {
    icon: Shield,
    title: "5. Data Security",
    content: [
      "We implement industry-standard security measures to protect your personal information:",
    ],
    list: [
      "All data transmissions are encrypted using TLS/SSL protocols.",
      "Passwords are hashed and salted using modern cryptographic algorithms.",
      "Access to personal data is restricted to authorised personnel only.",
      "Regular security audits and vulnerability assessments are conducted.",
      "We maintain incident response procedures for potential data breaches.",
    ],
    footer:
      "While we strive to protect your information, no method of transmission or storage is 100% secure. We encourage you to use strong passwords and keep your account credentials confidential.",
  },
  {
    icon: Baby,
    title: "6. Children's Privacy",
    content: [
      "Loshi Edu is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.",
      "For users between 13 and 18 years of age, we recommend parental guidance when using the platform and enrolling in courses. Parents or guardians may contact us to review, modify, or delete their child's information.",
    ],
  },
  {
    icon: RefreshCw,
    title: "7. Changes to This Policy",
    content: [
      "We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, or legal requirements. When we make material changes:",
    ],
    list: [
      "We will update the 'Last Updated' date at the top of this page.",
      "For significant changes, we will notify you via email or a prominent notice on our platform.",
      "Your continued use of Loshi Edu after changes are posted constitutes your acceptance of the updated policy.",
    ],
    footer:
      "We encourage you to review this page periodically to stay informed about how we protect your data.",
  },
  {
    icon: Mail,
    title: "8. Contact Us",
    content: [
      "If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please reach out to us:",
    ],
    list: [
      "Email: contact@loshiedu.com",
      "Phone: +91-6309046611",
      "Address: Unit 1801, 18th Floor, Vasavi Sky City, Gachibowli, Hyderabad-500032",
    ],
    footer:
      "We aim to respond to all privacy-related inquiries within 48 business hours.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main>
        <section className="border-b border-border bg-white/20 backdrop-blur-sm py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Legal
              </p>
              <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
                Privacy <span className="text-primary">Policy</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                Your privacy matters to us. This policy explains how Loshi
                EduTech Pvt Ltd collects, uses, and safeguards your personal
                information.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Last Updated: February 2026
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-10">
              {sections.map((section) => (
                <div key={section.title} className="group">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <section.icon className="size-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-foreground sm:text-xl">
                        {section.title}
                      </h2>
                      {section.content.map((paragraph, i) => (
                        <p
                          key={i}
                          className="mt-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          {paragraph}
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

            <div className="mt-12 rounded-xl border border-border bg-white/20 backdrop-blur-sm p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Have questions about our privacy practices?{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-primary hover:underline"
                >
                  Contact our team
                </Link>{" "}
                — we&apos;re happy to help.
              </p>
            </div>
          </div>
        </section>
    </main>
  );
}
