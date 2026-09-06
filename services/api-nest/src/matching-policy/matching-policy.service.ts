/**
 * B7 정책 로더. list/detail/participate/퍼뜩이 같은 evaluate 를 쓴다.
 */

import { Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";
import { PostgresService } from "../db/postgres";
import {
  evaluateMatchingPolicy,
  filterVisibleOpportunities,
  platformDefaultLayer,
  type MatchingDecision,
  type MatchingPolicyLayer,
  type MatchingUserContext,
  type OpportunityCandidate,
} from "./matching-policy.engine";

export type PolicyQuerier = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
};

type PolicyRow = {
  id: string;
  scope: "platform" | "group" | "user";
  version: number;
  visibility_min_usdt: string | null;
  visibility_max_usdt: string | null;
  participate_min_usdt: string | null;
  participate_max_usdt: string | null;
  allow_categories: string[] | null;
  deny_categories: string[] | null;
  allow_brands: string[] | null;
  deny_brands: string[] | null;
  allow_providers: string[] | null;
  deny_providers: string[] | null;
  allow_marketplaces: string[] | null;
  deny_marketplaces: string[] | null;
  allow_countries: string[] | null;
  deny_countries: string[] | null;
  allow_currencies: string[] | null;
  deny_currencies: string[] | null;
  auto_match_allowed: boolean | null;
  manual_assign_only: boolean | null;
  prefer_new_listings: boolean | null;
  max_concurrent_trades: number | null;
  daily_participate_count: number | null;
  daily_participate_amount_usdt: string | null;
  matching_paused: boolean;
  effective_from: Date | null;
  effective_until: Date | null;
};

type AssignRow = {
  opportunity_id: string;
  kind: "include" | "exclude";
};

type HiddenRow = {
  opportunity_id: string;
  hidden: boolean;
  force_show: boolean;
};

@Injectable()
export class MatchingPolicyService {
  constructor(private readonly db: PostgresService) {}

  async evaluateForUser(
    userId: string,
    candidate: OpportunityCandidate,
    extras: Partial<MatchingUserContext> = {},
    querier: PolicyQuerier = this.db,
  ): Promise<MatchingDecision> {
    const ctx = await this.loadContext(userId, extras, querier);
    const layers = await this.loadLayers(userId, ctx.nowMs, querier);
    return evaluateMatchingPolicy({ candidate, layers, ctx });
  }

  async filterForUser<T extends { id: string }>(
    userId: string,
    rows: T[],
    toCandidate: (row: T) => OpportunityCandidate,
    extras: Partial<MatchingUserContext> = {},
  ): Promise<T[]> {
    if (rows.length === 0) return [];
    const ctx = await this.loadContext(userId, extras);
    const layers = await this.loadLayers(userId, ctx.nowMs);
    const candidates = rows.map(toCandidate);
    const visible = new Set(
      filterVisibleOpportunities(candidates, layers, ctx).map((c) => c.id),
    );
    return rows.filter((row) => visible.has(row.id));
  }

  async assertParticipable(
    userId: string,
    candidate: OpportunityCandidate,
    extras: Partial<MatchingUserContext> = {},
    querier: PolicyQuerier = this.db,
  ): Promise<MatchingDecision> {
    const decision = await this.evaluateForUser(userId, candidate, extras, querier);
    if (!decision.visible || !decision.participable) {
      const err = new Error("OPPORTUNITY_UNAVAILABLE_FOR_ACCOUNT");
      (err as Error & { decision: MatchingDecision }).decision = decision;
      throw err;
    }
    return decision;
  }

  private async loadContext(
    userId: string,
    extras: Partial<MatchingUserContext>,
    querier: PolicyQuerier = this.db,
  ): Promise<MatchingUserContext> {
    const nowMs = extras.nowMs ?? Date.now();
    const blocked = await querier.query<{ match_blocked: boolean }>(
      `SELECT match_blocked
         FROM public.user_capability
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const active = await querier.query<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM public.trade_executions
        WHERE user_id = $1::uuid
          AND status IN ('running', 'requeue')`,
      [userId],
    );
    const daily = await querier.query<{ n: string; amt: string }>(
      `SELECT count(*)::text AS n,
              COALESCE(sum(capital_usdt), 0)::text AS amt
         FROM public.participate_requests
        WHERE user_id = $1::uuid
          AND created_at >= date_trunc('day', now())
          AND status = 'accepted'`,
      [userId],
    );
    return {
      userId,
      platformHardStop: extras.platformHardStop === true,
      accountBlocked: extras.accountBlocked ?? blocked.rows[0]?.match_blocked === true,
      riskBlocked: extras.riskBlocked === true,
      activeTradeCount: extras.activeTradeCount ?? Number(active.rows[0]?.n ?? 0),
      dailyParticipateCount:
        extras.dailyParticipateCount ?? Number(daily.rows[0]?.n ?? 0),
      dailyParticipateAmountUsdt: extras.dailyParticipateAmountUsdt ?? daily.rows[0]?.amt ?? "0",
      nowMs,
    };
  }

  async loadLayers(
    userId: string,
    nowMs: number,
    querier: PolicyQuerier = this.db,
  ): Promise<MatchingPolicyLayer[]> {
    const keys = await this.groupKeysForUser(userId, querier);
    const policies = await this.queryOptional<PolicyRow>(
      querier,
      `SELECT id::text, scope, version,
              visibility_min_usdt::text, visibility_max_usdt::text,
              participate_min_usdt::text, participate_max_usdt::text,
              allow_categories, deny_categories, allow_brands, deny_brands,
              allow_providers, deny_providers, allow_marketplaces, deny_marketplaces,
              allow_countries, deny_countries, allow_currencies, deny_currencies,
              auto_match_allowed, manual_assign_only, prefer_new_listings,
              max_concurrent_trades, daily_participate_count,
              daily_participate_amount_usdt::text, matching_paused,
              effective_from, effective_until
         FROM public.matching_policy_versions
        WHERE status = 'active'
          AND (
            scope = 'platform'
            OR (scope = 'user' AND subject_id = $1::uuid)
            OR (scope = 'group' AND group_key = ANY($2::text[]))
          )`,
      [userId, keys],
    );
    const assigns = await this.queryOptional<AssignRow>(
      querier,
      `SELECT opportunity_id::text, kind
         FROM public.matching_policy_assignments
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const hidden = await querier.query<HiddenRow>(
      `SELECT opportunity_id::text, hidden, force_show
         FROM public.user_opportunity_overrides
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const includeIds = [
      ...assigns.rows.filter((r) => r.kind === "include").map((r) => r.opportunity_id),
      ...hidden.rows.filter((r) => r.force_show === true).map((r) => r.opportunity_id),
    ];
    const excludeIds = [
      ...assigns.rows.filter((r) => r.kind === "exclude").map((r) => r.opportunity_id),
      ...hidden.rows.filter((r) => r.hidden === true).map((r) => r.opportunity_id),
    ];
    const layers = policies.rows.map((row) => this.toLayer(row));
    if (includeIds.length || excludeIds.length) {
      layers.push({
        ...platformDefaultLayer(),
        source: "user",
        policyId: "assignments",
        version: 0,
        includeOpportunityIds: includeIds,
        excludeOpportunityIds: excludeIds,
      });
    }
    void nowMs;
    return layers;
  }

  private async groupKeysForUser(
    userId: string,
    querier: PolicyQuerier,
  ): Promise<string[]> {
    const keys = new Set<string>();
    const members = await this.queryOptional<{ group_key: string }>(
      querier,
      `SELECT group_key
         FROM public.matching_policy_group_members
        WHERE user_id = $1::uuid`,
      [userId],
    );
    for (const row of members.rows) keys.add(row.group_key);
    const created = await querier.query<{ created_at: Date }>(
      `SELECT created_at FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    const createdAt = created.rows[0]?.created_at
      ? new Date(created.rows[0].created_at).getTime()
      : 0;
    if (createdAt && Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000) {
      keys.add("new_signup");
    }
    const kakao = await querier.query<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM public.auth_oauth_identities
        WHERE user_id = $1::uuid AND provider = 'kakao'`,
      [userId],
    );
    if (Number(kakao.rows[0]?.n ?? 0) > 0) keys.add("kakao");
    return [...keys];
  }

  private async queryOptional<T extends QueryResultRow>(
    querier: PolicyQuerier,
    text: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[] }> {
    try {
      return await querier.query<T>(text, params);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code ?? "")
          : "";
      if (code === "42P01") return { rows: [] };
      throw err;
    }
  }

  private toLayer(row: PolicyRow): MatchingPolicyLayer {
    return {
      source: row.scope,
      policyId: row.id,
      version: row.version,
      visibilityMinUsdt: row.visibility_min_usdt,
      visibilityMaxUsdt: row.visibility_max_usdt,
      participateMinUsdt: row.participate_min_usdt,
      participateMaxUsdt: row.participate_max_usdt,
      allowCategories: row.allow_categories,
      denyCategories: row.deny_categories,
      allowBrands: row.allow_brands,
      denyBrands: row.deny_brands,
      allowProviders: row.allow_providers,
      denyProviders: row.deny_providers,
      allowMarketplaces: row.allow_marketplaces,
      denyMarketplaces: row.deny_marketplaces,
      allowCountries: row.allow_countries,
      denyCountries: row.deny_countries,
      allowCurrencies: row.allow_currencies,
      denyCurrencies: row.deny_currencies,
      includeOpportunityIds: [],
      excludeOpportunityIds: [],
      autoMatchAllowed: row.auto_match_allowed,
      manualAssignOnly: row.manual_assign_only,
      preferNewListings: row.prefer_new_listings,
      maxConcurrentTrades: row.max_concurrent_trades,
      dailyParticipateCount: row.daily_participate_count,
      dailyParticipateAmountUsdt: row.daily_participate_amount_usdt,
      matchingPaused: row.matching_paused === true,
      effectiveFromMs: row.effective_from ? new Date(row.effective_from).getTime() : null,
      effectiveUntilMs: row.effective_until ? new Date(row.effective_until).getTime() : null,
    };
  }

  async applyToFactCards<T extends { source?: string; payload?: Record<string, unknown> }>(
    userId: string,
    facts: T[],
  ): Promise<T[]> {
    const out: T[] = [];
    for (const fact of facts) {
      const payload = fact.payload;
      const ids = Array.isArray(payload?.opportunityIds)
        ? payload.opportunityIds.map((id) => String(id))
        : payload?.opportunityId
          ? [String(payload.opportunityId)]
          : [];
      if (ids.length === 0) {
        out.push(fact);
        continue;
      }
      const rows = await this.db.query<{
        id: string;
        required_capital_usdt: string;
        category: string;
        asset_id: string | null;
        status: string;
        pricing: Record<string, unknown> | null;
        expected_profit_usdt: string;
      }>(
        `SELECT id::text, required_capital_usdt::text, category, asset_id::text,
                status, pricing, expected_profit_usdt::text
           FROM public.opportunities
          WHERE id = ANY($1::uuid[])`,
        [ids],
      );
      const visible = await this.filterForUser(
        userId,
        rows.rows,
        (row) => opportunityRowToCandidate(row),
      );
      const top = visible[0];
      out.push({
        ...fact,
        payload: {
          ...(payload || {}),
          count: visible.length,
          opportunityId: top?.id ?? null,
          opportunityIds: visible.map((row) => row.id),
          expectedProfitUsdt: top?.expected_profit_usdt ?? null,
        },
      });
    }
    return out;
  }
}

export function opportunityRowToCandidate(row: {
  id: string;
  required_capital_usdt: string;
  category: string;
  asset_id?: string | null;
  status: string;
  pricing?: Record<string, unknown> | null;
}): OpportunityCandidate {
  const pricing = row.pricing || {};
  const amount = String(row.required_capital_usdt ?? "");
  const amountValid = /^-?[0-9]+(\.[0-9]+)?$/.test(amount) && amount !== "0";
  return {
    id: row.id,
    requiredCapitalUsdt: amount,
    category: String(row.category ?? ""),
    brand: pricing.brand != null ? String(pricing.brand) : null,
    model: pricing.model != null ? String(pricing.model) : null,
    condition: pricing.condition != null ? String(pricing.condition) : null,
    provider: pricing.provider != null ? String(pricing.provider) : null,
    marketplace: pricing.marketplace != null ? String(pricing.marketplace) : null,
    country: pricing.country != null ? String(pricing.country) : null,
    currency: pricing.currency != null ? String(pricing.currency) : null,
    status: row.status,
    published: row.status === "available",
    expired: false,
    identityConfirmed: Boolean(row.asset_id),
    amountValid,
  };
}
