import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    experimental: {
        optimizePackageImports: ["lucide-react", "recharts"],
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
