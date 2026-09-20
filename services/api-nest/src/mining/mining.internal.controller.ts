import { Controller, Headers, Post, Query, UnauthorizedException } from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { MiningService } from "./mining.service";

@Controller("internal/mining")
export class MiningInternalController {
  constructor(private readonly mining: MiningService) {}

  @Post("settlement-tick")
  tick(
    @Headers("x-internal-mining-token") token: string | undefined,
    @Query("limit") limit?: string,
  ) {
    const expected = loadPhase0Env().internalMiningTickToken;
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
    return this.mining.settleDueDaily(new Date(), limit ? Number(limit) : undefined);
  }
}
