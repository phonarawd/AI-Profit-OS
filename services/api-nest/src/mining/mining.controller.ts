import { Body, Controller, Get, Headers, Param, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MiningService } from "./mining.service";
import { MINING_USER_ROUTES } from "./mining.routes";

type SessionReq = { user?: { userId?: string; sub?: string } };
type AmountBody = { amountUsdt?: string };

@UseGuards(JwtAuthGuard)
@Controller()
export class MiningController {
  constructor(private readonly mining: MiningService) {}
  @Get(MINING_USER_ROUTES.mines) mines() { return this.mining.listMines(); }
  @Get(MINING_USER_ROUTES.mine) mine(@Param("mineId") id: string) { return this.mining.getMine(id); }
  @Get(MINING_USER_ROUTES.summary) summary(@Req() r: SessionReq) { return this.mining.summary(this.user(r)); }
  @Get(MINING_USER_ROUTES.positions) positions(@Req() r: SessionReq) { return this.mining.listPositions(this.user(r)); }
  @Get(MINING_USER_ROUTES.position) position(@Param("positionId") id: string, @Req() r: SessionReq) { return this.mining.getPosition(this.user(r), id); }
  @Get(MINING_USER_ROUTES.settlements) settlements(@Req() r: SessionReq) { return this.mining.listSettlements(this.user(r)); }
  @Post(MINING_USER_ROUTES.start) start(@Body() b: AmountBody & { mineId?: string }, @Headers("idempotency-key") k: string, @Req() r: SessionReq) { return this.mining.start(this.user(r), b.mineId ?? "", b.amountUsdt ?? "", k); }
  @Post(MINING_USER_ROUTES.increase) increase(@Param("positionId") id: string, @Body() b: AmountBody, @Headers("idempotency-key") k: string, @Req() r: SessionReq) { return this.mining.change(this.user(r), id, "INCREASE", b.amountUsdt ?? "", k); }
  @Post(MINING_USER_ROUTES.decrease) decrease(@Param("positionId") id: string, @Body() b: AmountBody, @Headers("idempotency-key") k: string, @Req() r: SessionReq) { return this.mining.change(this.user(r), id, "DECREASE", b.amountUsdt ?? "", k); }
  @Post(MINING_USER_ROUTES.end) end(@Param("positionId") id: string, @Headers("idempotency-key") k: string, @Req() r: SessionReq) { return this.mining.change(this.user(r), id, "END", null, k); }
  private user(r: SessionReq) { const id = String(r.user?.userId ?? r.user?.sub ?? ""); if (!id) throw new UnauthorizedException("AUTH_REQUIRED"); return id; }
}
