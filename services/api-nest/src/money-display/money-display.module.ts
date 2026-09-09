import { Module } from "@nestjs/common";
import { KrwDisplayService } from "./krw-display.service";

@Module({
  providers: [KrwDisplayService],
  exports: [KrwDisplayService],
})
export class MoneyDisplayModule {}
