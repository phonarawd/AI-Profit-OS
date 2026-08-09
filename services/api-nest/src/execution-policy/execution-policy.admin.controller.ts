import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  Query,
} from "@nestjs/common";
import { ExecutionPolicyAdminService } from "./execution-policy.admin.service";
import { EXECUTION_POLICY_ADMIN_ROUTES } from "./execution-policy.routes";
import type {
  ExecutionPolicyPutInput,
  MatchStrictness,
} from "./execution-policy.types";

/**
 * Admin /admin/execution-policy · /api/v1/admin/execution-policy*
 * UI Owns=Admin §48.6 · map/Rule Owns=Engine §48.13.3
 * Auth/RBAC guard lands with Admin todos — contracts locked here.
 */
@Controller("admin")
export class ExecutionPolicyAdminController {
  constructor(private readonly policy: ExecutionPolicyAdminService) {}

  @Get(EXECUTION_POLICY_ADMIN_ROUTES.get)
  get() {
    return this.policy.get();
  }

  @Put(EXECUTION_POLICY_ADMIN_ROUTES.put)
  put(@Body() body: Record<string, unknown>) {
    if (
      body &&
      typeof body === "object" &&
      "successRatePercent" in body
    ) {
      throw new BadRequestException("successRatePercent FORBIDDEN");
    }
    const input: ExecutionPolicyPutInput = {
      matchStrictness: String(body.matchStrictness ?? "") as MatchStrictness,
      minProfitUsdt:
        body.minProfitUsdt != null ? String(body.minProfitUsdt) : undefined,
      staleAllowanceSec:
        body.staleAllowanceSec != null
          ? Number(body.staleAllowanceSec)
          : undefined,
      maxRematchCount:
        body.maxRematchCount != null
          ? Number(body.maxRematchCount)
          : undefined,
      retryWaitSec:
        body.retryWaitSec != null ? Number(body.retryWaitSec) : undefined,
      slippageBoundBps:
        body.slippageBoundBps != null
          ? Number(body.slippageBoundBps)
          : undefined,
      dailyUserMatchCap:
        body.dailyUserMatchCap != null
          ? Number(body.dailyUserMatchCap)
          : undefined,
      dailyOppSlotsDefault:
        body.dailyOppSlotsDefault != null
          ? Number(body.dailyOppSlotsDefault)
          : undefined,
      autoCancelOnShortfall:
        typeof body.autoCancelOnShortfall === "boolean"
          ? body.autoCancelOnShortfall
          : undefined,
      membershipBandOverlayEnabled:
        typeof body.membershipBandOverlayEnabled === "boolean"
          ? body.membershipBandOverlayEnabled
          : undefined,
      feed: body.feed as ExecutionPolicyPutInput["feed"],
      presentation:
        body.presentation as ExecutionPolicyPutInput["presentation"],
      updatedByAdminId: String(body.updatedByAdminId ?? ""),
      changeReason: String(body.changeReason ?? ""),
    };
    return this.policy.put(input);
  }

  @Get(EXECUTION_POLICY_ADMIN_ROUTES.statsToday)
  statsToday() {
    return this.policy.statsToday();
  }

  @Get(EXECUTION_POLICY_ADMIN_ROUTES.audit)
  audit(@Query("limit") limitRaw?: string) {
    return this.policy.listAudit(
      limitRaw ? Number(limitRaw) : undefined,
    );
  }
}
