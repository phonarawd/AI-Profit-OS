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

@Module({
  controllers: [LedgerAdminController, LedgerUserController],
  providers: [
    LedgerOutboxService,
    LedgerPostingService,
    LedgerProvisionService,
    LedgerBucketsService,
    LedgerReconService,
    LedgerAdminService,
    LedgerUserQueryService,
    PracticeGrantService,
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
    PayoutReservationService,
  ],
})
export class LedgerModule {}
