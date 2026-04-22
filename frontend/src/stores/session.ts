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
    clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
    persist(
        set => ({
            user: null,
            accessToken: null,
            setSession: (user, accessToken) => set({ user, accessToken }),
            clearSession: () => set({ user: null, accessToken: null }),
        }),
        {
            name: "vb-session",
        }
    )
);
