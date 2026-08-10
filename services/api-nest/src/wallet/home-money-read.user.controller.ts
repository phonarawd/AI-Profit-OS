/**
 * GET /api/v1/me/home-money-read — Money v7.23 R1
 * userId = JWT session only · query/body userId FORBIDDEN
 * todayPossibleProfitUsdt = Engine R1 Owns (not here)
 */

import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { HOME_MONEY_READ_USER_ROUTES } from "./home-money-read.user.routes";
import { HomeMoneyReadService } from "./home-money-read.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class HomeMoneyReadUserController {
  constructor(private readonly homeMoneyRead: HomeMoneyReadService) {}

  @Get(HOME_MONEY_READ_USER_ROUTES.get)
  get(@Req() req: SessionReq) {
    return this.homeMoneyRead.getForUser(this.sessionUserId(req));
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
