/**
 * REL-019 기기 티어 계약.
 * 판정 함수 owner = packages/sdk/src/device-tier.ts (재발명 금지).
 */
export const DEVICE_TIER_OWNER = "packages/sdk/src/device-tier.ts" as const;

export const DEVICE_TIERS = ["S", "A", "B"] as const;
export type DeviceTierName = (typeof DEVICE_TIERS)[number];

export const DEVICE_TIER_SIGNALS = [
  "hardwareConcurrency",
  "deviceMemory",
  "prefers-reduced-motion",
  "saveData",
] as const;

/** reduced-motion 또는 saveData = 무조건 B. 기능 세트는 동일(PPE). */
export const DEVICE_TIER_FORCE_B = ["prefers-reduced-motion", "saveData"] as const;

export const HOME_RETROACTIVE_VISUAL_REDESIGN = false;
export const HOME_LARGE_SCREEN_SAFETY_QA = true;
export const HOME_LARGE_SCREEN_SAFETY_RELS = ["REL-105", "REL-601"] as const;

export const LARGE_SCREEN_VIEWPORTS = [2560, 3440, 3840] as const;

export const LARGE_SCREEN_SAFETY_CHECKS = [
  "overflow",
  "clip",
  "absurd-stretch",
  "interaction-break",
  "performance",
] as const;
