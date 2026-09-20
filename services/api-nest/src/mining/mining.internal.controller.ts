import {
  Controller,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { MiningOperationCoordinatorService } from "./mining-operation-coordinator.service";
import { MiningRateActivationService } from "./mining-rate-activation.service";

@Controller("internal/mining")
export class MiningInternalController {
  constructor(
    private readonly operations: MiningOperationCoordinatorService,
    private readonly rateActivation: MiningRateActivationService,
  ) {}

  @Post("settlement-tick")
  async tick(
    @Headers("x-internal-mining-token") token: string | undefined,
    @Query("limit") limit?: string,
  ) {
    const expected = loadPhase0Env().internalMiningTickToken;
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException("인증할 수 없습니다.");
    }
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
