import { Module } from "@nestjs/common";
import { ComplianceModule } from "../compliance/compliance.module";
import { EventsModule } from "../events/events.module";
import { LedgerModule } from "../ledger/ledger.module";
import { MissionModule } from "../missions/mission.module";
import { ReferralModule } from "../referral/referral.module";
import { WalletModule } from "../wallet/wallet.module";
import { AiLogsAdminController } from "./ai-logs.admin.controller";
import { AiLogsAdminService } from "./ai-logs.admin.service";
import { AiPickAdminController } from "./ai-pick.admin.controller";
import { AiPickAdminService } from "./ai-pick.admin.service";
import { AssistantService } from "./assistant.service";
import { CoachController } from "./coach.controller";
import { CoachOrchestrator } from "./coach.orchestrator";
import { ConversationStateService } from "./conversation-state.service";
import { FactToolService } from "./fact-tool.service";
import { HelpRagService } from "./help-rag.service";
import { LlmAdapterService } from "./llm.adapter.service";
import { MemoryService } from "./memory.service";
import { ShadowReplayAdminController } from "./shadow-replay.admin.controller";
import { ShadowReplayAdminService } from "./shadow-replay.admin.service";
import { UserTwinService } from "./user-twin.service";

/**
 * Engine ai-feature-platform + Personal AI §47 + 퍼뜩 Coach §47.15
 * Twin + Memory + Fact tools + Help RAG + CoachOrchestrator
 * L3 money execution 0 · Admin score override 0
 */
@Module({
  imports: [
    EventsModule,
    LedgerModule,
    WalletModule,
    ComplianceModule,
    ReferralModule,
    MissionModule,
  ],
  controllers: [
    AiLogsAdminController,
    AiPickAdminController,
    ShadowReplayAdminController,
    CoachController,
  ],
  providers: [
    AiLogsAdminService,
    AiPickAdminService,
    ShadowReplayAdminService,
    UserTwinService,
    MemoryService,
    AssistantService,
    LlmAdapterService,
    HelpRagService,
    FactToolService,
    ConversationStateService,
    CoachOrchestrator,
  ],
  exports: [
    AiLogsAdminService,
    AiPickAdminService,
    ShadowReplayAdminService,
    UserTwinService,
    MemoryService,
    AssistantService,
    LlmAdapterService,
    HelpRagService,
    FactToolService,
    ConversationStateService,
    CoachOrchestrator,
  ],
})
export class AiModule {}
