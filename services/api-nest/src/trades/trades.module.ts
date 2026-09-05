import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../audit/admin-audit.module";
import { ExecutionPolicyModule } from "../execution-policy/execution-policy.module";
import { LedgerModule } from "../ledger/ledger.module";
import { RiskModule } from "../risk/risk.module";
import { SimulationModule } from "../simulation/simulation.module";
import { TradeExecutionService } from "./trades.execution.service";
import { TradesUserController } from "./trades.user.controller";
import { TradesAdminController } from "./trades.admin.controller";

/**
 * Engine §0.9 E-R5 — trade execute-tick · settlement_rule.cjs wiring
 * SettlementCompletedFanout lives in MissionModule (listener only · unmodified)
 * TradesAdminController = Step 7.3 durable server-side reconcile-tick
 */
@Module({
  imports: [
    LedgerModule,
    RiskModule,
    ExecutionPolicyModule,
    SimulationModule,
    AdminAuditModule,
  ],
  controllers: [TradesUserController, TradesAdminController],
  providers: [TradeExecutionService],
  exports: [TradeExecutionService],
})
export class TradesModule {}
