import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    experimental: {
        optimizePackageImports: ["lucide-react", "recharts"],
    },

    // ─── Security Headers ─────────────────────────────────────────────────────
    // NOTE: The Content-Security-Policy header is set dynamically by
    // src/middleware.ts based on environment (dev vs production).
    // In development, 'unsafe-eval' is included for Next.js HMR (hot reload).
    // In production, 'unsafe-eval' is omitted for tighter security.
    // The headers below cover all other security directives.
    async headers() {
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
                    // HSTS — only in production (middleware sets CSP, not here)
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
