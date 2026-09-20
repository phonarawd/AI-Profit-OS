import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, type SessionUser } from "../auth/jwt-auth.guard";
import { MiningService, requireMiningIdempotencyKey } from "./mining.service";

type UserRequest = { user?: SessionUser };

function userId(req: UserRequest): string {
  return String(req.user?.sub ?? "");
}

@Controller("mines")
export class MineCatalogController {
  constructor(private readonly mining: MiningService) {}

  @Get()
  list() {
    return this.mining.listMines();
  }

  @Get(":mineId")
  get(@Param("mineId") mineId: string) {
    return this.mining.getMine(mineId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller("mining")
export class MiningController {
  constructor(private readonly mining: MiningService) {}

  @Get("me/summary")
  summary(@Req() req: UserRequest) {
    return this.mining.getSummary(userId(req));
  }

  @Get("me/positions")
  positions(@Req() req: UserRequest, @Query("limit") limit?: string) {
    return this.mining.listPositions(userId(req), limit ? Number(limit) : undefined);
  }

  @Get("me/positions/:positionId")
  position(@Req() req: UserRequest, @Param("positionId") positionId: string) {
    return this.mining.getPosition(userId(req), positionId);
  }

  @Get("me/settlements")
  settlements(@Req() req: UserRequest, @Query("limit") limit?: string) {
    return this.mining.listSettlements(userId(req), limit ? Number(limit) : undefined);
  }

  @Post("positions/start")
  start(
    @Req() req: UserRequest,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.mining.startPosition({
      userId: userId(req),
      mineId: String(body.mineId ?? ""),
      principalUsdt: body.principalUsdt,
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
    });
  }

  @Post("positions/:positionId/increase")
  increase(
    @Req() req: UserRequest,
    @Param("positionId") positionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.mining.increasePosition({
      userId: userId(req),
      positionId,
      amountUsdt: body.amountUsdt,
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
    });
  }

  @Post("positions/:positionId/decrease")
  decrease(
    @Req() req: UserRequest,
    @Param("positionId") positionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.mining.decreasePosition({
      userId: userId(req),
      positionId,
      amountUsdt: body.amountUsdt,
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
    });
  }

  @Post("positions/:positionId/end")
  end(
    @Req() req: UserRequest,
    @Param("positionId") positionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    return this.mining.endPosition({
      userId: userId(req),
      positionId,
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
    });
  }
}
