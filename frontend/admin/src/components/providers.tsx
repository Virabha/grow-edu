"use client";
import { QueryProvider } from "@/lib/providers/query-provider";
import { Toaster } from "sonner";

// Demo mode must be installed before any component renders, because the auth
// screens call `fetch` directly rather than going through the axios client.
// Wiring it here rather than in lib/api/client.ts means it is active even on
// pages that never import that client — sign-up and sign-in among them.

export function Providers({ children }: {
    children: React.ReactNode;
}) {
    return (<QueryProvider>
      {children}
      <Toaster position="top-right"/>
    </QueryProvider>);
}
