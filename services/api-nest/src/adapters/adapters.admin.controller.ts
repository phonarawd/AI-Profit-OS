import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdaptersAdminService } from "./adapters.admin.service";
import { ADAPTER_ADMIN_ROUTES } from "./adapters.routes";
import type { AdapterMatchAttemptBody } from "./adapters.types";

/**
 * Admin adapters · /api/v1/admin/adapters/*
 * UI = /admin/adapters · Auth/RBAC = AdminGuard (admin-rbac.v1).
 * §51.15 matching KPI · yahoo0 · Simulation S4 선행
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class AdaptersAdminController {
  constructor(private readonly adapters: AdaptersAdminService) {}

  @Get(ADAPTER_ADMIN_ROUTES.listingLegs)
  listingLegs() {
    return this.adapters.listingLegs();
  }

  @Get(ADAPTER_ADMIN_ROUTES.matchingKpi)
  matchingKpi() {
    return this.adapters.matchingKpi();
  }

  @Get(ADAPTER_ADMIN_ROUTES.simulationS4)
  simulationS4() {
    return this.adapters.simulationS4Input();
  }

  @Post(ADAPTER_ADMIN_ROUTES.recordMatchAttempts)
  recordMatchAttempts(
    @Body()
    body: {
      attempts?: AdapterMatchAttemptBody[];
      adapterId?: string;
    },
  ) {
    return this.adapters.recordMatchAttempts(body?.attempts ?? [], {
      adapterId: body?.adapterId,
    });
  }

  @Get(ADAPTER_ADMIN_ROUTES.identityReviewQueue)
  identityReviewQueue() {
    return this.adapters.identityReviewQueue();
  }

  @Get(ADAPTER_ADMIN_ROUTES.list)
  list() {
    return this.adapters.listHealth();
  }

  @Get(ADAPTER_ADMIN_ROUTES.get)
  get(@Param("adapterId") adapterId: string) {
    return this.adapters.getHealth(adapterId);
  }
}
