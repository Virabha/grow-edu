import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join Loshi Edu today. Create your account and start your learning journey with 500+ expert-led courses.",
  openGraph: {
    title: "Sign Up | Loshi Edu",
    description: "Create your account and start learning today.",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
