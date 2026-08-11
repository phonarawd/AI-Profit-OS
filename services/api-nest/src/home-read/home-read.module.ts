import { Module } from "@nestjs/common";
import { GrowthModule } from "../growth/growth.module";
import { OpportunitiesModule } from "../opportunities/opportunities.module";
import { WalletModule } from "../wallet/wallet.module";
import { HomeReadService } from "./home-read.service";
import { HomeReadUserController } from "./home-read.user.controller";

/**
 * Engine v7.23 R1 · HomeReadModelV1
 * Reuses Wallet(HomeMoneyRead) + OpportunitiesUser + GrowthPublic
 */
@Module({
  imports: [WalletModule, OpportunitiesModule, GrowthModule],
  controllers: [HomeReadUserController],
  providers: [HomeReadService],
  exports: [HomeReadService],
})
export class HomeReadModule {}
