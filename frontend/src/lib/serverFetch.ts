import { cookies } from "next/headers";

/**
 * Server-side fetch utility for Next.js Server Components.
 *
 * WHY NOT USE the shared axios instance?
 * The axios instance has a response interceptor that tries to call /auth/refresh
 * when it receives a 401. On the server side, this fails with "No refresh token"
 * because Node.js doesn't have access to the browser's httpOnly cookie jar.
 *
 * This utility uses native fetch() and forwards the access token from the
 * incoming server-side cookie store directly. If the token is missing or expired,
 * it returns null gracefully (the client-side React Query will take over and
 * the useTokenRefresh hook will handle silent refresh on the client).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";


type FetchResult<T> =
    | { data: T; error: null }
    | { data: null; error: string };

export async function serverFetch<T>(
    path: string,
    options?: RequestInit
): Promise<FetchResult<T>> {
    const cookieStore = await cookies();
    const token = cookieStore.get("vb_access_token")?.value;

    // No token at all — user is not authenticated (middleware should have redirected,
    // but handle gracefully here too)
    if (!token) {
        return { data: null, error: "Not authenticated" };
    }

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options?.headers ?? {}),
            },
            // Do NOT cache — always fetch fresh data on each server render
            cache: "no-store",
        });

        if (!res.ok) {
            // 401 = token expired — return null gracefully.
            // Client-side useTokenRefresh hook will silently refresh and
            // React Query will re-fetch once the client hydrates.
            if (res.status === 401) {
                return { data: null, error: "Token expired" };
            }
            const body = await res.json().catch(() => ({}));
            return { data: null, error: (body as { message?: string }).message ?? `HTTP ${res.status}` };
        }

        const body = await res.json() as { data?: T };
        return { data: body.data ?? null as T, error: null };
    } catch (err) {
        // Network error / server unreachable
        const message = err instanceof Error ? err.message : "Network error";
        return { data: null, error: message };
    }
}
