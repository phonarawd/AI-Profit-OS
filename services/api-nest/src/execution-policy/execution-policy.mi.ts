/**
 * Bridge → @aipo/market-intelligence matchStrictness map (§48.13.3)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mi = require("@aipo/market-intelligence") as typeof import("@aipo/market-intelligence");

export const MATCH_STRICTNESS_PRESETS = mi.MATCH_STRICTNESS_PRESETS;
export const SOFT_SEC = mi.SOFT_SEC;
export const HARD_SEC = mi.HARD_SEC;
export const EXECUTION_POLICY_BOOTSTRAP_ADMIN_ID =
  mi.EXECUTION_POLICY_BOOTSTRAP_ADMIN_ID;
export const applyMatchStrictness = mi.applyMatchStrictness;
export const coerceStrictnessLabel = mi.coerceStrictnessLabel;
export const day1ExecutionPolicyDefaults = mi.day1ExecutionPolicyDefaults;
export const assertDay1BootstrapShape = mi.assertDay1BootstrapShape;
export const softHardReadOnly = mi.softHardReadOnly;
export const toRulePolicy = mi.toRulePolicy;
export const isMatchStrictness = mi.isMatchStrictness;
export const expandMatchStrictness = mi.expandMatchStrictness;
export const assertPresetSnapshot = mi.assertPresetSnapshot;
