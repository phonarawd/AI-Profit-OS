/**
 * GET /api/v1/growth/public-surface — read-only · auth optional
 * UI PART9g · Admin PATCH Owns=04 Admin (apps/admin 코드 0)
 */

import { Controller, Get } from "@nestjs/common";
import { GROWTH_PUBLIC_ROUTES } from "./growth.routes";
import { GrowthPublicService } from "./growth-public.service";

@Controller()
export class GrowthPublicController {
  constructor(private readonly growth: GrowthPublicService) {}

  @Get(GROWTH_PUBLIC_ROUTES.publicSurface)
  getPublicSurface() {
    return this.growth.getPublicSurface();
  }
}
