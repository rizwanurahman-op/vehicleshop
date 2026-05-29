"use client";

import { useSessionStore } from "@stores/session";

/** Returns the current user's role, or null if not authenticated. */
export const useRole = () => useSessionStore(s => s.user?.role ?? null);

/** Returns true if the current user is an admin. */
export const useIsAdmin = () => useRole() === "admin";

/** Returns true if the current user is a viewer. */
export const useIsViewer = () => useRole() === "viewer";
