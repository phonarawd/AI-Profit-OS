import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { InboxModule } from "../inbox/inbox.module";
import { PushModule } from "../push/push.module";
import { CmsAdminController } from "./cms.admin.controller";
import { CmsPublicController } from "./cms.public.controller";
import { CmsService } from "./cms.service";

@Module({
  imports: [EventsModule, InboxModule, PushModule],
  controllers: [CmsAdminController, CmsPublicController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
