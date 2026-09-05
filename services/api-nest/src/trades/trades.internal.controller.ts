/**
 * 브라우저/Admin JWT 없이 서버가 거래를 종결한다.
 * 토큰 없거나 불일치 → 401 · reconcile 0건.
 */
import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { TradeExecutionService } from "./trades.execution.service";

export const TRADE_INTERNAL_ROUTES = {
  reconcileTick: "internal/trades/reconcile-tick",
} as const;

@Controller()
export class TradesInternalController {
  constructor(private readonly execution: TradeExecutionService) {}

  @Post(TRADE_INTERNAL_ROUTES.reconcileTick)
  reconcileTick(
    @Headers("x-internal-wallet-token") headerToken: string | undefined,
  ) {
    this.assertMachineAuth(headerToken);
    return this.execution.reconcileStuckTrades();
  }

  private assertMachineAuth(headerToken: string | undefined): void {
    const expected = loadPhase0Env().internalWalletTickToken;
    if (!expected) {
      throw new UnauthorizedException("INTERNAL_WALLET_TICK_TOKEN_UNSET");
    }
    if (!headerToken || headerToken !== expected) {
      throw new UnauthorizedException("INTERNAL_WALLET_TICK_TOKEN_INVALID");
    }
  }
}
