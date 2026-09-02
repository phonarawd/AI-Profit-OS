/**
 * Isolate legacy synthetic (HMAC-ref) deposit addresses from canonical HD credit.
 */

import type { CanonicalTrc20Deriver } from "./tron-address";

export const LEGACY_SYNTHETIC_QUARANTINE = "LEGACY_SYNTHETIC_QUARANTINE" as const;

export type DepositAddressAuthority = {
  trc20Address: string;
  derivationIndex: number;
  authority: "canonical" | "quarantined_legacy";
  reason?: typeof LEGACY_SYNTHETIC_QUARANTINE;
};

export function classifyDepositAddressAuthority(opts: {
  deriver: CanonicalTrc20Deriver | null;
  trc20Address: string;
  derivationIndex: number;
}): DepositAddressAuthority {
  const addr = opts.trc20Address.trim();
  if (!opts.deriver) {
    return {
      trc20Address: addr,
      derivationIndex: opts.derivationIndex,
      authority: "quarantined_legacy",
      reason: LEGACY_SYNTHETIC_QUARANTINE,
    };
  }
  try {
    const expected = opts.deriver.derive({
      derivationIndex: opts.derivationIndex,
    });
    if (expected.trc20Address === addr) {
      return {
        trc20Address: addr,
        derivationIndex: opts.derivationIndex,
        authority: "canonical",
      };
    }
  } catch {
    // quarantine
  }
  return {
    trc20Address: addr,
    derivationIndex: opts.derivationIndex,
    authority: "quarantined_legacy",
    reason: LEGACY_SYNTHETIC_QUARANTINE,
  };
}
