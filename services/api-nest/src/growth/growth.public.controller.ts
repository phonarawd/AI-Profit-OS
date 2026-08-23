/**
 * GET /api/v1/growth/public-surface — read-only · auth optional
 * UI PART9g · Admin PATCH Owns=04 Admin (apps/admin 코드 0)
 */

import { Controller, Get } from "@nestjs/common";
import { KillSwitchService } from "../kill-switch/kill-switch.service";
import { GROWTH_PUBLIC_ROUTES } from "./growth.routes";
import { GrowthPublicService } from "./growth-public.service";

@Controller()
export class GrowthPublicController {
  constructor(
    private readonly growth: GrowthPublicService,
    private readonly killSwitch: KillSwitchService,
  ) {}

  @Get(GROWTH_PUBLIC_ROUTES.publicSurface)
  async getPublicSurface() {
    if (await this.killSwitch.isBlocked("growth")) {
      return {
        tickerMode: "off",
        counterMode: "off",
        ledgerTotal: 0,
        events: [],
        asOf: new Date().toISOString(),
      };
    }
    return this.growth.getPublicSurface();
  }
}
