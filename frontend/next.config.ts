import type { NextConfig } from "next";

// Derive the backend API origin from the env var so the CSP is always correct
// regardless of dev (http://localhost:5001) vs production (https://vehicleshop-hk7l.onrender.com).
function getApiOrigin(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";
    try {
        return new URL(apiUrl).origin; // e.g. "http://localhost:5001" or "https://vehicleshop-hk7l.onrender.com"
    } catch {
        return "http://localhost:5001"; // fallback
    }
}

const isDev = process.env.NODE_ENV !== "production";
const apiOrigin = getApiOrigin();

const nextConfig: NextConfig = {
    reactStrictMode: true,
    experimental: {
        optimizePackageImports: ["lucide-react", "recharts"],
    },

    // ─── Security Headers ─────────────────────────────────────────────
    async headers() {
        const csp = [
            "default-src 'self'",
            // 'unsafe-eval' is required by Next.js hot-reload in dev; not needed in production
            isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            // Allow API calls to whichever backend is configured via NEXT_PUBLIC_API_URL
            `connect-src 'self' ${apiOrigin}`,
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join("; ");

        return [
            {
                source: "/:path*",
                headers: [
                    // Prevent MIME type sniffing
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    // Prevent framing (clickjacking protection)
                    { key: "X-Frame-Options", value: "DENY" },
                    // Block dangerous XSS patterns in legacy browsers
                    { key: "X-XSS-Protection", value: "1; mode=block" },
                    // Strict referrer policy — don't leak full URL to third parties
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    // Limit browser features
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
                    // Content Security Policy (dynamically built above)
                    { key: "Content-Security-Policy", value: csp },
                    // HSTS — only in production
                    ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
                ],
            },
        ];
    },

    async redirects() {
        return [
            {
                source: "/",
                destination: "/dashboard",
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
