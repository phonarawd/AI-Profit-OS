/**
 * 외부 카탈로그 쓰기 가드.
 * 게이트(기본 OFF)와 operator 행 보호를 writer가 같은 TX에서 강제한다.
 */
import { Injectable, Logger } from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { PoolClient } from "pg";
import { PostgresService } from "../db/postgres";

const requireCjs = createRequire(__filename);
const core = requireCjs(
  join(__dirname, "..", "..", "catalog-external-write.core.cjs"),
) as {
  GATE_ENV: string;
  WRITER_KIND: { LEGACY_EXTERNAL: string; OPERATOR_CANONICAL: string };
  REASON: Record<string, string>;
  SQL: {
    schemaReady: string;
    lockAsset: string;
    lockOpportunities: string;
    updateAssetImage: string;
    updateOpportunityImage: string;
    updateOpportunityPricingLegacyOnly: string;
    updateOpportunityAdminImage: string;
  };
  parseGate: (raw: unknown) =>
    | { ok: true; engaged: boolean }
    | { ok: false; reason: string };
  readGateFromEnv: (env?: NodeJS.ProcessEnv) =>
    | { ok: true; engaged: boolean }
    | { ok: false; reason: string };
  decideProductWrite: (input: {
    gate: { ok: boolean; engaged?: boolean; reason?: string };
    schemaReady: boolean | null;
    schemaError?: boolean;
    sources: Array<string | null | undefined> | null;
    writerKind?: string;
  }) => { allow: boolean; reason: string };
  decideBootSeed: (input: {
    gate: { ok: boolean; engaged?: boolean; reason?: string };
    schemaReady: boolean | null;
    schemaError?: boolean;
  }) => { allow: boolean; reason: string };
  isUndefinedColumn: (err: unknown) => boolean;
  isExpectedProductBlock: (reason: string) => boolean;
  inspectSchemaOnClient: (
    client: Pick<PoolClient, "query">,
  ) => Promise<{ ready: boolean; error: boolean }>;
  evaluateLockedAssetOnClient: (
    client: Pick<PoolClient, "query">,
    assetId: string,
    env?: NodeJS.ProcessEnv,
    opts?: { writerKind?: string },
  ) => Promise<{
    allow: boolean;
    reason: string;
    schemaReady: boolean;
    assetLocked: boolean;
    writerKind?: string;
  }>;
  evaluateLockedOpportunityOnClient: (
    client: Pick<PoolClient, "query">,
    opportunityId: string,
    env?: NodeJS.ProcessEnv,
  ) => Promise<{
    allow: boolean;
    reason: string;
    schemaReady: boolean;
    assetLocked: boolean;
    opportunityMissing: boolean;
    writerKind?: string;
  }>;
};

export type CatalogWriteDecision = {
  allow: boolean;
  reason: string;
  schemaReady: boolean;
};

export type LockedAssetEvaluation = CatalogWriteDecision & {
  assetLocked: boolean;
};

export type LockedOpportunityEvaluation = LockedAssetEvaluation & {
  opportunityMissing: boolean;
};

@Injectable()
export class CatalogExternalWriteGuard {
  private readonly logger = new Logger(CatalogExternalWriteGuard.name);

  constructor(private readonly db: PostgresService) {}

  readGate(
    env: NodeJS.ProcessEnv = process.env,
  ): { ok: true; engaged: boolean } | { ok: false; reason: string } {
    return core.readGateFromEnv(env);
  }

  /**
   * 잠금 전 빠른 차단. 게이트 ON/미해석이면 DB 없이 상품 쓰기를 건너뛴다.
   * 스키마·공급원은 TX 안에서 다시 확인한다.
   */
  preflightProductWrites(
    env: NodeJS.ProcessEnv = process.env,
  ): { skipAll: boolean; reason: string } {
    const gate = this.readGate(env);
    if (!gate.ok) return { skipAll: true, reason: gate.reason };
    if (gate.engaged) return { skipAll: true, reason: core.REASON.GATE_ON };
    return { skipAll: false, reason: core.REASON.ALLOW_LEGACY };
  }

  async inspectSchema(
    client: Pick<PoolClient, "query">,
  ): Promise<{ ready: boolean; error: boolean }> {
    return core.inspectSchemaOnClient(client);
  }

  /**
   * assets → opportunities(id ASC) 잠금 후 게이트·공급원을 재평가한다.
   * 잠금 전에 읽은 값으로 쓰기를 결정하지 않는다.
   * writerKind 기본값 = legacy_external. operator_canonical은 S2 예약.
   */
  async evaluateLockedAsset(
    client: Pick<PoolClient, "query">,
    assetId: string,
    env: NodeJS.ProcessEnv = process.env,
    opts?: { writerKind?: string },
  ): Promise<LockedAssetEvaluation> {
    const decided = await core.evaluateLockedAssetOnClient(
      client,
      assetId,
      env,
      opts,
    );
    if (!decided.allow) {
      this.logger.warn(
        `catalog write blocked asset=${assetId} reason=${decided.reason}`,
      );
    }
    return {
      allow: decided.allow,
      reason: decided.reason,
      schemaReady: decided.schemaReady,
      assetLocked: decided.assetLocked,
    };
  }

  /**
   * opportunity id → asset 잠금 → 재평가. writerKind를 받지 않는다.
   */
  async evaluateLockedOpportunity(
    client: Pick<PoolClient, "query">,
    opportunityId: string,
    env: NodeJS.ProcessEnv = process.env,
  ): Promise<LockedOpportunityEvaluation> {
    const decided = await core.evaluateLockedOpportunityOnClient(
      client,
      opportunityId,
      env,
    );
    if (!decided.allow && !decided.opportunityMissing) {
      this.logger.warn(
        `catalog write blocked opportunity=${opportunityId} reason=${decided.reason}`,
      );
    }
    return {
      allow: decided.allow,
      reason: decided.reason,
      schemaReady: decided.schemaReady,
      assetLocked: decided.assetLocked,
      opportunityMissing: decided.opportunityMissing === true,
    };
  }

  async evaluateBootSeed(
    env: NodeJS.ProcessEnv = process.env,
  ): Promise<CatalogWriteDecision> {
    const gate = this.readGate(env);
    if (!this.db.configured()) {
      return {
        allow: false,
        reason: "DATABASE_URL unset",
        schemaReady: false,
      };
    }
    if (!gate.ok || gate.engaged) {
      return {
        allow: false,
        reason: gate.ok ? core.REASON.GATE_ON : gate.reason,
        schemaReady: false,
      };
    }
    try {
      const schema = await this.db.withTransaction(async (client) =>
        this.inspectSchema(client),
      );
      const decided = core.decideBootSeed({
        gate,
        schemaReady: schema.ready,
        schemaError: schema.error,
      });
      return { ...decided, schemaReady: schema.ready };
    } catch (err) {
      this.logger.warn(
        `boot-seed schema inspect failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return {
        allow: false,
        reason: core.REASON.SCHEMA_QUERY_FAILED,
        schemaReady: false,
      };
    }
  }
}

export const catalogExternalWriteCore = core;
