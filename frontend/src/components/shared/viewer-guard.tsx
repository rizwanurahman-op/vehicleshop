"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsViewer } from "@hooks/use-role";

/**
 * Client component guard — redirects viewer users away from write pages.
 * Render at the top of any page that creates/edits records.
 *
 * Usage:
 *   <ViewerGuard redirectTo="/vehicles" />
 */
export function ViewerGuard({ redirectTo = "/" }: { redirectTo?: string }) {
    const isViewer = useIsViewer();
    const router = useRouter();

    useEffect(() => {
        if (isViewer) router.replace(redirectTo);
    }, [isViewer, redirectTo, router]);

    return null;
}
