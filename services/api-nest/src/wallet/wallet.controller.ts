import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { loadPhase0Env } from "../config/phase0.env";
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

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

/**
 * User wallet HTTP surface · /api/v1/wallet/*
 * 유저 라우트 = JwtAuthGuard + sessionUserId · internal chain/tick routes = fail-closed machine-auth
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
  @UseGuards(JwtAuthGuard)
  @Get(WALLET_USER_ROUTES.buckets)
  getBuckets(@Req() req: SessionReq) {
    return this.buckets.getUserBuckets(this.sessionUserId(req));
  }

  /** §49.7 POST profit→principal merge */
  @UseGuards(JwtAuthGuard)
  @Post(WALLET_USER_ROUTES.profitMerge)
  mergeProfit(@Body() body: Record<string, unknown>, @Req() req: SessionReq) {
    return this.profitMerge.merge({
      userId: this.sessionUserId(req),
      amountUsdt: String(body.amountUsdt ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  /** §51.7 welcome practice · subject=JWT principal only · body.userId 무시 */
  @UseGuards(JwtAuthGuard)
  @Post(WALLET_USER_ROUTES.practiceWelcome)
  practiceWelcome(@Req() req: SessionReq) {
    return this.practiceGrant.grantWelcome(this.sessionUserId(req));
  }

  /**
   * §51.7 Phase0 in-process expire cron · fail-closed machine-auth
   * AdaptersIngest fail-open(if token) 패턴 복제 금지
   */
  @Post(WALLET_USER_ROUTES.practiceExpireTick)
  practiceExpireTick(
    @Headers("x-internal-wallet-token") headerToken: string | undefined,
    @Body() body?: Record<string, unknown>,
  ) {
    this.assertInternalWalletTickAuth(headerToken);
    return this.practiceGrant.expireDue({
      limit: typeof body?.limit === "number" ? body.limit : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(WALLET_USER_ROUTES.myDepositAddress)
  myDepositAddress(@Req() req: SessionReq) {
    return this.depositAddress.getOrCreate(this.sessionUserId(req));
  }

  /** §43.1 observe Transfer — internal Phase0/Phase1 ingest · fail-closed machine-auth */
  @Post(WALLET_USER_ROUTES.usdtDepositObserve)
  observeUsdtDeposit(
    @Headers("x-internal-wallet-token") headerToken: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    this.assertInternalWalletTickAuth(headerToken);
    return this.usdtDeposit.observe({
      txHash: String(body.txHash ?? ""),
      toAddress: String(body.toAddress ?? ""),
      amountUsdt: String(body.amountUsdt ?? ""),
      confirmations: Number(body.confirmations ?? 0),
      userId: typeof body.userId === "string" ? body.userId : undefined,
      reorg: body.reorg === true,
    });
  }

  /** §43.1 Phase0 in-process single-stream tick/status · fail-closed machine-auth */
  @Post(WALLET_USER_ROUTES.chainWatcherTick)
  chainWatcherTick(
    @Headers("x-internal-wallet-token") headerToken: string | undefined,
  ) {
    this.assertInternalWalletTickAuth(headerToken);
    return this.chainWatcher.tick();
  }

  @Get(WALLET_USER_ROUTES.chainWatcherStatus)
  chainWatcherStatus(
    @Headers("x-internal-wallet-token") headerToken: string | undefined,
  ) {
    this.assertInternalWalletTickAuth(headerToken);
    return this.chainWatcher.describe();
  }

  /** §43.2 Phase0 in-process Energy+TRX sweeper tick/status · fail-closed machine-auth */
  @Post(WALLET_USER_ROUTES.chainSweeperTick)
  chainSweeperTick(
    @Headers("x-internal-wallet-token") headerToken: string | undefined,
    @Body() body?: Record<string, unknown>,
  ) {
    this.assertInternalWalletTickAuth(headerToken);
    return this.chainSweeper.tick({
      treasuryTrxBalance:
        typeof body?.treasuryTrxBalance === "string"
          ? body.treasuryTrxBalance
          : undefined,
      limit: typeof body?.limit === "number" ? body.limit : undefined,
    });
  }

  @Get(WALLET_USER_ROUTES.chainSweeperStatus)
  chainSweeperStatus(
    @Headers("x-internal-wallet-token") headerToken: string | undefined,
  ) {
    this.assertInternalWalletTickAuth(headerToken);
    return this.chainSweeper.describe();
  }

  @UseGuards(JwtAuthGuard)
  @Post(WALLET_USER_ROUTES.krwDepositRequests)
  createKrwDeposit(
    @Body() body: Record<string, unknown>,
    @Req() req: SessionReq,
  ) {
    return this.krwDeposit.createRequest({
      userId: this.sessionUserId(req),
      requestedAmountKrw: Number(body.requestedAmountKrw),
      depositorName: String(body.depositorName ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  /** §41.6 · §51.11 wrong-chain CS → Admin wallet?tab=disputes */
  @UseGuards(JwtAuthGuard)
  @Post(WALLET_USER_ROUTES.depositDisputes)
  createDepositDispute(
    @Body() body: Record<string, unknown>,
    @Req() req: SessionReq,
  ) {
    return this.depositDisputes.create({
      userId: this.sessionUserId(req),
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

  @UseGuards(JwtAuthGuard)
  @Post(WALLET_USER_ROUTES.withdrawStepUpChallenge)
  createStepUpChallenge(
    @Body() body: Record<string, unknown>,
    @Req() req: SessionReq,
  ) {
    return this.stepUp.createChallenge({
      userId: this.sessionUserId(req),
      method: String(body.method ?? "") as WithdrawStepUpMethod,
      origin: String(body.origin ?? ""),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(WALLET_USER_ROUTES.withdrawStepUpVerify)
  verifyStepUp(@Body() body: Record<string, unknown>, @Req() req: SessionReq) {
    return this.stepUp.verifyChallenge({
      userId: this.sessionUserId(req),
      challengeId: String(body.challengeId ?? ""),
      method: String(body.method ?? "") as WithdrawStepUpMethod,
      proof: String(body.proof ?? body.code ?? body.pin ?? ""),
      origin: String(body.origin ?? ""),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(WALLET_USER_ROUTES.withdrawPinSet)
  setWithdrawPin(
    @Body() body: Record<string, unknown>,
    @Req() req: SessionReq,
  ) {
    return this.stepUp.setPin({
      userId: this.sessionUserId(req),
      pin: String(body.pin ?? ""),
      enrollmentStepUpToken: String(body.stepUpToken ?? ""),
    });
  }

  /** §49.3 POST withdraw · default mode=profit · guard#1 withdrawApplyBlocked */
  @UseGuards(JwtAuthGuard)
  @Post(WALLET_USER_ROUTES.withdraw)
  createWithdraw(
    @Body() body: Record<string, unknown>,
    @Req() req: SessionReq,
  ) {
    const practiceDebitAttempt =
      body.practiceDebitAttempt === true ||
      body.requestedBucket === "practice" ||
      body.bucket === "practice" ||
      (typeof body.debitPracticeUsdt === "string" &&
        body.debitPracticeUsdt !== "0" &&
        body.debitPracticeUsdt !== "0.0" &&
        body.debitPracticeUsdt !== "0.00");
    return this.withdrawIntent.create({
      userId: this.sessionUserId(req),
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

  /** never trust query/body userId on user routes */
  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }

  /** fail-closed: token unset OR mismatch → Unauthorized · operation 미실행 */
  private assertInternalWalletTickAuth(headerToken: string | undefined): void {
    const expected = loadPhase0Env().internalWalletTickToken;
    if (!expected) {
      throw new UnauthorizedException("INTERNAL_WALLET_TICK_TOKEN_UNSET");
    }
    if (!headerToken || headerToken !== expected) {
      throw new UnauthorizedException("INTERNAL_WALLET_TICK_TOKEN_INVALID");
    }
  }
}
