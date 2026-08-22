/**
 * Nest 면 — public.opportunities 단일 write owner.
 */
import { Injectable } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PostgresService } from "../db/postgres";

const req = createRequire(__filename);
const write = req(join(__dirname, "opportunity-write.cjs")) as {
  ORIGIN: { CATALOG_SEED: "catalog_seed"; TRACK_A: "track_a" };
  findByAssetId: (
    q: { query: Function },
    assetId: string,
  ) => Promise<{ id: string } | null>;
  countAvailableByOrigin: (
    q: { query: Function },
    origin: string,
  ) => Promise<number>;
  insertIfAbsentByAssetId: (
    q: { query: Function },
    opp: Record<string, unknown>,
  ) => Promise<{ inserted: boolean; idempotent: boolean; id: string }>;
};

@Injectable()
export class OpportunityWriteService {
  constructor(private readonly db: PostgresService) {}

  get origins() {
    return write.ORIGIN;
  }

  async countAvailableByOrigin(origin: string): Promise<number> {
    if (!this.db.configured()) return 0;
    return write.countAvailableByOrigin(this.db, origin);
  }

  async insertIfAbsentByAssetId(
    opp: Record<string, unknown>,
  ): Promise<{ inserted: boolean; id: string }> {
    const existing = await write.findByAssetId(this.db, String(opp.assetId));
    if (existing) return { inserted: false, id: existing.id };
    return write.insertIfAbsentByAssetId(this.db, opp);
  }
}
