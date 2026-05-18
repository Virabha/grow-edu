import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Courses",
  description: "View and continue your enrolled courses at grotutor.",
  robots: { index: false, follow: true },
};

export default function MyCoursesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
