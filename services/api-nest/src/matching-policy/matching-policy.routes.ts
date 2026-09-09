export const MATCHING_POLICY_ADMIN_ROUTES = {
  getEffective: "users/:id/matching-policy",
  preview: "users/:id/matching-policy/preview",
  putVersion: "users/:id/matching-policy",
  pause: "users/:id/matching-policy/pause",
  resume: "users/:id/matching-policy/resume",
  assign: "users/:id/matching-policy/assign",
  exclude: "users/:id/matching-policy/exclude",
  bulkDryRun: "users/:id/matching-policy/bulk-dry-run",
  bulkApply: "users/:id/matching-policy/bulk-apply",
  listAudit: "users/:id/matching-policy/audit",
} as const;
