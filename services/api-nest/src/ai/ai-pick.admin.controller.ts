import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AiPickAdminService } from "./ai-pick.admin.service";
import { AI_PICK_ADMIN_ROUTES } from "./ai.routes";
import type { AiPickScoreRequest } from "./ai.types";

@UseGuards(AdminGuard)
@Controller("admin")
export class AiPickAdminController {
  constructor(private readonly pick: AiPickAdminService) {}

  @Post(AI_PICK_ADMIN_ROUTES.score)
  score(@Body() body: Record<string, unknown> = {}) {
    const input: AiPickScoreRequest = {
      user: body.user as AiPickScoreRequest["user"],
      market: body.market as AiPickScoreRequest["market"],
      opportunity: body.opportunity as AiPickScoreRequest["opportunity"],
      now: body.now != null ? String(body.now) : undefined,
      persist: body.persist === true,
    };
    return this.pick.score(input, body);
  }

  @Get(AI_PICK_ADMIN_ROUTES.recent)
  recent(@Query("limit") limit?: string) {
    return this.pick.recent(limit ? Number(limit) : 20);
  }
}
