import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { InboxModule } from "../inbox/inbox.module";
import { LedgerModule } from "../ledger/ledger.module";
import { PostgresService } from "../db/postgres";
import { ResendEmailProvider } from "../wallet/resend-email.provider";
import { AuthController } from "./auth.controller";
import { AuthRateLimitGuard } from "./auth-rate-limit.guard";
import { AuthService } from "./auth.service";
import { PrivacyAccountService } from "./privacy-account.service";
import { MagicLinkService } from "./magic-link.service";
import { OauthIdentityService, defaultOauthHttp } from "./oauth-identity.service";
import { WebauthnAssertService } from "./webauthn-assert.service";
import { PostgresProofStore } from "./identity-proof.store";

@Module({
  imports: [EventsModule, LedgerModule, InboxModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrivacyAccountService,
    AuthRateLimitGuard,
    ResendEmailProvider,
    {
      provide: PostgresProofStore,
      useFactory: (db: PostgresService) => new PostgresProofStore(db),
      inject: [PostgresService],
    },
    {
      provide: MagicLinkService,
      useFactory: (store: PostgresProofStore, resend: ResendEmailProvider) =>
        new MagicLinkService(store, resend),
      inject: [PostgresProofStore, ResendEmailProvider],
    },
    {
      provide: OauthIdentityService,
      useFactory: (store: PostgresProofStore) =>
        new OauthIdentityService(store, defaultOauthHttp()),
      inject: [PostgresProofStore],
    },
    {
      provide: WebauthnAssertService,
      useFactory: (store: PostgresProofStore) => new WebauthnAssertService(store),
      inject: [PostgresProofStore],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
