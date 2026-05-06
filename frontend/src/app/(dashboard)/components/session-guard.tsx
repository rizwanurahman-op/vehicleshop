"use client";
import { useTokenRefresh } from "@/hooks/use-token-refresh";

/**
 * Mounts the proactive token-refresh logic for all dashboard pages.
 * This is a minimal client component so it can use the hook
 * without converting the entire dashboard layout to "use client".
 */
export function SessionGuard() {
    useTokenRefresh();
    return null;
}
