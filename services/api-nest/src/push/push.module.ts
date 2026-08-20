import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { InboxModule } from "../inbox/inbox.module";
import { PushDispatchClient } from "./push-dispatch.client";
import { PushEmitService } from "./push-emit.service";
import { PushKillAdminController } from "./push-kill.admin.controller";
import { PushKillService } from "./push-kill.service";
import { PushSubscriptionService } from "./push-subscription.service";
import { PushUserController } from "./push.user.controller";

@Module({
  imports: [EventsModule, InboxModule],
  controllers: [PushUserController, PushKillAdminController],
  providers: [
    PushKillService,
    PushSubscriptionService,
    PushDispatchClient,
    PushEmitService,
  ],
  exports: [PushEmitService, PushKillService],
})
export class PushModule {}
