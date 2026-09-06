import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { ProductOnboardingService } from "./product-onboarding.service";
import { ProductOnboardingUserController } from "./product-onboarding.user.controller";

@Module({
  imports: [EventsModule],
  controllers: [ProductOnboardingUserController],
  providers: [ProductOnboardingService],
  exports: [ProductOnboardingService],
})
export class ProductOnboardingModule {}
