import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import {
  assertManualAssignDoesNotMutateMoney,
  planBulkApply,
  previewPolicyChange,
  type MatchingPolicyLayer,
} from "./matching-policy.engine";
import {
  MatchingPolicyService,
  opportunityRowToCandidate,
} from "./matching-policy.service";

type DraftBody = {
  visibilityMinUsdt?: string | null;
  visibilityMaxUsdt?: string | null;
  participateMinUsdt?: string | null;
  participateMaxUsdt?: string | null;
  allowCategories?: string[] | null;
  denyCategories?: string[] | null;
  matchingPaused?: boolean;
  autoMatchAllowed?: boolean;
  manualAssignOnly?: boolean;
  maxConcurrentTrades?: number | null;
  dailyParticipateCount?: number | null;
  reason?: string;
  internalRef?: string;
  requestId?: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
};

@Injectable()
export class MatchingPolicyAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly matching: MatchingPolicyService,
  ) {}

  async getEffective(userId: string) {
    this.assertDb();
    const nowMs = Date.now();
    const layers = await this.matching.loadLayers(userId, nowMs);
    const counts = await this.previewCounts(userId, layers, layers);
    return {
      userId,
      layers,
      source: layers.find((l) => l.source === "user")?.source ?? "platform",
      preview: counts,
      ledgerMutated: false,
    };
  }

  async preview(userId: string, raw: Record<string, unknown>) {
    const body = raw as DraftBody;
    this.assertDb();
    const nowMs = Date.now();
    const before = await this.matching.loadLayers(userId, nowMs);
    const after = [...before.filter((l) => l.source !== "user" || l.policyId === "assignments"), this.draftLayer(body)];
    const counts = await this.previewCounts(userId, before, after);
    return {
      ...counts,
      ledgerMutated: false,
    };
  }

  async putVersion(userId: string, raw: Record<string, unknown>, adminId: string) {
    const body = raw as DraftBody;
    this.assertDb();
    const reason = String(body.reason ?? "");
    if (reason.length < 8) throw new BadRequestException("reason required");
    const requestId = String(body.requestId ?? "").trim() || null;
    if (requestId) {
      const seen = await this.db.query<{ version: number }>(
        `SELECT version FROM public.matching_policy_versions
          WHERE request_id = $1`,
        [requestId],
      );
      if (seen.rows[0]) {
        return { userId, version: seen.rows[0].version, duplicate: true, ledgerMutated: false };
      }
    }
    const current = await this.db.query<{ version: number }>(
      `SELECT version FROM public.matching_policy_versions
        WHERE scope = 'user' AND subject_id = $1::uuid AND status = 'active'`,
      [userId],
    );
    const nextVersion = (current.rows[0]?.version ?? 0) + 1;
    await this.db.query(
      `UPDATE public.matching_policy_versions
          SET status = 'superseded'
        WHERE scope = 'user' AND subject_id = $1::uuid AND status = 'active'`,
      [userId],
    );
    const inserted = await this.db.query<{ id: string; version: number }>(
      `INSERT INTO public.matching_policy_versions (
         scope, subject_id, version, status,
         visibility_min_usdt, visibility_max_usdt,
         participate_min_usdt, participate_max_usdt,
         allow_categories, deny_categories,
         matching_paused, auto_match_allowed, manual_assign_only,
         max_concurrent_trades, daily_participate_count,
         reason, internal_ref, request_id, created_by_admin_id,
         effective_from, effective_until
       ) VALUES (
         'user', $1::uuid, $2, 'active',
         $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, $13,
         $14, $15, $16, $17::uuid, $18, $19
       ) RETURNING id::text, version`,
      [
        userId,
        nextVersion,
        body.visibilityMinUsdt ?? null,
        body.visibilityMaxUsdt ?? null,
        body.participateMinUsdt ?? null,
        body.participateMaxUsdt ?? null,
        body.allowCategories ?? null,
        body.denyCategories ?? null,
        body.matchingPaused === true,
        body.autoMatchAllowed !== false,
        body.manualAssignOnly === true,
        body.maxConcurrentTrades ?? null,
        body.dailyParticipateCount ?? null,
        reason,
        body.internalRef ?? null,
        requestId,
        adminId,
        body.effectiveFrom ?? null,
        body.effectiveUntil ?? null,
      ],
    );
    await this.audit({
      adminId,
      userId,
      action: "put_version",
      reason,
      requestId,
      after: inserted.rows[0],
    });
    return { userId, version: inserted.rows[0]?.version ?? nextVersion, ledgerMutated: false };
  }

  async setPaused(userId: string, paused: boolean, raw: Record<string, unknown>, adminId: string) {
    const body = raw as DraftBody;
    return this.putVersion(userId, { ...body, matchingPaused: paused }, adminId);
  }

  async assign(
    userId: string,
    body: Record<string, unknown>,
    adminId: string,
    kind: "include" | "exclude",
  ) {
    this.assertDb();
    const money = assertManualAssignDoesNotMutateMoney(body);
    if (!money.ok) throw new BadRequestException(money.code);
    const opportunityId = String(body.opportunityId ?? "");
    const reason = String(body.reason ?? "");
    if (!opportunityId || reason.length < 8) {
      throw new BadRequestException("opportunityId and reason required");
    }
    const opp = await this.db.query<{
      id: string;
      status: string;
      required_capital_usdt: string;
      category: string;
      asset_id: string | null;
      pricing: Record<string, unknown> | null;
    }>(
      `SELECT id::text, status, required_capital_usdt::text, category, asset_id::text, pricing
         FROM public.opportunities WHERE id = $1::uuid`,
      [opportunityId],
    );
    const row = opp.rows[0];
    if (!row) throw new BadRequestException("opportunity not found");
    const candidate = opportunityRowToCandidate(row);
    if (kind === "include") {
      if (!candidate.published || !candidate.identityConfirmed || !candidate.amountValid) {
        throw new BadRequestException("ASSIGN_PLATFORM_REJECT");
      }
    }
    await this.db.query(
      `INSERT INTO public.matching_policy_assignments (
         user_id, opportunity_id, kind, reason, created_by_admin_id
       ) VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid)
       ON CONFLICT (user_id, opportunity_id, kind) DO UPDATE
         SET reason = EXCLUDED.reason, created_by_admin_id = EXCLUDED.created_by_admin_id`,
      [userId, opportunityId, kind, reason, adminId],
    );
    await this.audit({
      adminId,
      userId,
      action: kind === "include" ? "assign" : "exclude",
      reason,
      after: { opportunityId, kind },
    });
    return { userId, opportunityId, kind, ledgerMutated: false };
  }

  async bulkDryRun(userId: string, body: Record<string, unknown>) {
    const preview = await this.preview(userId, body);
    return { ...preview, targetCount: preview.afterCount };
  }

  async bulkApply(userId: string, body: Record<string, unknown>, adminId: string) {
    const preview = await this.preview(userId, body);
    const planned = planBulkApply({
      dryRunTargetCount: Number(body.dryRunTargetCount ?? -1),
      applyTargetCount: preview.afterCount,
      requestId: String(body.requestId ?? ""),
      seenRequestId: null,
      currentVersion: 0,
    });
    if (!planned.ok) throw new BadRequestException(planned.code);
    return this.putVersion(userId, body, adminId);
  }

  async listAudit(userId: string) {
    this.assertDb();
    const rows = await this.queryOptional(
      `SELECT id::text, admin_id::text, action, reason, success, created_at
         FROM public.matching_policy_audit
        WHERE target_user_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT 50`,
      [userId],
    );
    return { items: rows, ledgerMutated: false };
  }

  private async previewCounts(
    userId: string,
    before: MatchingPolicyLayer[],
    after: MatchingPolicyLayer[],
  ) {
    const catalog = await this.db.query<{
      id: string;
      required_capital_usdt: string;
      category: string;
      asset_id: string | null;
      status: string;
      pricing: Record<string, unknown> | null;
    }>(
      `SELECT id::text, required_capital_usdt::text, category, asset_id::text, status, pricing
         FROM public.opportunities
        WHERE status = 'available'
        LIMIT 200`,
    );
    const candidates = catalog.rows.map(opportunityRowToCandidate);
    const ctx = {
      userId,
      platformHardStop: false,
      accountBlocked: false,
      riskBlocked: false,
      activeTradeCount: 0,
      dailyParticipateCount: 0,
      dailyParticipateAmountUsdt: "0",
      nowMs: Date.now(),
    };
    return previewPolicyChange({
      beforeLayers: before,
      afterLayers: after,
      candidates,
      ctx,
    });
  }

  private draftLayer(body: DraftBody): MatchingPolicyLayer {
    return {
      source: "user",
      policyId: "draft",
      version: 0,
      visibilityMinUsdt: body.visibilityMinUsdt ?? null,
      visibilityMaxUsdt: body.visibilityMaxUsdt ?? null,
      participateMinUsdt: body.participateMinUsdt ?? null,
      participateMaxUsdt: body.participateMaxUsdt ?? null,
      allowCategories: body.allowCategories ?? null,
      denyCategories: body.denyCategories ?? null,
      allowBrands: null,
      denyBrands: null,
      allowProviders: null,
      denyProviders: null,
      allowMarketplaces: null,
      denyMarketplaces: null,
      allowCountries: null,
      denyCountries: null,
      allowCurrencies: null,
      denyCurrencies: null,
      includeOpportunityIds: [],
      excludeOpportunityIds: [],
      autoMatchAllowed: body.autoMatchAllowed ?? true,
      manualAssignOnly: body.manualAssignOnly === true,
      preferNewListings: false,
      maxConcurrentTrades: body.maxConcurrentTrades ?? null,
      dailyParticipateCount: body.dailyParticipateCount ?? null,
      dailyParticipateAmountUsdt: null,
      matchingPaused: body.matchingPaused === true,
      effectiveFromMs: body.effectiveFrom ? Date.parse(body.effectiveFrom) : null,
      effectiveUntilMs: body.effectiveUntil ? Date.parse(body.effectiveUntil) : null,
    };
  }

  private async audit(input: {
    adminId: string;
    userId: string;
    action: string;
    reason: string;
    requestId?: string | null;
    after?: unknown;
  }) {
    await this.queryOptional(
      `INSERT INTO public.matching_policy_audit (
         admin_id, target_user_id, action, after_policy, reason, request_id, success
       ) VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, $5, $6, true)`,
      [
        input.adminId,
        input.userId,
        input.action,
        JSON.stringify(input.after ?? {}),
        input.reason,
        input.requestId ?? null,
      ],
    );
  }

  private async queryOptional(text: string, params: unknown[]) {
    try {
      const r = await this.db.query(text, params);
      return r.rows;
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code ?? "")
          : "";
      if (code === "42P01") return [];
      throw err;
    }
  }

  private assertDb() {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("DATABASE_URL unset");
    }
  }
}
