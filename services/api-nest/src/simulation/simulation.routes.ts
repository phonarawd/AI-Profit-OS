/**
 * Admin simulation + platform_reserve HTTP · Engine §51.4 · §0.0.4.3
 * UI Owns=/admin/growth?tab=simulation · /admin/system-control?tab=reserve
 */

export const SIMULATION_ADMIN_ROUTES = {
  /** POST — run M0.5 with KPI inputs (S1~S4) */
  run: "simulation/run",
  /** GET — latest SimulationReport + gates */
  latest: "simulation/latest",
  /** GET — Growth ON eligibility */
  growthGate: "simulation/growth-gate",
  /** GET/PATCH — admin.growth.enabled */
  growthEnabled: "growth/enabled",
} as const;

export const PLATFORM_RESERVE_ADMIN_ROUTES = {
  /** GET — target + ledger balance */
  get: "system-control/reserve",
  /** PUT — set target_usdt (audit) */
  put: "system-control/reserve",
  /** GET — audit trail */
  audit: "system-control/reserve/audit",
} as const;
