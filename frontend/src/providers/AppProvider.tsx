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
                        staleTime: 30 * 1000,
                        retry: 1,
                        refetchOnWindowFocus: false,
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
