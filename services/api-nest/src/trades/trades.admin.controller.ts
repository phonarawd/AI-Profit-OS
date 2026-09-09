import { Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { AdminAuditService } from "../audit/admin-audit.service";
import { TradeExecutionService } from "./trades.execution.service";
import { TRADE_ADMIN_ROUTES } from "./trades.admin.routes";

/**
 * Step 7.3 money-safety fix - server-side durable trade termination.
 * Mirrors the exact Phase0 "externally-triggered batch tick" shape
 * ChainSweeperPhase0Service.tick() already established for the wallet
 * sweeper (wallet/chain-sweeper/tick): no NATS/Temporal/@nestjs/schedule,
 * just a POST an operator or an external periodic caller hits. This
 * endpoint's real work (finding stuck trades and re-running the existing
 * settlement Rule on their behalf) lives in TradeExecutionService.
 * reconcileStuckTrades - see that method's own comment for the full
 * money-safety rationale.
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class TradesAdminController {
  constructor(
    private readonly execution: TradeExecutionService,
    private readonly audit: AdminAuditService,
  ) {}

  @Post(TRADE_ADMIN_ROUTES.reconcileTick)
  async reconcileTick(@Req() req: RequestWithAdmin) {
    const result = await this.execution.reconcileStuckTrades();
    const admin = req.admin;
    if (admin) {
      await this.audit
        .write({
          actorKey: admin.adminId,
          actorId: admin.adminId,
          role: admin.role,
          action: "admin.trades.reconcile_tick",
          targetType: "trade_execution",
          targetId: "batch",
          mode: "n/a",
          result: "applied",
          payload: {
            candidates: result.candidates,
            reconciled: result.reconciled,
          },
        })
        .catch(() => undefined);
    }
    return result;
  }
}
