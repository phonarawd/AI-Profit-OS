import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { SimulationAdminService } from "./simulation.admin.service";
import { SIMULATION_ADMIN_ROUTES } from "./simulation.routes";
import type {
  GrowthEnabledPutInput,
  SimulationRunRequest,
} from "./simulation.types";

/**
 * Admin /admin/growth?tab=simulation · /api/v1/admin/simulation/*
 * Auth/RBAC = AdminGuard (deny-by-default · schemas/admin-rbac.v1.json).
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class SimulationAdminController {
  constructor(private readonly simulation: SimulationAdminService) {}

  @Post(SIMULATION_ADMIN_ROUTES.run)
  run(@Body() body: Record<string, unknown> = {}) {
    const input: SimulationRunRequest = {
      opportunityPublishRate:
        typeof body.opportunityPublishRate === "number"
          ? body.opportunityPublishRate
          : undefined,
      spreadDistribution: body.spreadDistribution as SimulationRunRequest["spreadDistribution"],
      payoutFeasibilityScore:
        typeof body.payoutFeasibilityScore === "number"
          ? body.payoutFeasibilityScore
          : undefined,
      worstCasePlatformDrainUsdt:
        body.worstCasePlatformDrainUsdt != null
          ? String(body.worstCasePlatformDrainUsdt)
          : undefined,
      uxDisplayAccuracy:
        body.uxDisplayAccuracy as SimulationRunRequest["uxDisplayAccuracy"],
      adapterMatchFailureRate:
        typeof body.adapterMatchFailureRate === "number"
          ? body.adapterMatchFailureRate
          : undefined,
      feasibility: body.feasibility as SimulationRunRequest["feasibility"],
      opportunities: body.opportunities as SimulationRunRequest["opportunities"],
      createdByAdminId:
        body.createdByAdminId != null
          ? String(body.createdByAdminId)
          : undefined,
    };
    return this.simulation.run(input);
  }

  @Get(SIMULATION_ADMIN_ROUTES.latest)
  latest() {
    return this.simulation.latest();
  }

  @Get(SIMULATION_ADMIN_ROUTES.growthGate)
  growthGate() {
    return this.simulation.growthGate();
  }

  @Get(SIMULATION_ADMIN_ROUTES.growthEnabled)
  getGrowthEnabled() {
    return this.simulation.getGrowthEnabled();
  }

  @Patch(SIMULATION_ADMIN_ROUTES.growthEnabled)
  putGrowthEnabled(@Body() body: Record<string, unknown>) {
    const input: GrowthEnabledPutInput = {
      enabled: body.enabled === true,
      updatedByAdminId: String(body.updatedByAdminId ?? ""),
      changeReason: String(body.changeReason ?? ""),
    };
    return this.simulation.putGrowthEnabled(input);
  }
}
