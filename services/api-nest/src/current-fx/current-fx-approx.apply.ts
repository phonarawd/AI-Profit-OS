/**
 * Current FX apply core — displayed USDT + one snapshot.
 * HomeRead / Wallet / Ledger read 0. New FX formula 0.
 * Formula = opportunities.mi.ts 가 re-export 하는
 * @aipo/market-intelligence approxKrwFromSnapshot.
 */
import { createRequire } from "node:module";

const req = createRequire(__filename);
const { approxKrwFromSnapshot } = req("@aipo/market-intelligence") as {
  approxKrwFromSnapshot: (
    amountUsdt: string,
    snapshot: { usdtKrw: string },
  ) => string;
};

export type CurrentFxSnapshot = {
  fxSnapshotId: string;
  usdtKrw: string;
  formulaId: string;
  sources: string[] | null;
  capturedAt: string;
};

export type CurrentFxApproxRequestV1 = {
  principalUsdt: string | null;
  withdrawableProfitUsdt: string | null;
  expectedProfitUsdt: string | null;
};

export type CurrentFxApproxV1 = {
  fxSnapshotId: string | null;
  capturedAt: string | null;
  principalKrwApprox: string | null;
  withdrawableProfitKrwApprox: string | null;
  expectedProfitKrwApprox: string | null;
};

const SLOT_KEYS = [
  "principalUsdt",
  "withdrawableProfitUsdt",
  "expectedProfitUsdt",
] as const;

const DECIMAL = /^-?[0-9]+(\.[0-9]+)?$/;

export class CurrentFxApproxRequestError extends Error {
  readonly status = 400;
  constructor() {
    super("CURRENT_FX_APPROX_INVALID_REQUEST");
    this.name = "CurrentFxApproxRequestError";
  }
}

export function emptyCurrentFxApprox(): CurrentFxApproxV1 {
  return {
    fxSnapshotId: null,
    capturedAt: null,
    principalKrwApprox: null,
    withdrawableProfitKrwApprox: null,
    expectedProfitKrwApprox: null,
  };
}

export function isAllNullRequest(request: CurrentFxApproxRequestV1): boolean {
  return (
    request.principalUsdt === null &&
    request.withdrawableProfitUsdt === null &&
    request.expectedProfitUsdt === null
  );
}

function isValidSlot(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  if (value === "") return false;
  if (value.includes("+")) return false;
  if (value.includes(",")) return false;
  if (value === "NaN" || value === "Infinity" || value === "-Infinity") {
    return false;
  }
  if (/[eE]/.test(value)) return false;
  return DECIMAL.test(value);
}

export function parseCurrentFxApproxRequest(
  raw: unknown,
): CurrentFxApproxRequestV1 {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CurrentFxApproxRequestError();
  }
  const rec = raw as Record<string, unknown>;
  const keys = Object.keys(rec);
  if (keys.length !== SLOT_KEYS.length) {
    throw new CurrentFxApproxRequestError();
  }
  for (const key of keys) {
    if (!SLOT_KEYS.includes(key as (typeof SLOT_KEYS)[number])) {
      throw new CurrentFxApproxRequestError();
    }
  }
  for (const key of SLOT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(rec, key)) {
      throw new CurrentFxApproxRequestError();
    }
    if (!isValidSlot(rec[key])) {
      throw new CurrentFxApproxRequestError();
    }
  }
  return {
    principalUsdt: rec.principalUsdt as string | null,
    withdrawableProfitUsdt: rec.withdrawableProfitUsdt as string | null,
    expectedProfitUsdt: rec.expectedProfitUsdt as string | null,
  };
}

function slotApprox(
  amount: string | null,
  snapshot: CurrentFxSnapshot,
): string | null {
  if (amount === null) return null;
  try {
    return approxKrwFromSnapshot(amount, snapshot);
  } catch {
    return null;
  }
}

export function applyCurrentFxApproxWithSnapshot(
  request: CurrentFxApproxRequestV1,
  snapshot: CurrentFxSnapshot | null,
): CurrentFxApproxV1 {
  if (!snapshot) return emptyCurrentFxApprox();
  return {
    fxSnapshotId: snapshot.fxSnapshotId,
    capturedAt: snapshot.capturedAt,
    principalKrwApprox: slotApprox(request.principalUsdt, snapshot),
    withdrawableProfitKrwApprox: slotApprox(
      request.withdrawableProfitUsdt,
      snapshot,
    ),
    expectedProfitKrwApprox: slotApprox(request.expectedProfitUsdt, snapshot),
  };
}

export async function applyCurrentFxApprox(
  raw: unknown,
  readSnapshot: () => Promise<CurrentFxSnapshot | null>,
): Promise<CurrentFxApproxV1> {
  const request = parseCurrentFxApproxRequest(raw);
  if (isAllNullRequest(request)) {
    return emptyCurrentFxApprox();
  }
  const snapshot = await readSnapshot();
  return applyCurrentFxApproxWithSnapshot(request, snapshot);
}
