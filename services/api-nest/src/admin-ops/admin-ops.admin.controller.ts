/**
 * REL-222 3-mode · /api/v1/admin/ops/*
 * LIVE 는 confirm 없이 apply 불가. 유저 JWT mint 0. 사이드바 13번째 0.
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import type { RequestWithAdmin } from "../common/admin.guard";
import { ADMIN_OPS_ROUTES } from "./admin-ops.routes";
import { AdminOpsService } from "./admin-ops.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class AdminOpsAdminController {
  constructor(private readonly ops: AdminOpsService) {}

  @Get(ADMIN_OPS_ROUTES.modes)
  modes() {
    return this.ops.modes();
  }

  @Post(ADMIN_OPS_ROUTES.preview)
  preview(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.ops.preview({
      family: String(body.family ?? ""),
      mode: String(body.mode ?? ""),
      impactCount: Number(body.impactCount ?? 0),
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }

  @Post(ADMIN_OPS_ROUTES.confirm)
  confirm(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.ops.confirm({
      id: String(body.id ?? ""),
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }

  @Post(ADMIN_OPS_ROUTES.apply)
  apply(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.ops.apply({
      id: String(body.id ?? ""),
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }

  @Post(ADMIN_OPS_ROUTES.rollback)
  rollback(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.ops.rollback({
      id: String(body.id ?? ""),
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }

  @Get(ADMIN_OPS_ROUTES.previewAsUser)
  previewAsUser(
    @Param("userId") userId: string,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.ops.previewAsUser({
      userId,
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }
}
