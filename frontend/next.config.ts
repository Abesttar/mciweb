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
};

export default nextConfig;
