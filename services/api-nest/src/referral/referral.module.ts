import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { ReferralAdminController } from "./referral.admin.controller";
import { ReferralClawbackService } from "./referral.clawback.service";
import { ReferralController } from "./referral.controller";
import { ReferralEdgeService } from "./referral.edge.service";
import { ReferralLadderService } from "./referral.ladder.service";
import { ReferralPoolService } from "./referral.pool.service";
import { ReferralProgramService } from "./referral.program.service";
import { ReferralHooks } from "./referral.hooks";
import { ReferralShareService } from "./referral.share.service";

/**
 * Money §51.5 Nest referral module.
 * User explain copy Owns = UI §5.9.1a · Admin shell = /admin/growth?tab=referral
 */
@Module({
  imports: [LedgerModule],
  controllers: [ReferralController, ReferralAdminController],
  providers: [
    ReferralProgramService,
    ReferralEdgeService,
    ReferralPoolService,
    ReferralLadderService,
    ReferralClawbackService,
    ReferralShareService,
    ReferralHooks,
  ],
  exports: [
    ReferralProgramService,
    ReferralEdgeService,
    ReferralPoolService,
    ReferralLadderService,
    ReferralClawbackService,
    ReferralShareService,
  ],
})
export class ReferralModule {}
