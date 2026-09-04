import type { MetadataRoute } from "next";

const SITE_URL = "https://hiptk.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL + "/", changeFrequency: "weekly", priority: 1 },
    { url: SITE_URL + "/me/legal", changeFrequency: "monthly", priority: 0.5 },
    { url: SITE_URL + "/me/legal/terms", changeFrequency: "monthly", priority: 0.4 },
    { url: SITE_URL + "/me/legal/privacy", changeFrequency: "monthly", priority: 0.4 },
  ];
}
