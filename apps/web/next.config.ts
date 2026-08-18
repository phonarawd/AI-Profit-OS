import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aipo/ui", "@aipo/sdk", "@aipo/schemas"],
  async rewrites() {
    const apiHost = process.env.API_HOST ?? "localhost:4000";
    const apiBase = apiHost.startsWith("http")
      ? apiHost.replace(/\/$/, "")
      : `http://${apiHost}`;
    return [
      { source: "/ads", destination: "/l/meta" },
      { source: "/ads/:variant", destination: "/l/:variant" },
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
