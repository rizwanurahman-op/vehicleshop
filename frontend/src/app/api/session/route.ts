import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/session
 *
 * WHY THIS EXISTS — Cross-domain cookie problem:
 * -------------------------------------------------
 * The backend (Render: vehicleshop-hk7l.onrender.com) sets `vb_access_token`
 * as an httpOnly cookie on its own domain. The Next.js middleware runs on the
 * frontend domain (Vercel: vehicleshop-delta.vercel.app) and reads cookies
 * from THAT domain — it can NEVER see the backend's cookie.
 *
 * This route handler runs server-side on the SAME Vercel domain as the
 * middleware. It receives the accessToken from the client (which got it from
 * the backend login response body) and sets it as an httpOnly cookie on the
 * Vercel domain — exactly where the middleware expects to find it.
 *
 * Security:
 * - The token is NOT stored in JavaScript-accessible storage.
 * - It is set as httpOnly — browser JS cannot read it.
 * - TTL matches the refresh token (1 day), NOT the access token (15 min).
 *   Reason: The middleware only needs to know the user is logged in.
 *   Actual access-token validity is enforced by the backend on every API call.
 *   Using a 15-minute TTL caused navigation-based logouts in production:
 *   the middleware redirect fires before the client-side refresh hook can run.
 * - SameSite=Lax is required (Strict would break cross-site navigation flows).
 */

const IS_PROD = process.env.NODE_ENV === "production";
// 1 day — matches JWT_REFRESH_EXPIRY on the backend.
// The middleware only checks "is the user logged in?" — not token validity.
// Actual access-token expiry is enforced by the backend on every authenticated request.
const SESSION_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60; // 1 day

// POST /api/session — set the session cookie after login / token refresh
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { accessToken?: string };
        const { accessToken } = body;

        if (!accessToken || typeof accessToken !== "string") {
            return NextResponse.json({ error: "Missing or invalid accessToken" }, { status: 400 });
        }

        const response = NextResponse.json({ ok: true });
        response.cookies.set("vb_access_token", accessToken, {
            httpOnly: true,
            secure: IS_PROD,
            // Lax (not Strict) because the page and API are on the same Vercel domain
            // but some navigation flows come from external redirects.
            sameSite: "lax",
            path: "/",
            // 1-day TTL: middleware only needs to know user is logged in.
            // The backend validates the actual access token on every API call.
            maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
        });
        return response;
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}

// DELETE /api/session — clear the session cookie on logout
export async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("vb_access_token", "", {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
        path: "/",
        maxAge: 0, // expire immediately
    });
    return response;
}
