import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { MoneyCircuitService } from "./money-circuit.service";
import { RISK_ADMIN_ROUTES } from "./risk.routes";
import { RiskService } from "./risk.service";
import type { RiskStatus } from "./risk.types";

/**
 * Admin /admin/risk?tab=queue HTTP surface · /api/v1/admin/risk/*
 * UI tab mapping Owns=Admin shell · API+signals Owns=Money §49.9
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class RiskAdminController {
  constructor(
    private readonly risk: RiskService,
    private readonly circuit: MoneyCircuitService,
  ) {}

  @Get(RISK_ADMIN_ROUTES.queue)
  queue(
    @Query("status") status?: string,
    @Query("limit") limitRaw?: string,
  ) {
    return this.risk.listQueue({
      status,
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
  }

  @Get(RISK_ADMIN_ROUTES.catalog)
  catalog() {
    return this.risk.catalog();
  }

  @Get(RISK_ADMIN_ROUTES.circuit)
  circuitState() {
    return this.circuit.getState();
  }

  @Post(RISK_ADMIN_ROUTES.circuitClose)
  circuitClose(
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.circuit.close({
      adminId: operatorId,
      reason: String(body.reason ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Get(RISK_ADMIN_ROUTES.userState)
  userState(@Param("userId") userId: string) {
    return this.risk.getUserState(userId);
  }

  @Post(RISK_ADMIN_ROUTES.userFreeze)
  freeze(
    @Param("userId") userId: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.risk.setUserStatus({
      userId,
      status: "frozen",
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
      signalId:
        typeof body.signalId === "string" ? body.signalId : undefined,
    });
  }

  @Post(RISK_ADMIN_ROUTES.userUnfreeze)
  unfreeze(
    @Param("userId") userId: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.risk.setUserStatus({
      userId,
      status: "active",
      reason: String(body.reason ?? "unfreeze after review"),
      adminId: operatorId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
      signalId:
        typeof body.signalId === "string" ? body.signalId : undefined,
    });
  }

  @Post(RISK_ADMIN_ROUTES.userRestrict)
  restrict(
    @Param("userId") userId: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.risk.setUserStatus({
      userId,
      status: "restricted" satisfies RiskStatus,
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Post(RISK_ADMIN_ROUTES.userFlag)
  flag(
    @Param("userId") userId: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.risk.setUserStatus({
      userId,
      status: "flagged",
      reason: String(body.reason ?? ""),
      adminId: operatorId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Post(RISK_ADMIN_ROUTES.signalAck)
  ack(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.risk.ackSignal({
      signalId: id,
      adminId: operatorId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Post(RISK_ADMIN_ROUTES.signalResolve)
  resolve(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
  ) {
    return this.risk.resolveSignal({
      signalId: id,
      adminId: operatorId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
      reason: String(body.reason ?? ""),
    });
  }
}
