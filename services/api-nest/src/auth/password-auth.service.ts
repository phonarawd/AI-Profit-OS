/**
 * 아이디 또는 이메일 + 비밀번호 로그인. 계정 존재 여부를 응답으로 드러내지 않음.
 */

import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { hashPassword, needsRehash, verifyPassword } from "./password-hash";
import { AuthService } from "./auth.service";

let dummyHashPromise: Promise<string> | null = null;

function dummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("this-value-never-matches-any-real-account-000");
  }
  return dummyHashPromise;
}

@Injectable()
export class PasswordAuthService {
  constructor(
    private readonly db: PostgresService,
    private readonly auth: AuthService,
  ) {}

  private assertDb(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("DATABASE_URL unset");
    }
  }

  async login(identifierRaw: string, password: string) {
    this.assertDb();
    const identifier = typeof identifierRaw === "string" ? identifierRaw.trim() : "";
    if (!identifier || typeof password !== "string" || !password) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }
    const idCanonical = identifier.toLowerCase();

    const row = await this.db.query<{
      id: string;
      password_hash: string | null;
      status: string;
      email_verified_at: Date | null;
    }>(
      `SELECT id::text, password_hash, status, email_verified_at
         FROM public.users
        WHERE username_canonical = $1 OR email_canonical = $1
        LIMIT 1`,
      [idCanonical],
    );
    const user = row.rows[0];
    const hashToCheck = user?.password_hash ?? (await dummyHash());
    const passwordOk = await verifyPassword(password, hashToCheck);

    if (!user || !user.password_hash || !passwordOk) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }
    if (user.status !== "active") {
      throw new ForbiddenException("ACCOUNT_NOT_ACTIVE");
    }
    if (!user.email_verified_at) {
      throw new ForbiddenException("EMAIL_NOT_VERIFIED");
    }

    if (needsRehash(user.password_hash)) {
      const upgraded = await hashPassword(password);
      await this.db.query(
        `UPDATE public.users SET password_hash = $2, updated_at = now() WHERE id = $1::uuid`,
        [user.id, upgraded],
      );
    }

    return this.auth.mintUserSession(user.id);
  }

  async verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
    this.assertDb();
    const row = await this.db.query<{ password_hash: string | null }>(
      `SELECT password_hash FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    const hash = row.rows[0]?.password_hash;
    if (!hash) return false;
    return verifyPassword(password, hash);
  }
}
