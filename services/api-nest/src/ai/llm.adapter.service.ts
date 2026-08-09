/**
 * Nest LLM Adapter — Engine §47.13 · quota · degrade
 */

import { Injectable } from "@nestjs/common";
import { loadPhase0Env, type LlmProviderId } from "../config/phase0.env";
import { UpstashRedisService } from "../redis/upstash";
import {
  createLlmAdapter,
  degradeAnswerPath,
  llmAdapterChat,
  quotaKeyRpd,
  quotaKeyRpm,
  shouldDegradeForQuota,
} from "./ai.engine";

export type LlmChatRequest = {
  messages: Array<{ role: string; content: string }>;
  tools?: unknown[];
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  lane?: "P" | "G" | "S";
};

export type LlmChatResponse = {
  degraded: boolean;
  provider_id: LlmProviderId | string;
  provider_effective: LlmProviderId | string;
  text: string;
  finish_reason: string;
  answer_path?: string | null;
  degrade_reason?: string | null;
};

@Injectable()
export class LlmAdapterService {
  constructor(private readonly redis: UpstashRedisService) {}

  configuredProvider(): LlmProviderId {
    return loadPhase0Env().llmProvider;
  }

  private adapterConfig() {
    const env = loadPhase0Env();
    return {
      llmApiKey: env.llmApiKey,
      geminiApiKey: env.geminiApiKey,
      geminiModel: env.geminiModel,
      openaiModel: env.openaiModel,
      groqModel: env.groqModel,
      ollamaModel: env.ollamaModel,
      llmBaseUrl: env.llmBaseUrl,
    };
  }

  private async readQuotaCounts(providerId: string) {
    const now = Date.now();
    const rpmKey = quotaKeyRpm(providerId, now);
    const rpdKey = quotaKeyRpd(providerId, now);
    const rpmRaw = await this.redis.get(rpmKey);
    const rpdRaw = await this.redis.get(rpdKey);
    return {
      rpmCount: rpmRaw != null ? Number(rpmRaw) : 0,
      rpdCount: rpdRaw != null ? Number(rpdRaw) : 0,
    };
  }

  private async bumpQuota(providerId: string) {
    const now = Date.now();
    const rpmKey = quotaKeyRpm(providerId, now);
    const rpdKey = quotaKeyRpd(providerId, now);
    const rpm = await this.redis.incr(rpmKey);
    if (rpm === 1) await this.redis.expire(rpmKey, 120);
    const rpd = await this.redis.incr(rpdKey);
    if (rpd === 1) await this.redis.expire(rpdKey, 86_400);
    return { rpm, rpd };
  }

  async chat(input: LlmChatRequest): Promise<LlmChatResponse> {
    const env = loadPhase0Env();
    const providerId = env.llmProvider;
    const lane = input.lane ?? "G";

    if (providerId === "none") {
      const hint = degradeAnswerPath(lane, true);
      return {
        degraded: true,
        provider_id: "none",
        provider_effective: "none",
        text: hint?.text ?? "",
        finish_reason: "degraded",
        answer_path: hint?.path ?? "template",
        degrade_reason: "provider_none",
      };
    }

    const counts = await this.readQuotaCounts(providerId);
    const quota = shouldDegradeForQuota({
      rpmCount: counts.rpmCount,
      rpdCount: counts.rpdCount,
      softRpm: env.llmQuotaSoftRpm,
      softRpd: env.llmQuotaSoftRpd,
    });

    if (quota.degrade) {
      const hint = degradeAnswerPath(lane, true);
      return {
        degraded: true,
        provider_id: providerId,
        provider_effective: "none",
        text: hint?.text ?? "",
        finish_reason: "degraded",
        answer_path: hint?.path ?? "template",
        degrade_reason: quota.reason,
      };
    }

    const adapter = createLlmAdapter(providerId, this.adapterConfig());
    let result = await llmAdapterChat(adapter, {
      messages: input.messages,
      tools: lane === "G" ? [] : input.tools,
      stream: input.stream,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    });

    if (!result.degraded) {
      await this.bumpQuota(providerId);
    }

    if (result.degraded && result.finish_reason === "quota") {
      const retry = await llmAdapterChat(createLlmAdapter(providerId, this.adapterConfig()), {
        messages: input.messages,
        tools: lane === "G" ? [] : input.tools,
        stream: false,
        maxTokens: input.maxTokens,
        temperature: input.temperature,
      });
      if (!retry.degraded) {
        result = retry;
        await this.bumpQuota(providerId);
      }
    }

    if (result.degraded) {
      const hint = degradeAnswerPath(lane, true);
      return {
        degraded: true,
        provider_id: result.provider_id,
        provider_effective: "none",
        text: hint?.text ?? "",
        finish_reason: result.finish_reason,
        answer_path: hint?.path ?? "template",
        degrade_reason: result.reason ?? result.error_kind ?? "llm_degraded",
      };
    }

    return {
      degraded: false,
      provider_id: result.provider_id,
      provider_effective: result.provider_effective,
      text: result.text,
      finish_reason: result.finish_reason,
      answer_path: lane === "G" ? "llm_g" : "llm_p",
    };
  }
}
