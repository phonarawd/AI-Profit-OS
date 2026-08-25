/**
 * REL-508 POST /api/v1/me/current-fx/approx
 * Display-only. Client amounts are not ledger truth.
 * Rate owner = latest fx_snapshots. Client FX math 0.
 */

import { Injectable } from "@nestjs/common";
import { approxKrwFromSnapshot } from "./opportunities.mi";
import {
  QUOTES_MAX,
  classifyBudgetLevel,
  COINGECKO_MONTHLY_LIMIT,
  estimateMonthlyCalls,
  roundKrwDisplay,
  UPSTREAM_FETCH_INTERVAL_SEC,
} from "./opportunities.mi";
import { approxKrwOrNull } from "./current-fx-approx.map";
import { FxSnapshotService } from "./fx-snapshot.service";

export type CurrentFxQuoteIn = {
  id?: string | null;
  amountUsdt?: string | null;
};

export type CurrentFxApproxRequest = {
  principalUsdt?: string | null;
  withdrawableProfitUsdt?: string | null;
  expectedProfitUsdt?: string | null;
  quotes?: CurrentFxQuoteIn[] | null;
};

export type CurrentFxApproxResponse = {
  fxSnapshotId: string | null;
  capturedAt: string | null;
  principalKrwApprox: string | null;
  withdrawableProfitKrwApprox: string | null;
  expectedProfitKrwApprox: string | null;
  krwDisplayAvailable: boolean;
  fxStatus: "FRESH" | "STALE" | "UNAVAILABLE";
  quotes: Array<{ id: string; amountUsdt: string | null; amountKrw: string | null }>;
  budget: {
    plan: "FREE_DEMO";
    estimatedMonthlyCalls: number;
    monthlyLimit: number;
    level: string;
  };
};

const EMPTY: CurrentFxApproxResponse = {
  fxSnapshotId: null,
  capturedAt: null,
  principalKrwApprox: null,
  withdrawableProfitKrwApprox: null,
  expectedProfitKrwApprox: null,
  krwDisplayAvailable: false,
  fxStatus: "UNAVAILABLE",
  quotes: [],
  budget: {
    plan: "FREE_DEMO",
    estimatedMonthlyCalls: estimateMonthlyCalls(UPSTREAM_FETCH_INTERVAL_SEC),
    monthlyLimit: COINGECKO_MONTHLY_LIMIT,
    level: classifyBudgetLevel(
      estimateMonthlyCalls(UPSTREAM_FETCH_INTERVAL_SEC),
      COINGECKO_MONTHLY_LIMIT,
    ),
  },
};

function displayKrw(
  amountUsdt: unknown,
  rate: { usdtKrw: string } | null,
): string | null {
  const raw = approxKrwOrNull(amountUsdt, rate, approxKrwFromSnapshot);
  if (raw == null) return null;
  try {
    return roundKrwDisplay(raw);
  } catch {
    return null;
  }
}

@Injectable()
export class CurrentFxApproxService {
  constructor(private readonly fxSnapshots: FxSnapshotService) {}

  async approx(input: CurrentFxApproxRequest): Promise<CurrentFxApproxResponse> {
    const snapshot = await this.fxSnapshots.getLatestKrwDisplaySnapshot();
    const budget = EMPTY.budget;
    if (!snapshot) return { ...EMPTY, budget };

    const rate = { usdtKrw: snapshot.usdtKrw };
    const quotes = (input.quotes ?? []).slice(0, QUOTES_MAX).map((q: CurrentFxQuoteIn) => {
      const id = typeof q?.id === "string" && q.id.trim() ? q.id.trim() : "";
      const amountUsdt =
        typeof q?.amountUsdt === "string" && q.amountUsdt.trim()
          ? q.amountUsdt.trim()
          : null;
      return {
        id,
        amountUsdt,
        amountKrw: id ? displayKrw(amountUsdt, rate) : null,
      };
    }).filter((q: { id: string }) => q.id);

    return {
      fxSnapshotId: snapshot.id,
      capturedAt: snapshot.capturedAt,
      principalKrwApprox: displayKrw(input.principalUsdt, rate),
      withdrawableProfitKrwApprox: displayKrw(input.withdrawableProfitUsdt, rate),
      expectedProfitKrwApprox: displayKrw(input.expectedProfitUsdt, rate),
      krwDisplayAvailable: true,
      fxStatus: snapshot.status,
      quotes,
      budget,
    };
  }
}
