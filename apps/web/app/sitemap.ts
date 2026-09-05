import type { MetadataRoute } from "next";

const APP_ORIGIN = "https://app.hiptk.app";

/** 공개 고정 경로만. 기회 ID·잔액·거래 URL을 추측해 넣지 않는다. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-06T00:00:00.000Z");
  return [
    { url: `${APP_ORIGIN}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${APP_ORIGIN}/onboarding`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${APP_ORIGIN}/profits`, lastModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${APP_ORIGIN}/auth/login`, lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];
}
