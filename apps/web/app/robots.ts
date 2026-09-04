import type { MetadataRoute } from "next";

const SITE_URL = "https://hiptk.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/me/legal", "/me/legal/terms", "/me/legal/privacy"],
      disallow: [
        "/api/",
        "/auth/",
        "/wallet/",
        "/trades/",
        "/profits",
        "/onboarding",
        "/me/",
        "/dev/",
        "/admin/",
        "/ops/",
        "/r/",
        "/share/",
        "/kyb/trade-license-1135431-det-reference.png",
      ],
    },
    sitemap: SITE_URL + "/sitemap.xml",
    host: SITE_URL,
  };
}
