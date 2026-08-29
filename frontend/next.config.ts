import type { NextConfig } from "next";
import { randomBytes } from "crypto";

const nextConfig: NextConfig = {
    generateBuildId: async () => {
        return `build-${Date.now()}-${randomBytes(4).toString('hex')}`;
    },
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: '**',
            },
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/storage/:path*',
                destination: 'https://backend.miraicrownindonesia.online/storage/:path*',
            },
        ];
    },
};

export default nextConfig;
