/** 운영자 CMS HTTP · prefix /api/v1 */

export const CMS_KINDS = [
  "notice",
  "event",
  "benefit",
  "banner",
  "notification",
] as const;

export type CmsKind = (typeof CMS_KINDS)[number];

export const CMS_ADMIN_ROUTES = {
  list: "cms/:kind",
  create: "cms/:kind",
  get: "cms/:kind/:id",
  patch: "cms/:kind/:id",
  publish: "cms/:kind/:id/publish",
  end: "cms/:kind/:id/end",
} as const;

export const CMS_PUBLIC_ROUTES = {
  list: "cms/:kind",
  get: "cms/:kind/:id",
} as const;
