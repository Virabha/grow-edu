import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Instructors",
  description:
    "Meet the expert instructors at Loshi Edu. Learn from industry professionals with years of experience.",
  openGraph: {
    title: "Our Instructors | Loshi Edu",
    description: "Meet the expert instructors powering Loshi Edu courses.",
  },
};

export default function InstructorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
