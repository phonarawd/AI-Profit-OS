/**
 * REL-224 소스 건강 읽기 + 정책 버전 이력.
 * 건강 공식은 ProviderHealthService 재사용. 버전 본문 UPDATE 0.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PostgresService } from "../db/postgres";
import { ProviderHealthService } from "../adapters/provider-health.service";

const requireCjs = createRequire(__filename);
const policyCore = requireCjs(
  join(__dirname, "..", "..", "admin-policy-version.core.cjs"),
) as {
  POLICY_KEYS: readonly string[];
  VERSION_LABELS: readonly string[];
  HEALTH_STATUSES: readonly string[];
  normalizePolicyKey: (
    raw: unknown,
  ) => { ok: true; key: string } | { ok: false; error: string };
  requireReason: (
    reason: unknown,
  ) => { ok: true; reason: string } | { ok: false; error: string };
  assertNoMoney: (
    payload: unknown,
  ) => { ok: true; payload: object } | { ok: false; error: string };
  publishVersion: (
    existing: unknown,
    label: unknown,
  ) => { ok: true; label: string; overwrite: false } | { ok: false; error: string };
  rollbackHead: (
    existing: unknown,
    toLabel: unknown,
  ) =>
    | { ok: true; currentLabel: string; versionsUntouched: true }
    | { ok: false; error: string };
  requireFounder: (
    role: unknown,
    severity: unknown,
  ) => { ok: true; role: string; severity: string } | { ok: false; error: string };
  projectHealth: (
    status: unknown,
  ) =>
    | { ok: true; status: string | null; filledHealthy: false }
    | { ok: false; error: string };
};

const auditCore = requireCjs(
  join(__dirname, "..", "..", "admin-audit.core.cjs"),
) as {
  writeAuditEvent: (
    raw: unknown,
  ) => Promise<{ ok: boolean; error?: string; event?: object }>;
};

type VersionRow = {
  policy_key: string;
  version_label: string;
  payload: Record<string, unknown>;
  reason: string;
  severity: string;
};

type HeadRow = { policy_key: string; current_label: string };

function isUndefinedTable(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      (err as { code?: string }).code === "42P01",
  );
}

@Injectable()
export class SourcePolicyService {
  constructor(
    private readonly db: PostgresService,
    private readonly providerHealth: ProviderHealthService,
  ) {}

  catalog() {
    return {
      version: 1 as const,
      policyKeys: [...policyCore.POLICY_KEYS],
      labels: [...policyCore.VERSION_LABELS],
      healthStatuses: [...policyCore.HEALTH_STATUSES],
    };
  }

  async health() {
    const items: Array<{
      sourceId: string;
      marketplaceId: string | null;
      status: string | null;
    }> = [];
    if (this.db.configured()) {
      try {
        const { rows } = await this.db.query<{ provider_id: string }>(
          `SELECT DISTINCT provider_id FROM public.provider_runtime_health ORDER BY 1`,
        );
        for (const row of rows) {
          const snap = await this.providerHealth.getHealth(row.provider_id, null);
          const projected = policyCore.projectHealth(snap?.healthStatus ?? null);
          if (!projected.ok) throw new BadRequestException(projected.error);
          items.push({
            sourceId: row.provider_id,
            marketplaceId: null,
            status: projected.status,
          });
        }
      } catch (err) {
        if (!isUndefinedTable(err)) throw err;
      }
    }
    return {
      items,
      inventedHealthy: false,
      ledgerWrite: false,
    };
  }

  async versions(policyKeyRaw?: string) {
    const filter = policyKeyRaw
      ? policyCore.normalizePolicyKey(policyKeyRaw)
      : { ok: true as const, key: "" };
    if (!filter.ok) throw new BadRequestException(filter.error);
    const rows = await this.loadVersions(filter.key || null);
    const heads = await this.loadHeads();
    return {
      items: rows,
      heads,
      overwrite: false,
    };
  }

  async publish(input: {
    policyKey: string;
    label: string;
    payload?: Record<string, unknown>;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const key = policyCore.normalizePolicyKey(input.policyKey);
    if (!key.ok) throw new BadRequestException(key.error);
    const reason = policyCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const payload = policyCore.assertNoMoney(input.payload || {});
    if (!payload.ok) throw new BadRequestException(payload.error);
    const existing = (await this.loadVersions(key.key)).map((r) => r.version_label);
    const pub = policyCore.publishVersion(existing, input.label);
    if (!pub.ok) throw new BadRequestException(pub.error);
    await this.insertVersion({
      policyKey: key.key,
      label: pub.label,
      payload: payload.payload,
      reason: reason.reason,
      severity: "NORMAL",
      adminId: input.adminId,
    });
    await this.upsertHead(key.key, pub.label, input.adminId);
    await this.audit(input, {
      action: "SourcePolicyAdminController.publish",
      result: "applied",
      targetId: `${key.key}:${pub.label}`,
      extra: { policyKey: key.key, label: pub.label, overwrite: false },
    });
    return {
      policyKey: key.key,
      label: pub.label,
      overwrite: false,
      ledgerWrite: false,
    };
  }

  async rollback(input: {
    policyKey: string;
    toLabel: string;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const key = policyCore.normalizePolicyKey(input.policyKey);
    if (!key.ok) throw new BadRequestException(key.error);
    const reason = policyCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const existing = (await this.loadVersions(key.key)).map((r) => r.version_label);
    const rb = policyCore.rollbackHead(existing, input.toLabel);
    if (!rb.ok) throw new BadRequestException(rb.error);
    await this.upsertHead(key.key, rb.currentLabel, input.adminId);
    await this.audit(input, {
      action: "SourcePolicyAdminController.rollback",
      result: "rolled_back",
      targetId: `${key.key}:${rb.currentLabel}`,
      extra: {
        policyKey: key.key,
        currentLabel: rb.currentLabel,
        versionsUntouched: true,
      },
    });
    return {
      policyKey: key.key,
      currentLabel: rb.currentLabel,
      versionsUntouched: true,
      ledgerWrite: false,
    };
  }

  async founderOverride(input: {
    label: string;
    payload?: Record<string, unknown>;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const founder = policyCore.requireFounder(input.role, "HIGH");
    if (!founder.ok) throw new ForbiddenException(founder.error);
    const reason = policyCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const payload = policyCore.assertNoMoney(input.payload || {});
    if (!payload.ok) throw new BadRequestException(payload.error);
    const existing = (await this.loadVersions("founder_override")).map(
      (r) => r.version_label,
    );
    const pub = policyCore.publishVersion(existing, input.label);
    if (!pub.ok) throw new BadRequestException(pub.error);
    await this.insertVersion({
      policyKey: "founder_override",
      label: pub.label,
      payload: payload.payload,
      reason: reason.reason,
      severity: founder.severity,
      adminId: input.adminId,
    });
    await this.upsertHead("founder_override", pub.label, input.adminId);
    await this.audit(input, {
      action: "SourcePolicyAdminController.founderOverride",
      result: "applied",
      targetId: `founder_override:${pub.label}`,
      extra: {
        policyKey: "founder_override",
        label: pub.label,
        severity: "HIGH",
        overwrite: false,
      },
    });
    return {
      policyKey: "founder_override",
      label: pub.label,
      severity: "HIGH",
      overwrite: false,
      ledgerWrite: false,
    };
  }

  private async loadVersions(policyKey: string | null): Promise<VersionRow[]> {
    if (!this.db.configured()) return [];
    try {
      const { rows } = await this.db.query<VersionRow>(
        policyKey
          ? `SELECT policy_key, version_label, payload, reason, severity
               FROM public.admin_policy_versions
              WHERE policy_key = $1
              ORDER BY version_label`
          : `SELECT policy_key, version_label, payload, reason, severity
               FROM public.admin_policy_versions
              ORDER BY policy_key, version_label`,
        policyKey ? [policyKey] : [],
      );
      return rows;
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
      return [];
    }
  }

  private async loadHeads(): Promise<HeadRow[]> {
    if (!this.db.configured()) return [];
    try {
      const { rows } = await this.db.query<HeadRow>(
        `SELECT policy_key, current_label FROM public.admin_policy_heads`,
      );
      return rows;
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
      return [];
    }
  }

  private async insertVersion(input: {
    policyKey: string;
    label: string;
    payload: object;
    reason: string;
    severity: string;
    adminId: string;
  }): Promise<void> {
    if (!this.db.configured()) return;
    try {
      await this.db.query(
        `INSERT INTO public.admin_policy_versions (
           policy_key, version_label, payload, reason, severity,
           created_by_admin_id, created_at
         ) VALUES ($1,$2,$3::jsonb,$4,$5,$6::uuid, now())`,
        [
          input.policyKey,
          input.label,
          JSON.stringify(input.payload),
          input.reason,
          input.severity,
          input.adminId,
        ],
      );
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
    }
  }

  private async upsertHead(
    policyKey: string,
    label: string,
    adminId: string,
  ): Promise<void> {
    if (!this.db.configured()) return;
    try {
      await this.db.query(
        `INSERT INTO public.admin_policy_heads (
           policy_key, current_label, updated_by_admin_id, updated_at
         ) VALUES ($1,$2,$3::uuid, now())
         ON CONFLICT (policy_key) DO UPDATE
           SET current_label = EXCLUDED.current_label,
               updated_by_admin_id = EXCLUDED.updated_by_admin_id,
               updated_at = now()`,
        [policyKey, label, adminId],
      );
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
    }
  }

  private async audit(
    actor: { adminId: string; role: string; reason: string },
    ev: {
      action: string;
      result: string;
      targetId: string;
      extra: Record<string, unknown>;
    },
  ) {
    await auditCore.writeAuditEvent({
      actorKey: actor.adminId,
      actorId: actor.adminId,
      role: actor.role || "unknown",
      action: ev.action,
      targetType: "policy_version",
      targetId: ev.targetId,
      mode: "LIVE",
      result: ev.result,
      reason: actor.reason,
      payload: ev.extra,
    });
  }
}
