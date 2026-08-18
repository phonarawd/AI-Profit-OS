/** Admin execution-policy HTTP · UI §48.8 · Engine §48.13.3 */

export const EXECUTION_POLICY_ADMIN_ROUTES = {
  get: "execution-policy",
  put: "execution-policy",
  statsToday: "execution-policy/stats/today",
  audit: "execution-policy/audit",
} as const;
