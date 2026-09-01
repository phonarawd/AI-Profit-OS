import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { UserUxPrefsService } from "./user-ux-prefs.service";
import { UserUxPrefsUserController } from "./user-ux-prefs.user.controller";

/** UI §38.9·§50.1 — current-user UX prefs */
@Module({
  imports: [EventsModule],
  controllers: [UserUxPrefsUserController],
  providers: [UserUxPrefsService],
  exports: [UserUxPrefsService],
})
export class UserUxPrefsModule {}
