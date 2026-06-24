"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@stores/session";
import { setClientSession, clearClientSession, msUntilTokenExpiry } from "@/lib/auth";
import apiClient from "@config/axios";

/**
 * Proactive silent token refresh hook.
 *
 * Mounting this hook prevents the most common logout cause:
 * the access-token cookie expiring while the user is idle on a page,
 * which triggers the Next.js middleware to redirect them to /auth/login
 * even though their refresh token is still valid.
 *
 * Strategy:
 *  1. On mount — if the token is already expired or missing, try to refresh immediately.
 *  2. On mount — schedule a refresh 2 minutes before the token would expire.
 *  3. On window `focus` — if the token has < 5 minutes left (or is gone), refresh silently.
 *
 * All refreshes call POST /auth/refresh which reads the httpOnly refreshToken cookie.
 * If the refresh itself fails (refresh token expired/revoked), forceLogout is called.
 *
 * NOTE: The vb_access_token cookie is httpOnly — JS cannot read it.
 * We detect "session is active" by checking the Zustand in-memory accessToken
 * or the expiry timestamp stored in localStorage.
 */
export function useTokenRefresh() {
    const { clearSession, setSession } = useSessionStore();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRefreshingRef = useRef(false);

    // Use refs to read the latest values without causing effect re-runs
    const userRef = useRef(useSessionStore.getState().user);
    const accessTokenRef = useRef(useSessionStore.getState().accessToken);

    // Keep refs in sync with store changes (without adding to useCallback deps)
    useEffect(() => {
        return useSessionStore.subscribe((state) => {
            userRef.current = state.user;
            accessTokenRef.current = state.accessToken;
        });
    }, []);

    const forceLogout = useCallback(async () => {
        await clearClientSession();
        clearSession();
        window.location.href = "/auth/login";
    }, [clearSession]);

    const silentRefresh = useCallback(async (): Promise<void> => {
        if (isRefreshingRef.current) return;
        isRefreshingRef.current = true;
        try {
            // withCredentials sends the httpOnly refreshToken cookie automatically
            const { data } = await apiClient.post<{ data: { accessToken: string } }>("/auth/refresh");
            const newToken = data?.data?.accessToken;
            if (newToken) {
                // Store new token in Zustand memory and record expiry for next schedule
                const currentUser = userRef.current;
                if (currentUser) {
                    setSession(currentUser, newToken);
                }
                await setClientSession(newToken); // records expiry in localStorage
                // Keep axios default header in sync
                apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            } else {
                await forceLogout();
            }
        } catch {
            // Refresh token is expired or revoked — the user must log in again
            await forceLogout();
        } finally {
            isRefreshingRef.current = false;
        }
    }, [forceLogout, setSession]);

    /** Schedule a refresh to fire 2 minutes before the token expires. */
    const scheduleRefresh = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        const msLeft = msUntilTokenExpiry();
        // If already expired or no in-memory token, try immediately
        if (msLeft <= 0 || !accessTokenRef.current) {
            silentRefresh().then(scheduleRefresh);
            return;
        }

        // Refresh 2 minutes before expiry (or immediately if < 2 min left)
        const REFRESH_BEFORE_MS = 2 * 60 * 1000;
        const delay = Math.max(msLeft - REFRESH_BEFORE_MS, 0);

        timerRef.current = setTimeout(() => {
            silentRefresh().then(scheduleRefresh);
        }, delay);
    }, [silentRefresh]); // accessToken removed — read via ref to avoid re-render loop

    useEffect(() => {
        // 1. Schedule a refresh for ~2 min before expiry on mount
        scheduleRefresh();

        // 2. On tab focus: if token has < 5 min left (or is missing), refresh now
        const FOCUS_THRESHOLD_MS = 5 * 60 * 1000;
        const handleFocus = () => {
            if (msUntilTokenExpiry() < FOCUS_THRESHOLD_MS || !accessTokenRef.current) {
                silentRefresh().then(scheduleRefresh);
            }
        };

        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("focus", handleFocus);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [scheduleRefresh, silentRefresh]); // accessToken removed from deps — stops infinite loop
}
