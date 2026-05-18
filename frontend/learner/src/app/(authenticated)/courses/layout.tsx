import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Courses",
  description:
    "Explore 500+ expert-led courses at grotutor. Competitive Exams, Professional Skills, Academics, Data Science, Digital Marketing and more.",
  openGraph: {
    title: "Browse Courses | grotutor",
    description:
      "Explore 500+ expert-led courses. Find the perfect course for your career growth.",
  },
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
