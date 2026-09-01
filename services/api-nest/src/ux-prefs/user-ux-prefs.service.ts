/**
 * public.user_ux_prefs — JWT userId 스코프만.
 * Production DDL/backfill 없음. 행은 lazy INSERT ON CONFLICT DO NOTHING.
 */

import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import type { UserUxPrefsV1 } from "./user-ux-prefs.defaults";
import type { UxPrefsPatch } from "./user-ux-prefs.parse";
import {
  UxPrefsUnavailableError,
  ensureUxPrefsRow,
  readUxPrefsForUser,
  writeUxPrefsForUser,
} from "./user-ux-prefs.store";

@Injectable()
export class UserUxPrefsService {
  constructor(private readonly db: PostgresService) {}

  async ensureDefaultsForUser(userId: string): Promise<void> {
    try {
      await ensureUxPrefsRow(this.db, userId);
    } catch (err) {
      if (err instanceof UxPrefsUnavailableError) {
        throw new ServiceUnavailableException("UX_PREFS_UNAVAILABLE");
      }
      throw err;
    }
  }

  async getForUser(userId: string): Promise<UserUxPrefsV1> {
    try {
      return await readUxPrefsForUser(this.db, userId);
    } catch (err) {
      if (err instanceof UxPrefsUnavailableError) {
        throw new ServiceUnavailableException("UX_PREFS_UNAVAILABLE");
      }
      throw err;
    }
  }

  async putForUser(userId: string, patch: UxPrefsPatch): Promise<UserUxPrefsV1> {
    try {
      return await writeUxPrefsForUser(this.db, userId, patch);
    } catch (err) {
      if (err instanceof UxPrefsUnavailableError) {
        throw new ServiceUnavailableException("UX_PREFS_UNAVAILABLE");
      }
      throw err;
    }
  }
}
