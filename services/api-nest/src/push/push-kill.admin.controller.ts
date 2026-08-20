/**
 * REL-020 Admin push kill 계약.
 * UI Owns=REL-213 /admin/system-control. 유저 JWT 200 금지.
 */

import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { PUSH_ADMIN_ROUTES } from "./push.routes";
import { PushKillService } from "./push-kill.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class PushKillAdminController {
  constructor(private readonly kill: PushKillService) {}

  @Get(PUSH_ADMIN_ROUTES.get)
  get() {
    return this.kill.getState();
  }

  @Put(PUSH_ADMIN_ROUTES.put)
  put(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.kill.putEnabled({
      pushEnabled: body.pushEnabled === true,
      reason: String(body.reason ?? ""),
      adminId: operatorId,
    });
  }
}
