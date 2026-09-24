import {
  Controller,
  Get,
  Headers,
  Patch,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminOperator } from "../common/admin-operator.decorator";
import { AdminGuard, type RequestWithAdmin } from "../common/admin.guard";
import { requireMiningIdempotencyKey } from "./mining.service";
import { MiningTrialService } from "./mining-trial.service";

function actor(adminId: string, req: RequestWithAdmin) {
  return { adminId, role: req.admin?.role ?? "unknown" };
}

@UseGuards(AdminGuard)
@Controller("admin/mining/trial-config")
export class MiningTrialAdminController {
  constructor(private readonly trial: MiningTrialService) {}

  @Get()
  getTrialConfig() {
    return this.trial.getTrialConfig();
  }

  @Patch()
  updateTrialConfig(
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
    @AdminOperator() adminId: string,
    @Req() req: RequestWithAdmin,
  ) {
    return this.trial.updateTrialConfig({
      actor: actor(adminId, req),
      idempotencyKey: requireMiningIdempotencyKey(idempotencyKey),
      body,
    });
  }
}
