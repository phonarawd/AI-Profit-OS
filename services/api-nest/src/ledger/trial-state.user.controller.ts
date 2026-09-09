/**
 * GET /api/v1/me/trial-state
 * userId = JWT session only · query/body userId 금지
 */

import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TrialStateService } from "./trial-state.service";
import { TRIAL_STATE_USER_ROUTES } from "./trial-state.user.routes";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class TrialStateUserController {
  constructor(private readonly trialState: TrialStateService) {}

  @Get(TRIAL_STATE_USER_ROUTES.get)
  get(@Req() req: SessionReq) {
    return this.trialState.getForUser(this.sessionUserId(req));
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
