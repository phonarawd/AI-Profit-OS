/** REL-222 3-mode · prefix /api/v1/ · 13번째 사이드바 0 */

export const ADMIN_OPS_ROUTES = {
  modes: "ops/modes",
  preview: "ops/preview",
  confirm: "ops/confirm",
  apply: "ops/apply",
  rollback: "ops/rollback",
  previewAsUser: "ops/preview-as-user/:userId",
} as const;
