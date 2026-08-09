import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { InboxUserController } from "./inbox.user.controller";
import { NotificationPrefsService } from "./notification-prefs.service";
import { OpsInboxAdminController } from "./ops-inbox.admin.controller";
import { OpsInboxService } from "./ops-inbox.service";

/**
 * UI §5.9.4 · §50.1n · Admin §9.8.8d Nest contract
 */
@Module({
  imports: [EventsModule],
  controllers: [InboxUserController, OpsInboxAdminController],
  providers: [OpsInboxService, NotificationPrefsService],
  exports: [OpsInboxService, NotificationPrefsService],
})
export class InboxModule {}
