/**
 * GET/PUT /api/v1/me/ux-prefs
 * JWT session userId only · query/body userId 권위 금지
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { parseUxPrefsPatch } from "./user-ux-prefs.parse";
import { UX_PREFS_USER_ROUTES } from "./user-ux-prefs.user.routes";
import { UserUxPrefsService } from "./user-ux-prefs.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class UserUxPrefsUserController {
  constructor(private readonly prefs: UserUxPrefsService) {}

  @Get(UX_PREFS_USER_ROUTES.get)
  getPrefs(@Req() req: SessionReq) {
    return this.prefs.getForUser(this.sessionUserId(req));
  }

  @Put(UX_PREFS_USER_ROUTES.put)
  putPrefs(@Req() req: SessionReq, @Body() body: unknown) {
    const parsed = parseUxPrefsPatch(body);
    if ("error" in parsed) {
      throw new BadRequestException(parsed.error);
    }
    return this.prefs.putForUser(this.sessionUserId(req), parsed);
  }

  /** §0.9.3 — never trust query/body userId */
  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) throw new UnauthorizedException("AUTH_REQUIRED");
    return userId;
  }
}
