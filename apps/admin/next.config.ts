import type { NextConfig } from "next";
import { createRequire } from "module";
import { PRODUCT_IMAGE_REMOTE_PATTERNS } from "../../packages/ui/components/product/image-hosts";

const require = createRequire(import.meta.url);
const { nextSecurityHeaderSources } = require("../../tooling/security/http-headers.cjs") as {
  nextSecurityHeaderSources: () => Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;
};

const nextConfig: NextConfig = {
  transpilePackages: ["@aipo/ui", "@aipo/sdk", "@aipo/schemas"],
  images: {
    remotePatterns: [...PRODUCT_IMAGE_REMOTE_PATTERNS],
  },
  async headers() {
    return nextSecurityHeaderSources();
  },
  /** web과 동일 — /api/v1 → API_HOST (ops staging·로컬 프록시) */
  async rewrites() {
    const apiHost = process.env.API_HOST ?? "localhost:4000";
    const apiBase = (() => {
      if (apiHost.startsWith("http://") || apiHost.startsWith("https://")) {
        return apiHost.replace(/\/$/, "");
      }
      if (
        apiHost.includes("localhost") ||
        apiHost.startsWith("127.") ||
        apiHost.startsWith("0.0.0.0")
      ) {
        return `http://${apiHost}`;
      }
      return `https://${apiHost}`;
    })();
    return [
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
