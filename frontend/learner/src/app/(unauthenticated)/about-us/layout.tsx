import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Loshi Edu's mission to transform education in India. Our story, vision, team, and values.",
  openGraph: {
    title: "About Us | Loshi Edu",
    description:
      "Our mission: redefining the future of learning in India.",
  },
};

export default function AboutUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
