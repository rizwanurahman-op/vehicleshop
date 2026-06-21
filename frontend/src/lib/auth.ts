/**
 * Client-side auth utilities.
 *
 * SECURITY DESIGN:
 * - The access token is returned in the login response BODY (JSON) by the backend.
 * - We store only the token EXPIRY TIME in localStorage (not the token itself).
 * - The Zustand session store keeps the access token in memory for the axios
 *   Authorization header — NOT persisted to localStorage.
 * - We call POST /api/session after every token update to set an httpOnly cookie
 *   on the VERCEL domain so the Next.js middleware can read it for auth checks.
 *
 * WHY TWO COOKIES EXIST IN PRODUCTION:
 *   vb_access_token (backend domain / Render) — sent automatically to backend APIs
 *   vb_access_token (frontend domain / Vercel) — read by Next.js middleware for routing
 *
 * The backend (Render) still sets its own vb_access_token cookie (used by the
 * refresh endpoint which reads it when axios sends withCredentials requests).
 * The /api/session route sets the frontend-domain copy for middleware routing.
 *
 * Flow:
 *  Login/Register → backend returns accessToken in body
 *  → setSession(user, accessToken) in Zustand (in-memory)
 *  → setClientSession(accessToken):
 *      - stores expiry in localStorage for proactive refresh
 *      - calls POST /api/session to set httpOnly cookie on Vercel domain
 *  → Next.js middleware reads vb_access_token cookie → allows accesss
 */

const EXPIRY_KEY = "vb_token_expiry";

// Must match JWT_ACCESS_EXPIRY on the backend (currently 15m).
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Record token expiry time and sync the Vercel-domain httpOnly cookie
 * so the Next.js middleware can authenticate server-side renders.
 *
 * Called after login, register, or a successful token refresh.
 */
export const setClientSession = async (accessToken: string): Promise<void> => {
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    if (typeof window !== "undefined") {
        localStorage.setItem(EXPIRY_KEY, String(expiresAt));

        // Sync the cookie on the Vercel (frontend) domain so the Next.js
        // middleware can read it. We await this to prevent race conditions.
        try {
            await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken }),
                credentials: "same-origin",
            });
        } catch {
            // Non-fatal — Zustand in-memory token still works for API calls.
            // The cookie sync will retry on the next token refresh.
            console.warn("[auth] Failed to sync session cookie to frontend domain");
        }
    }
};

/**
 * The httpOnly cookie cannot be read by JavaScript.
 * This returns null — the axios interceptor uses the Zustand in-memory token instead.
 * The Next.js middleware reads the cookie server-side.
 */
export const getClientSession = (): string | null => {
    // httpOnly cookie is not accessible to JS — return null.
    // Axios uses the Authorization header populated from Zustand instead.
    return null;
};

/**
 * Clear the token expiry marker from localStorage on logout.
 * Also clears the Vercel-domain session cookie via DELETE /api/session.
 */
export const clearClientSession = async (): Promise<void> => {
    if (typeof window !== "undefined") {
        localStorage.removeItem(EXPIRY_KEY);

        // Clear the Vercel-domain cookie so the Next.js middleware
        // immediately treats the user as logged out.
        try {
            await fetch("/api/session", {
                method: "DELETE",
                credentials: "same-origin",
            });
        } catch {
            console.warn("[auth] Failed to clear session cookie from frontend domain");
        }
    }
    // The backend httpOnly cookie (Render domain) is cleared by the
    // backend /auth/logout endpoint which the caller invokes separately.
};

/** Returns ms until the token expires (negative if already expired). */
export const msUntilTokenExpiry = (): number => {
    if (typeof window === "undefined") return Infinity;
    const expiresAt = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
    return expiresAt - Date.now();
};
