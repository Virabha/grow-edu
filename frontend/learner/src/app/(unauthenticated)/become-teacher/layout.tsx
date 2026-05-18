import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become an Instructor",
  description: "Join Loshi Edu as an instructor. Share your expertise and reach thousands of students across India.",
  openGraph: {
    title: "Become an Instructor | Loshi Edu",
    description: "Share your expertise and reach thousands of students.",
  },
};

export default function BecomeTeacherLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
