/**
 * Redis hot cache — Upstash REDIS_URL default (Compose Redis optional).
 */

import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { loadPhase0Env } from "../config/phase0.env";

@Injectable()
export class UpstashRedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  private ensure(): Redis | null {
    if (this.client) return this.client;
    const url = loadPhase0Env().redisUrl;
    if (!url) return null;
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5_000,
    });
    return this.client;
  }

  configured(): boolean {
    return Boolean(loadPhase0Env().redisUrl);
  }

  async ping(): Promise<{ ok: boolean; detail: string }> {
    const c = this.ensure();
    if (!c) return { ok: false, detail: "REDIS_URL unset" };
    try {
      if (c.status === "wait") await c.connect();
      const pong = await c.ping();
      return pong === "PONG"
        ? { ok: true, detail: "up" }
        : { ok: false, detail: pong };
    } catch (e) {
      return {
        ok: false,
        detail: e instanceof Error ? e.message : "redis ping failed",
      };
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }
}
