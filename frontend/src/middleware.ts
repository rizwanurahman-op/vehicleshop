import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/auth/login", "/auth/register"];

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

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|icons|images).*)",
    ],
};
