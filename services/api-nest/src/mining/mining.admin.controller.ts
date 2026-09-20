import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminAuditService } from "../audit/admin-audit.service";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { MiningService, requireMiningIdempotencyKey } from "./mining.service";

@UseGuards(AdminGuard)
@Controller("admin/mining")
export class MiningAdminController {
  constructor(
    private readonly mining: MiningService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get("settlements")
  listSettlements(@Query("limit") limit?: string) {
    return this.mining.adminListSettlements(limit ? Number(limit) : undefined);
  }

  @Get("settlements/:settlementId")
  getSettlement(@Param("settlementId") settlementId: string) {
    return this.mining.adminGetSettlement(settlementId);
  }

  @Post("settlements/:settlementId/retry")
  async retrySettlement(
    @Param("settlementId") settlementId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    const idem = requireMiningIdempotencyKey(idempotencyKey);
    try {
      const result = await this.mining.retrySettlement(settlementId);
      await this.audit.write({
        actorKey: `admin:${operatorId}`,
        actorId: operatorId,
        role: String(req.admin?.role ?? ""),
        action: "mining.settlement.retry",
        targetType: "mine_settlement",
        targetId: settlementId,
        occurredAt: new Date().toISOString(),
        mode: "live",
        result: "success",
        reason: "settlement recovery retry",
        idempotencyKey: `mine-admin-retry:${settlementId}:${idem}`,
        payload: { settlementId },
      });
      return result;
    } catch (error) {
      await this.audit.write({
        actorKey: `admin:${operatorId}`,
        actorId: operatorId,
        role: String(req.admin?.role ?? ""),
        action: "mining.settlement.retry",
        targetType: "mine_settlement",
        targetId: settlementId,
        occurredAt: new Date().toISOString(),
        mode: "live",
        result: "failed",
        reason: "settlement recovery retry failed",
        idempotencyKey: `mine-admin-retry-failed:${settlementId}:${idem}`,
        payload: { settlementId },
      }).catch(() => undefined);
      throw error;
    }
  }
}
