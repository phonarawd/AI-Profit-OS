import type { MetadataRoute } from "next";

const APP_ORIGIN = "https://app.hiptk.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/wallet/", "/trades/", "/admin", "/dev/"],
    },
    sitemap: `${APP_ORIGIN}/sitemap.xml`,
    host: APP_ORIGIN,
  };
}
