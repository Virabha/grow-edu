import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Details",
  description: "Learn more about this grotutor service offering.",
};

export default function ServiceDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
