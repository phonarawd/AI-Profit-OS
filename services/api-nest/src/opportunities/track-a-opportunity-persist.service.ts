/**
 * Track A ISSUED Opportunity → 기존 write owner.
 * production ingest / cron / worker 활성화 없음.
 */
import { Injectable } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PostgresService } from "../db/postgres";

const req = createRequire(__filename);
const persist = req(join(__dirname, "track-a-opportunity-persist.cjs")) as {
  persistQualifiedTrackAOpportunity: (input: {
    issued: unknown;
    asset: Record<string, unknown>;
    fxSnapshot: unknown;
    querier: { query: Function };
  }) => Promise<{
    ok: boolean;
    persisted: boolean;
    idempotent: boolean;
    reason: string | null;
    opportunityId: string | null;
    row: Record<string, unknown> | null;
    productionPersisted: false;
  }>;
};

type AssetRow = {
  asset_id: string;
  category: string;
  asset_label: string;
  image_url: string;
  image_source: string;
  image_alt_ko: string;
};

@Injectable()
export class TrackAOpportunityPersistService {
  constructor(private readonly db: PostgresService) {}

  async persistIssued(input: {
    issued: unknown;
    assetId: string;
    fxSnapshot: unknown;
  }) {
    if (!this.db.configured()) {
      return {
        ok: false,
        persisted: false,
        idempotent: false,
        reason: "DATABASE_URL_UNSET",
        opportunityId: null,
        row: null,
        productionPersisted: false as const,
      };
    }
    const assetId = String(input.assetId || "").trim();
    const { rows } = await this.db.query<AssetRow>(
      `SELECT asset_id, category, asset_label, image_url, image_source, image_alt_ko
         FROM public.assets WHERE asset_id = $1 LIMIT 1`,
      [assetId],
    );
    const asset = rows[0];
    if (!asset) {
      return {
        ok: false,
        persisted: false,
        idempotent: false,
        reason: "EXISTING_ASSET_REQUIRED",
        opportunityId: null,
        row: null,
        productionPersisted: false as const,
      };
    }
    return persist.persistQualifiedTrackAOpportunity({
      issued: input.issued,
      fxSnapshot: input.fxSnapshot,
      querier: this.db,
      asset: {
        assetId: asset.asset_id,
        category: asset.category,
        assetLabel: asset.asset_label,
        assetImageUrl: asset.image_url,
        assetImageSource: asset.image_source,
        assetImageAltKo: asset.image_alt_ko,
      },
    });
  }
}
