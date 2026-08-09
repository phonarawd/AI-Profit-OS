import { Module } from "@nestjs/common";
import { ExecutionPolicyModule } from "../execution-policy/execution-policy.module";
import { LedgerModule } from "../ledger/ledger.module";
import { RiskModule } from "../risk/risk.module";
import { SimulationModule } from "../simulation/simulation.module";
import { TradeExecutionService } from "./trades.execution.service";
import { TradesUserController } from "./trades.user.controller";

/**
 * Engine §0.9 E-R5 — trade execute-tick · settlement_rule.cjs wiring
 * SettlementCompletedFanout lives in MissionModule (listener only · unmodified)
 */
@Module({
  imports: [
    LedgerModule,
    RiskModule,
    ExecutionPolicyModule,
    SimulationModule,
  ],
  controllers: [TradesUserController],
  providers: [TradeExecutionService],
  exports: [TradeExecutionService],
})
export class TradesModule {}
