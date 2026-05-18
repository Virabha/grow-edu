import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment",
  description: "Payment processing for Loshi Edu.",
  robots: { index: false, follow: false },
};

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
