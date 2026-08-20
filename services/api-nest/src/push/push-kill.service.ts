/**
 * REL-020 Admin pushEnabled kill.
 * UI는 REL-213. 이 서비스가 발송을 멈춘다.
 * push_control 테이블은 committedUnapplied — 원격 apply 전엔 env/memory.
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

@Injectable()
export class PushKillService {
  private memoryOverride: boolean | null = null;

  constructor(private readonly db: PostgresService) {}

  async getEnabled(): Promise<boolean> {
    if (process.env.PUSH_ENABLED === "false") return false;
    if (this.memoryOverride === false) return false;
    if (this.memoryOverride === true) return true;
    if (!this.db.configured()) return true;
    try {
      const r = await this.db.query<{ push_enabled: boolean }>(
        `SELECT push_enabled FROM public.push_control WHERE id = 1`,
      );
      if (r.rows[0]) return r.rows[0].push_enabled === true;
    } catch {
      // REL-701-DB 전: 테이블 미적용
    }
    return true;
  }

  async getState(): Promise<{
    pushEnabled: boolean;
    source: "env" | "memory" | "db" | "default";
  }> {
    if (process.env.PUSH_ENABLED === "false") {
      return { pushEnabled: false, source: "env" };
    }
    if (this.memoryOverride !== null) {
      return { pushEnabled: this.memoryOverride, source: "memory" };
    }
    if (this.db.configured()) {
      try {
        const r = await this.db.query<{ push_enabled: boolean }>(
          `SELECT push_enabled FROM public.push_control WHERE id = 1`,
        );
        if (r.rows[0]) {
          return {
            pushEnabled: r.rows[0].push_enabled === true,
            source: "db",
          };
        }
      } catch {
        /* unapplied */
      }
    }
    return { pushEnabled: true, source: "default" };
  }

  async putEnabled(input: {
    pushEnabled: boolean;
    reason: string;
    adminId: string;
  }): Promise<{ pushEnabled: boolean }> {
    if (!input.adminId) {
      throw new BadRequestException("adminId required");
    }
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason must be ≥10 characters");
    }
    this.memoryOverride = input.pushEnabled === true;
    if (this.db.configured()) {
      try {
        await this.db.query(
          `UPDATE public.push_control
              SET push_enabled = $1,
                  reason = $2,
                  updated_by_admin_id = $3::uuid,
                  updated_at = now()
            WHERE id = 1`,
          [this.memoryOverride, input.reason.trim(), input.adminId],
        );
      } catch {
        /* unapplied — memory still kills this process */
      }
    }
    return { pushEnabled: this.memoryOverride };
  }
}
