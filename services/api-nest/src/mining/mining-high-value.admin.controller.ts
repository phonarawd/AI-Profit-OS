import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminOperator } from "../common/admin-operator.decorator";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { MiningHighValueService } from "./mining-high-value.service";
import { requireMiningIdempotencyKey } from "./mining.service";

function actor(adminId: string, req: RequestWithAdmin) {
  return { adminId, role: req.admin?.role ?? "unknown" };
}

@UseGuards(AdminGuard)
@Controller("admin/mining/high-value")
export class MiningHighValueAdminController {
  constructor(private readonly highValue: MiningHighValueService) {}

  @Get("reviews")
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

  @Get("reviews/:reviewId")
  getHighValueReview(@Param("reviewId") reviewId: string) {
    return this.highValue.getReview(reviewId);
  }

  @Post("reviews/:reviewId/approve")
  approveHighValueReview(
    @Param("reviewId") reviewId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.highValue.approve({
      actor: actor(adminId, req),
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
      reviewId,
      reason: body.reason,
    });
  }

  @Post("reviews/:reviewId/reject")
  rejectHighValueReview(
    @Param("reviewId") reviewId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.highValue.reject({
      actor: actor(adminId, req),
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
      reviewId,
      reason: body.reason,
    });
  }
}
