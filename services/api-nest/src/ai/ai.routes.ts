/**
 * Admin AI + shadow-replay HTTP
 * UI Owns=/admin/ai-logs · /admin/ledger?tab=shadow-replay
 * Admin AI score override FORBIDDEN (A13)
 * Personal AI Twin/Memory/router + Coach HTTP = Nest services
 */

export const AI_LOGS_ADMIN_ROUTES = {
  /** GET — recent AI_LOG / answer traces */
  list: "ai-logs",
  /** GET — single trace */
  get: "ai-logs/:id",
  /** GET — Eval gate status + auto_learning lock */
  evalStatus: "ai-logs/eval/status",
  /** POST — run Eval Gate on candidate metrics (no auto-train) */
  evalRun: "ai-logs/eval/run",
  /** GET — coach catalog · toneBand · eval set pointers · degrade */
  coach: "ai-logs/coach",
} as const;

export const AI_PICK_ADMIN_ROUTES = {
  /** POST — score from features (Engine calc only · no override body fields) */
  score: "ai-pick/score",
  /** GET — recent pick scores (read-only) */
  recent: "ai-pick/recent",
} as const;

export const SHADOW_REPLAY_ADMIN_ROUTES = {
  /** POST — run 24h AI PICK shadow replay */
  run: "shadow-replay/run",
  /** GET — latest report */
  latest: "shadow-replay/latest",
} as const;
