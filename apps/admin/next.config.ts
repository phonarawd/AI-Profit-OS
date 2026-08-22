import { createRequire } from "node:module";
import type { NextConfig } from "next";
import { PRODUCT_IMAGE_REMOTE_PATTERNS } from "../../packages/ui/components/product/image-hosts";

const requireCjs = createRequire(__filename);
const { nextHeadersFor } = requireCjs(
  "../../tooling/security/security-headers.cjs",
) as {
  nextHeadersFor: (kind: string) => Array<{
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
    return nextHeadersFor("admin");
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
