import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instructor Profile",
  description:
    "View instructor profile, expertise, courses, and student reviews at grotutor.",
  openGraph: {
    title: "Instructor Profile | grotutor",
    description: "View instructor profile, courses, and reviews.",
  },
};

export default function InstructorDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
