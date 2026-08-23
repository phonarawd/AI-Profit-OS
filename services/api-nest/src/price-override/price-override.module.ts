import { Module } from "@nestjs/common";
import { PriceOverrideService } from "./price-override.service";

@Module({
  providers: [PriceOverrideService],
  exports: [PriceOverrideService],
})
export class PriceOverrideModule {}
