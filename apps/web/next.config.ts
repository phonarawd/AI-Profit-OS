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
    // Cloudflare Workers 런타임에는 Next 기본 이미지 최적화(sharp)가 없다.
    // @opennextjs/cloudflare는 이를 Cloudflare Images `IMAGES` 바인딩으로 대체하는데,
    // wrangler.toml에 그 바인딩이 없으면 배포 시 worker.js가 "No such module cloudflare/images.js"로 거부된다(code 10021).
    // 이 원격 썸네일은 §0.0.6 참고용 상품 시세 이미지(프리미엄 Home 비주얼 자산 아님)이므로
    // 새 유료/신규 바인딩 의존성을 추가하지 않고 최적화를 끈다 — 원본 그대로 서빙.
    unoptimized: true,
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
