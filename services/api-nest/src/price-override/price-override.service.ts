/**
 * REL-407 가격 4레이어 서버 강제.
 * SOURCE = listings 읽기 전용 · OVERRIDE = 전용 테이블 · EFFECTIVE = 기존 공식.
 * listings / ledger UPDATE 0.
 */

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { PoolClient } from "pg";
import { PostgresService } from "../db/postgres";

const requireCjs = createRequire(__filename);
const core = requireCjs(
  join(__dirname, "..", "..", "price-override.core.cjs"),
) as {
  PRICE_LAYERS: readonly string[];
  requireReason: (
    reason: unknown,
  ) => { ok: true; reason: string } | { ok: false; error: string };
  requireReasonCode: (
    raw: unknown,
    engaged: boolean,
  ) => { ok: true; reasonCode: string } | { ok: false; error: string };
  resolveLayers: (input: {
    sourceObserved?: object;
    override?: object;
    compute?: object;
  }) =>
    | {
        ok: true;
        SOURCE_OBSERVED: Record<string, unknown>;
        OVERRIDE: Record<string, unknown>;
        EFFECTIVE: Record<string, unknown>;
        USER_VISIBLE: Record<string, unknown>;
      }
    | { ok: false; error: string; leaked?: string[] };
  projectUserVisible: (
    effective: unknown,
  ) =>
    | { ok: true; userVisible: Record<string, unknown> }
    | { ok: false; error: string; leaked?: string[] };
};

const auditCore = requireCjs(
  join(__dirname, "..", "..", "admin-audit.core.cjs"),
) as {
  writeAuditEvent: (
    raw: unknown,
  ) => Promise<{ ok: boolean; error?: string; event?: object }>;
};

export type PriceOverrideWrite = {
  engaged: boolean;
  adminBuyUsdt?: string;
  adminSellUsdt?: string;
  adminMarginPct?: string;
  reason: string;
  reasonCode: string;
  adminId: string;
  role: string;
};

type ListingRow = {
  market_id: string;
  price_usdt: string;
  native_amount: string | null;
  native_currency: string | null;
  observed_at: Date | null;
  adapter_id: string | null;
  external_item_id: string | null;
};

function isUndefinedTable(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      (err as { code?: string }).code === "42P01",
  );
}

@Injectable()
export class PriceOverrideService {
  constructor(private readonly db: PostgresService) {}

  projectUserVisible(pricing: Record<string, unknown> | null | undefined) {
    const projected = core.projectUserVisible(pricing || {});
    if (!projected.ok) return {};
    return projected.userVisible;
  }

  requireWrite(input: {
    reason: unknown;
    reasonCode: unknown;
    engaged: boolean;
  }) {
    const reason = core.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const reasonCode = core.requireReasonCode(input.reasonCode, input.engaged);
    if (!reasonCode.ok) throw new BadRequestException(reasonCode.error);
    return { reason: reason.reason, reasonCode: reasonCode.reasonCode };
  }

  async loadSource(
    client: PoolClient,
    input: {
      assetId: string;
      buyMarketId: string;
      sellMarketId: string;
    },
  ) {
    const { rows } = await client.query<ListingRow>(
      `SELECT market_id, price_usdt::text,
              native_amount::text, native_currency, observed_at,
              adapter_id, external_item_id
         FROM public.listings
        WHERE asset_id = $1`,
      [input.assetId],
    );
    const buy = rows.find((r) => r.market_id === input.buyMarketId);
    const sell = rows.find((r) => r.market_id === input.sellMarketId);
    return {
      buyMarketId: input.buyMarketId,
      sellMarketId: input.sellMarketId,
      buyPriceUsdt: buy?.price_usdt ?? null,
      sellPriceUsdt: sell?.price_usdt ?? null,
      nativeAmount: buy?.native_amount ?? sell?.native_amount ?? null,
      nativeCurrency: buy?.native_currency ?? sell?.native_currency ?? null,
      observedAt: buy?.observed_at
        ? new Date(buy.observed_at).toISOString()
        : sell?.observed_at
          ? new Date(sell.observed_at).toISOString()
          : null,
      source: buy?.adapter_id || sell?.adapter_id || "listing",
      externalItemId: buy?.external_item_id ?? sell?.external_item_id ?? null,
    };
  }

  resolve(input: {
    sourceObserved: object;
    override: object;
    compute: object;
  }) {
    const layers = core.resolveLayers(input);
    if (!layers.ok) {
      throw new BadRequestException(layers.error);
    }
    return layers;
  }

  async persistOverride(
    client: PoolClient,
    opportunityId: string,
    write: PriceOverrideWrite,
  ): Promise<void> {
    try {
      await client.query(
        `INSERT INTO public.opportunity_price_overrides (
           opportunity_id, engaged, admin_buy_usdt, admin_sell_usdt,
           admin_margin_pct, reason_code, reason,
           updated_by_admin_id, updated_at
         ) VALUES (
           $1::uuid, $2, $3::numeric, $4::numeric, $5::numeric,
           $6, $7, $8::uuid, now()
         )
         ON CONFLICT (opportunity_id) DO UPDATE SET
           engaged = EXCLUDED.engaged,
           admin_buy_usdt = EXCLUDED.admin_buy_usdt,
           admin_sell_usdt = EXCLUDED.admin_sell_usdt,
           admin_margin_pct = EXCLUDED.admin_margin_pct,
           reason_code = EXCLUDED.reason_code,
           reason = EXCLUDED.reason,
           updated_by_admin_id = EXCLUDED.updated_by_admin_id,
           updated_at = now()`,
        [
          opportunityId,
          write.engaged,
          write.adminBuyUsdt ?? null,
          write.adminSellUsdt ?? null,
          write.adminMarginPct ?? null,
          write.reasonCode,
          write.reason,
          write.adminId,
        ],
      );
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
    }
  }

  async writeAppliedAudit(input: {
    opportunityId: string;
    engaged: boolean;
    reason: string;
    reasonCode: string;
    adminId: string;
    role: string;
  }): Promise<void> {
    await auditCore.writeAuditEvent({
      actorKey: input.adminId,
      actorId: input.adminId,
      role: input.role || "unknown",
      action: "OpportunitiesAdminController.patchPricing",
      targetType: "price_override",
      targetId: input.opportunityId,
      mode: "LIVE",
      result: "applied",
      reason: input.reason,
      payload: {
        engaged: input.engaged,
        reasonCode: input.reasonCode,
        layer: "OVERRIDE",
      },
    });
  }

  async describe(opportunityId: string) {
    if (!opportunityId?.trim()) {
      throw new NotFoundException("opportunity not found");
    }
    if (!this.db.configured()) {
      throw new BadRequestException("SOURCE_UNAVAILABLE");
    }
    return this.db.withTransaction(async (client) => {
      const { rows } = await client.query<{
        id: string;
        asset_id: string;
        required_capital_usdt: string;
        grade_mismatch: boolean;
        image_missing: boolean;
        pricing: Record<string, unknown>;
      }>(
        `SELECT id::text, asset_id, required_capital_usdt::text,
                grade_mismatch, image_missing, pricing
           FROM public.opportunities
          WHERE id = $1::uuid`,
        [opportunityId],
      );
      const row = rows[0];
      if (!row) throw new NotFoundException("opportunity not found");
      const prev = row.pricing || {};
      const buyMarketId = String(prev.buyMarketId ?? "ebay_us");
      const sellMarketId = String(prev.sellMarketId ?? "ebay_gb");
      const source = await this.loadSource(client, {
        assetId: row.asset_id,
        buyMarketId,
        sellMarketId,
      });
      const override = {
        engaged: prev.useAdminOverride === true,
        adminBuyUsdt: prev.adminBuyUsdt,
        adminSellUsdt: prev.adminSellUsdt,
        adminMarginPct: prev.adminMarginPct,
        lastAdminEditBy: prev.lastAdminEditBy,
      };
      const layers = this.resolve({
        sourceObserved: source,
        override,
        compute: {
          buyMarketId,
          sellMarketId,
          requiredCapitalUsdt: row.required_capital_usdt,
          gradeMismatch: row.grade_mismatch,
          imageMissing: row.image_missing,
        },
      });
      return {
        version: 1 as const,
        layers: [...core.PRICE_LAYERS],
        SOURCE_OBSERVED: layers.SOURCE_OBSERVED,
        OVERRIDE: layers.OVERRIDE,
        EFFECTIVE: layers.EFFECTIVE,
        USER_VISIBLE: layers.USER_VISIBLE,
      };
    });
  }
}
