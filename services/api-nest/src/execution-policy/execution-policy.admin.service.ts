/**
 * Admin §48.6 / Engine §48.13.3 — execution-policy singleton API
 * matchStrictness → Rule thresholds · Soft60/Hard90 read-only
 * FORBIDDEN: successRatePercent · Math.random → MATCH_SUCCESS · observed auto-tune
 */

import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { EXECUTION_POLICY_EVENTS } from "./execution-policy.events";
import {
  applyMatchStrictness,
  coerceStrictnessLabel,
  day1ExecutionPolicyDefaults,
  MATCH_STRICTNESS_PRESETS,
  softHardReadOnly,
} from "./execution-policy.mi";
import type {
  ExecutionPolicyGetResponse,
  ExecutionPolicyPutInput,
  ExecutionPolicyTodayStats,
  ExecutionPolicyV1,
  MatchStrictness,
  PresentationStep,
} from "./execution-policy.types";

type PolicyRow = {
  id: string;
  match_strictness: string;
  min_profit_usdt: string;
  stale_allowance_sec: number;
  max_rematch_count: number;
  retry_wait_sec: number;
  slippage_bound_bps: number;
  daily_user_match_cap: number;
  daily_opp_slots_default: number;
  auto_cancel_on_shortfall: boolean;
  membership_band_overlay_enabled: boolean;
  feed: { nearMissCapUsdt?: string } | null;
  presentation: ExecutionPolicyV1["presentation"];
  updated_by_admin_id: string;
  updated_at: Date;
};

const PRESENTATION_STEPS: PresentationStep[] = [
  "product_check",
  "price_compare",
  "matching",
  "settle_prep",
  "credit",
];

@Injectable()
export class ExecutionPolicyAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  async get(): Promise<ExecutionPolicyGetResponse> {
    const row = await this.fetchActive();
    const policy = row
      ? this.toV1(row)
      : (day1ExecutionPolicyDefaults() as ExecutionPolicyV1);
    return {
      policy,
      softHard: softHardReadOnly() as ExecutionPolicyGetResponse["softHard"],
      presets: MATCH_STRICTNESS_PRESETS as ExecutionPolicyGetResponse["presets"],
      observedWriteForbidden: true,
    };
  }

  async put(input: ExecutionPolicyPutInput): Promise<ExecutionPolicyGetResponse> {
    if (!input.updatedByAdminId || input.updatedByAdminId.length < 1) {
      throw new BadRequestException("updatedByAdminId required");
    }
    if (!input.changeReason || input.changeReason.trim().length < 4) {
      throw new BadRequestException("changeReason minLength 4");
    }

    const current = (await this.get()).policy;
    const next = this.buildNext(current, input);
    this.assertPolicy(next);

    const saved = await this.db.withTransaction(async (client) => {
      const existing = await client.query<PolicyRow>(
        `SELECT id::text, match_strictness, min_profit_usdt::text,
                stale_allowance_sec, max_rematch_count, retry_wait_sec,
                slippage_bound_bps, daily_user_match_cap, daily_opp_slots_default,
                auto_cancel_on_shortfall, membership_band_overlay_enabled,
                feed, presentation, updated_by_admin_id::text, updated_at
           FROM public.execution_policies
          WHERE is_active = true
          FOR UPDATE`,
      );

      let row: PolicyRow;
      const feedJson = JSON.stringify(next.feed ?? { nearMissCapUsdt: "50" });
      const presentationJson = JSON.stringify(next.presentation);

      if (existing.rows[0]) {
        const upd = await client.query<PolicyRow>(
          `UPDATE public.execution_policies SET
             match_strictness = $1,
             min_profit_usdt = $2::numeric,
             stale_allowance_sec = $3,
             max_rematch_count = $4,
             retry_wait_sec = $5,
             slippage_bound_bps = $6,
             daily_user_match_cap = $7,
             daily_opp_slots_default = $8,
             auto_cancel_on_shortfall = $9,
             membership_band_overlay_enabled = $10,
             feed = $11::jsonb,
             presentation = $12::jsonb,
             updated_by_admin_id = $13::uuid,
             updated_at = now()
           WHERE id = $14::uuid
           RETURNING id::text, match_strictness, min_profit_usdt::text,
                     stale_allowance_sec, max_rematch_count, retry_wait_sec,
                     slippage_bound_bps, daily_user_match_cap, daily_opp_slots_default,
                     auto_cancel_on_shortfall, membership_band_overlay_enabled,
                     feed, presentation, updated_by_admin_id::text, updated_at`,
          [
            next.matchStrictness,
            next.minProfitUsdt,
            next.staleAllowanceSec,
            next.maxRematchCount,
            next.retryWaitSec,
            next.slippageBoundBps,
            next.dailyUserMatchCap,
            next.dailyOppSlotsDefault,
            next.autoCancelOnShortfall,
            next.membershipBandOverlayEnabled === true,
            feedJson,
            presentationJson,
            input.updatedByAdminId,
            existing.rows[0].id,
          ],
        );
        row = upd.rows[0];
      } else {
        const ins = await client.query<PolicyRow>(
          `INSERT INTO public.execution_policies (
             is_active, match_strictness, min_profit_usdt, stale_allowance_sec,
             max_rematch_count, retry_wait_sec, slippage_bound_bps,
             daily_user_match_cap, daily_opp_slots_default,
             auto_cancel_on_shortfall, membership_band_overlay_enabled,
             feed, presentation, updated_by_admin_id
           ) VALUES (
             true, $1, $2::numeric, $3, $4, $5, $6, $7, $8, $9, $10,
             $11::jsonb, $12::jsonb, $13::uuid
           )
           RETURNING id::text, match_strictness, min_profit_usdt::text,
                     stale_allowance_sec, max_rematch_count, retry_wait_sec,
                     slippage_bound_bps, daily_user_match_cap, daily_opp_slots_default,
                     auto_cancel_on_shortfall, membership_band_overlay_enabled,
                     feed, presentation, updated_by_admin_id::text, updated_at`,
          [
            next.matchStrictness,
            next.minProfitUsdt,
            next.staleAllowanceSec,
            next.maxRematchCount,
            next.retryWaitSec,
            next.slippageBoundBps,
            next.dailyUserMatchCap,
            next.dailyOppSlotsDefault,
            next.autoCancelOnShortfall,
            next.membershipBandOverlayEnabled === true,
            feedJson,
            presentationJson,
            input.updatedByAdminId,
          ],
        );
        row = ins.rows[0];
      }

      await client.query(
        `INSERT INTO public.execution_policy_audit (
           policy_id, action, previous_payload, next_payload,
           changed_by_admin_id, change_reason
         ) VALUES (
           $1::uuid, $2, $3::jsonb, $4::jsonb, $5::uuid, $6
         )`,
        [
          row.id,
          EXECUTION_POLICY_EVENTS.updated,
          JSON.stringify(current),
          JSON.stringify(this.toV1(row)),
          input.updatedByAdminId,
          input.changeReason.trim(),
        ],
      );

      return row;
    });

    const v1 = this.toV1(saved);
    this.bus.emit(EXECUTION_POLICY_EVENTS.updated, {
      matchStrictness: v1.matchStrictness,
      updatedByAdminId: v1.updatedByAdminId,
      toastCode: "EXECUTION_POLICY_UPDATED",
    });

    return {
      policy: v1,
      softHard: softHardReadOnly() as ExecutionPolicyGetResponse["softHard"],
      presets: MATCH_STRICTNESS_PRESETS as ExecutionPolicyGetResponse["presets"],
      observedWriteForbidden: true,
    };
  }

  /**
   * Read-only observed success KPI — NEVER writes policy / NEVER tunes minProfit.
   */
  async statsToday(): Promise<ExecutionPolicyTodayStats> {
    const day = new Date().toISOString().slice(0, 10);
    if (!this.db.configured()) {
      return this.emptyStats(day);
    }

    const { rows } = await this.db.query<{
      result_code: string | null;
      n: string;
    }>(
      `SELECT result_code, count(*)::text AS n
         FROM public.trade_executions
        WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul')
          AT TIME ZONE 'Asia/Seoul'
          AND result_code IS NOT NULL
        GROUP BY result_code`,
    );

    let successCount = 0;
    let priceMovedCount = 0;
    let belowMinProfitCount = 0;
    let requeueCount = 0;
    let otherTerminalCount = 0;

    for (const r of rows) {
      const n = Number(r.n) || 0;
      switch (r.result_code) {
        case "MATCH_SUCCESS":
          successCount += n;
          break;
        case "PRICE_MOVED":
          priceMovedCount += n;
          break;
        case "BELOW_MIN_PROFIT":
          belowMinProfitCount += n;
          break;
        case "REQUEUE":
          requeueCount += n;
          break;
        default:
          otherTerminalCount += n;
          break;
      }
    }

    const denominator =
      successCount +
      priceMovedCount +
      belowMinProfitCount +
      otherTerminalCount;
    const rate = (num: number) =>
      denominator > 0 ? Number((num / denominator).toFixed(6)) : null;
    const tradeDenom = denominator + requeueCount;

    return {
      day,
      successCount,
      priceMovedCount,
      belowMinProfitCount,
      requeueCount,
      otherTerminalCount,
      denominator,
      observedSuccessRate: rate(successCount),
      priceMovedRate: rate(priceMovedCount),
      belowMinProfitRate: rate(belowMinProfitCount),
      requeueAvgPerTrade:
        tradeDenom > 0
          ? Number((requeueCount / tradeDenom).toFixed(6))
          : null,
      readOnly: true,
    };
  }

  async listAudit(limit = 20): Promise<{ items: unknown[] }> {
    const lim = Math.min(Math.max(limit, 1), 100);
    if (!this.db.configured()) return { items: [] };
    const { rows } = await this.db.query(
      `SELECT id, policy_id::text, action, previous_payload, next_payload,
              changed_by_admin_id::text, change_reason, created_at
         FROM public.execution_policy_audit
        ORDER BY created_at DESC
        LIMIT $1`,
      [lim],
    );
    return { items: rows };
  }

  private emptyStats(day: string): ExecutionPolicyTodayStats {
    return {
      day,
      successCount: 0,
      priceMovedCount: 0,
      belowMinProfitCount: 0,
      requeueCount: 0,
      otherTerminalCount: 0,
      denominator: 0,
      observedSuccessRate: null,
      priceMovedRate: null,
      belowMinProfitRate: null,
      requeueAvgPerTrade: null,
      readOnly: true,
    };
  }

  private async fetchActive(): Promise<PolicyRow | null> {
    if (!this.db.configured()) return null;
    const { rows } = await this.db.query<PolicyRow>(
      `SELECT id::text, match_strictness, min_profit_usdt::text,
              stale_allowance_sec, max_rematch_count, retry_wait_sec,
              slippage_bound_bps, daily_user_match_cap, daily_opp_slots_default,
              auto_cancel_on_shortfall, membership_band_overlay_enabled,
              feed, presentation, updated_by_admin_id::text, updated_at
         FROM public.execution_policies
        WHERE is_active = true
        LIMIT 1`,
    );
    return rows[0] ?? null;
  }

  private buildNext(
    current: ExecutionPolicyV1,
    input: ExecutionPolicyPutInput,
  ): ExecutionPolicyV1 {
    const mapped = applyMatchStrictness({
      matchStrictness: input.matchStrictness,
      minProfitUsdt: input.minProfitUsdt ?? current.minProfitUsdt,
      staleAllowanceSec: input.staleAllowanceSec ?? current.staleAllowanceSec,
      maxRematchCount: input.maxRematchCount ?? current.maxRematchCount,
      slippageBoundBps: input.slippageBoundBps ?? current.slippageBoundBps,
      dailyUserMatchCap: input.dailyUserMatchCap ?? current.dailyUserMatchCap,
      dailyOppSlotsDefault:
        input.dailyOppSlotsDefault ?? current.dailyOppSlotsDefault,
    });

    const labeled = coerceStrictnessLabel({
      matchStrictness: mapped.matchStrictness,
      minProfitUsdt: mapped.minProfitUsdt,
      staleAllowanceSec: mapped.staleAllowanceSec,
      maxRematchCount: mapped.maxRematchCount,
      slippageBoundBps: mapped.slippageBoundBps,
      dailyUserMatchCap: mapped.dailyUserMatchCap,
      dailyOppSlotsDefault: mapped.dailyOppSlotsDefault,
    }) as MatchStrictness;

    const presentation = input.presentation ?? current.presentation;
    const feed = input.feed ?? current.feed ?? { nearMissCapUsdt: "50" };

    return {
      matchStrictness: labeled,
      minProfitUsdt: String(mapped.minProfitUsdt),
      staleAllowanceSec: Number(mapped.staleAllowanceSec),
      maxRematchCount: Number(mapped.maxRematchCount),
      retryWaitSec: Number(input.retryWaitSec ?? current.retryWaitSec),
      slippageBoundBps: Number(mapped.slippageBoundBps),
      dailyUserMatchCap: Number(mapped.dailyUserMatchCap),
      dailyOppSlotsDefault: Number(mapped.dailyOppSlotsDefault),
      autoCancelOnShortfall:
        input.autoCancelOnShortfall ?? current.autoCancelOnShortfall,
      membershipBandOverlayEnabled:
        input.membershipBandOverlayEnabled ??
        current.membershipBandOverlayEnabled,
      feed: {
        nearMissCapUsdt: String(feed.nearMissCapUsdt ?? "50"),
      },
      presentation: {
        durationSecMin: Number(presentation.durationSecMin),
        durationSecMax: Number(presentation.durationSecMax),
        steps: [...presentation.steps] as PresentationStep[],
      },
      updatedAt: new Date().toISOString(),
      updatedByAdminId: input.updatedByAdminId,
    };
  }

  private assertPolicy(p: ExecutionPolicyV1): void {
    if (
      !["lenient", "standard", "tight", "scarce", "custom"].includes(
        p.matchStrictness,
      )
    ) {
      throw new BadRequestException("invalid matchStrictness");
    }
    if (!/^[0-9]+(\.[0-9]+)?$/.test(p.minProfitUsdt)) {
      throw new BadRequestException("minProfitUsdt must be decimal string");
    }
    for (const [k, v] of [
      ["staleAllowanceSec", p.staleAllowanceSec],
      ["maxRematchCount", p.maxRematchCount],
      ["retryWaitSec", p.retryWaitSec],
      ["slippageBoundBps", p.slippageBoundBps],
      ["dailyUserMatchCap", p.dailyUserMatchCap],
      ["dailyOppSlotsDefault", p.dailyOppSlotsDefault],
    ] as const) {
      if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
        throw new BadRequestException(`${k} must be non-negative integer`);
      }
    }
    if (
      !p.presentation ||
      p.presentation.durationSecMin < 1 ||
      p.presentation.durationSecMax < p.presentation.durationSecMin
    ) {
      throw new BadRequestException("presentation duration invalid");
    }
    if (
      !Array.isArray(p.presentation.steps) ||
      p.presentation.steps.length !== 5 ||
      PRESENTATION_STEPS.some((s, i) => p.presentation.steps[i] !== s)
    ) {
      throw new BadRequestException("presentation.steps locked order");
    }
    if (
      !p.feed?.nearMissCapUsdt ||
      !/^[0-9]+(\.[0-9]+)?$/.test(p.feed.nearMissCapUsdt)
    ) {
      throw new BadRequestException("feed.nearMissCapUsdt required");
    }
    // Explicit forbid — never accept successRatePercent on write path
    const raw = p as ExecutionPolicyV1 & { successRatePercent?: unknown };
    if ("successRatePercent" in raw && raw.successRatePercent !== undefined) {
      throw new BadRequestException("successRatePercent FORBIDDEN");
    }
  }

  private toV1(row: PolicyRow): ExecutionPolicyV1 {
    const feed = row.feed ?? { nearMissCapUsdt: "50" };
    return {
      matchStrictness: row.match_strictness as MatchStrictness,
      minProfitUsdt: String(row.min_profit_usdt),
      staleAllowanceSec: Number(row.stale_allowance_sec),
      maxRematchCount: Number(row.max_rematch_count),
      retryWaitSec: Number(row.retry_wait_sec),
      slippageBoundBps: Number(row.slippage_bound_bps),
      dailyUserMatchCap: Number(row.daily_user_match_cap),
      dailyOppSlotsDefault: Number(row.daily_opp_slots_default),
      autoCancelOnShortfall: row.auto_cancel_on_shortfall === true,
      membershipBandOverlayEnabled:
        row.membership_band_overlay_enabled === true,
      feed: {
        nearMissCapUsdt: String(feed.nearMissCapUsdt ?? "50"),
      },
      presentation: row.presentation,
      updatedAt: new Date(row.updated_at).toISOString(),
      updatedByAdminId: row.updated_by_admin_id,
    };
  }
}
