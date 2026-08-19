/**
 * User trades · GET state · POST execute-tick (Phase0 polling)
 * Engine §0.9 E-R5 · §48.13
 * userId = JWT session only (§0.9.3 · query/body userId FORBIDDEN)
 */

import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TRADE_USER_ROUTES } from "./trades.user.routes";
import { TradeExecutionService } from "./trades.execution.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

/** P0-1 fix — JwtAuthGuard populates req.user from a real verified session */
@UseGuards(JwtAuthGuard)
@Controller()
export class TradesUserController {
  constructor(private readonly execution: TradeExecutionService) {}

  @Get(TRADE_USER_ROUTES.list)
  list(@Req() req: SessionReq) {
    return this.execution.list(this.sessionUserId(req));
  }

  @Get(TRADE_USER_ROUTES.get)
  get(@Param("id") id: string, @Req() req: SessionReq) {
    return this.execution.get(this.sessionUserId(req), id);
  }

  @Post(TRADE_USER_ROUTES.executeTick)
  executeTick(@Param("id") id: string, @Req() req: SessionReq) {
    return this.execution.executeTick(this.sessionUserId(req), id);
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
