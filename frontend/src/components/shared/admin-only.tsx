"use client";

import { useIsAdmin } from "@hooks/use-role";

interface AdminOnlyProps {
    children: React.ReactNode;
    /** Optional element to render for viewers instead of nothing */
    fallback?: React.ReactNode;
}

/**
 * Renders `children` only when the logged-in user is an admin.
 * For viewers, renders `fallback` (default: nothing).
 *
 * Usage:
 *   <AdminOnly>
 *     <CreateButton />
 *   </AdminOnly>
 *
 *   <AdminOnly fallback={<LockedButton />}>
 *     <EditButton />
 *   </AdminOnly>
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
    const isAdmin = useIsAdmin();
    if (!isAdmin) return <>{fallback}</>;
    return <>{children}</>;
}
