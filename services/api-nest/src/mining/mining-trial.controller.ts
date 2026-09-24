import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, type SessionUser } from "../auth/jwt-auth.guard";
import { requireMiningIdempotencyKey } from "./mining.service";
import { MiningTrialService } from "./mining-trial.service";

type UserRequest = { user?: SessionUser };

function requireUserId(req: UserRequest): string {
  const id = String(req.user?.sub ?? "").trim();
  if (!id) throw new UnauthorizedException("로그인이 필요합니다.");
  return id;
}

@UseGuards(JwtAuthGuard)
@Controller("mining/trial")
export class MiningTrialController {
  constructor(private readonly trial: MiningTrialService) {}

  @Get()
  getTrialStatus(@Req() req: UserRequest) {
    return this.trial.getStatus(requireUserId(req));
  }

  @Post("start")
  startTrial(
    @Req() req: UserRequest,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.trial.startTrial({
      userId: requireUserId(req),
      mineId: String(body.mineId ?? ""),
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
    });
  }
}
