import { Module } from "@nestjs/common";
import { KillSwitchModule } from "../kill-switch/kill-switch.module";
import { LedgerModule } from "../ledger/ledger.module";
import { ReferralAdminController } from "./referral.admin.controller";
import { ReferralClawbackService } from "./referral.clawback.service";
import { ReferralController } from "./referral.controller";
import { ReferralEdgeService } from "./referral.edge.service";
import { ReferralLadderService } from "./referral.ladder.service";
import { ReferralPoolService } from "./referral.pool.service";
import { ReferralProgramService } from "./referral.program.service";
import { ReferralHooks } from "./referral.hooks";
import { ReferralOwnCodeService } from "./referral.own-code.service";
import { ReferralShareService } from "./referral.share.service";

/**
 * Money §51.5 Nest referral module.
 * User explain copy Owns = UI §5.9.1a · Admin shell = /admin/growth?tab=referral
 */
@Module({
  imports: [LedgerModule, KillSwitchModule],
  controllers: [ReferralController, ReferralAdminController],
  providers: [
    ReferralProgramService,
    ReferralEdgeService,
    ReferralPoolService,
    ReferralLadderService,
    ReferralClawbackService,
    ReferralShareService,
    ReferralOwnCodeService,
    ReferralHooks,
  ],
  exports: [
    ReferralProgramService,
    ReferralEdgeService,
    ReferralPoolService,
    ReferralLadderService,
    ReferralClawbackService,
    ReferralShareService,
    ReferralOwnCodeService,
  ],
})
export class ReferralModule {}
