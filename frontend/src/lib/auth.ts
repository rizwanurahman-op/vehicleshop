import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "vb_access_token";
const EXPIRY_KEY = "vb_token_expiry";

// How long the access token is valid — must match JWT_ACCESS_EXPIRY on the backend.
// We bump this to 1 day; the refresh token (7d) is the real security gate.
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

export const setClientSession = (accessToken: string): void => {
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, {
        expires: TOKEN_TTL_MS / (1000 * 60 * 60 * 24), // days
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
    });
    // Store expiry epoch for proactive refresh logic
    if (typeof window !== "undefined") {
        localStorage.setItem(EXPIRY_KEY, String(expiresAt));
    }
};

export const getClientSession = (): string | null => {
    return Cookies.get(ACCESS_TOKEN_KEY) ?? null;
};

export const clearClientSession = (): void => {
    Cookies.remove(ACCESS_TOKEN_KEY);
    if (typeof window !== "undefined") {
        localStorage.removeItem(EXPIRY_KEY);
    }
};

/** Returns ms until the token expires (negative if already expired). */
export const msUntilTokenExpiry = (): number => {
    if (typeof window === "undefined") return Infinity;
    const expiresAt = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
    return expiresAt - Date.now();
};

