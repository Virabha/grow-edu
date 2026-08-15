"use client";
import { QueryClient, QueryClientProvider, type QueryClient as QueryClientType, MutationCache, } from "@tanstack/react-query";
import { toast } from "sonner";
import React, { createContext, useContext, useState, type ReactNode } from "react";
import { getApiError } from "@/lib/api/errors";
const createQueryClient = (): QueryClientType => new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
        },
    },
    mutationCache: new MutationCache({
        onError: (error, _vars, _ctx, mutation) => {
            if (mutation.options.onError) return;
            toast.error(getApiError(error).message);
        },
    }),
});
const QueryClientContext = createContext<QueryClientType | null>(null);
export function useQueryClientContext(): QueryClientType {
    const client = useContext(QueryClientContext);
    if (!client)
        throw new Error("useQueryClientContext must be used within QueryProvider");
    return client;
}
export function QueryProvider({ children, }: {
    children: ReactNode;
}): React.ReactElement {
    const [queryClient] = useState<QueryClientType>(createQueryClient);
    return (<QueryClientContext.Provider value={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </QueryClientContext.Provider>);
}
