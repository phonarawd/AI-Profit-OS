import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { MissionAccrualService } from "./mission.accrual.service";
import { MissionProgramService } from "./mission.program.service";
import { MissionRewardEvaluator } from "./mission-reward.evaluator";
import { SettlementCompletedFanout } from "./settlement-completed.fanout";

/**
 * Money §51.8a Nest missions · Engine §48.13.4 fanout boundary.
 * Rule engine / settlement_rule.rs coupling = 0.
 * G4/demo/ticker → accrual = 0.
 * User explain copy Owns = UI §5.9.5 · Admin catalog = Admin §35.7.
 */
@Module({
  imports: [LedgerModule],
  providers: [
    MissionProgramService,
    MissionAccrualService,
    SettlementCompletedFanout,
    MissionRewardEvaluator,
  ],
  exports: [
    MissionProgramService,
    MissionAccrualService,
    MissionRewardEvaluator,
    SettlementCompletedFanout,
  ],
})
export class MissionModule {}
