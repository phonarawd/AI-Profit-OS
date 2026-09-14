/**
 * Admin §9.8.10 / Engine §0.0.7 — membership force · match-policy override · fulfillRate read-only
 * FORBIDDEN: successRatePercent · fulfillRate → Rule · Math.random → MATCH_SUCCESS · ledger UPDATE
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { MEMBERSHIP_EVENTS } from "./membership.events";
import {
  applyMatchStrictness,
  computeFulfillRate7d,
  day1ExecutionPolicyDefaults,
  isMatchStrictness,
  isMembership,
  membershipDefaults,
  membershipLabelKo,
  mergeEffectivePolicy,
  resolveMembership,
  rowCapAfterGradeChange,
  GRADE_DAILY_MATCH_DEFAULTS,
  MEMBERSHIP_LADDER,
} from "./membership.mi";

const reqCjs = createRequire(__filename);
const capCore = reqCjs("./member-daily-cap.core.cjs") as {
  assertMemberDailyMatchCap: (raw: unknown) => number;
  nextCapOnlyOverride: (
    before: object | null,
    cap: number,
    meta: { reason: string; updatedByAdminId: string },
  ) => { insertMode: string; qualityUntouched: boolean };
  nextClearCapOnly: (before: object | null) => { action: string };
};
const gradeCore = reqCjs("./grade-daily-policy.core.cjs") as {
  previewGradeDailyCapChange: (store: object, input: object) => object;
  createGradeDailyPolicyStore: (seed?: object) => object;
};
const persistCore = reqCjs("./operator-control.persist.cjs") as {
  preflightOperatorControlSchema: (db: object) => Promise<{
    ready: boolean;
    gradeReady: boolean;
    bonusReady: boolean;
    presentationReady: boolean;
    code: string;
  }>;
  listGradeDailyPolicy: (db: object) => Promise<{
    revision: number;
    caps: Record<string, number>;
    [key: string]: unknown;
  }>;
  applyGradeDailyCapChange: (
    db: object,
    input: object,
  ) => Promise<Record<string, unknown>>;
  grantBonusMatches: (
    db: object,
    input: object,
  ) => Promise<Record<string, unknown>>;
  listBonusGrants: (
    db: object,
    userId: string,
  ) => Promise<Record<string, unknown>>;
  reclaimUnusedBonus: (
    db: object,
    input: object,
  ) => Promise<Record<string, unknown>>;
  listPresentationProfile: (db: object) => Promise<Record<string, unknown>>;
  applyPresentationProfile: (
    db: object,
    input: object,
  ) => Promise<Record<string, unknown>>;
};
const providerCore = reqCjs("./operator-control.provider.cjs") as {
  PROVIDER_KIND: { RUNTIME_PERSIST: string };
  projectRuntimeParticipateQuota: (input: object) => Promise<DailyMatchQuotaV1>;
};
const downCore = reqCjs("./auto-downgrade.core.cjs") as {
  evaluateAutoDowngrade: (input: object) => { wouldApply: false; skippedReason: string };
  previewGradeChangeEffects: (input: object) => object;
};
const presentCore = reqCjs("./presentation-profile.core.cjs") as {
  V19_DEFAULTS: object;
  validatePresentationProfile: (input: object) => object;
  restoreV19Presentation: () => object;
  projectUserFacingProfile: (listed: object) => object;
};
import {
  MembershipRuntimeService,
  type MembershipRow,
} from "./membership.runtime.service";
import type {
  ForceMembershipRequest,
  MembershipId,
  DailyMatchQuotaV1,
  PutMatchPolicyOverrideRequest,
  PutMemberDailyMatchCapRequest,
  PutGradeDailyCapRequest,
  GrantBonusMatchesRequest,
  ReclaimBonusMatchesRequest,
  UserMatchPolicyOverrideV1,
  UserMembershipV1,
} from "./membership.types";
import { MEMBERSHIP_AUDIT } from "./membership.types";

type MatchOverrideRow = {
  user_id: string;
  match_strictness: string;
  min_profit_usdt: string | null;
  stale_allowance_sec: number | null;
  max_rematch_count: number | null;
  daily_user_match_cap: number | null;
  reason: string;
  updated_by_admin_id: string;
  updated_at: Date;
};

type PolicyRow = {
  match_strictness: string;
  min_profit_usdt: string;
  stale_allowance_sec: number;
  max_rematch_count: number;
  retry_wait_sec: number;
  slippage_bound_bps: number;
  daily_user_match_cap: number;
  daily_opp_slots_default: number;
  membership_band_overlay_enabled: boolean;
};

@Injectable()
export class MembershipAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
    private readonly runtime: MembershipRuntimeService,
  ) {}

  async getMembership(userId: string): Promise<{
    membership: UserMembershipV1;
    labelKo: string;
    ladder: ReturnType<typeof membershipDefaults>;
    quota: DailyMatchQuotaV1;
    gradeControl: "MANUAL_PIN" | "AUTO";
    autoDowngrade: false;
    fulfillRateReadOnly: true;
    ledgerMutated: false;
  }> {
    this.assertUuid(userId, "userId");
    await this.assertUserExists(userId);
    const row = await this.runtime.ensureRow(userId);
    const rate = await this.refreshFulfillRate7d(userId);
    const item = this.toMembershipV1({
      ...row,
      fulfill_rate_7d:
        rate != null ? String(rate) : row.fulfill_rate_7d,
    });
    return {
      membership: item,
      labelKo: membershipLabelKo(item.membership),
      ladder: membershipDefaults(item.membership),
      quota: await this.buildQuota(userId),
      // 기존 admin_force 별칭. 자동 하향 엔진은 enabled=false.
      gradeControl: row.admin_force === true ? "MANUAL_PIN" : "AUTO",
      autoDowngrade: false,
      fulfillRateReadOnly: true,
      ledgerMutated: false,
    };
  }

  async forceMembership(
    userId: string,
    body: ForceMembershipRequest,
  ): Promise<{
    membership: UserMembershipV1;
    auditAction: string;
    ledgerMutated: false;
  }> {
    this.assertUuid(userId, "userId");
    this.assertUuid(body.updatedByAdminId, "updatedByAdminId");
    this.assertReason(body.reason);
    await this.assertUserExists(userId);

    const before = await this.runtime.ensureRow(userId);
    let nextMembership: MembershipId;
    let adminForce: boolean;

    if (body.clearForce === true) {
      const metrics = await this.runtime.loadPromotionMetrics(userId);
      const resolved = resolveMembership({
        cumulativeDepositUsdt: metrics.cumulativeDepositUsdt,
        matchSuccessCount: metrics.matchSuccessCount,
        adminForce: false,
      });
      nextMembership = resolved.membership as MembershipId;
      adminForce = false;
    } else {
      if (!isMembership(body.membership)) {
        throw new BadRequestException("membership invalid");
      }
      nextMembership = body.membership;
      adminForce = true;
    }

    const defaults = membershipDefaults(nextMembership);
    const beforeOverride = await this.loadOverride(userId);
    const nextRowCap = rowCapAfterGradeChange({
      hasIndividualCapOverride: beforeOverride?.dailyUserMatchCap != null,
      currentRowCap: before.daily_user_match_cap,
      nextGradeCap: defaults.dailyUserMatchCap,
    }).rowCap;
    const { rows } = await this.db.query<MembershipRow>(
      `UPDATE public.user_membership SET
         membership = $2,
         max_capital_band = $3,
         daily_user_match_cap = $4,
         match_strictness = $5,
         admin_force = $6,
         ai_perk_flags = $7::jsonb,
         updated_at = now()
       WHERE user_id = $1::uuid
       RETURNING user_id::text, membership, max_capital_band,
                 daily_user_match_cap, match_strictness, admin_force,
                 ai_perk_flags, fulfill_rate_7d::text, daily_matches_used,
                 updated_at`,
      [
        userId,
        nextMembership,
        defaults.maxCapitalBand,
        nextRowCap,
        defaults.matchStrictness,
        adminForce,
        JSON.stringify(defaults.aiPerkFlags),
      ],
    );
    const after = rows[0];
    if (!after) throw new NotFoundException("user_membership missing");

    await this.db.query(
      `INSERT INTO public.user_membership_audit (
         user_id, action, before_json, after_json, reason, admin_id
       ) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb, $5, $6::uuid)`,
      [
        userId,
        MEMBERSHIP_AUDIT.force,
        JSON.stringify(this.toMembershipV1(before)),
        JSON.stringify(this.toMembershipV1(after)),
        body.reason,
        body.updatedByAdminId,
      ],
    );

    this.bus.emit(MEMBERSHIP_EVENTS.force, {
      userId,
      membership: nextMembership,
      adminForce,
      adminId: body.updatedByAdminId,
    });

    return {
      membership: this.toMembershipV1(after),
      auditAction: MEMBERSHIP_AUDIT.force,
      ledgerMutated: false,
    };
  }

  async getMatchPolicyOverride(userId: string): Promise<{
    override: UserMatchPolicyOverrideV1 | null;
    effectivePreview: object;
    observedWriteForbidden: true;
    ledgerMutated: false;
  }> {
    this.assertUuid(userId, "userId");
    await this.assertUserExists(userId);
    const override = await this.loadOverride(userId);
    const effectivePreview = await this.buildEffectivePreview(
      userId,
      override,
    );
    return {
      override,
      effectivePreview,
      observedWriteForbidden: true,
      ledgerMutated: false,
    };
  }

  async putMatchPolicyOverride(
    userId: string,
    body: PutMatchPolicyOverrideRequest,
  ): Promise<{
    override: UserMatchPolicyOverrideV1 | null;
    effectivePreview: object;
    auditAction: string;
    ledgerMutated: false;
  }> {
    this.assertUuid(userId, "userId");
    this.assertUuid(body.updatedByAdminId, "updatedByAdminId");
    this.assertReason(body.reason);
    await this.assertUserExists(userId);

    if (
      body &&
      typeof body === "object" &&
      ("successRatePercent" in (body as object) ||
        "fulfillRate7d" in (body as object) ||
        "winRate" in (body as object))
    ) {
      throw new BadRequestException(
        "successRatePercent/fulfillRate7d/winRate FORBIDDEN on match-policy",
      );
    }

    const before = await this.loadOverride(userId);

    if (
      body.capOnly === true ||
      (body.dailyUserMatchCap != null &&
        body.matchStrictnessOverride == null &&
        body.clear !== true)
    ) {
      return this.putMemberDailyMatchCap(userId, {
        dailyUserMatchCap: body.dailyUserMatchCap,
        reason: body.reason,
        updatedByAdminId: body.updatedByAdminId,
        clear: false,
      });
    }

    if (body.clear === true) {
      await this.db.query(
        `DELETE FROM public.user_match_policy_overrides WHERE user_id = $1::uuid`,
        [userId],
      );
      await this.writeMatchPolicyAudit(
        userId,
        before,
        null,
        body.reason,
        body.updatedByAdminId,
      );
      const effectivePreview = await this.buildEffectivePreview(userId, null);
      this.bus.emit(MEMBERSHIP_EVENTS.matchPolicyUpdated, {
        userId,
        cleared: true,
        adminId: body.updatedByAdminId,
      });
      return {
        override: null,
        effectivePreview,
        auditAction: MEMBERSHIP_AUDIT.matchPolicy,
        ledgerMutated: false,
      };
    }

    const strictness = body.matchStrictnessOverride;
    if (!strictness || !isMatchStrictness(strictness)) {
      throw new BadRequestException(
        "matchStrictnessOverride must be lenient|standard|tight|scarce|custom",
      );
    }

    let minProfit: string | null = null;
    let stale: number | null = null;
    let rematch: number | null = null;
    let dailyCap: number | null = null;

    if (strictness === "custom") {
      if (body.minProfitUsdt == null || body.staleAllowanceSec == null) {
        throw new BadRequestException(
          "custom override requires minProfitUsdt and staleAllowanceSec",
        );
      }
      minProfit = String(body.minProfitUsdt);
      stale = Number(body.staleAllowanceSec);
      rematch =
        body.maxRematchCount != null ? Number(body.maxRematchCount) : 0;
      dailyCap =
        body.dailyUserMatchCap != null
          ? Number(body.dailyUserMatchCap)
          : null;
    } else {
      const expanded = applyMatchStrictness({ matchStrictness: strictness });
      minProfit = expanded.minProfitUsdt;
      stale = expanded.staleAllowanceSec;
      rematch = expanded.maxRematchCount;
      dailyCap = expanded.dailyUserMatchCap;
    }

    const { rows } = await this.db.query<MatchOverrideRow>(
      `INSERT INTO public.user_match_policy_overrides (
         user_id, match_strictness, min_profit_usdt, stale_allowance_sec,
         max_rematch_count, daily_user_match_cap, reason,
         updated_by_admin_id, updated_at
       ) VALUES (
         $1::uuid, $2, $3::numeric, $4, $5, $6, $7, $8::uuid, now()
       )
       ON CONFLICT (user_id) DO UPDATE SET
         match_strictness = EXCLUDED.match_strictness,
         min_profit_usdt = EXCLUDED.min_profit_usdt,
         stale_allowance_sec = EXCLUDED.stale_allowance_sec,
         max_rematch_count = EXCLUDED.max_rematch_count,
         daily_user_match_cap = EXCLUDED.daily_user_match_cap,
         reason = EXCLUDED.reason,
         updated_by_admin_id = EXCLUDED.updated_by_admin_id,
         updated_at = now()
       RETURNING user_id::text, match_strictness, min_profit_usdt::text,
                 stale_allowance_sec, max_rematch_count, daily_user_match_cap,
                 reason, updated_by_admin_id::text, updated_at`,
      [
        userId,
        strictness,
        minProfit,
        stale,
        rematch,
        dailyCap,
        body.reason,
        body.updatedByAdminId,
      ],
    );
    const after = this.toOverrideV1(rows[0]);
    await this.writeMatchPolicyAudit(
      userId,
      before,
      after,
      body.reason,
      body.updatedByAdminId,
    );
    const effectivePreview = await this.buildEffectivePreview(userId, after);
    this.bus.emit(MEMBERSHIP_EVENTS.matchPolicyUpdated, {
      userId,
      matchStrictnessOverride: strictness,
      adminId: body.updatedByAdminId,
    });
    return {
      override: after,
      effectivePreview,
      auditAction: MEMBERSHIP_AUDIT.matchPolicy,
      ledgerMutated: false,
    };
  }

  /**
   * 회원별 횟수만 변경. minProfit/stale/strictness/자본/혜택은 그대로.
   * 0 = 신규 참여 차단. 기존 accepted/원장은 소급 취소하지 않음.
   */
  async putMemberDailyMatchCap(
    userId: string,
    body: PutMemberDailyMatchCapRequest,
  ): Promise<{
    override: UserMatchPolicyOverrideV1 | null;
    quota: DailyMatchQuotaV1;
    effectivePreview: object;
    auditAction: string;
    qualityUntouched: true;
    ledgerMutated: false;
  }> {
    this.assertUuid(userId, "userId");
    this.assertUuid(body.updatedByAdminId, "updatedByAdminId");
    this.assertReason(body.reason);
    await this.assertUserExists(userId);

    const before = await this.loadOverride(userId);

    if (body.clear === true) {
      const plan = capCore.nextClearCapOnly(before);
      if (plan.action === "delete") {
        await this.db.query(
          `DELETE FROM public.user_match_policy_overrides WHERE user_id = $1::uuid`,
          [userId],
        );
      } else if (plan.action === "null_cap") {
        await this.db.query(
          `UPDATE public.user_match_policy_overrides
              SET daily_user_match_cap = NULL,
                  reason = $2,
                  updated_by_admin_id = $3::uuid,
                  updated_at = now()
            WHERE user_id = $1::uuid`,
          [userId, body.reason, body.updatedByAdminId],
        );
      }
    } else {
      let cap: number;
      try {
        cap = capCore.assertMemberDailyMatchCap(body.dailyUserMatchCap);
      } catch {
        throw new BadRequestException(
          "dailyUserMatchCap must be a non-negative integer",
        );
      }
      capCore.nextCapOnlyOverride(before, cap, {
        reason: body.reason,
        updatedByAdminId: body.updatedByAdminId,
      });
      if (!before) {
        await this.db.query(
          `INSERT INTO public.user_match_policy_overrides (
             user_id, match_strictness, min_profit_usdt, stale_allowance_sec,
             max_rematch_count, daily_user_match_cap, reason,
             updated_by_admin_id, updated_at
           ) VALUES (
             $1::uuid, 'custom', NULL, NULL, NULL, $2, $3, $4::uuid, now()
           )`,
          [userId, cap, body.reason, body.updatedByAdminId],
        );
      } else {
        await this.db.query(
          `UPDATE public.user_match_policy_overrides
              SET daily_user_match_cap = $2,
                  reason = $3,
                  updated_by_admin_id = $4::uuid,
                  updated_at = now()
            WHERE user_id = $1::uuid`,
          [userId, cap, body.reason, body.updatedByAdminId],
        );
      }
    }

    const after = await this.loadOverride(userId);
    await this.writeMatchPolicyAudit(
      userId,
      before,
      after,
      body.reason,
      body.updatedByAdminId,
    );
    const effectivePreview = await this.buildEffectivePreview(userId, after);
    this.bus.emit(MEMBERSHIP_EVENTS.matchPolicyUpdated, {
      userId,
      capOnly: true,
      adminId: body.updatedByAdminId,
    });
    return {
      override: after,
      quota: await this.buildQuota(userId),
      effectivePreview,
      auditAction: MEMBERSHIP_AUDIT.matchPolicy,
      qualityUntouched: true,
      ledgerMutated: false,
    };
  }

  async effectivePreview(
    userId: string,
    capitalBand = "micro",
  ): Promise<{
    effectivePolicy: object;
    rulePolicy: object;
    quota: DailyMatchQuotaV1;
    fulfillRateExcluded: true;
  }> {
    this.assertUuid(userId, "userId");
    const override = await this.loadOverride(userId);
    const effectivePolicy = await this.buildEffectivePreview(
      userId,
      override,
      capitalBand,
    );
    const quota = await this.buildQuota(userId);
    return {
      effectivePolicy: {
        ...(effectivePolicy as object),
        dailyUserMatchCap: quota.cap,
      },
      rulePolicy: {
        minProfitUsdt: String(
          (effectivePolicy as { minProfitUsdt: string }).minProfitUsdt,
        ),
        staleAllowanceSec: Number(
          (effectivePolicy as { staleAllowanceSec: number }).staleAllowanceSec,
        ),
        maxRematchCount: Number(
          (effectivePolicy as { maxRematchCount: number }).maxRematchCount,
        ),
        retryWaitSec: Number(
          (effectivePolicy as { retryWaitSec: number }).retryWaitSec,
        ),
      },
      quota,
      fulfillRateExcluded: true,
    };
  }

  async listGradeDailyCaps() {
    const listed = await persistCore.listGradeDailyPolicy(this.db);
    return {
      ...listed,
      compiledDefaults: GRADE_DAILY_MATCH_DEFAULTS,
      existingMemberBackfill: false,
    };
  }

  async previewGradeDailyCap(body: PutGradeDailyCapRequest) {
    this.assertReason(body.reason);
    const listed = await persistCore.listGradeDailyPolicy(this.db);
    const store = gradeCore.createGradeDailyPolicyStore({
      revision: listed.revision,
      caps: listed.caps,
    });
    return gradeCore.previewGradeDailyCapChange(store, body);
  }

  async putGradeDailyCap(body: PutGradeDailyCapRequest) {
    this.assertUuid(body.updatedByAdminId, "updatedByAdminId");
    this.assertReason(body.reason);
    try {
      return {
        ...(await persistCore.applyGradeDailyCapChange(this.db, body)),
        auditAction: MEMBERSHIP_AUDIT.gradeDaily,
      };
    } catch (e) {
      throw this.mapOperatorWriteError(e);
    }
  }

  async grantBonus(userId: string, body: GrantBonusMatchesRequest) {
    this.assertUuid(userId, "userId");
    this.assertUuid(body.updatedByAdminId, "updatedByAdminId");
    this.assertReason(body.reason);
    await this.assertUserExists(userId);
    try {
      return {
        ...(await persistCore.grantBonusMatches(this.db, {
          ...body,
          userId,
        })),
        auditAction: MEMBERSHIP_AUDIT.bonusGrant,
      };
    } catch (e) {
      throw this.mapOperatorWriteError(e);
    }
  }

  async listBonus(userId: string) {
    this.assertUuid(userId, "userId");
    await this.assertUserExists(userId);
    return persistCore.listBonusGrants(this.db, userId);
  }

  async reclaimBonus(userId: string, body: ReclaimBonusMatchesRequest) {
    this.assertUuid(userId, "userId");
    this.assertReason(body.reason);
    await this.assertUserExists(userId);
    try {
      return {
        ...(await persistCore.reclaimUnusedBonus(this.db, {
          ...body,
          userId,
        })),
        auditAction: MEMBERSHIP_AUDIT.bonusReclaim,
      };
    } catch (e) {
      throw this.mapOperatorWriteError(e);
    }
  }

  async listPresentationProfile() {
    return persistCore.listPresentationProfile(this.db);
  }

  async listUserPresentationProfile() {
    return presentCore.projectUserFacingProfile(
      await persistCore.listPresentationProfile(this.db),
    );
  }

  async putPresentationProfile(body: {
    profile: object;
    reason: string;
    updatedByAdminId: string;
    expectedRevision?: number;
  }) {
    this.assertUuid(body.updatedByAdminId, "updatedByAdminId");
    this.assertReason(body.reason);
    try {
      presentCore.validatePresentationProfile(body.profile);
      return {
        ...(await persistCore.applyPresentationProfile(this.db, body)),
        auditAction: MEMBERSHIP_AUDIT.presentation,
      };
    } catch (e) {
      throw this.mapOperatorWriteError(e);
    }
  }

  async quotaProjection(userId: string) {
    this.assertUuid(userId, "userId");
    await this.assertUserExists(userId);
    return {
      quota: await this.buildQuota(userId),
      gradeControl: (await this.runtime.ensureRow(userId)).admin_force === true
        ? "MANUAL_PIN"
        : "AUTO",
      autoDowngrade: downCore.evaluateAutoDowngrade({
        adminForce: (await this.runtime.ensureRow(userId)).admin_force === true,
        appliedMembership: (await this.runtime.ensureRow(userId)).membership,
        autoMembership: (await this.runtime.ensureRow(userId)).membership,
      }),
      ledgerMutated: false,
    };
  }

  // --- internals ---

  /**
   * Display-only KPI refresh. NEVER used by evaluateMatchSuccess.
   */
  private async refreshFulfillRate7d(userId: string): Promise<number | null> {
    const { rows } = await this.db.query<{
      match_success: string;
      price_moved: string;
      below_min: string;
      requeue_term: string;
    }>(
      `SELECT
         count(*) FILTER (WHERE result_code = 'MATCH_SUCCESS')::text AS match_success,
         count(*) FILTER (WHERE result_code = 'PRICE_MOVED')::text AS price_moved,
         count(*) FILTER (WHERE result_code = 'BELOW_MIN_PROFIT')::text AS below_min,
         count(*) FILTER (
           WHERE result_code = 'REQUEUE' AND status IN ('safe_stop', 'failed', 'cancelled')
         )::text AS requeue_term
       FROM public.trade_executions
      WHERE user_id = $1::uuid
        AND created_at >= now() - interval '7 days'
        AND result_code IS NOT NULL`,
      [userId],
    );
    const r = rows[0];
    const rate = computeFulfillRate7d({
      matchSuccess: Number(r?.match_success ?? 0),
      priceMoved: Number(r?.price_moved ?? 0),
      belowMinProfit: Number(r?.below_min ?? 0),
      requeueTerminal: Number(r?.requeue_term ?? 0),
    });
    await this.db.query(
      `UPDATE public.user_membership
          SET fulfill_rate_7d = $2::numeric, updated_at = updated_at
        WHERE user_id = $1::uuid`,
      [userId, rate],
    );
    return rate;
  }

  private async buildQuota(userId: string): Promise<DailyMatchQuotaV1> {
    const row = await this.runtime.ensureRow(userId);
    const used = await this.runtime.effectiveDailyMatchesUsed(userId);
    const override = await this.loadOverride(userId);
    return providerCore.projectRuntimeParticipateQuota({
      db: this.db,
      userId,
      used,
      membership: row.membership,
      overrideDailyUserMatchCap: override?.dailyUserMatchCap,
      membershipRowCap: row.daily_user_match_cap,
      ladderCap: MEMBERSHIP_LADDER[row.membership].dailyUserMatchCap,
      providerKind: providerCore.PROVIDER_KIND.RUNTIME_PERSIST,
    });
  }

  private mapOperatorWriteError(e: unknown): never {
    const code = (e as { code?: string }).code;
    if (code === "STORE_UNREADY") {
      throw new ServiceUnavailableException({
        code: "STORE_UNREADY",
        toastCode: "STORE_UNREADY",
        message: "operator control store is not ready",
        applied: false,
        storeStatus: "unready",
        statusCode: 503,
      });
    }
    if (code === "REVISION_CONFLICT") {
      throw new ConflictException({
        code: "REVISION_CONFLICT",
        applied: false,
        statusCode: 409,
      });
    }
    throw new BadRequestException(code || (e as Error).message);
  }

  private async loadOverride(
    userId: string,
  ): Promise<UserMatchPolicyOverrideV1 | null> {
    const { rows } = await this.db.query<MatchOverrideRow>(
      `SELECT user_id::text, match_strictness, min_profit_usdt::text,
              stale_allowance_sec, max_rematch_count, daily_user_match_cap,
              reason, updated_by_admin_id::text, updated_at
         FROM public.user_match_policy_overrides
        WHERE user_id = $1::uuid`,
      [userId],
    );
    if (!rows[0]) return null;
    return this.toOverrideV1(rows[0]);
  }

  private async loadBasePolicy(): Promise<{
    policy: Record<string, unknown>;
    overlayEnabled: boolean;
  }> {
    const { rows } = await this.db.query<PolicyRow>(
      `SELECT match_strictness, min_profit_usdt::text, stale_allowance_sec,
              max_rematch_count, retry_wait_sec, slippage_bound_bps,
              daily_user_match_cap, daily_opp_slots_default,
              membership_band_overlay_enabled
         FROM public.execution_policies
        WHERE is_active = true
        LIMIT 1`,
    );
    if (!rows[0]) {
      const d = day1ExecutionPolicyDefaults() as Record<string, unknown>;
      return {
        policy: d,
        overlayEnabled: d.membershipBandOverlayEnabled === true,
      };
    }
    const r = rows[0];
    return {
      policy: {
        matchStrictness: r.match_strictness,
        minProfitUsdt: r.min_profit_usdt,
        staleAllowanceSec: r.stale_allowance_sec,
        maxRematchCount: r.max_rematch_count,
        retryWaitSec: r.retry_wait_sec,
        slippageBoundBps: r.slippage_bound_bps,
        dailyUserMatchCap: r.daily_user_match_cap,
        dailyOppSlotsDefault: r.daily_opp_slots_default,
      },
      overlayEnabled: r.membership_band_overlay_enabled === true,
    };
  }

  private async buildEffectivePreview(
    userId: string,
    override: UserMatchPolicyOverrideV1 | null,
    capitalBand = "micro",
  ): Promise<object> {
    const mem = await this.runtime.ensureRow(userId);
    const { policy, overlayEnabled } = await this.loadBasePolicy();
    return mergeEffectivePolicy({
      basePolicy: policy,
      membership: mem.membership,
      capitalBand,
      membershipBandOverlayEnabled: overlayEnabled,
      userOverride: override
        ? {
            matchStrictnessOverride: override.matchStrictnessOverride,
            minProfitUsdt: override.minProfitUsdt,
            staleAllowanceSec: override.staleAllowanceSec,
            maxRematchCount: override.maxRematchCount,
            dailyUserMatchCap: override.dailyUserMatchCap,
          }
        : null,
    });
  }

  private async writeMatchPolicyAudit(
    userId: string,
    before: UserMatchPolicyOverrideV1 | null,
    after: UserMatchPolicyOverrideV1 | null,
    reason: string,
    adminId: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO public.user_match_policy_override_audit (
         user_id, action, before_json, after_json, reason, admin_id
       ) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb, $5, $6::uuid)`,
      [
        userId,
        MEMBERSHIP_AUDIT.matchPolicy,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        reason,
        adminId,
      ],
    );
  }

  private toMembershipV1(row: MembershipRow): UserMembershipV1 {
    const flags = Array.isArray(row.ai_perk_flags)
      ? (row.ai_perk_flags as string[])
      : typeof row.ai_perk_flags === "string"
        ? (JSON.parse(row.ai_perk_flags) as string[])
        : [];
    const rate =
      row.fulfill_rate_7d == null || row.fulfill_rate_7d === ""
        ? null
        : Number(row.fulfill_rate_7d);
    return {
      userId: row.user_id,
      membership: row.membership as MembershipId,
      maxCapitalBand: row.max_capital_band as UserMembershipV1["maxCapitalBand"],
      dailyUserMatchCap: Number(row.daily_user_match_cap),
      matchStrictness:
        row.match_strictness as UserMembershipV1["matchStrictness"],
      adminForce: row.admin_force === true,
      aiPerkFlags: flags,
      fulfillRate7d: rate,
      dailyMatchesUsed: Number(row.daily_matches_used),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private toOverrideV1(row: MatchOverrideRow): UserMatchPolicyOverrideV1 {
    const out: UserMatchPolicyOverrideV1 = {
      userId: row.user_id,
      matchStrictnessOverride:
        row.match_strictness as UserMatchPolicyOverrideV1["matchStrictnessOverride"],
      reason: row.reason,
      updatedByAdminId: row.updated_by_admin_id,
      updatedAt: new Date(row.updated_at).toISOString(),
    };
    if (row.min_profit_usdt != null) out.minProfitUsdt = row.min_profit_usdt;
    if (row.stale_allowance_sec != null) {
      out.staleAllowanceSec = Number(row.stale_allowance_sec);
    }
    if (row.max_rematch_count != null) {
      out.maxRematchCount = Number(row.max_rematch_count);
    }
    if (row.daily_user_match_cap != null) {
      out.dailyUserMatchCap = Number(row.daily_user_match_cap);
    }
    return out;
  }

  private async assertUserExists(userId: string): Promise<void> {
    const { rows } = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    if (!rows[0]) throw new NotFoundException("user not found");
  }

  private assertUuid(value: string, field: string): void {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new BadRequestException(`${field} must be uuid`);
    }
  }

  private assertReason(reason: string): void {
    if (typeof reason !== "string" || reason.trim().length < 10) {
      throw new BadRequestException("reason minLength 10");
    }
  }
}
