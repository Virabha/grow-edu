import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Courses",
  description:
    "Explore 500+ expert-led courses at Loshi Edu. Competitive Exams, Professional Skills, Academics, Data Science, Digital Marketing and more.",
  openGraph: {
    title: "Browse Courses | Loshi Edu",
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
