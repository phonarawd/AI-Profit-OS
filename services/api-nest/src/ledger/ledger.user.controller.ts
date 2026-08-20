import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { LEDGER_USER_ROUTES } from "./ledger.routes";
import { LedgerUserQueryService } from "./ledger.user-query.service";

type SessionReq = {
  user?: { userId?: string; sub?: string };
};

/**
 * REL-015 유저 원장 조회 · /api/v1/me/ledger/*
 * GET only. query.userId 무시. 잔액 UPDATE 0.
 */
@UseGuards(JwtAuthGuard)
@Controller("me/ledger")
export class LedgerUserController {
  constructor(private readonly query: LedgerUserQueryService) {}

  @Get(LEDGER_USER_ROUTES.journals)
  list(
    @Req() req: SessionReq,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.query.listForUser(this.sessionUserId(req), { limit, offset });
  }

  @Get(LEDGER_USER_ROUTES.journalById)
  get(@Req() req: SessionReq, @Param("journalId") journalId: string) {
    return this.query.getForUser(this.sessionUserId(req), journalId);
  }

  private sessionUserId(req: SessionReq): string {
    const userId = String(req.user?.userId ?? req.user?.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return userId;
  }
}
