/**
 * REL-224 소스 건강/정책 버전 · /api/v1/admin/source-policy/*
 * 이력 없는 덮어쓰기 0. Founder override = super + HIGH. 사이드바 13번째 0.
 */

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import type { RequestWithAdmin } from "../common/admin.guard";
import { SOURCE_POLICY_ROUTES } from "./source-policy.routes";
import { SourcePolicyService } from "./source-policy.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class SourcePolicyAdminController {
  constructor(private readonly policy: SourcePolicyService) {}

  @Get(SOURCE_POLICY_ROUTES.health)
  health() {
    return this.policy.health();
  }

  @Get(SOURCE_POLICY_ROUTES.versions)
  versions(@Query("policyKey") policyKey?: string) {
    return this.policy.versions(policyKey);
  }

  @Post(SOURCE_POLICY_ROUTES.publish)
  publish(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.policy.publish({
      policyKey: String(body.policyKey ?? ""),
      label: String(body.label ?? ""),
      payload:
        body.payload && typeof body.payload === "object"
          ? (body.payload as Record<string, unknown>)
          : {},
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }

  @Post(SOURCE_POLICY_ROUTES.rollback)
  rollback(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.policy.rollback({
      policyKey: String(body.policyKey ?? ""),
      toLabel: String(body.toLabel ?? ""),
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }

  @Post(SOURCE_POLICY_ROUTES.founderOverride)
  founderOverride(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.policy.founderOverride({
      label: String(body.label ?? ""),
      payload:
        body.payload && typeof body.payload === "object"
          ? (body.payload as Record<string, unknown>)
          : {},
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      role: req.admin?.role ?? "unknown",
    });
  }
}
