import type { NextConfig } from "next";
import { PRODUCT_IMAGE_REMOTE_PATTERNS } from "../../packages/ui/components/product/image-hosts";

const nextConfig: NextConfig = {
  transpilePackages: ["@aipo/ui", "@aipo/sdk", "@aipo/schemas"],
  images: {
    remotePatterns: [...PRODUCT_IMAGE_REMOTE_PATTERNS],
  },
  /** Infra §31.2a — /ads aliases /l (identical landing-3s surface) */
  async rewrites() {
    return [
      { source: "/ads", destination: "/l/meta" },
      { source: "/ads/:variant", destination: "/l/:variant" },
    ];
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
