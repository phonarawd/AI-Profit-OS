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
    // apps/web과 동일한 이유 — Cloudflare Images `IMAGES` 바인딩 없이는
    // 배포 시 worker.js가 "No such module cloudflare/images.js"로 거부된다(code 10021).
    // 신규 바인딩 의존성 없이 원본 그대로 서빙.
    unoptimized: true,
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
