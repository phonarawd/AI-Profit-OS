/**
 * GET /api/v1/me/day-pulse — UI §51.24 live only
 * userId = JWT session (auth) · Admin 수동 숫자 필드 0
 */

import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DAY_PULSE_USER_ROUTES } from "./day-pulse.user.routes";
import { DayPulseService } from "./day-pulse.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class DayPulseUserController {
  constructor(private readonly dayPulse: DayPulseService) {}

  @Get(DAY_PULSE_USER_ROUTES.get)
  async get(@Req() req: SessionReq) {
    this.sessionUserId(req);
    return this.dayPulse.getToday();
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
