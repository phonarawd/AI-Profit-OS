/**
 * REL-508 · POST /api/v1/me/current-fx/approx
 * JWT session required. Body amounts = display input only.
 */

import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CURRENT_FX_APPROX_USER_ROUTES } from "./current-fx-approx.user.routes";
import { CurrentFxApproxService } from "./current-fx-approx.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class CurrentFxApproxUserController {
  constructor(private readonly currentFx: CurrentFxApproxService) {}

  @Post(CURRENT_FX_APPROX_USER_ROUTES.approx)
  approx(
    @Req() req: SessionReq,
    @Body()
    body: {
      principalUsdt?: string | null;
      withdrawableProfitUsdt?: string | null;
      expectedProfitUsdt?: string | null;
    },
  ) {
    this.sessionUserId(req);
    return this.currentFx.approx({
      principalUsdt: body?.principalUsdt ?? null,
      withdrawableProfitUsdt: body?.withdrawableProfitUsdt ?? null,
      expectedProfitUsdt: body?.expectedProfitUsdt ?? null,
    });
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
