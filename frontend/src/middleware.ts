import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"];

/** Routes that require admin role — viewers get redirected to /dashboard */
const ADMIN_ONLY_PATHS = [
    "/consignments/new",
    "/vehicles/new",
    "/users",
    "/backups",
];

/**
 * Decode the JWT payload without verifying the signature.
 * Signature verification is done by the backend API on every request.
 * This lightweight decode is safe for UI-level routing only.
 */
function decodeJwtRole(token: string): string | null {
    try {
        const payload = token.split(".")[1];
        const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
        return decoded?.role ?? null;
    } catch {
        return null;
    }
}

/**
 * SECURITY: Validate that a callbackUrl is an internal path.
 * Prevents open redirect attacks where an attacker crafts:
 *   /auth/login?callbackUrl=https://evil.com
 *   /auth/login?callbackUrl=//evil.com  (protocol-relative bypass)
 * Only accepts paths starting with "/" that contain no ":" character.
 */
function isSafeInternalPath(path: string): boolean {
    return (
        typeof path === "string" &&
        path.startsWith("/") &&
        !path.startsWith("//") &&
        !path.includes(":")
    );
}

/**
 * Build the Content-Security-Policy header value with per-request nonce.
 *
 * SECURITY: Nonce-based CSP eliminates 'unsafe-inline' in production.
 * A unique nonce is generated per request and injected into script-src.
 * Next.js uses this nonce for its own inline scripts automatically when
 * the nonce is forwarded as the `x-nonce` request header.
 *
 * In development, 'unsafe-eval' is still needed for hot-reload (HMR).
 */
function buildCsp(nonce: string, isDev: boolean): string {
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL
        ? (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL).origin; } catch { return ""; } })()
        : "";

    // Dev: keep unsafe-eval for HMR. Prod: nonce alone — no more 'unsafe-inline'.
    const scriptSrc = isDev
        ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
        : `'self' 'nonce-${nonce}'`;

    const directives = [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}`,
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ];

    return directives.join("; ");
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("vb_access_token")?.value;

    const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p));

    // Logged in → redirect away from auth pages
    if (isPublicPath && token) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Not logged in → redirect to login
    if (!isPublicPath && !token) {
        const loginUrl = new URL("/auth/login", request.url);
        // Only set callbackUrl for safe internal paths (prevents open redirect)
        if (isSafeInternalPath(pathname)) {
            loginUrl.searchParams.set("callbackUrl", pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    // Viewer trying to access admin-only routes → redirect to dashboard
    if (token) {
        const role = decodeJwtRole(token);
        const isAdminOnly = ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p));
        if (isAdminOnly && role !== "admin") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    // ── Nonce-based CSP ──────────────────────────────────────────────────────
    // Generate a fresh cryptographic nonce for every response.
    // Forward it as x-nonce so server components can attach it to <script> tags.
    // This removes the need for 'unsafe-inline' in production.
    const randomId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const nonce = btoa(randomId);
    const isDev = process.env.NODE_ENV !== "production";
    const csp = buildCsp(nonce, isDev);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);

    return response;
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|icons|images).*)",
    ],
};
