/**
 * Money §49.9 E1/P24 — money circuit on bucket drift / recon mismatch.
 */

export const CIRCUIT_REASON_BUCKET_INVARIANT = "BUCKET_INVARIANT_FAIL" as const;

export type CircuitState = {
  open: boolean;
  reasonCode?: string | null;
  detail?: string | null;
  openedAt?: string | null;
};

export function shouldOpenCircuitFromRecon(mismatches: Array<{ code: string }>): {
  open: boolean;
  reasonCode: string;
  ruleCode: "E1" | "P24";
} | null {
  const hit = mismatches.find(
    (m) =>
      m.code === "BUCKET_INVARIANT" ||
      m.code === "PROJECTION_DRIFT" ||
      m.code === "JOURNAL_UNBALANCED",
  );
  if (!hit) return null;
  const ruleCode = hit.code === "BUCKET_INVARIANT" ? "E1" : "P24";
  return {
    open: true,
    reasonCode: CIRCUIT_REASON_BUCKET_INVARIANT,
    ruleCode,
  };
}

export function circuitBlockToast(open: boolean): "CIRCUIT_OPEN" | null {
  return open ? "CIRCUIT_OPEN" : null;
}
