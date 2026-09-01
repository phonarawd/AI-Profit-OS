import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { AdminOperator } from "../common/admin-operator.decorator";
import { WALLET_ADMIN_ROUTES } from "./wallet.routes";
import { WithdrawReviewService } from "./withdraw-review.service";

/**
 * Admin wallet?tab=review · 기존 withdraw_intents만 사용.
 */
@UseGuards(AdminGuard)
@Controller("admin")
export class WithdrawReviewAdminController {
  constructor(private readonly review: WithdrawReviewService) {}

  @Get(WALLET_ADMIN_ROUTES.withdrawReviewList)
  list(@Query("limit") limitRaw?: string) {
    return this.review.list({
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
  }

  @Get(WALLET_ADMIN_ROUTES.withdrawReviewGet)
  get(@Param("id") id: string) {
    return this.review.get(id);
  }

  @Post(WALLET_ADMIN_ROUTES.withdrawReviewApprove)
  approve(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.review.decide({
      id,
      decision: "approve",
      adminId: operatorId,
      role: String(req.admin?.role ?? ""),
      reason: String(body.reason ?? body.adminNote ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }

  @Post(WALLET_ADMIN_ROUTES.withdrawReviewReject)
  reject(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @AdminOperator() operatorId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.review.decide({
      id,
      decision: "reject",
      adminId: operatorId,
      role: String(req.admin?.role ?? ""),
      reason: String(body.reason ?? body.adminNote ?? ""),
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
  }
}
