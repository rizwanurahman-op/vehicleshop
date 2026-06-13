"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // staleTime: 0 is the RQ default — restoring it fixes stale-data-on-navigation.
                        // Old code had staleTime: 30_000 + refetchOnWindowFocus: false which broke freshness.
                        staleTime: 0,
                        retry: 1,
                    },
                },
            })
    );

    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <QueryClientProvider client={queryClient}>
                {children}
                <Toaster position="top-right" richColors closeButton />
            </QueryClientProvider>
        </ThemeProvider>
    );
}
