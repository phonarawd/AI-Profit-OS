import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [EventsModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
