/**
 * Admin §9.8.8d HTTP pointer — POST/GET /api/v1/admin/users/:id/ops-messages
 * Deep Admin UI Owns=04 Admin · this is Nest contract for verify:ops-inbox
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { OPS_INBOX_ADMIN_ROUTES } from "./inbox.user.routes";
import { OpsInboxService } from "./ops-inbox.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class OpsInboxAdminController {
  constructor(private readonly inbox: OpsInboxService) {}

  @Post(OPS_INBOX_ADMIN_ROUTES.send)
  send(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.inbox.sendToUser(id, {
      template: String(body.template ?? ""),
      titleKo: String(body.titleKo ?? ""),
      bodyKo: String(body.bodyKo ?? ""),
      href: body.href != null ? String(body.href) : undefined,
      createdByAdminId: operatorId,
      sourceEventId:
        body.sourceEventId != null ? String(body.sourceEventId) : undefined,
    });
  }

  @Get(OPS_INBOX_ADMIN_ROUTES.list)
  list(@Param("id") id: string) {
    return this.inbox.listForUser(id);
  }
}
