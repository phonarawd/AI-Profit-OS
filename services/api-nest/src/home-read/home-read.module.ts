import { Module } from "@nestjs/common";
import { GrowthModule } from "../growth/growth.module";
import { LedgerModule } from "../ledger/ledger.module";
import { MembershipModule } from "../membership/membership.module";
import { OpportunitiesModule } from "../opportunities/opportunities.module";
import { WalletModule } from "../wallet/wallet.module";
import { HomeReadService } from "./home-read.service";
import { HomeReadUserController } from "./home-read.user.controller";
import { TrialStateService } from "./trial-state.service";
import { TrialStateUserController } from "./trial-state.user.controller";

/**
 * Engine v7.23 R1 · HomeReadModelV1
 * Reuses Wallet(HomeMoneyRead) + OpportunitiesUser + GrowthPublic
 */
@Module({
  imports: [
    WalletModule,
    OpportunitiesModule,
    GrowthModule,
    LedgerModule,
    MembershipModule,
  ],
  controllers: [HomeReadUserController, TrialStateUserController],
  providers: [HomeReadService, TrialStateService],
  exports: [HomeReadService],
})
export class HomeReadModule {}
