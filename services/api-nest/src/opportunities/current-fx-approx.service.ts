/**
 * REL-508 POST /api/v1/me/current-fx/approx
 * Display-only. Client amounts are not ledger truth.
 * Rate owner = latest fx_snapshots. Client FX math 0.
 */

import { Injectable } from "@nestjs/common";
import { approxKrwFromSnapshot } from "./opportunities.mi";
import { approxKrwOrNull } from "./current-fx-approx.map";
import { FxSnapshotService } from "./fx-snapshot.service";

export type CurrentFxApproxRequest = {
  principalUsdt?: string | null;
  withdrawableProfitUsdt?: string | null;
  expectedProfitUsdt?: string | null;
};

export type CurrentFxApproxResponse = {
  fxSnapshotId: string | null;
  capturedAt: string | null;
  principalKrwApprox: string | null;
  withdrawableProfitKrwApprox: string | null;
  expectedProfitKrwApprox: string | null;
};

const EMPTY: CurrentFxApproxResponse = {
  fxSnapshotId: null,
  capturedAt: null,
  principalKrwApprox: null,
  withdrawableProfitKrwApprox: null,
  expectedProfitKrwApprox: null,
};

@Injectable()
export class CurrentFxApproxService {
  constructor(private readonly fxSnapshots: FxSnapshotService) {}

  async approx(input: CurrentFxApproxRequest): Promise<CurrentFxApproxResponse> {
    const snapshot = await this.fxSnapshots.getLatestKrwDisplaySnapshot();
    if (!snapshot) return { ...EMPTY };

    const rate = { usdtKrw: snapshot.usdtKrw };
    return {
      fxSnapshotId: snapshot.id,
      capturedAt: snapshot.capturedAt,
      principalKrwApprox: approxKrwOrNull(
        input.principalUsdt,
        rate,
        approxKrwFromSnapshot,
      ),
      withdrawableProfitKrwApprox: approxKrwOrNull(
        input.withdrawableProfitUsdt,
        rate,
        approxKrwFromSnapshot,
      ),
      expectedProfitKrwApprox: approxKrwOrNull(
        input.expectedProfitUsdt,
        rate,
        approxKrwFromSnapshot,
      ),
    };
  }
}
