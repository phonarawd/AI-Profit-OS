/**
 * Global platform primitives module.
 * Exposes the domain Clock so any domain service can inject it without each
 * feature module re-declaring the provider.
 */

import { Global, Module } from "@nestjs/common";
import { CLOCK_PROVIDER } from "./clock";
import { AdminSessionController } from "./admin-session.controller";

@Global()
@Module({
  controllers: [AdminSessionController],
  providers: [CLOCK_PROVIDER],
  exports: [CLOCK_PROVIDER.provide],
})
export class CommonModule {}
