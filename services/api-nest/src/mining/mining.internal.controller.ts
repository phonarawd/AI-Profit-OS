import {
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { MiningOperationCoordinatorService } from "./mining-operation-coordinator.service";
import { MiningRateActivationService } from "./mining-rate-activation.service";

function requireInternalMiningToken(token: string | undefined) {
  const env = loadPhase0Env();
  const expected = env.internalMiningTickToken;
  if (!expected || !token || token !== expected) {
    throw new UnauthorizedException("인증할 수 없습니다.");
  }
  return env;
}

@Controller("internal/mining")
export class MiningInternalController {
  constructor(
    private readonly operations: MiningOperationCoordinatorService,
    private readonly rateActivation: MiningRateActivationService,
  ) {}

  /**
   * PHASE21 isolated-staging attestation. The mutation E2E runner must prove
   * both the remote API commit and configured Supabase ref before moving money.
   * This is protected by the same fail-closed internal mining token as ticks.
   */
  @Get("staging-identity")
  stagingIdentity(
    @Headers("x-internal-mining-token") token: string | undefined,
  ) {
    const env = requireInternalMiningToken(token);
    return {
      supabaseProjectRef: env.supabaseProjectRef,
      supabaseRegion: env.supabaseRegion,
      nodeEnv: env.nodeEnv,
      gitCommit:
        process.env.RENDER_GIT_COMMIT?.trim() ||
        process.env.GIT_COMMIT_SHA?.trim() ||
        null,
    };
  }

  @Post("settlement-tick")
  async tick(
    @Headers("x-internal-mining-token") token: string | undefined,
    @Query("limit") limit?: string,
  ) {
    requireInternalMiningToken(token);
    const now = new Date();
    await this.operations.assertSettlementAllowed();
    const rates = await this.rateActivation.activateDue(now);
    const settlements = await this.operations.settleDueDaily(
      now,
      limit ? Number(limit) : undefined,
    );
    return { rates, settlements };
  }
}
