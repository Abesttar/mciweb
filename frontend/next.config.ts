import type { NextConfig } from "next";
import { randomBytes } from "crypto";

const nextConfig: NextConfig = {
    // Give each build a unique ID so browsers always load fresh assets after deploy
    generateBuildId: async () => {
        return `build-${Date.now()}-${randomBytes(4).toString('hex')}`;
    },

    // Prevent browsers from caching JS/CSS chunks indefinitely
    async headers() {
        return [
            {
                // Static chunks (JS/CSS) — browsers should revalidate every time
                source: '/_next/static/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                // HTML pages — must revalidate on every request
                source: '/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Pragma', value: 'no-cache' },
                    { key: 'Expires', value: '0' },
                ],
            },
        ];
    },
};

export default nextConfig;
