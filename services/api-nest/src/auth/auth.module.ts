import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { InboxModule } from "../inbox/inbox.module";
import { LedgerModule } from "../ledger/ledger.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrivacyAccountService } from "./privacy-account.service";

@Module({
  imports: [EventsModule, LedgerModule, InboxModule],
  controllers: [AuthController],
  providers: [AuthService, PrivacyAccountService],
  exports: [AuthService],
})
export class AuthModule {}
