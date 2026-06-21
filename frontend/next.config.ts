import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    experimental: {
        optimizePackageImports: ["lucide-react", "recharts"],
    },

    // ─── Security Headers ─────────────────────────────────────────────────────
    // NOTE: The Content-Security-Policy header is now set dynamically by
    // src/middleware.ts on every request using a per-request nonce.
    // This allows 'unsafe-inline' to be REMOVED in production — each
    // inline script gets a cryptographic nonce instead.
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
