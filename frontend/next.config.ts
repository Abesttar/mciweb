import type { NextConfig } from "next";
import { randomBytes } from "crypto";

const nextConfig: NextConfig = {
    generateBuildId: async () => {
        return `build-${Date.now()}-${randomBytes(4).toString('hex')}`;
    },
};

export default nextConfig;
