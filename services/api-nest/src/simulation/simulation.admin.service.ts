/**
 * Engine §51.4 — M0.5 run/latest · Growth ON gate
 * Admin UI = /admin/growth?tab=simulation
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdaptersAdminService } from "../adapters/adapters.admin.service";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { PlatformReserveAdminService } from "./platform-reserve.admin.service";
import {
  buildSimulationReport,
  evaluateGrowthEnableGate,
  payoutFeasible,
} from "./simulation.engine";
import {
  GROWTH_EVENTS,
  SIMULATION_EVENTS,
} from "./simulation.events";
import type {
  GrowthEnabledPutInput,
  SimulationRunRequest,
} from "./simulation.types";

type RunRow = {
  id: string;
  run_id: string;
  as_of: Date;
  report: unknown;
  gates: unknown;
  overall_pass: boolean;
  platform_reserve_usdt: string | null;
  platform_reserve_is_set: boolean;
  created_by_admin_id: string | null;
  created_at: Date;
};

@Injectable()
export class SimulationAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
    private readonly reserve: PlatformReserveAdminService,
    private readonly adapters: AdaptersAdminService,
  ) {}

  async run(input: SimulationRunRequest = {}) {
    const reserve = await this.reserve.asS2Input();

    // S4 KPI 입력 — body override, else live adapters KPI
    let adapterMatchFailureRate = input.adapterMatchFailureRate;
    if (typeof adapterMatchFailureRate !== "number") {
      const s4 = this.adapters.simulationS4Input();
      adapterMatchFailureRate = s4.adapterMatchFailureRate;
    }

    const built = buildSimulationReport(
      {
        ...input,
        adapterMatchFailureRate,
      },
      reserve,
    );

    const saved = await this.db.withTransaction(async (client) => {
      const ins = await client.query<RunRow>(
        `INSERT INTO public.simulation_runs (
           run_id, as_of, horizon_hours, report, gates, overall_pass,
           platform_reserve_usdt, platform_reserve_is_set, created_by_admin_id
         ) VALUES (
           $1, $2::timestamptz, 24, $3::jsonb, $4::jsonb, $5,
           $6::numeric, $7, $8::uuid
         )
         RETURNING id::text, run_id, as_of, report, gates, overall_pass,
                   platform_reserve_usdt::text, platform_reserve_is_set,
                   created_by_admin_id::text, created_at`,
        [
          built.report.runId,
          built.report.asOf,
          JSON.stringify(built.report),
          JSON.stringify(built.gates),
          built.gates.overallPass,
          reserve.isSet ? reserve.targetUsdt : null,
          reserve.isSet,
          input.createdByAdminId || null,
        ],
      );
      return ins.rows[0];
    });

    const payload = this.toResponse(saved);
    this.bus.emit(SIMULATION_EVENTS.completed, payload);
    return payload;
  }

  async latest() {
    const r = await this.db.query<RunRow>(
      `SELECT id::text, run_id, as_of, report, gates, overall_pass,
              platform_reserve_usdt::text, platform_reserve_is_set,
              created_by_admin_id::text, created_at
         FROM public.simulation_runs
        ORDER BY as_of DESC
        LIMIT 1`,
    );
    if (!r.rows[0]) {
      throw new NotFoundException("no simulation run");
    }
    return this.toResponse(r.rows[0]);
  }

  async latestOrNull() {
    try {
      return await this.latest();
    } catch {
      return null;
    }
  }

  /** R8 — simulation.payoutFeasible(opportunityId) */
  async payoutFeasibleFor(opportunityId: string): Promise<boolean> {
    const latest = await this.latestOrNull();
    const report = latest?.report as
      | { feasibility?: Array<{ opportunityId: string; payoutFeasible: boolean }> }
      | undefined;
    return payoutFeasible(opportunityId, report?.feasibility);
  }

  async growthGate() {
    const latest = await this.latestOrNull();
    const reserve = await this.reserve.asS2Input();
    const gate = evaluateGrowthEnableGate({
      latest: latest
        ? { overallPass: latest.overallPass, asOf: latest.asOf }
        : null,
      reserveIsSet: reserve.isSet,
    });
    const growth = await this.getGrowthEnabled();
    return {
      ...gate,
      growthEnabled: growth.enabled,
      latest: latest
        ? {
            runId: latest.runId,
            asOf: latest.asOf,
            overallPass: latest.overallPass,
          }
        : null,
      reserveIsSet: reserve.isSet,
    };
  }

  async getGrowthEnabled() {
    const r = await this.db.query<{
      enabled: boolean;
      updated_by_admin_id: string | null;
      change_reason: string | null;
      updated_at: Date;
    }>(
      `SELECT enabled, updated_by_admin_id::text, change_reason, updated_at
         FROM public.growth_control WHERE id = 1`,
    );
    const row = r.rows[0];
    return {
      enabled: row?.enabled === true,
      updatedByAdminId: row?.updated_by_admin_id ?? null,
      changeReason: row?.change_reason ?? null,
      updatedAt: row?.updated_at ? row.updated_at.toISOString() : null,
    };
  }

  async putGrowthEnabled(input: GrowthEnabledPutInput) {
    if (!input.updatedByAdminId || input.updatedByAdminId.length < 1) {
      throw new BadRequestException("updatedByAdminId required");
    }
    if (!input.changeReason || input.changeReason.trim().length < 4) {
      throw new BadRequestException("changeReason minLength 4");
    }
    if (typeof input.enabled !== "boolean") {
      throw new BadRequestException("enabled boolean required");
    }

    const gate = await this.growthGate();
    if (input.enabled === true && gate.allowed !== true) {
      throw new BadRequestException({
        message: "Growth ON blocked — simulation PASS ≤24h + platform_reserve required",
        code: "GROWTH_GATE_BLOCKED",
        reasons: gate.reasons,
      });
    }

    const previous = await this.getGrowthEnabled();
    await this.db.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.growth_control (id, enabled, updated_by_admin_id, change_reason, updated_at)
         VALUES (1, $1, $2::uuid, $3, now())
         ON CONFLICT (id) DO UPDATE SET
           enabled = EXCLUDED.enabled,
           updated_by_admin_id = EXCLUDED.updated_by_admin_id,
           change_reason = EXCLUDED.change_reason,
           updated_at = now()`,
        [input.enabled, input.updatedByAdminId, input.changeReason.trim()],
      );
      await client.query(
        `INSERT INTO public.growth_control_audit
           (previous_enabled, next_enabled, gate_snapshot, changed_by_admin_id, change_reason)
         VALUES ($1, $2, $3::jsonb, $4::uuid, $5)`,
        [
          previous.enabled,
          input.enabled,
          JSON.stringify({
            allowed: gate.allowed,
            reasons: gate.reasons,
            latest: gate.latest,
            reserveIsSet: gate.reserveIsSet,
          }),
          input.updatedByAdminId,
          input.changeReason.trim(),
        ],
      );
    });

    const next = await this.getGrowthEnabled();
    this.bus.emit(GROWTH_EVENTS.enabled, {
      previous: previous.enabled,
      next: next.enabled,
      gate,
      changedByAdminId: input.updatedByAdminId,
    });
    return { ...next, gate };
  }

  private toResponse(row: RunRow) {
    return {
      id: row.id,
      runId: row.run_id,
      asOf: row.as_of instanceof Date ? row.as_of.toISOString() : String(row.as_of),
      report: row.report,
      gates: row.gates,
      overallPass: row.overall_pass === true,
      platformReserveUsdt: row.platform_reserve_usdt,
      platformReserveIsSet: row.platform_reserve_is_set === true,
      createdByAdminId: row.created_by_admin_id,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}
