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
 * - It has the same TTL as the JWT (15 minutes).
 * - SameSite=Lax is required (Strict would break cross-site navigation flows).
 */

const IS_PROD = process.env.NODE_ENV === "production";
const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // 15 minutes — must match JWT_ACCESS_EXPIRY

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
            maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
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
