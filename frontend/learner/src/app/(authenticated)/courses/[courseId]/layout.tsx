import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Course Details",
  description:
    "View course details, curriculum, instructor info, and enroll at Loshi Edu.",
  openGraph: {
    title: "Course Details | Loshi Edu",
    description: "View course details, curriculum, and enroll today.",
  },
};

export default function CourseDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
