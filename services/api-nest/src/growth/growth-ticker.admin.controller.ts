import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { GrowthPublicService } from "./growth-public.service";
import { GROWTH_ADMIN_ROUTES } from "./growth.routes";

/**
 * Admin G4 · /admin/growth?tab=ticker · /api/v1/admin/growth/ticker
 * SoT = public.growth_ticker_config (동일 오너 · 평행 엔진 0)
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class GrowthTickerAdminController {
  constructor(private readonly growth: GrowthPublicService) {}

  @Get(GROWTH_ADMIN_ROUTES.ticker)
  get() {
    return this.growth.getTickerConfig();
  }

  @Patch(GROWTH_ADMIN_ROUTES.ticker)
  patch(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.growth.patchTickerConfig({
      tickerMode: body.tickerMode,
      counterMode: body.counterMode,
      updatedByAdminId: operatorId,
      changeReason: String(body.changeReason ?? ""),
    });
  }
}
