import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { ShadowReplayAdminService } from "./shadow-replay.admin.service";
import { SHADOW_REPLAY_ADMIN_ROUTES } from "./ai.routes";
import type { ShadowReplayRunRequest } from "./ai.types";

@UseGuards(AdminGuard)
@Controller("admin")
export class ShadowReplayAdminController {
  constructor(private readonly shadow: ShadowReplayAdminService) {}

  @Post(SHADOW_REPLAY_ADMIN_ROUTES.run)
  run(@Body() body: Record<string, unknown> = {}) {
    const input: ShadowReplayRunRequest = {
      createdByAdminId:
        body.createdByAdminId != null
          ? String(body.createdByAdminId)
          : undefined,
      runId: body.runId != null ? String(body.runId) : undefined,
    };
    return this.shadow.run(input);
  }

  @Get(SHADOW_REPLAY_ADMIN_ROUTES.latest)
  latest() {
    return this.shadow.latest();
  }
}
