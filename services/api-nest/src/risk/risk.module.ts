import { Module } from "@nestjs/common";
import { KillSwitchModule } from "../kill-switch/kill-switch.module";
import { LedgerModule } from "../ledger/ledger.module";
import { MoneyCircuitService } from "./money-circuit.service";
import { RiskAdminController } from "./risk.admin.controller";
import { RiskService } from "./risk.service";

/**
 * Money §49.9 Nest risk module.
 * FORBIDDEN: separate services/risk-service folder.
 */
@Module({
  imports: [LedgerModule, KillSwitchModule],
  controllers: [RiskAdminController],
  providers: [RiskService, MoneyCircuitService],
  exports: [RiskService, MoneyCircuitService],
})
export class RiskModule {}
