import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aipo/ui", "@aipo/sdk", "@aipo/schemas"],
};

export default nextConfig;
