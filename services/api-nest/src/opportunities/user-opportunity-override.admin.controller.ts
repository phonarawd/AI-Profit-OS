import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
} from "@nestjs/common";
import { OPPORTUNITY_ADMIN_ROUTES } from "./opportunities.routes";
import type { CapitalBand } from "./opportunities.types";
import { UserOpportunityOverrideAdminService } from "./user-opportunity-override.admin.service";

/**
 * Admin §9.8.9 HTTP · /api/v1/admin/users/:id/opportunity-overrides/*
 * UI = /admin/users/:id?tab=opportunities · Auth/RBAC = Admin todos.
 * ledgerMutated always false.
 */
@Controller("admin")
export class UserOpportunityOverrideAdminController {
  constructor(
    private readonly overrides: UserOpportunityOverrideAdminService,
  ) {}

  @Get(OPPORTUNITY_ADMIN_ROUTES.userOverrides)
  list(@Param("id") id: string) {
    return this.overrides.list(id);
  }

  @Put(OPPORTUNITY_ADMIN_ROUTES.userOverrideByOpp)
  upsert(
    @Param("id") id: string,
    @Param("opportunityId") opportunityId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.overrides.upsert(id, opportunityId, {
      hidden: body.hidden === true,
      forceShow: body.forceShow === true,
      pinOrder:
        body.pinOrder === null || body.pinOrder === undefined
          ? null
          : Number(body.pinOrder),
      marginPctOverride:
        body.marginPctOverride != null
          ? String(body.marginPctOverride)
          : null,
      expectedProfitUsdtOverride:
        body.expectedProfitUsdtOverride != null
          ? String(body.expectedProfitUsdtOverride)
          : null,
      capitalBandForce:
        body.capitalBandForce != null
          ? (String(body.capitalBandForce) as CapitalBand)
          : null,
      reason: String(body.reason ?? ""),
      updatedByAdminId: String(
        body.updatedByAdminId ?? body.adminId ?? "",
      ),
    });
  }

  @Delete(OPPORTUNITY_ADMIN_ROUTES.userOverrideByOpp)
  remove(
    @Param("id") id: string,
    @Param("opportunityId") opportunityId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.overrides.remove(id, opportunityId, {
      reason: String(body.reason ?? ""),
      updatedByAdminId: String(
        body.updatedByAdminId ?? body.adminId ?? "",
      ),
    });
  }
}
