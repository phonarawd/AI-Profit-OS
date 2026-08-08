/** S/A/B device tier detection — skeleton */
export type DeviceTier = "S" | "A" | "B";

export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === "undefined") return "B";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem >= 8) return "S";
  if (typeof mem === "number" && mem >= 4) return "A";
  return "B";
}
