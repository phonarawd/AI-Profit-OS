import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { ReferralClawbackService } from "./referral.clawback.service";
import { ReferralEdgeService } from "./referral.edge.service";
import { ReferralLadderService } from "./referral.ladder.service";
import { ReferralPoolService } from "./referral.pool.service";
import { ReferralProgramService } from "./referral.program.service";
import { REFERRAL_ADMIN_ROUTES } from "./referral.routes";
import type { ReferralProgramPatchInput } from "./referral.types";

/**
 * Admin /admin/growth?tab=referral HTTP · /api/v1/admin/growth/referral/*
 * FORBIDDEN UI contract: monthly invite-count cap field (verify:referral-unlimited-invites)
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class ReferralAdminController {
  constructor(
    private readonly program: ReferralProgramService,
    private readonly pool: ReferralPoolService,
    private readonly edges: ReferralEdgeService,
    private readonly ladder: ReferralLadderService,
    private readonly clawback: ReferralClawbackService,
  ) {}

  @Get(REFERRAL_ADMIN_ROUTES.program)
  getProgram() {
    return this.program.get();
  }

  @Patch(REFERRAL_ADMIN_ROUTES.program)
  patchProgram(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    // Explicitly reject invite-count cap if client sends it
    if ("capPerReferrerMonth" in body) {
      throw new BadRequestException(
        "FORBIDDEN: capPerReferrerMonth — invite count unlimited (§51.5)",
      );
    }
    const input: ReferralProgramPatchInput = {
      updatedByAdminId: operatorId,
      changeReason: String(body.changeReason ?? ""),
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      rewardsEnabled:
        typeof body.rewardsEnabled === "boolean"
          ? body.rewardsEnabled
          : undefined,
      accrualHalted:
        typeof body.accrualHalted === "boolean"
          ? body.accrualHalted
          : undefined,
      l2ReferrerPct:
        typeof body.l2ReferrerPct === "string" ? body.l2ReferrerPct : undefined,
      l2ReferrerHardCapUsdt:
        typeof body.l2ReferrerHardCapUsdt === "string"
          ? body.l2ReferrerHardCapUsdt
          : undefined,
      l3ReferrerFlatUsdt:
        typeof body.l3ReferrerFlatUsdt === "string"
          ? body.l3ReferrerFlatUsdt
          : undefined,
      l3ReferrerHardCapUsdt:
        typeof body.l3ReferrerHardCapUsdt === "string"
          ? body.l3ReferrerHardCapUsdt
          : undefined,
      clawbackHoursL2:
        typeof body.clawbackHoursL2 === "number"
          ? body.clawbackHoursL2
          : undefined,
      minRefereeDepositUsdt:
        typeof body.minRefereeDepositUsdt === "string"
          ? body.minRefereeDepositUsdt
          : undefined,
      sharePerUserPerDay:
        typeof body.sharePerUserPerDay === "number"
          ? body.sharePerUserPerDay
          : undefined,
      promoPoolTopUpPolicy:
        body.promoPoolTopUpPolicy === "manual" ||
        body.promoPoolTopUpPolicy === "pct_of_prior_week_margin"
          ? body.promoPoolTopUpPolicy
          : undefined,
    };
    return this.program.patch(input);
  }

  @Get(REFERRAL_ADMIN_ROUTES.programAudit)
  audit(@Query("limit") limitRaw?: string) {
    return this.program.listAudit({
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
  }

  @Get(REFERRAL_ADMIN_ROUTES.poolStatus)
  poolStatus() {
    return this.pool.getStatus();
  }

  @Post(REFERRAL_ADMIN_ROUTES.poolTopUp)
  poolTopUp(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.pool.topUp({
      amountUsdt: String(body.amountUsdt ?? ""),
      updatedByAdminId: operatorId,
      changeReason: String(body.changeReason ?? body.reason ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Get(REFERRAL_ADMIN_ROUTES.holdQueue)
  holdQueue(@Query("limit") limitRaw?: string) {
    return this.edges.listHoldQueue({
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
  }

  @Post(REFERRAL_ADMIN_ROUTES.release)
  release(
    @Param("edgeId") edgeId: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.ladder.adminRelease({
      edgeId,
      adminId: operatorId,
      reason: String(body.reason ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Post(REFERRAL_ADMIN_ROUTES.clawback)
  clawbackEdge(
    @Param("edgeId") edgeId: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.clawback.clawback({
      edgeId,
      adminId: operatorId,
      reason: String(body.reason ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Post(REFERRAL_ADMIN_ROUTES.accrualHalt)
  accrualHalt(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.program.setAccrualHalt({
      halted: Boolean(body.halted ?? body.accrualHalted ?? true),
      updatedByAdminId: operatorId,
      changeReason: String(body.changeReason ?? body.reason ?? ""),
    });
  }

  @Get(REFERRAL_ADMIN_ROUTES.userEdges)
  userEdges(@Param("userId") userId: string) {
    return this.edges.listByReferrer(userId);
  }
}
