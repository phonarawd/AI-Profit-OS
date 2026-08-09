import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { LedgerBucketsService } from "../ledger/ledger.buckets.service";
import { PracticeGrantService } from "../ledger/practice-grant.service";
import { ChainSweeperPhase0Service } from "./chain-sweeper.phase0.service";
import { ChainWatcherPhase0Service } from "./chain-watcher.phase0.service";
import { DepositAddressService } from "./deposit-address.service";
import { DepositDisputeService } from "./deposit-dispute.service";
import { KrwDepositService } from "./krw-deposit.service";
import { ProfitMergeService } from "./profit-merge.service";
import { UsdtDepositService } from "./usdt-deposit.service";
import { WALLET_USER_ROUTES } from "./wallet.routes";
import { WithdrawIntentService } from "./withdraw-intent.service";
import { WithdrawStepUpService } from "./withdraw-stepup.service";
import type { WithdrawStepUpMethod } from "./withdraw-stepup.policy";
import type {
  DepositDisputeKind,
  WithdrawAsset,
  WithdrawMode,
} from "./wallet.types";

/**
 * User wallet HTTP surface · /api/v1/wallet/*
 * Auth guard lands with auth wiring — contracts locked here.
 */
@Controller("wallet")
export class WalletController {
  constructor(
    private readonly depositAddress: DepositAddressService,
    private readonly krwDeposit: KrwDepositService,
    private readonly depositDisputes: DepositDisputeService,
    private readonly usdtDeposit: UsdtDepositService,
    private readonly chainWatcher: ChainWatcherPhase0Service,
    private readonly chainSweeper: ChainSweeperPhase0Service,
    private readonly buckets: LedgerBucketsService,
    private readonly practiceGrant: PracticeGrantService,
    private readonly profitMerge: ProfitMergeService,
    private readonly withdrawIntent: WithdrawIntentService,
    private readonly stepUp: WithdrawStepUpService,
  ) {}

  /**
   * §49.7 GET WalletBuckets · §49.2a principalUsdt SoT for participate preflight / P Fact.
   * Classification counts = Engine §0.0.5.1 (not computed here).
   */
  @Get(WALLET_USER_ROUTES.buckets)
  getBuckets(@Query("userId") userId?: string) {
    return this.buckets.getUserBuckets(String(userId ?? ""));
  }

  /** §49.7 POST profit→principal merge */
  @Post(WALLET_USER_ROUTES.profitMerge)
  mergeProfit(@Body() body: Record<string, unknown>) {
    return this.profitMerge.merge({
      userId: String(body.userId ?? ""),
      amountUsdt: String(body.amountUsdt ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  /** §51.7 welcome practice · idempotent 1회 · normally called from signup provision */
  @Post(WALLET_USER_ROUTES.practiceWelcome)
  practiceWelcome(@Body() body: Record<string, unknown>) {
    return this.practiceGrant.grantWelcome(String(body.userId ?? ""));
  }

  /** §51.7 Phase0 in-process expire cron */
  @Post(WALLET_USER_ROUTES.practiceExpireTick)
  practiceExpireTick(@Body() body?: Record<string, unknown>) {
    return this.practiceGrant.expireDue({
      limit: typeof body?.limit === "number" ? body.limit : undefined,
    });
  }

  @Get(WALLET_USER_ROUTES.myDepositAddress)
  myDepositAddress(@Query("userId") userId?: string) {
    return this.depositAddress.getOrCreate(String(userId ?? ""));
  }

  /** §43.1 observe Transfer — Phase0 tick / Phase1 worker ingest */
  @Post(WALLET_USER_ROUTES.usdtDepositObserve)
  observeUsdtDeposit(@Body() body: Record<string, unknown>) {
    return this.usdtDeposit.observe({
      txHash: String(body.txHash ?? ""),
      toAddress: String(body.toAddress ?? ""),
      amountUsdt: String(body.amountUsdt ?? ""),
      confirmations: Number(body.confirmations ?? 0),
      userId: typeof body.userId === "string" ? body.userId : undefined,
      reorg: body.reorg === true,
    });
  }

  /** §43.1 Phase0 in-process single-stream tick */
  @Post(WALLET_USER_ROUTES.chainWatcherTick)
  chainWatcherTick() {
    return this.chainWatcher.tick();
  }

  @Get(WALLET_USER_ROUTES.chainWatcherStatus)
  chainWatcherStatus() {
    return this.chainWatcher.describe();
  }

  /** §43.2 Phase0 in-process Energy+TRX sweeper tick */
  @Post(WALLET_USER_ROUTES.chainSweeperTick)
  chainSweeperTick(@Body() body?: Record<string, unknown>) {
    return this.chainSweeper.tick({
      treasuryTrxBalance:
        typeof body?.treasuryTrxBalance === "string"
          ? body.treasuryTrxBalance
          : undefined,
      limit: typeof body?.limit === "number" ? body.limit : undefined,
    });
  }

  @Get(WALLET_USER_ROUTES.chainSweeperStatus)
  chainSweeperStatus() {
    return this.chainSweeper.describe();
  }

  @Post(WALLET_USER_ROUTES.krwDepositRequests)
  createKrwDeposit(@Body() body: Record<string, unknown>) {
    return this.krwDeposit.createRequest({
      userId: String(body.userId ?? ""),
      requestedAmountKrw: Number(body.requestedAmountKrw),
      depositorName: String(body.depositorName ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  /** §41.6 · §51.11 wrong-chain CS → Admin wallet?tab=disputes */
  @Post(WALLET_USER_ROUTES.depositDisputes)
  createDepositDispute(@Body() body: Record<string, unknown>) {
    return this.depositDisputes.create({
      userId: String(body.userId ?? ""),
      kind: body.kind as DepositDisputeKind | undefined,
      linkedTxHash: String(body.linkedTxHash ?? body.txHash ?? ""),
      networkClaimedKo:
        typeof body.networkClaimedKo === "string"
          ? body.networkClaimedKo
          : undefined,
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  /** §43.6 policy surface — Money Owns · PWA must not redefine */
  @Get(WALLET_USER_ROUTES.withdrawStepUpPolicy)
  stepUpPolicy() {
    return this.stepUp.policy();
  }

  @Post(WALLET_USER_ROUTES.withdrawStepUpChallenge)
  createStepUpChallenge(@Body() body: Record<string, unknown>) {
    return this.stepUp.createChallenge({
      userId: String(body.userId ?? ""),
      method: String(body.method ?? "") as WithdrawStepUpMethod,
      origin: String(body.origin ?? ""),
      email: typeof body.email === "string" ? body.email : undefined,
    });
  }

  @Post(WALLET_USER_ROUTES.withdrawStepUpVerify)
  verifyStepUp(@Body() body: Record<string, unknown>) {
    return this.stepUp.verifyChallenge({
      userId: String(body.userId ?? ""),
      challengeId: String(body.challengeId ?? ""),
      method: String(body.method ?? "") as WithdrawStepUpMethod,
      proof: String(body.proof ?? body.code ?? body.pin ?? ""),
      origin: String(body.origin ?? ""),
    });
  }

  @Post(WALLET_USER_ROUTES.withdrawPinSet)
  setWithdrawPin(@Body() body: Record<string, unknown>) {
    return this.stepUp.setPin({
      userId: String(body.userId ?? ""),
      pin: String(body.pin ?? ""),
    });
  }

  /** §49.3 POST withdraw · default mode=profit · guard#1 withdrawApplyBlocked */
  @Post(WALLET_USER_ROUTES.withdraw)
  createWithdraw(@Body() body: Record<string, unknown>) {
    const practiceDebitAttempt =
      body.practiceDebitAttempt === true ||
      body.requestedBucket === "practice" ||
      body.bucket === "practice" ||
      (typeof body.debitPracticeUsdt === "string" &&
        body.debitPracticeUsdt !== "0" &&
        body.debitPracticeUsdt !== "0.0" &&
        body.debitPracticeUsdt !== "0.00");
    return this.withdrawIntent.create({
      userId: String(body.userId ?? ""),
      mode: (body.mode as WithdrawMode | undefined) ?? "profit",
      amountUsdt: String(body.amountUsdt ?? ""),
      asset: String(body.asset ?? "USDT") as WithdrawAsset,
      debitProfitUsdt:
        typeof body.debitProfitUsdt === "string"
          ? body.debitProfitUsdt
          : undefined,
      debitPrincipalUsdt:
        typeof body.debitPrincipalUsdt === "string"
          ? body.debitPrincipalUsdt
          : undefined,
      principalConfirmToken:
        typeof body.principalConfirmToken === "string"
          ? body.principalConfirmToken
          : undefined,
      practiceDebitAttempt,
      requestedBucket:
        typeof body.requestedBucket === "string"
          ? body.requestedBucket
          : typeof body.bucket === "string"
            ? body.bucket
            : undefined,
      idempotencyKey: String(body.idempotencyKey ?? ""),
      stepUpToken: String(body.stepUpToken ?? ""),
      destination:
        typeof body.destination === "string" ? body.destination : undefined,
    });
  }
}
