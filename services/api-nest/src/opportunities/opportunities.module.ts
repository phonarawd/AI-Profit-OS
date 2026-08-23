import { Module } from "@nestjs/common";
import { ExecutionPolicyModule } from "../execution-policy/execution-policy.module";
import { LedgerModule } from "../ledger/ledger.module";
import { EventsModule } from "../events/events.module";
import { LoopModule } from "../loop/loop.module";
import { KillSwitchModule } from "../kill-switch/kill-switch.module";
import { RiskModule } from "../risk/risk.module";
import { AssetImageR2Service } from "./asset-image-r2.service";
import { CatalogRuntimeSeedService } from "./catalog-runtime-seed.service";
import { FxSnapshotService } from "./fx-snapshot.service";
import { OpportunityRepriceService } from "./opportunity-reprice.service";
import { OpportunitiesAdminController } from "./opportunities.admin.controller";
import { OpportunitiesAdminService } from "./opportunities.admin.service";
import { OpportunitiesUserController } from "./opportunities.user.controller";
import { OpportunitiesUserService } from "./opportunities.user.service";
import { ParticipateService } from "./participate.service";
import { UserOpportunityOverrideAdminController } from "./user-opportunity-override.admin.controller";
import { UserOpportunityOverrideAdminService } from "./user-opportunity-override.admin.service";

@Module({
  imports: [
    EventsModule,
    LedgerModule,
    ExecutionPolicyModule,
    RiskModule,
    KillSwitchModule,
    LoopModule,
  ],
  controllers: [
    OpportunitiesUserController,
    OpportunitiesAdminController,
    UserOpportunityOverrideAdminController,
  ],
  providers: [
    AssetImageR2Service,
    OpportunityRepriceService,
    OpportunitiesAdminService,
    OpportunitiesUserService,
    ParticipateService,
    UserOpportunityOverrideAdminService,
    CatalogRuntimeSeedService,
    FxSnapshotService,
  ],
  exports: [
    AssetImageR2Service,
    OpportunityRepriceService,
    OpportunitiesAdminService,
    OpportunitiesUserService,
    ParticipateService,
    UserOpportunityOverrideAdminService,
    CatalogRuntimeSeedService,
    FxSnapshotService,
  ],
})
export class OpportunitiesModule {}
