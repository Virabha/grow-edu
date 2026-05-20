import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";

import "../../globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "grotutor — Online Learning Platform",
    template: "%s | grotutor",
  },
  description:
    "Redefining the future of learning. 50K+ active students, 100+ expert tutors, 95% success rate. Expert-led courses in Competitive Exams, Professional Skills, Academics, and more.",
  keywords: [
    "online courses",
    "grotutor",
    "education",
    "e-learning",
    "competitive exams",
    "professional skills",
    "UPSC courses",
    "IIT JEE",
    "digital marketing",
    "data science",
  ],
  authors: [{ name: "grotutor" }],
  creator: "grotutor",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://grotutor.com",
    siteName: "grotutor",
    title: "grotutor — Online Learning Platform",
    description:
      "50K+ active students. 100+ expert tutors. 95% success rate. Expert-led courses across Exams, Skills, Academics & more.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "grotutor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "grotutor",
    description:
      "Online Learning Platform. 50K+ active students. 100+ expert tutors.",
    images: ["https://grotutor.com/og-image.png"],
  },
  robots: "index, follow",
  metadataBase: new URL("https://grotutor.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7ee" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
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
              name: "grotutor",
              url: "https://grotutor.com",
              logo: "https://grotutor.com/logo.jpeg",
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
                email: "contact@grotutor.com",
                contactType: "customer service",
                availableLanguage: ["English", "Hindi", "Telugu"],
              },
              sameAs: [
                "https://www.facebook.com/grotutor",
                "https://www.linkedin.com/company/grotutor",
                "https://www.youtube.com/@grotutor",
                "https://www.instagram.com/grotutor",
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${fraunces.variable} font-sans antialiased overflow-x-hidden`}
      >
        <QueryProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
