import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { WALLET_ADMIN_ROUTES } from "./wallet.routes";
import { WithdrawReviewAdminService } from "./withdraw-review.admin.service";

@UseGuards(AdminGuard)
@Controller("admin")
export class WithdrawReviewAdminController {
  constructor(private readonly review: WithdrawReviewAdminService) {}

  @Get(WALLET_ADMIN_ROUTES.withdrawReviews)
  list(
    @Query("status") status?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
  ) {
    return this.review.list({
      status,
      limit: limitRaw ? Number(limitRaw) : undefined,
      offset: offsetRaw ? Number(offsetRaw) : undefined,
    });
  }
}
