/**
 * User opportunities · GET feed/detail · POST participate
 * Engine §0.9 E-R3 / E-R4 · separate from OpportunitiesAdminController
 * userId = JWT session only (§0.9.3 · query/body userId FORBIDDEN)
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OPPORTUNITY_USER_ROUTES } from "./opportunities.user.routes";
import { OpportunitiesUserService } from "./opportunities.user.service";
import {
  ParticipateService,
  type ParticipateBody,
} from "./participate.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

/** P0-1 fix — JwtAuthGuard populates req.user from a real verified session */
@UseGuards(JwtAuthGuard)
@Controller()
export class OpportunitiesUserController {
  constructor(
    private readonly opportunities: OpportunitiesUserService,
    private readonly participateSvc: ParticipateService,
  ) {}

  @Get(OPPORTUNITY_USER_ROUTES.list)
  list(@Req() req: SessionReq) {
    return this.opportunities.listFeed(this.sessionUserId(req));
  }

  @Get(OPPORTUNITY_USER_ROUTES.get)
  get(@Param("id") id: string, @Req() req: SessionReq) {
    return this.opportunities.getById(this.sessionUserId(req), id);
  }

  @Post(OPPORTUNITY_USER_ROUTES.participate)
  participate(
    @Param("id") id: string,
    @Body() body: ParticipateBody,
    @Req() req: SessionReq,
  ) {
    return this.participateSvc.participate(
      this.sessionUserId(req),
      id,
      body ?? {},
    );
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
