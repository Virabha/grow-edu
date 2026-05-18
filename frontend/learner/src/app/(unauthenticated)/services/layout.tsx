import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Services",
  description: "Explore Loshi Edu's educational services — corporate training, exam preparation, skill development, and more.",
  openGraph: {
    title: "Our Services | Loshi Edu",
    description: "Corporate training, exam prep, skill development & more.",
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
