import {
  Controller,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { MiningOperationCoordinatorService } from "./mining-operation-coordinator.service";

@Controller("internal/mining")
export class MiningInternalController {
  constructor(
    private readonly operations: MiningOperationCoordinatorService,
  ) {}

  @Post("settlement-tick")
  tick(
    @Headers("x-internal-mining-token") token: string | undefined,
    @Query("limit") limit?: string,
  ) {
    const expected = loadPhase0Env().internalMiningTickToken;
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException("인증할 수 없습니다.");
    }
    return this.operations.settleDueDaily(
      new Date(),
      limit ? Number(limit) : undefined,
    );
  }
}
