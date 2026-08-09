/**
 * Money §51.8a — user benefits read (controllers only · accrual/posting immutable).
 * Credits currency 0 · manual grant 0 · JWT session userId only.
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { formatAmount, parseAmount } from "../ledger/ledger.money";
import { MissionProgramService } from "./mission.program.service";
import type {
  MissionAccrualStatus,
  MissionRewardKind,
} from "./mission.types";

export type BenefitCardStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "pending_hold"
  | "posting"
  | "released"
  | "queued_pool"
  | "expired"
  | "skipped";

type DefinitionRow = {
  id: string;
  section: string;
  title_ko: string;
  body_ko: string;
  icon: string | null;
  reward_kind: MissionRewardKind;
  reward_amount_usdt: string | null;
  auto_claim: boolean;
  growth_required: boolean;
  status: "draft" | "live" | "paused" | "ended";
  sort_order: number;
  deep_route: string | null;
};

type AccrualRow = {
  id: string;
  mission_id: string;
  reward_kind_snap: MissionRewardKind;
  amount_usdt_snap: string;
  status: MissionAccrualStatus;
  hold_until: Date | null;
  released_at: Date | null;
  ledger_journal_id: string | null;
  created_at: Date;
};

const SECTION_TO_UI: Record<string, "daily" | "oneTime" | "weekly" | "streak"> =
  {
    daily: "daily",
    one_time: "oneTime",
    weekly: "weekly",
    streak: "streak",
  };

@Injectable()
export class BenefitsUserService {
  constructor(
    private readonly db: PostgresService,
    private readonly program: MissionProgramService,
  ) {}

  async listForUser(userId: string) {
    const cfg = await this.program.getConfig();
    const definitions = await this.loadDefinitions();
    const accruals = await this.loadAccruals(userId);
    const byMission = new Map(accruals.map((a) => [a.mission_id, a]));

    const items = definitions
      .filter((d) => {
        if (d.status === "ended") return true;
        if (d.growth_required && !cfg.rewardsEnabled) return false;
        if (
          !cfg.rewardsEnabled &&
          d.reward_kind !== "none" &&
          d.reward_kind !== "practice"
        ) {
          // Day-1: hide cash Daily/Weekly until Growth ON (UI §5.9.5)
          if (d.section === "daily" || d.section === "weekly") return false;
        }
        return d.status === "live" || d.status === "paused" || byMission.has(d.id);
      })
      .map((d) => {
        const accrual = byMission.get(d.id) ?? null;
        const cardStatus = this.toCardStatus(d, accrual, cfg.rewardsEnabled);
        return {
          missionId: d.id,
          section: SECTION_TO_UI[d.section] ?? "oneTime",
          sectionRaw: d.section,
          titleKo: d.title_ko,
          bodyKo: d.body_ko,
          icon: d.icon,
          deepRoute: d.deep_route,
          rewardKind: d.reward_kind,
          rewardAmountUsdt:
            d.reward_amount_usdt == null
              ? null
              : formatAmount(parseAmount(d.reward_amount_usdt)),
          autoClaim: d.auto_claim === true,
          growthRequired: d.growth_required === true,
          status: cardStatus,
          accrual: accrual
            ? {
                id: accrual.id,
                status: accrual.status,
                rewardKindSnap: accrual.reward_kind_snap,
                amountUsdtSnap: formatAmount(
                  parseAmount(accrual.amount_usdt_snap),
                ),
                holdUntil: accrual.hold_until
                  ? new Date(accrual.hold_until).toISOString()
                  : null,
                releasedAt: accrual.released_at
                  ? new Date(accrual.released_at).toISOString()
                  : null,
                ledgerJournalId: accrual.ledger_journal_id,
                createdAt: new Date(accrual.created_at).toISOString(),
              }
            : null,
          /** Credits currency FORBIDDEN — USDT/practice/fee_coupon only */
          creditsCurrency: false as const,
        };
      });

    const sections = {
      daily: items.filter((i) => i.section === "daily"),
      oneTime: items.filter((i) => i.section === "oneTime"),
      weekly: items.filter((i) => i.section === "weekly"),
      streak: items.filter((i) => i.section === "streak"),
    };

    return {
      rewardsEnabled: cfg.rewardsEnabled,
      accrualHalted: cfg.accrualHalted,
      items,
      sections,
      benefitsHref: "/me/benefits" as const,
    };
  }

  async summaryForUser(userId: string) {
    const cfg = await this.program.getConfig();
    if (!this.db.configured()) {
      return {
        claimableCount: 0,
        pendingHoldCount: 0,
        queuedPoolCount: 0,
        releasedCount: 0,
        releasedMonthUsdt: "0",
        rewardsEnabled: cfg.rewardsEnabled,
        accrualHalted: cfg.accrualHalted,
        benefitsHref: "/me/benefits" as const,
        creditsCurrency: false as const,
      };
    }

    const counts = await this.db.query<{
      claimable: string;
      pending_hold: string;
      queued_pool: string;
      released: string;
    }>(
      `SELECT
         COUNT(*) FILTER (
           WHERE status IN ('pending', 'pending_hold', 'queued_pool')
         )::text AS claimable,
         COUNT(*) FILTER (WHERE status = 'pending_hold')::text AS pending_hold,
         COUNT(*) FILTER (WHERE status = 'queued_pool')::text AS queued_pool,
         COUNT(*) FILTER (WHERE status = 'released')::text AS released
         FROM public.mission_accruals
        WHERE user_id = $1::uuid
          AND reward_kind_snap <> 'none'`,
      [userId],
    );

    const month = await this.db.query<{ sum: string | null }>(
      `SELECT COALESCE(SUM(amount_usdt_snap), 0)::text AS sum
         FROM public.mission_accruals
        WHERE user_id = $1::uuid
          AND status = 'released'
          AND reward_kind_snap IN ('promo_profit', 'practice', 'fee_coupon')
          AND released_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')
              AT TIME ZONE 'Asia/Seoul'`,
      [userId],
    );

    const row = counts.rows[0];
    return {
      claimableCount: Number(row?.claimable ?? "0") || 0,
      pendingHoldCount: Number(row?.pending_hold ?? "0") || 0,
      queuedPoolCount: Number(row?.queued_pool ?? "0") || 0,
      releasedCount: Number(row?.released ?? "0") || 0,
      releasedMonthUsdt: formatAmount(
        parseAmount(month.rows[0]?.sum ?? "0"),
      ),
      rewardsEnabled: cfg.rewardsEnabled,
      accrualHalted: cfg.accrualHalted,
      benefitsHref: "/me/benefits" as const,
      creditsCurrency: false as const,
    };
  }

  private toCardStatus(
    def: DefinitionRow,
    accrual: AccrualRow | null,
    rewardsEnabled: boolean,
  ): BenefitCardStatus {
    if (def.status === "ended") return "expired";
    if (def.status === "paused" && !accrual) return "locked";
    if (def.growth_required && !rewardsEnabled && !accrual) return "locked";

    if (!accrual) {
      return def.status === "live" ? "available" : "locked";
    }

    switch (accrual.status) {
      case "pending":
        return "in_progress";
      case "pending_hold":
        return "pending_hold";
      case "posting":
        return "posting";
      case "released":
        return "released";
      case "queued_pool":
        return "queued_pool";
      case "skipped":
        return "skipped";
      case "clawed_back":
      case "halted":
        return "expired";
      default:
        return "locked";
    }
  }

  private async loadDefinitions(): Promise<DefinitionRow[]> {
    if (!this.db.configured()) return [];
    const r = await this.db.query<DefinitionRow>(
      `SELECT id, section, title_ko, body_ko, icon, reward_kind,
              reward_amount_usdt::text, auto_claim, growth_required,
              status, sort_order, deep_route
         FROM public.mission_definitions
        WHERE status IN ('live', 'paused', 'ended')
        ORDER BY sort_order ASC, id ASC`,
    );
    return r.rows;
  }

  private async loadAccruals(userId: string): Promise<AccrualRow[]> {
    if (!this.db.configured() || !userId) return [];
    const r = await this.db.query<AccrualRow>(
      `SELECT id::text, mission_id, reward_kind_snap,
              amount_usdt_snap::text, status, hold_until, released_at,
              ledger_journal_id::text, created_at
         FROM public.mission_accruals
        WHERE user_id = $1::uuid
        ORDER BY created_at DESC`,
      [userId],
    );
    return r.rows;
  }
}
