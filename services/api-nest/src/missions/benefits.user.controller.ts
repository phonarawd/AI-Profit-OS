/**
 * User benefits · GET /api/v1/me/benefits(+ /summary)
 * Money §51.8a.7 · money-user-benefits-read
 * userId = JWT session only (§0.9.3 · query/body userId FORBIDDEN)
 * POST sync / SSE = out of gate
 */

import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BENEFITS_USER_ROUTES } from "./benefits.user.routes";
import { BenefitsUserService } from "./benefits.user.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

/** P0-1 fix — JwtAuthGuard populates req.user from a real verified session */
@UseGuards(JwtAuthGuard)
@Controller()
export class BenefitsUserController {
  constructor(private readonly benefits: BenefitsUserService) {}

  @Get(BENEFITS_USER_ROUTES.list)
  list(@Req() req: SessionReq) {
    return this.benefits.listForUser(this.sessionUserId(req));
  }

  @Get(BENEFITS_USER_ROUTES.summary)
  summary(@Req() req: SessionReq) {
    return this.benefits.summaryForUser(this.sessionUserId(req));
  }

  /** §0.9.3 — never trust query/body userId */
  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
