import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, type SessionUser } from "../auth/jwt-auth.guard";
import { MiningOperationCoordinatorService } from "./mining-operation-coordinator.service";
import { MiningReadService } from "./mining-read.service";
import { requireMiningIdempotencyKey } from "./mining.service";

type UserRequest = { user?: SessionUser };

function requireUserId(req: UserRequest): string {
  const id = String(req.user?.sub ?? "").trim();
  if (!id) throw new UnauthorizedException("로그인이 필요합니다.");
  return id;
}

@Controller("mines")
export class MineCatalogController {
  constructor(private readonly reads: MiningReadService) {}

  @Get()
  list() {
    return this.reads.listMines();
  }

  @Get(":mineId")
  get(@Param("mineId") mineId: string) {
    return this.reads.getMine(mineId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller("mining")
export class MiningController {
  constructor(
    private readonly reads: MiningReadService,
    private readonly operations: MiningOperationCoordinatorService,
  ) {}

  @Get("me/summary")
  summary(@Req() req: UserRequest) {
    return this.reads.getSummary(requireUserId(req));
  }

  @Get("me/positions")
  positions(@Req() req: UserRequest, @Query("limit") limit?: string) {
    return this.reads.listPositions(
      requireUserId(req),
      limit ? Number(limit) : undefined,
    );
  }

  @Get("me/positions/:positionId")
  position(
    @Req() req: UserRequest,
    @Param("positionId") positionId: string,
  ) {
    return this.reads.getPosition(requireUserId(req), positionId);
  }

  @Get("me/settlements")
  settlements(@Req() req: UserRequest, @Query("limit") limit?: string) {
    return this.reads.listSettlements(
      requireUserId(req),
      limit ? Number(limit) : undefined,
    );
  }

  @Post("positions/start")
  async start(
    @Req() req: UserRequest,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const userId = requireUserId(req);
    const result = await this.operations.startPosition({
      userId,
      mineId: String(body.mineId ?? ""),
      principalAmount: body.principalAmount,
      assetCode: body.assetCode,
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
    });
    return this.reads.getPosition(userId, result.positionId);
  }

  @Post("positions/:positionId/increase")
  async increase(
    @Req() req: UserRequest,
    @Param("positionId") positionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const userId = requireUserId(req);
    await this.operations.increasePosition({
      userId,
      positionId,
      principalAmount: body.principalAmount,
      assetCode: body.assetCode,
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
    });
    return this.reads.getPosition(userId, positionId);
  }

  @Post("positions/:positionId/decrease")
  async decrease(
    @Req() req: UserRequest,
    @Param("positionId") positionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const userId = requireUserId(req);
    await this.operations.decreasePosition({
      userId,
      positionId,
      principalAmount: body.principalAmount,
      assetCode: body.assetCode,
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
    });
    return this.reads.getPosition(userId, positionId);
  }

  @Post("positions/:positionId/end")
  async end(
    @Req() req: UserRequest,
    @Param("positionId") positionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    const userId = requireUserId(req);
    await this.operations.endPosition({
      userId,
      positionId,
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
    });
    return this.reads.getPosition(userId, positionId);
  }
}
