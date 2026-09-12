/**
 * GET /api/v1/me/trial-state
 * 웰컴 원화는 서버 정수. USDT 보조는 current-fx/approx 와 같은 근사 키.
 * 원장 UPDATE · 난수 정산 · 프론트 환율 곱 금지.
 */

import { Injectable } from "@nestjs/common";
import {
  PRACTICE_WELCOME_USDT,
  PracticeGrantService,
  type PracticeGrantStatus,
} from "../ledger/practice-grant.service";
import { MembershipRuntimeService } from "../membership/membership.runtime.service";
import { CurrentFxApproxService } from "../opportunities/current-fx-approx.service";

/** 화면 1만원 — 프론트 하드코딩/USDT×환율 금지 */
export const WELCOME_TARGET_KRW = 10000;

export type TrialStateView = {
  grantStatus: PracticeGrantStatus | "none";
  welcomeTargetKrw: number;
  grantAmountKrw: number;
  participationsRemaining: number;
  principalKrwApprox: string | null;
  withdrawableProfitKrwApprox: string | null;
  expectedProfitKrwApprox: string | null;
  fxSnapshotId: string | null;
  capturedAt: string | null;
};

@Injectable()
export class TrialStateService {
  constructor(
    private readonly practiceGrant: PracticeGrantService,
    private readonly membership: MembershipRuntimeService,
    private readonly currentFx: CurrentFxApproxService,
  ) {}

  async getForUser(userId: string): Promise<TrialStateView> {
    const active = await this.practiceGrant.listActiveForUser(userId);
    const grant =
      active.find((g) => g.grantKey === "practice_grant_welcome") ?? active[0];
    const grantStatus: PracticeGrantStatus | "none" = grant?.status ?? "none";
    const amountUsdt = grant?.amountUsdt ?? PRACTICE_WELCOME_USDT;

    const [row, usedToday, fx] = await Promise.all([
      this.membership.ensureRow(userId),
      this.membership.effectiveDailyMatchesUsed(userId),
      this.currentFx.approx({
        principalUsdt: amountUsdt,
        withdrawableProfitUsdt: null,
        expectedProfitUsdt: null,
      }),
    ]);

    const cap = Number(row.daily_user_match_cap ?? 0);
    const participationsRemaining = Math.max(0, cap - usedToday);

    return {
      grantStatus,
      welcomeTargetKrw: WELCOME_TARGET_KRW,
      grantAmountKrw: WELCOME_TARGET_KRW,
      participationsRemaining,
      principalKrwApprox: fx.principalKrwApprox,
      withdrawableProfitKrwApprox: fx.withdrawableProfitKrwApprox,
      expectedProfitKrwApprox: fx.expectedProfitKrwApprox,
      fxSnapshotId: fx.fxSnapshotId,
      capturedAt: fx.capturedAt,
    };
  }
}
