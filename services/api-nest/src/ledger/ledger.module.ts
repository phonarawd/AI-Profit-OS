import { Module } from "@nestjs/common";
import { LedgerAdminController } from "./ledger.admin.controller";
import { LedgerAdminService } from "./ledger.admin.service";
import { LedgerBucketsService } from "./ledger.buckets.service";
import { LedgerOutboxService } from "./ledger.outbox.service";
import { LedgerPostingService } from "./ledger.posting.service";
import { LedgerProvisionService } from "./ledger.provision.service";
import { LedgerReconService } from "./ledger.recon.service";
import { LedgerUserController } from "./ledger.user.controller";
import { LedgerUserQueryService } from "./ledger.user-query.service";
import { PayoutReservationService } from "./payout-reservation.service";
import { PracticeGrantService } from "./practice-grant.service";
import { TrialFundingService } from "./trial-funding.service";
import { TrialGrantService } from "./trial-grant.service";
import { TrialStateService } from "./trial-state.service";
import { TrialStateUserController } from "./trial-state.user.controller";

@Module({
  controllers: [
    LedgerAdminController,
    LedgerUserController,
    TrialStateUserController,
  ],
  providers: [
    LedgerOutboxService,
    LedgerPostingService,
    LedgerProvisionService,
    LedgerBucketsService,
    LedgerReconService,
    LedgerAdminService,
    LedgerUserQueryService,
    PracticeGrantService,
    TrialGrantService,
    TrialFundingService,
    TrialStateService,
    PayoutReservationService,
  ],
  exports: [
    LedgerOutboxService,
    LedgerPostingService,
    LedgerProvisionService,
    LedgerBucketsService,
    LedgerReconService,
    LedgerAdminService,
    LedgerUserQueryService,
    PracticeGrantService,
    TrialGrantService,
    TrialFundingService,
    TrialStateService,
    PayoutReservationService,
  ],
})
export class LedgerModule {}
