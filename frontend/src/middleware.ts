import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/auth/login", "/auth/register"];

/** Routes that require admin role — viewers get redirected to /dashboard */
const ADMIN_ONLY_PATHS = [
    "/consignments/new",
    "/vehicles/new",
    "/users",
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
        loginUrl.searchParams.set("callbackUrl", pathname);
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

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|icons|images).*)",
    ],
};
