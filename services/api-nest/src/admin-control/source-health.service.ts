/**
 * REL-224 — source/parser health + policy versions + founder override.
 * Health comes from existing AdaptersAdminService / ProviderHealthService.
 * No manufactured healthy-or-zero-failure metrics.
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AdaptersAdminService } from "../adapters/adapters.admin.service";
import { AdminAuditService } from "./admin-audit.service";

export const POLICY_VERSIONS = ["V1", "V2", "V3"] as const;
export type PolicyVersionId = (typeof POLICY_VERSIONS)[number];

type PolicyHistoryEntry = {
  version: PolicyVersionId;
  at: string;
  adminId: string;
};

type FounderOverrideState = {
  engaged: boolean;
  reason: string | null;
  adminId: string | null;
  at: string | null;
};

function mapHealth(status: unknown): "UNKNOWN" | "UNAVAILABLE" | "HEALTHY" | "DEGRADED" | "FAILED" {
  if (status === "HEALTHY" || status === "green") return "HEALTHY";
  if (status === "DEGRADED" || status === "yellow" || status === "STALE") {
    return "DEGRADED";
  }
  if (status === "FAILED" || status === "red" || status === "BLOCKED") return "FAILED";
  if (status == null) return "UNKNOWN";
  return "UNKNOWN";
}

@Injectable()
export class SourceHealthService {
  private currentPolicy: PolicyVersionId = "V1";
  private readonly history: PolicyHistoryEntry[] = [
    { version: "V1", at: new Date().toISOString(), adminId: "bootstrap" },
  ];
  private founderOverride: FounderOverrideState = {
    engaged: false,
    reason: null,
    adminId: null,
    at: null,
  };

  constructor(
    private readonly adapters: AdaptersAdminService,
    private readonly audit: AdminAuditService,
  ) {}

  async health(): Promise<{
    items: Array<{
      adapterId: string;
      status: ReturnType<typeof mapHealth>;
      lastIngestAt: string | null;
      observationCount24h: number | null;
      skuMatchFailureRate: number | null;
    }>;
    source: "adapters";
  }> {
    const raw = await this.adapters.listHealth();
    const items = (raw.items ?? []).map((row) => ({
      adapterId: row.adapterId,
      status: mapHealth(row.healthStatus ?? row.status),
      lastIngestAt: row.lastIngestAt ?? null,
      observationCount24h:
        typeof row.observationCount24h === "number"
          ? row.observationCount24h
          : null,
      skuMatchFailureRate:
        typeof row.skuMatchFailureRate === "number"
          ? row.skuMatchFailureRate
          : null,
    }));
    return { items, source: "adapters" };
  }

  versions(): {
    current: PolicyVersionId;
    history: PolicyHistoryEntry[];
    overwriteWithoutHistory: false;
  } {
    return {
      current: this.currentPolicy,
      history: [...this.history],
      overwriteWithoutHistory: false,
    };
  }

  async rollback(input: {
    version: unknown;
    reason: string;
    adminId: string;
  }): Promise<{ current: PolicyVersionId }> {
    if (!POLICY_VERSIONS.includes(input.version as PolicyVersionId)) {
      throw new BadRequestException("UNKNOWN_POLICY_VERSION");
    }
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason must be ≥10 characters");
    }
    const next = input.version as PolicyVersionId;
    const previous = this.currentPolicy;
    this.currentPolicy = next;
    this.history.push({
      version: next,
      at: new Date().toISOString(),
      adminId: input.adminId,
    });
    await this.audit.record({
      action: "policy.rollback",
      outcome: "applied",
      actorAdminId: input.adminId,
      capability: "sourceHealth",
      reason: input.reason.trim(),
      targetType: "policy_version",
      before: { version: previous },
      after: { version: next },
    });
    return { current: this.currentPolicy };
  }

  async founderOverridePut(input: {
    engaged: boolean;
    reason: string;
    adminId: string;
    adminRole: string | null;
  }): Promise<FounderOverrideState> {
    if (input.adminRole !== "founder" && input.adminRole !== "super") {
      throw new ForbiddenException("FOUNDER_OVERRIDE_DENIED");
    }
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason must be ≥10 characters");
    }
    this.founderOverride = {
      engaged: input.engaged === true,
      reason: input.reason.trim(),
      adminId: input.adminId,
      at: new Date().toISOString(),
    };
    await this.audit.record({
      action: "founder.override",
      outcome: "applied",
      actorAdminId: input.adminId,
      actorRole: input.adminRole,
      capability: "founderOverride",
      reason: input.reason.trim(),
      after: { engaged: this.founderOverride.engaged },
    });
    return this.founderOverride;
  }

  founderOverrideState() {
    return this.founderOverride;
  }
}
