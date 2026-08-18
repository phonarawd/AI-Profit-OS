import { Module } from "@nestjs/common";
import { OpportunitiesModule } from "../opportunities/opportunities.module";
import { CurrentFxApproxService } from "./current-fx-approx.service";
import { CurrentFxUserController } from "./current-fx.user.controller";

@Module({
  imports: [OpportunitiesModule],
  controllers: [CurrentFxUserController],
  providers: [CurrentFxApproxService],
})
export class CurrentFxModule {}
