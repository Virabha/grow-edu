import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Instructors",
  description:
    "Meet the expert instructors at grotutor. Learn from industry professionals with years of experience.",
  openGraph: {
    title: "Our Instructors | grotutor",
    description: "Meet the expert instructors powering grotutor courses.",
  },
};

export default function InstructorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
