/**
 * 체험 상태 읽기. 화면은 이 숫자만 표시한다.
 * GET에서 grantWelcome을 한 번 더 호출해 failed_fx를 재시도한다(환율 발명 0).
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { LedgerBucketsService } from "./ledger.buckets.service";
import { TrialGrantService, TRIAL_GRANT_KEY_WELCOME } from "./trial-grant.service";

export type TrialStateView = {
  grantStatus: "active" | "failed_fx" | "none";
  trialPrincipalUsdt: string;
  trialLockedUsdt: string;
  welcomeTargetKrw: number;
  grantAmountUsdt: string | null;
  grantAmountKrw: number | null;
  maxParticipations: number;
  participationsUsed: number;
  participationsRemaining: number;
  profitCapKrw: number;
  profitCreditedKrw: number;
  profitRemainingKrw: number;
  trialPrincipalWithdrawable: false;
  inviteSlotsGranted: number;
  trialEligibleOpportunityIds: string[];
};

type GrantRow = {
  status: "active" | "failed_fx";
  amount_usdt: string | null;
  amount_krw: number | null;
};

type StateRow = {
  max_participations: number;
  participations_used: number;
  profit_credited_krw: string;
};

type ProgramRow = {
  welcome_krw: number;
  profit_cap_krw: number;
  default_max_participations: number;
};

@Injectable()
export class TrialStateService {
  constructor(
    private readonly db: PostgresService,
    private readonly buckets: LedgerBucketsService,
    private readonly grant: TrialGrantService,
  ) {}

  async getForUser(userId: string): Promise<TrialStateView> {
    await this.grant.grantWelcome(userId);
    const buckets = await this.buckets.getUserBuckets(userId);
    const program = await this.program();

    const grant = await this.db.query<GrantRow>(
      `SELECT status, amount_usdt::text, amount_krw
         FROM public.trial_grants
        WHERE user_id = $1::uuid AND grant_key = $2`,
      [userId, TRIAL_GRANT_KEY_WELCOME],
    );
    const g = grant.rows[0];
    const grantStatus: TrialStateView["grantStatus"] = g?.status ?? "none";

    const state = await this.db.query<StateRow>(
      `SELECT max_participations, participations_used, profit_credited_krw::text
         FROM public.trial_user_state
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const s = state.rows[0];
    const maxParticipations =
      s?.max_participations ?? program.default_max_participations;
    const participationsUsed = s?.participations_used ?? 0;
    const profitCreditedKrw = Number(s?.profit_credited_krw ?? 0);
    const profitRemainingKrw = Math.max(
      0,
      program.profit_cap_krw - profitCreditedKrw,
    );

    const slots = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
         FROM public.referral_slot_grants
        WHERE referrer_user_id = $1::uuid`,
      [userId],
    );

    const eligible = await this.db.query<{ id: string }>(
      `SELECT id::text
         FROM public.opportunities
        WHERE COALESCE(trial_eligible, false) = true
          AND status = 'available'
          AND execution_mode = 'orchestrate'
          AND COALESCE((pricing->>'compareReady')::boolean, false) = true
          AND stale_at > now()
        ORDER BY updated_at DESC`,
    );

    const grantAmountKrw =
      grantStatus === "active" && g?.amount_krw != null
        ? Number(g.amount_krw)
        : null;
    const grantAmountUsdt =
      grantStatus === "active" && g?.amount_usdt ? g.amount_usdt : null;

    return {
      grantStatus,
      trialPrincipalUsdt: buckets.trialPrincipalUsdt,
      trialLockedUsdt: buckets.trialLockedUsdt,
      welcomeTargetKrw: program.welcome_krw,
      grantAmountUsdt,
      grantAmountKrw,
      maxParticipations,
      participationsUsed,
      participationsRemaining: Math.max(0, maxParticipations - participationsUsed),
      profitCapKrw: program.profit_cap_krw,
      profitCreditedKrw,
      profitRemainingKrw,
      trialPrincipalWithdrawable: false,
      inviteSlotsGranted: Number(slots.rows[0]?.n ?? 0),
      trialEligibleOpportunityIds: eligible.rows.map((r) => r.id),
    };
  }

  private async program(): Promise<ProgramRow> {
    const r = await this.db.query<ProgramRow>(
      `SELECT welcome_krw, profit_cap_krw, default_max_participations
         FROM public.trial_program_config WHERE id = 1`,
    );
    return (
      r.rows[0] ?? {
        welcome_krw: 10000,
        profit_cap_krw: 5000,
        default_max_participations: 1,
      }
    );
  }
}
