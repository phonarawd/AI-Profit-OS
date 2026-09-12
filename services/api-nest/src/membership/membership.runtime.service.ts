/**
 * Engine §0.0.7 — 가입/참여 행 보장 · 입금·MATCH_SUCCESS 후 resolveMembership 재적용.
 * adminForce 핀 유지 · 자동 강등 0 · 원장/잔액 UPDATE 0 · 난수 0.
 * AI 퍼크 런타임 해금·VIP 출금캡·userTier 경로 0.
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import {
  maxMembership,
  membershipDefaults,
  resolveMembership,
} from "./membership.mi";
import type { MembershipId } from "./membership.types";

export type MembershipRow = {
  user_id: string;
  membership: string;
  max_capital_band: string;
  daily_user_match_cap: number;
  match_strictness: string;
  admin_force: boolean;
  ai_perk_flags: unknown;
  fulfill_rate_7d: string | null;
  daily_matches_used: number;
  updated_at: Date;
};

const SELECT_MEMBERSHIP = `SELECT user_id::text, membership, max_capital_band,
              daily_user_match_cap, match_strictness, admin_force,
              ai_perk_flags, fulfill_rate_7d::text, daily_matches_used,
              updated_at
         FROM public.user_membership
        WHERE user_id = $1::uuid`;

/** participate_requests 오늘(KST) 건수 — 일자 컬럼 없이 daily_matches_used 리셋. */
const TODAY_KST_PARTICIPATES = `SELECT count(*)::text AS n
         FROM public.participate_requests
        WHERE user_id = $1::uuid
          AND status = 'accepted'
          AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul')
                AT TIME ZONE 'Asia/Seoul'`;

@Injectable()
export class MembershipRuntimeService {
  constructor(private readonly db: PostgresService) {}

  async ensureRow(userId: string): Promise<MembershipRow> {
    const existing = await this.db.query<MembershipRow>(SELECT_MEMBERSHIP, [
      userId,
    ]);
    if (existing.rows[0]) return existing.rows[0];

    const metrics = await this.loadPromotionMetrics(userId);
    const resolved = resolveMembership({
      cumulativeDepositUsdt: metrics.cumulativeDepositUsdt,
      matchSuccessCount: metrics.matchSuccessCount,
    });
    const defaults = membershipDefaults(resolved.membership);
    await this.db.query(
      `INSERT INTO public.user_membership (
         user_id, membership, max_capital_band, daily_user_match_cap,
         match_strictness, admin_force, ai_perk_flags, daily_matches_used
       ) VALUES (
         $1::uuid, $2, $3, $4, $5, false, $6::jsonb, 0
       )
       ON CONFLICT (user_id) DO NOTHING`,
      [
        userId,
        defaults.membership,
        defaults.maxCapitalBand,
        defaults.dailyUserMatchCap,
        defaults.matchStrictness,
        JSON.stringify(defaults.aiPerkFlags),
      ],
    );
    const after = await this.db.query<MembershipRow>(SELECT_MEMBERSHIP, [
      userId,
    ]);
    return after.rows[0];
  }

  /**
   * 입금 확정·MATCH_SUCCESS 후 등급 재적용.
   * adminForce=true 이면 핀 유지. 자동 강등 없음(max만 승급).
   * membership 컬럼만 — 잔액/원장/ai_perk_flags 변경 0.
   */
  async reapplyFromLedger(userId: string): Promise<{
    applied: boolean;
    membership: string;
    adminForce: boolean;
    autoDowngrade: false;
    ledgerMutated: false;
  }> {
    const row = await this.ensureRow(userId);
    if (row.admin_force === true) {
      return {
        applied: false,
        membership: row.membership,
        adminForce: true,
        autoDowngrade: false,
        ledgerMutated: false,
      };
    }

    const metrics = await this.loadPromotionMetrics(userId);
    const resolved = resolveMembership({
      cumulativeDepositUsdt: metrics.cumulativeDepositUsdt,
      matchSuccessCount: metrics.matchSuccessCount,
      adminForce: false,
    });
    const next = maxMembership(row.membership, resolved.membership);
    if (next === row.membership) {
      return {
        applied: false,
        membership: row.membership,
        adminForce: false,
        autoDowngrade: false,
        ledgerMutated: false,
      };
    }

    const defaults = membershipDefaults(next);
    await this.db.query(
      `UPDATE public.user_membership SET
         membership = $2,
         max_capital_band = $3,
         daily_user_match_cap = $4,
         match_strictness = $5,
         updated_at = now()
       WHERE user_id = $1::uuid
         AND admin_force = false`,
      [
        userId,
        defaults.membership as MembershipId,
        defaults.maxCapitalBand,
        defaults.dailyUserMatchCap,
        defaults.matchStrictness,
      ],
    );
    return {
      applied: true,
      membership: defaults.membership,
      adminForce: false,
      autoDowngrade: false,
      ledgerMutated: false,
    };
  }

  /**
   * 오늘(Asia/Seoul) 수락 participate 건수를 SoT로 쓰고,
   * 오늘 0건이면 daily_matches_used를 0으로 리셋(기존 컬럼만).
   */
  async effectiveDailyMatchesUsed(userId: string): Promise<number> {
    await this.ensureRow(userId);
    const today = await this.db.query<{ n: string }>(TODAY_KST_PARTICIPATES, [
      userId,
    ]);
    const usedToday = Number(today.rows[0]?.n ?? 0);
    if (usedToday === 0) {
      await this.db.query(
        `UPDATE public.user_membership
            SET daily_matches_used = 0
          WHERE user_id = $1::uuid
            AND daily_matches_used > 0`,
        [userId],
      );
    }
    return usedToday;
  }

  async loadPromotionMetrics(userId: string): Promise<{
    cumulativeDepositUsdt: string;
    matchSuccessCount: number;
  }> {
    const dep = await this.db.query<{ amt: string | null }>(
      `SELECT COALESCE(sum(e.amount_usdt), 0)::text AS amt
         FROM public.ledger_entries e
         JOIN public.ledger_accounts a ON a.id = e.account_id
         JOIN public.ledger_journals j ON j.id = e.journal_id
        WHERE j.journal_type IN ('deposit_usdt', 'deposit_krw')
          AND e.direction = 'credit'
          AND a.owner_user_id = $1::uuid
          AND a.account_kind = 'user_bucket'`,
      [userId],
    );
    const suc = await this.db.query<{ c: string }>(
      `SELECT count(*)::text AS c
         FROM public.trade_executions
        WHERE user_id = $1::uuid
          AND result_code = 'MATCH_SUCCESS'`,
      [userId],
    );
    return {
      cumulativeDepositUsdt: dep.rows[0]?.amt ?? "0",
      matchSuccessCount: Number(suc.rows[0]?.c ?? 0),
    };
  }
}
