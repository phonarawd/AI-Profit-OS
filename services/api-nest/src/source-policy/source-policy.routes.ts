/** REL-224 source health + policy versions · prefix /api/v1/ · 사이드바 13번째 0 */

export const SOURCE_POLICY_ROUTES = {
  health: "source-policy/health",
  versions: "source-policy/versions",
  publish: "source-policy/versions",
  rollback: "source-policy/rollback",
  founderOverride: "source-policy/founder-override",
} as const;
