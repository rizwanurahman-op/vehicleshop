import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionUser {
    id: string;
    username: string;
    email: string;
    role: "admin" | "viewer";
}

interface SessionStore {
    user: SessionUser | null;
    accessToken: string | null;
    setSession: (user: SessionUser, accessToken: string) => void;
    updateUser: (user: Partial<SessionUser>) => void;
    clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
    persist(
        set => ({
            user: null,
            accessToken: null,
            setSession: (user, accessToken) => set({ user, accessToken }),
            updateUser: (updates) => set(state => ({
                user: state.user ? { ...state.user, ...updates } : null,
            })),
            clearSession: () => set({ user: null, accessToken: null }),
        }),
        {
            name: "vb-session",
            // SECURITY: Only persist the user profile — NEVER the accessToken.
            // The accessToken is kept in Zustand memory only (not localStorage, not js-cookie).
            // It is sent to the backend via the Authorization header (axios interceptor reads it
            // from getState().accessToken). The httpOnly vb_access_token cookie is set by the
            // backend and is completely inaccessible to JavaScript — XSS-safe.
            partialize: state => ({ user: state.user }),
        }
    )
);
