import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminOperator } from "../common/admin-operator.decorator";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { MiningAdminService } from "./mining-admin.service";
import { MiningHighValueService } from "./mining-high-value.service";
import { requireMiningIdempotencyKey } from "./mining.service";

function actor(adminId: string, req: RequestWithAdmin) {
  return { adminId, role: req.admin?.role ?? "unknown" };
}

function idem(raw: string | undefined): string {
  return requireMiningIdempotencyKey(raw);
}

@UseGuards(AdminGuard)
@Controller("admin")
export class MiningAdminController {
  constructor(
    private readonly mining: MiningAdminService,
    private readonly highValue: MiningHighValueService,
  ) {}

  @Get("mines")
  listMines(@Query("limit") limit?: string) {
    return this.mining.listMines(limit ? Number(limit) : undefined);
  }

  @Post("mines")
  createMine(
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.createMine({
      actor: actor(adminId, req),
      idempotencyKey: idem(idempotencyKey),
      code: body.code,
      displayName: body.displayName,
      description: body.description,
      assetCode: body.assetCode,
      minPrincipalAmount: body.minPrincipalAmount,
      maxPrincipalAmount: body.maxPrincipalAmount,
      displayOrder: body.displayOrder,
      metadata: body.metadata,
      reason: body.reason,
    });
  }

  @Get("mines/:mineId")
  getMine(@Param("mineId") mineId: string) {
    return this.mining.getMine(mineId);
  }

  @Patch("mines/:mineId")
  updateMine(
    @Param("mineId") mineId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.updateMine({
      actor: actor(adminId, req),
      idempotencyKey: idem(idempotencyKey),
      mineId,
      body,
    });
  }

  @Post("mines/:mineId/publish")
  publishMine(
    @Param("mineId") mineId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.publishMine({ actor: actor(adminId, req), idempotencyKey: idem(idempotencyKey), mineId, reason: body.reason });
  }

  @Post("mines/:mineId/pause-new-positions")
  pauseNewPositions(
    @Param("mineId") mineId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.pauseNewPositions({ actor: actor(adminId, req), idempotencyKey: idem(idempotencyKey), mineId, reason: body.reason });
  }

  @Post("mines/:mineId/pause")
  pauseMine(
    @Param("mineId") mineId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.pauseMine({ actor: actor(adminId, req), idempotencyKey: idem(idempotencyKey), mineId, reason: body.reason });
  }

  @Post("mines/:mineId/resume")
  resumeMine(
    @Param("mineId") mineId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.resumeMine({ actor: actor(adminId, req), idempotencyKey: idem(idempotencyKey), mineId, reason: body.reason });
  }

  @Post("mines/:mineId/end")
  endMine(
    @Param("mineId") mineId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.endMine({ actor: actor(adminId, req), idempotencyKey: idem(idempotencyKey), mineId, reason: body.reason });
  }

  @Get("mines/:mineId/rates")
  listRateVersions(@Param("mineId") mineId: string, @Query("limit") limit?: string) {
    return this.mining.listRateVersions(mineId, limit ? Number(limit) : undefined);
  }

  @Post("mines/:mineId/rates")
  createRateVersion(
    @Param("mineId") mineId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.createRateVersion({
      actor: actor(adminId, req),
      idempotencyKey: idem(idempotencyKey),
      mineId,
      dailyRate: body.dailyRate,
      reason: body.reason,
    });
  }

  @Patch("mines/:mineId/rates/:rateVersionId")
  updateRateVersion(
    @Param("mineId") mineId: string,
    @Param("rateVersionId") rateVersionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.updateRateVersion({
      actor: actor(adminId, req),
      idempotencyKey: idem(idempotencyKey),
      mineId,
      rateVersionId,
      dailyRate: body.dailyRate,
      reason: body.reason,
    });
  }

  @Post("mines/:mineId/rates/:rateVersionId/request-approval")
  requestRateApproval(
    @Param("mineId") mineId: string,
    @Param("rateVersionId") rateVersionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.requestRateApproval({ actor: actor(adminId, req), idempotencyKey: idem(idempotencyKey), mineId, rateVersionId, reason: body.reason });
  }

  @Post("mines/:mineId/rates/:rateVersionId/approve")
  approveRateVersion(
    @Param("mineId") mineId: string,
    @Param("rateVersionId") rateVersionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.approveRateVersion({ actor: actor(adminId, req), idempotencyKey: idem(idempotencyKey), mineId, rateVersionId, reason: body.reason });
  }

  @Post("mines/:mineId/rates/:rateVersionId/schedule")
  scheduleRateVersion(
    @Param("mineId") mineId: string,
    @Param("rateVersionId") rateVersionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.scheduleRateVersion({
      actor: actor(adminId, req),
      idempotencyKey: idem(idempotencyKey),
      mineId,
      rateVersionId,
      effectiveAt: body.effectiveAt,
      reason: body.reason,
    });
  }

  @Get("mining/positions")
  listPositions(
    @Query("mineId") mineId?: string,
    @Query("userId") userId?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    return this.mining.listPositions({ mineId, userId, status, limit: limit ? Number(limit) : undefined });
  }

  @Get("mining/positions/:positionId")
  getPosition(@Param("positionId") positionId: string) {
    return this.mining.getPosition(positionId);
  }

  @Get("mining/settlements")
  listSettlements(
    @Query("mineId") mineId?: string,
    @Query("userId") userId?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    return this.mining.listSettlements({ mineId, userId, status, limit: limit ? Number(limit) : undefined });
  }

  @Get("mining/settlements/:settlementId")
  getSettlement(@Param("settlementId") settlementId: string) {
    return this.mining.getSettlement(settlementId);
  }

  @Post("mining/settlements/:settlementId/retry")
  retrySettlement(
    @Param("settlementId") settlementId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.mining.retrySettlement({
      actor: actor(adminId, req),
      idempotencyKey: idem(idempotencyKey),
      settlementId,
      reason: body.reason,
    });
  }

  @Get("mining/high-value-reviews")
  listHighValueReviews(
    @Query("mineId") mineId?: string,
    @Query("userId") userId?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    return this.highValue.listReviews({
      mineId,
      userId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("mining/high-value-reviews/:reviewId")
  getHighValueReview(@Param("reviewId") reviewId: string) {
    return this.highValue.getReview(reviewId);
  }

  @Post("mining/high-value-reviews/:reviewId/approve")
  approveHighValueReview(
    @Param("reviewId") reviewId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.highValue.approve({
      actor: actor(adminId, req),
      idempotencyKey: idem(idempotencyKey),
      reviewId,
      reason: body.reason,
    });
  }

  @Post("mining/high-value-reviews/:reviewId/reject")
  rejectHighValueReview(
    @Param("reviewId") reviewId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.highValue.reject({
      actor: actor(adminId, req),
      idempotencyKey: idem(idempotencyKey),
      reviewId,
      reason: body.reason,
    });
  }
}
