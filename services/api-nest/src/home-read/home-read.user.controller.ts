/**
 * GET /api/v1/me/home-read — Engine v7.23 R1 HomeReadModelV1
 * userId = JWT session only · query/body userId FORBIDDEN
 */

import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { HomeReadService } from "./home-read.service";
import { HOME_READ_USER_ROUTES } from "./home-read.user.routes";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

@UseGuards(JwtAuthGuard)
@Controller()
export class HomeReadUserController {
  constructor(private readonly homeRead: HomeReadService) {}

  @Get(HOME_READ_USER_ROUTES.get)
  get(@Req() req: SessionReq) {
    return this.homeRead.getForUser(this.sessionUserId(req));
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
