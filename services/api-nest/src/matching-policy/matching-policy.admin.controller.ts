import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { MatchingPolicyAdminService } from "./matching-policy.admin.service";
import { MATCHING_POLICY_ADMIN_ROUTES } from "./matching-policy.routes";

@UseGuards(AdminGuard)
@Controller("admin")
export class MatchingPolicyAdminController {
  constructor(private readonly policies: MatchingPolicyAdminService) {}

  @Get(MATCHING_POLICY_ADMIN_ROUTES.getEffective)
  getEffective(@Param("id") id: string) {
    return this.policies.getEffective(id);
  }

  @Post(MATCHING_POLICY_ADMIN_ROUTES.preview)
  preview(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.policies.preview(id, body);
  }

  @Put(MATCHING_POLICY_ADMIN_ROUTES.putVersion)
  putVersion(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.policies.putVersion(id, body, operatorId);
  }

  @Post(MATCHING_POLICY_ADMIN_ROUTES.pause)
  pause(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.policies.setPaused(id, true, body, operatorId);
  }

  @Post(MATCHING_POLICY_ADMIN_ROUTES.resume)
  resume(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.policies.setPaused(id, false, body, operatorId);
  }

  @Post(MATCHING_POLICY_ADMIN_ROUTES.assign)
  assign(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.policies.assign(id, body, operatorId, "include");
  }

  @Post(MATCHING_POLICY_ADMIN_ROUTES.exclude)
  exclude(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.policies.assign(id, body, operatorId, "exclude");
  }

  @Post(MATCHING_POLICY_ADMIN_ROUTES.bulkDryRun)
  bulkDryRun(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.policies.bulkDryRun(id, body);
  }

  @Post(MATCHING_POLICY_ADMIN_ROUTES.bulkApply)
  bulkApply(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.policies.bulkApply(id, body, operatorId);
  }

  @Get(MATCHING_POLICY_ADMIN_ROUTES.listAudit)
  listAudit(@Param("id") id: string) {
    return this.policies.listAudit(id);
  }
}
