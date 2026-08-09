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

  /** Hot Twin / session cache — no-op when REDIS_URL unset */
  async get(key: string): Promise<string | null> {
    const c = await this.ready();
    if (!c) return null;
    return c.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSec?: number,
  ): Promise<boolean> {
    const c = await this.ready();
    if (!c) return false;
    if (ttlSec != null && Number.isFinite(ttlSec) && ttlSec > 0) {
      await c.set(key, value, "EX", Math.floor(ttlSec));
    } else {
      await c.set(key, value);
    }
    return true;
  }

  async del(key: string): Promise<boolean> {
    const c = await this.ready();
    if (!c) return false;
    await c.del(key);
    return true;
  }

  async incr(key: string): Promise<number | null> {
    const c = await this.ready();
    if (!c) return null;
    return c.incr(key);
  }

  async expire(key: string, ttlSec: number): Promise<boolean> {
    const c = await this.ready();
    if (!c) return false;
    if (!Number.isFinite(ttlSec) || ttlSec <= 0) return false;
    await c.expire(key, Math.floor(ttlSec));
    return true;
  }

  private async ready(): Promise<Redis | null> {
    const c = this.ensure();
    if (!c) return null;
    try {
      if (c.status === "wait") await c.connect();
      return c;
    } catch {
      return null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }
}
