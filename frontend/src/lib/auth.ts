/**
 * Client-side auth utilities.
 *
 * SECURITY DESIGN:
 * - The access token cookie (vb_access_token) is set as httpOnly by the backend.
 *   This means JavaScript CANNOT read or write it — XSS attacks cannot steal it.
 * - We store only the token EXPIRY TIME in localStorage (not the token itself)
 *   so the proactive refresh logic knows when to call /auth/refresh.
 * - The Zustand session store keeps the access token in memory (for the axios
 *   Authorization header), but it is NOT persisted to localStorage/cookie.
 *
 * Flow:
 *  Login/Register → backend sets httpOnly cookie → body returns accessToken
 *  → Zustand stores it in memory → axios sends it as Authorization header
 *  → on expiry, /auth/refresh renews both the httpOnly cookie AND the body token
 *  → Zustand updates its in-memory copy
 */

const EXPIRY_KEY = "vb_token_expiry";

// Must match JWT_ACCESS_EXPIRY on the backend (currently 15m).
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Record token expiry time so the proactive refresh hook knows when to renew.
 * Called after login, register, or a successful token refresh.
 * Does NOT write the token itself to any client-accessible storage.
 */
export const setClientSession = (_accessToken: string): void => {
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    if (typeof window !== "undefined") {
        localStorage.setItem(EXPIRY_KEY, String(expiresAt));
    }
    // NOTE: The vb_access_token cookie is httpOnly — set by the backend, not here.
    // The _accessToken parameter is kept for API compatibility (Zustand stores it in memory).
};

/**
 * The httpOnly cookie cannot be read by JavaScript.
 * This returns null — the axios interceptor uses the Zustand in-memory token instead.
 * The Next.js middleware reads the cookie server-side (httpOnly cookies ARE readable there).
 */
export const getClientSession = (): string | null => {
    // httpOnly cookie is not accessible to JS — return null.
    // Axios uses the Authorization header populated from Zustand instead.
    return null;
};

/** Clear the token expiry marker from localStorage on logout. */
export const clearClientSession = (): void => {
    if (typeof window !== "undefined") {
        localStorage.removeItem(EXPIRY_KEY);
    }
    // The httpOnly cookie is cleared by the backend /auth/logout endpoint.
};

/** Returns ms until the token expires (negative if already expired). */
export const msUntilTokenExpiry = (): number => {
    if (typeof window === "undefined") return Infinity;
    const expiresAt = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
    return expiresAt - Date.now();
};
