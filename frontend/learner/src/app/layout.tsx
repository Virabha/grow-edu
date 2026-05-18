import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "../../globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Loshi Edu — Transform Your Learning Journey",
    template: "%s | Loshi Edu",
  },
  description:
    "Redefining the future of learning. 50K+ active students, 100+ expert tutors, 95% success rate. Expert-led courses in Competitive Exams, Professional Skills, Academics, and more.",
  keywords: [
    "online courses",
    "Loshi Edu",
    "LoshiEdu",
    "education",
    "e-learning",
    "competitive exams",
    "professional skills",
    "UPSC courses",
    "IIT JEE",
    "digital marketing",
    "data science",
  ],
  authors: [{ name: "Loshi EduTech Pvt Ltd" }],
  creator: "Loshi EduTech Pvt Ltd",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://loshiedu.com",
    siteName: "Loshi Edu",
    title: "Loshi Edu — Transform Your Learning Journey",
    description:
      "50K+ active students. 100+ expert tutors. 95% success rate. Expert-led courses across Exams, Skills, Academics & more.",
    images: [
      {
        url: "./logo.jpeg",
        width: 192,
        height: 192,
        alt: "Loshi Edu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Loshi Edu",
    description:
      "Transform Your Learning Journey. 50K+ active students. 100+ expert tutors.",
    images: ["https://loshiedu.com/logo.jpeg"],
  },
  robots: "index, follow",
  metadataBase: new URL("https://loshiedu.com"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "Loshi Edu",
              url: "https://loshiedu.com",
              logo: "https://loshiedu.com/logo.jpeg",
              description:
                "India's leading online education platform — redefining the future of learning.",
              address: {
                "@type": "PostalAddress",
                streetAddress:
                  "Unit # 1801, Vasavi Sky City, Gachibowli X Road",
                addressLocality: "Hyderabad",
                addressRegion: "Telangana",
                addressCountry: "IN",
              },
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+91-6309046611",
                email: "contact@loshiedu.com",
                contactType: "customer service",
                availableLanguage: ["English", "Hindi", "Telugu"],
              },
              sameAs: [
                "https://www.facebook.com/loshiedu",
                "https://www.linkedin.com/company/loshiedu",
                "https://www.youtube.com/@loshiedu",
                "https://www.instagram.com/loshiedu",
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased overflow-x-hidden`}
      >
        <QueryProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
