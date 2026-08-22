import { Module } from "@nestjs/common";
import { ComplianceModule } from "../compliance/compliance.module";
import { LedgerModule } from "../ledger/ledger.module";
import { LoopModule } from "../loop/loop.module";
import { RiskModule } from "../risk/risk.module";
import { KillSwitchModule } from "../admin-control/kill-switch.module";
import { ChainSweeperPhase0Service } from "./chain-sweeper.phase0.service";
import { ChainWatcherPhase0Service } from "./chain-watcher.phase0.service";
import { DepositAddressService } from "./deposit-address.service";
import { DepositConfigAdminController } from "./deposit-config.admin.controller";
import { DepositConfigService } from "./deposit-config.service";
import { DepositDisputeAdminController } from "./deposit-dispute.admin.controller";
import { DepositDisputeService } from "./deposit-dispute.service";
import { FeedCacheInvalidateService } from "./feed-cache-invalidate.service";
import { HomeMoneyReadService } from "./home-money-read.service";
import { HomeMoneyReadUserController } from "./home-money-read.user.controller";
import { KrwDepositAdminController } from "./krw-deposit.admin.controller";
import { KrwDepositService } from "./krw-deposit.service";
import { MinHoldingService } from "./min-holding.service";
import { ProfitMergeService } from "./profit-merge.service";
import { ResendEmailProvider } from "./resend-email.provider";
import { UsdtDepositService } from "./usdt-deposit.service";
import { WalletController } from "./wallet.controller";
import { WithdrawCredentialsAdminController } from "./withdraw-credentials.admin.controller";
import { WithdrawCredentialsAdminService } from "./withdraw-credentials.admin.service";
import { WithdrawFeeService } from "./withdraw-fee.service";
import { WithdrawIntentService } from "./withdraw-intent.service";
import { WithdrawKycGuard } from "./withdraw-kyc.guard";
import { WithdrawStepUpService } from "./withdraw-stepup.service";

@Module({
  imports: [LedgerModule, ComplianceModule, RiskModule, KillSwitchModule, LoopModule],
  controllers: [
    WalletController,
    HomeMoneyReadUserController,
    DepositConfigAdminController,
    KrwDepositAdminController,
    DepositDisputeAdminController,
    WithdrawCredentialsAdminController,
  ],
  providers: [
    DepositConfigService,
    DepositAddressService,
    KrwDepositService,
    DepositDisputeService,
    UsdtDepositService,
    ChainWatcherPhase0Service,
    ChainSweeperPhase0Service,
    WithdrawFeeService,
    MinHoldingService,
    WithdrawKycGuard,
    ResendEmailProvider,
    WithdrawStepUpService,
    WithdrawIntentService,
    WithdrawCredentialsAdminService,
    ProfitMergeService,
    FeedCacheInvalidateService,
    HomeMoneyReadService,
  ],
  exports: [
    DepositConfigService,
    DepositAddressService,
    KrwDepositService,
    DepositDisputeService,
    UsdtDepositService,
    ChainWatcherPhase0Service,
    ChainSweeperPhase0Service,
    WithdrawFeeService,
    MinHoldingService,
    WithdrawKycGuard,
    ResendEmailProvider,
    WithdrawStepUpService,
    WithdrawIntentService,
    WithdrawCredentialsAdminService,
    ProfitMergeService,
    FeedCacheInvalidateService,
    HomeMoneyReadService,
  ],
})
export class WalletModule {}
