/**
 * POST /api/v1/me/current-fx/approx
 * JWT required. userId is not used for financial reads.
 * Mutation 0. Raw GET 0.
 */
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentFxApproxService } from "./current-fx-approx.service";
import { CURRENT_FX_USER_ROUTES } from "./current-fx.routes";

@UseGuards(JwtAuthGuard)
@Controller()
export class CurrentFxUserController {
  constructor(private readonly approx: CurrentFxApproxService) {}

  @Post(CURRENT_FX_USER_ROUTES.approx)
  apply(@Body() body: unknown) {
    return this.approx.apply(body);
  }
}
