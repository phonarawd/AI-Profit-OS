import { Module } from "@nestjs/common";
import { LedgerAdminController } from "./ledger.admin.controller";
import { LedgerAdminService } from "./ledger.admin.service";
import { LedgerBucketsService } from "./ledger.buckets.service";
import { LedgerOutboxService } from "./ledger.outbox.service";
import { LedgerPostingService } from "./ledger.posting.service";
import { LedgerProvisionService } from "./ledger.provision.service";
import { LedgerReconService } from "./ledger.recon.service";
import { LedgerUserJournalService } from "./ledger.user-journal.service";
import { PracticeGrantService } from "./practice-grant.service";

@Module({
  controllers: [LedgerAdminController],
  providers: [
    LedgerOutboxService,
    LedgerPostingService,
    LedgerProvisionService,
    LedgerBucketsService,
    LedgerReconService,
    LedgerAdminService,
    LedgerUserJournalService,
    PracticeGrantService,
  ],
  exports: [
    LedgerOutboxService,
    LedgerPostingService,
    LedgerProvisionService,
    LedgerBucketsService,
    LedgerReconService,
    LedgerAdminService,
    LedgerUserJournalService,
    PracticeGrantService,
  ],
})
export class LedgerModule {}
