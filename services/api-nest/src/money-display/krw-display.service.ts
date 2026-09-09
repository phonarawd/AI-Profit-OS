/**
 * 최신 fx_snapshots로 USDT → KRW 표시만 만든다.
 * OpportunitiesModule을 끌어오지 않는다(Ledger 순환 방지).
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { approxKrwOrNull } from "../opportunities/current-fx-approx.map";
import { approxKrwFromSnapshot } from "../opportunities/opportunities.mi";
import { userMoneyDisplay } from "./user-money-display";

export type KrwDisplaySnapshot = {
  id: string;
  capturedAt: string;
  usdtKrw: string;
};

export type UsdtBucketAmounts = {
  principalUsdt: string;
  profitUsdt?: string;
  lockedUsdt?: string;
  practiceUsdt?: string;
  liabilityUsdt?: string;
  trialPrincipalUsdt?: string;
  trialLockedUsdt?: string;
};

@Injectable()
export class KrwDisplayService {
  constructor(private readonly db: PostgresService) {}

  async latest(): Promise<KrwDisplaySnapshot | null> {
    if (!this.db.configured()) return null;
    const { rows } = await this.db.query<{
      id: string;
      usd_krw: string;
      captured_at: string;
    }>(
      `SELECT id, usd_krw::text, captured_at::text
         FROM public.fx_snapshots
        WHERE usd_krw > 0
        ORDER BY captured_at DESC
        LIMIT 1`,
    );
    const row = rows[0];
    if (!row?.usd_krw) return null;
    return {
      id: row.id,
      capturedAt: row.captured_at,
      usdtKrw: row.usd_krw,
    };
  }

  approxAmount(
    amountUsdt: unknown,
    snapshot: KrwDisplaySnapshot | null,
  ): string | null {
    return approxKrwOrNull(amountUsdt, snapshot, approxKrwFromSnapshot);
  }

  envelope(principalUsdt: unknown, snapshot: KrwDisplaySnapshot | null) {
    return {
      ...userMoneyDisplay(),
      principalKrwApprox: this.approxAmount(principalUsdt, snapshot),
    };
  }

  buckets(amounts: UsdtBucketAmounts, snapshot: KrwDisplaySnapshot | null) {
    return {
      ...userMoneyDisplay(),
      principalKrwApprox: this.approxAmount(amounts.principalUsdt, snapshot),
      profitKrwApprox: this.approxAmount(amounts.profitUsdt, snapshot),
      lockedKrwApprox: this.approxAmount(amounts.lockedUsdt, snapshot),
      practiceKrwApprox: this.approxAmount(amounts.practiceUsdt, snapshot),
      liabilityKrwApprox: this.approxAmount(amounts.liabilityUsdt, snapshot),
      trialPrincipalKrwApprox: this.approxAmount(
        amounts.trialPrincipalUsdt,
        snapshot,
      ),
      trialLockedKrwApprox: this.approxAmount(
        amounts.trialLockedUsdt,
        snapshot,
      ),
    };
  }
}
