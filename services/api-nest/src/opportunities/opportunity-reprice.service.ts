/**
 * Listing persist 이후 기존 Opportunity만 canonical compute로 재계산한다.
 * 새 INSERT/promotion 없음. opportunity.stale_at writer = AS-OF (=== priced_at).
 */
import { Injectable, Logger } from "@nestjs/common";
import type { PoolClient } from "pg";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import {
  approxKrwFromSnapshot,
  computeOpportunityPricing,
  DEFAULT_PLATFORM_MARGIN_PCT,
  resolveCapitalBand,
  resolveStoredLegListingPrices,
} from "./opportunities.mi";
import { OPPORTUNITY_EVENTS } from "./opportunities.events";

export type OpportunityPersistRow = {
  id: string;
  asset_id: string;
  pricing_version: number;
  priced_at: Date;
  expected_profit_usdt: string;
  expected_profit_krw_approx: string | null;
  fx_snapshot_id: string;
  required_capital_usdt: string;
  category: string;
  asset_label: string;
  asset_image_url: string;
  pricing: Record<string, unknown>;
  stale_at: Date;
  status: string;
  grade_mismatch: boolean;
  image_missing: boolean;
  capital_band: string | null;
};

const OPP_RETURNING = `id, asset_id, pricing_version, priced_at,
              expected_profit_usdt::text, expected_profit_krw_approx::text,
              fx_snapshot_id, required_capital_usdt::text, category,
              asset_label, asset_image_url, pricing, stale_at, status,
              grade_mismatch, image_missing, capital_band`;

export type PersistComputedPricingInput = {
  id: string;
  pricing: Record<string, unknown>;
  expectedProfitUsdt: string;
  expectedProfitKrw: string | null;
  capitalBand: string;
  nextVersion: number;
  asOf: string;
};

@Injectable()
export class OpportunityRepriceService {
  private readonly logger = new Logger(OpportunityRepriceService.name);

  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  /**
   * compute 성공 시에만 priced_at = stale_at = 동일 as-of bind.
   * freshness 단독 patch 금지. Admin patchPricing과 listing reprice가 공유.
   */
  async persistComputedPricing(
    client: PoolClient,
    input: PersistComputedPricingInput,
  ): Promise<OpportunityPersistRow> {
    const { rows } = await client.query<OpportunityPersistRow>(
      `UPDATE public.opportunities SET
          pricing = $2::jsonb,
          pricing_version = $3,
          priced_at = $4::timestamptz,
          stale_at = $4::timestamptz,
          expected_profit_usdt = $5::numeric,
          expected_profit_krw_approx = $6::numeric,
          capital_band = $7,
          updated_at = now()
        WHERE id = $1
        RETURNING ${OPP_RETURNING}`,
      [
        input.id,
        JSON.stringify(input.pricing),
        input.nextVersion,
        input.asOf,
        input.expectedProfitUsdt,
        input.expectedProfitKrw,
        input.capitalBand,
      ],
    );
    const updated = rows[0];
    if (!updated) throw new Error("opportunity persist missing RETURNING row");
    return updated;
  }

  /**
   * 기존 Opportunity UPDATE only. asset에 opp가 없으면 no-op.
   * resolve/compute 실패 · admin override → freshness 미갱신.
   */
  async repriceFromCurrentListings(assetIds: string[]): Promise<{
    attempted: number;
    updated: number;
    skipped: number;
  }> {
    const unique = [
      ...new Set(
        assetIds.map((id) => String(id || "").trim()).filter((id) => id.length > 0),
      ),
    ];
    let updated = 0;
    let skipped = 0;
    for (const assetId of unique) {
      try {
        const result = await this.repriceOneAsset(assetId);
        if (result === "updated") updated += 1;
        else skipped += 1;
      } catch (e) {
        skipped += 1;
        this.logger.warn(
          `reprice skipped (fail-closed): asset=${assetId} err=${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    }
    return { attempted: unique.length, updated, skipped };
  }

  private async repriceOneAsset(
    assetId: string,
  ): Promise<"updated" | "skipped"> {
    if (!this.db.configured()) return "skipped";

    const persisted = await this.db.withTransaction(async (client) => {
      const { rows } = await client.query<OpportunityPersistRow>(
        `SELECT ${OPP_RETURNING}
           FROM public.opportunities
          WHERE asset_id = $1
          FOR UPDATE`,
        [assetId],
      );
      const row = rows[0];
      if (!row) return null;

      const prev = row.pricing || {};
      if (prev.useAdminOverride === true) return null;

      const buyMarketId = String(prev.buyMarketId ?? "");
      const sellMarketId = String(prev.sellMarketId ?? "");
      const listings = await client.query<{
        market_id: string;
        price_usdt: string;
      }>(
        `SELECT market_id, price_usdt::text
           FROM public.listings
          WHERE asset_id = $1`,
        [assetId],
      );
      const resolved = resolveStoredLegListingPrices({
        listings: listings.rows.map((L) => ({
          marketId: L.market_id,
          priceUsdt: L.price_usdt,
        })),
        buyMarketId,
        sellMarketId,
      });
      if (!resolved.ok) return null;

      const computed = computeOpportunityPricing({
        buyMarketId,
        sellMarketId,
        buyPriceUsdt: resolved.buyPriceUsdt,
        sellPriceUsdt: resolved.sellPriceUsdt,
        platformMarginPct: DEFAULT_PLATFORM_MARGIN_PCT,
        adminMarginPct:
          prev.adminMarginPct != null ? String(prev.adminMarginPct) : undefined,
        requiredCapitalUsdt: row.required_capital_usdt,
        useAdminOverride: false,
        pricingSource: "adapter",
        gradeMismatch: row.grade_mismatch,
        imageMissing: row.image_missing,
      });

      let expectedProfitKrw: string | null = row.expected_profit_krw_approx;
      const fx = await client.query<{ usd_krw: string }>(
        `SELECT usd_krw::text FROM public.fx_snapshots WHERE id = $1`,
        [row.fx_snapshot_id],
      );
      if (fx.rows[0]) {
        expectedProfitKrw = approxKrwFromSnapshot(computed.expectedProfitUsdt, {
          usdtKrw: fx.rows[0].usd_krw,
        });
      }

      const pricing = {
        ...prev,
        ...computed,
        useAdminOverride: false,
      };
      const asOf = new Date().toISOString();
      return this.persistComputedPricing(client, {
        id: row.id,
        pricing,
        expectedProfitUsdt: computed.expectedProfitUsdt,
        expectedProfitKrw,
        capitalBand: resolveCapitalBand(row.required_capital_usdt),
        nextVersion: row.pricing_version + 1,
        asOf,
      });
    });

    if (!persisted) return "skipped";

    this.bus.emit(OPPORTUNITY_EVENTS.priceUpdated, {
      id: persisted.id,
      pricingVersion: persisted.pricing_version,
      patch: {
        expectedProfitUsdt: persisted.expected_profit_usdt,
        pricing: persisted.pricing,
        capitalBand: persisted.capital_band,
        compareReady: Boolean(persisted.pricing?.compareReady),
      },
    });
    return "updated";
  }
}
