import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AiLogsAdminService } from "./ai-logs.admin.service";
import { AI_LOGS_ADMIN_ROUTES } from "./ai.routes";
import type { AiEvalRunRequest } from "./ai.types";

/**
 * Admin /admin/ai-logs · /api/v1/admin/ai-logs/*
 * Auth/RBAC = AdminGuard (deny-by-default · schemas/admin-rbac.v1.json).
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class AiLogsAdminController {
  constructor(private readonly logs: AiLogsAdminService) {}

  @Get(AI_LOGS_ADMIN_ROUTES.evalStatus)
  evalStatus() {
    return this.logs.evalStatus();
  }

  @Get(AI_LOGS_ADMIN_ROUTES.coach)
  coach() {
    return this.logs.coachCatalog();
  }

  @Post(AI_LOGS_ADMIN_ROUTES.evalRun)
  evalRun(@Body() body: Record<string, unknown> = {}) {
    const input: AiEvalRunRequest = {
      modelId: String(body.modelId ?? ""),
      version: String(body.version ?? ""),
      accuracy:
        typeof body.accuracy === "number" ? body.accuracy : undefined,
      piiLeakRate:
        typeof body.piiLeakRate === "number" ? body.piiLeakRate : undefined,
      moneyHallucinationRate:
        typeof body.moneyHallucinationRate === "number"
          ? body.moneyHallucinationRate
          : undefined,
      l3MoneyActionRate:
        typeof body.l3MoneyActionRate === "number"
          ? body.l3MoneyActionRate
          : undefined,
      autoLearningRequested: body.autoLearningRequested === true,
      promoteOnPass: body.promoteOnPass === true,
    };
    return this.logs.evalRun(input);
  }

  @Get(AI_LOGS_ADMIN_ROUTES.list)
  list(@Query("limit") limit?: string) {
    return this.logs.list(limit ? Number(limit) : 50);
  }

  @Get(AI_LOGS_ADMIN_ROUTES.get)
  get(@Param("id") id: string) {
    return this.logs.get(id);
  }
}
