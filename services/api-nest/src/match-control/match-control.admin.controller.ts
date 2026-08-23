/**
 * REL-223 수동 매칭/대량 · /api/v1/admin/match-controls/*
 * 허용 동사만. 잔액 수정 핸들러 0. 사이드바 13번째 0.
 */

import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import type { RequestWithAdmin } from "../common/admin.guard";
import { MATCH_CONTROL_ROUTES } from "./match-control.routes";
import { MatchControlService } from "./match-control.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class MatchControlAdminController {
  constructor(private readonly match: MatchControlService) {}

  @Get(MATCH_CONTROL_ROUTES.verbs)
  verbs() {
    return this.match.verbs();
  }

  @Post(MATCH_CONTROL_ROUTES.preview)
  preview(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.match.preview({
      verb: String(body.verb ?? ""),
      kind: String(body.kind ?? ""),
      mode: String(body.mode ?? ""),
      impactCount:
        body.impactCount == null ? undefined : Number(body.impactCount),
      targetId: body.targetId == null ? undefined : String(body.targetId),
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }

  @Post(MATCH_CONTROL_ROUTES.confirm)
  confirm(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.match.confirm({
      id: String(body.id ?? ""),
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }

  @Post(MATCH_CONTROL_ROUTES.apply)
  apply(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.match.apply({
      id: String(body.id ?? ""),
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }
}
