import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Loshi Edu. We're here to help with course enquiries, support, and partnership opportunities.",
  openGraph: {
    title: "Contact Us | Loshi Edu",
    description:
      "Reach out to our team for enquiries, support, or partnership.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
