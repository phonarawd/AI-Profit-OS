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
    // REL-013: 공유 최소 allowlist만. hostname '*' / 임의 https 전체 허용 0.
    remotePatterns: [...PRODUCT_IMAGE_REMOTE_PATTERNS],
  },
  async headers() {
    return nextSecurityHeaderSources();
  },
  /** Infra §31.2a — /ads aliases /l (identical landing-3s surface) */
  /** PART9-pre — /api/v1 → API_HOST (dev proxy · /ads 규칙 보존) */
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

if (process.env.NEXT_DEV_SKIP_OPENNEXT !== "1") {
  initOpenNextCloudflareForDev();
}
