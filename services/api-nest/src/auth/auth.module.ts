import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { LedgerModule } from "../ledger/ledger.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [EventsModule, LedgerModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
