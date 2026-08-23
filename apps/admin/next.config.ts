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
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
