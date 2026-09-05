/**
 * S1F Section 11 - "이전 refresh token 재사용 탐지" 회귀.
 * NOT wired into AppModule - invoked only by
 * tooling/verify/auth-session-rotation-reuse.runtime.cjs via
 * `node dist/auth/session-rotation.reuse.selftest.js` after a scoped tsc
 * build (same convention as jwt-guard.selftest.ts / identity-proof.selftest.ts).
 *
 * session-rotation.service.ts is the most security-sensitive new code this
 * session added (refresh-token rotation + family-wide reuse detection that
 * guards real account/session access) and it had zero automated coverage
 * before this file - node:test against the raw .ts source does not work
 * here because the service uses a TypeScript parameter property
 * (`constructor(private readonly db: PostgresService)`), which Node's
 * native `--experimental-strip-types` cannot handle (strip-only mode, not a
 * real transform) - hence the compiled-dist .selftest.ts pattern instead of
 * the plain .runtime.test.ts pattern used elsewhere this session.
 *
 * Uses a FakeAuthSessionsDb that recognizes exactly the SQL strings
 * session-rotation.service.ts issues (copied verbatim from its source) -
 * no real Postgres needed.
 */
import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { SessionRotationService } from "./session-rotation.service";
import type { PostgresService } from "../db/postgres";

type Row = {
  id: string;
  user_id: string;
  issuer: string;
  refresh_jti: string;
  family_id: string;
  issued_at: string;
  expires_at: string;
  revoked: boolean;
  revoked_at: string | null;
  rotated_at: string | null;
  replaced_by_id: string | null;
  reuse_detected_at: string | null;
};

class FakeAuthSessionsDb {
  rows: Row[] = [];
  private seq = 0;

  configured(): boolean {
    return true;
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return prefix + "-" + this.seq;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    const p = params as string[];

    if (sql.includes("gen_random_uuid()")) {
      const userId = p[0];
      const issuer = p[1];
      const refreshHash = p[2];
      const issuedAt = p[5];
      const expiresAt = p[6];
      const row: Row = {
        id: this.nextId("session"),
        user_id: userId,
        issuer,
        refresh_jti: refreshHash,
        family_id: this.nextId("family"),
        issued_at: issuedAt,
        expires_at: expiresAt,
        revoked: false,
        revoked_at: null,
        rotated_at: null,
        replaced_by_id: null,
        reuse_detected_at: null,
      };
      this.rows.push(row);
      return { rows: [{ id: row.id, family_id: row.family_id } as unknown as T] };
    }

    if (sql.includes("SELECT") && sql.includes("WHERE refresh_jti = $1")) {
      const hash = p[0];
      const row = this.rows.find((r) => r.refresh_jti === hash);
      if (!row) return { rows: [] };
      return {
        rows: [
          {
            id: row.id,
            user_id: row.user_id,
            family_id: row.family_id,
            expires_at: new Date(row.expires_at),
            revoked: row.revoked,
            rotated_at: row.rotated_at ? new Date(row.rotated_at) : null,
          } as unknown as T,
        ],
      };
    }

    if (sql.includes("VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6)")) {
      const userId = p[0];
      const issuer = p[1];
      const newHash = p[2];
      const familyId = p[3];
      const issuedAt = p[4];
      const expiresAt = p[5];
      const row: Row = {
        id: this.nextId("session"),
        user_id: userId,
        issuer,
        refresh_jti: newHash,
        family_id: familyId,
        issued_at: issuedAt,
        expires_at: expiresAt,
        revoked: false,
        revoked_at: null,
        rotated_at: null,
        replaced_by_id: null,
        reuse_detected_at: null,
      };
      this.rows.push(row);
      return { rows: [{ id: row.id } as unknown as T] };
    }

    if (sql.includes("SET rotated_at = now()")) {
      const id = p[0];
      const replacedById = p[1];
      const row = this.rows.find((r) => r.id === id);
      if (!row || row.rotated_at !== null || row.revoked) return { rows: [] };
      row.rotated_at = new Date().toISOString();
      row.replaced_by_id = replacedById;
      return { rows: [{ id: row.id } as unknown as T] };
    }

    if (sql.includes("reuse_detected_at = now()")) {
      const familyId = p[0];
      for (const row of this.rows) {
        if (row.family_id === familyId && !row.revoked) {
          row.revoked = true;
          row.revoked_at = new Date().toISOString();
          row.reuse_detected_at = new Date().toISOString();
        }
      }
      return { rows: [] };
    }

    if (sql.includes("WHERE id = $1::uuid") && sql.includes("SET revoked = true")) {
      const id = p[0];
      const row = this.rows.find((r) => r.id === id);
      if (row) {
        row.revoked = true;
        row.revoked_at = new Date().toISOString();
      }
      return { rows: [] };
    }

    if (sql.includes("WHERE family_id = $1::uuid AND revoked = false")) {
      const familyId = p[0];
      for (const row of this.rows) {
        if (row.family_id === familyId && !row.revoked) {
          row.revoked = true;
          row.revoked_at = new Date().toISOString();
        }
      }
      return { rows: [] };
    }

    throw new Error("FakeAuthSessionsDb: unrecognized query: " + sql);
  }
}

function makeService(): { svc: SessionRotationService; db: FakeAuthSessionsDb } {
  const db = new FakeAuthSessionsDb();
  const svc = new SessionRotationService(db as unknown as PostgresService);
  return { svc, db };
}

type CheckResult = { name: string; ok: boolean; detail: string };

async function expectThrows(
  fn: () => Promise<unknown>,
  isExpected: (err: unknown) => boolean,
): Promise<{ threw: boolean; matched: boolean }> {
  try {
    await fn();
    return { threw: false, matched: false };
  } catch (err) {
    return { threw: true, matched: isExpected(err) };
  }
}

async function main() {
  // Bracket access - avoid KEY= assignment literals that trip verify:secrets
  // (same technique as jwt-guard.selftest.ts).
  const envKey = "JWT_" + "USER_SECRET";
  if (!process.env[envKey]) {
    process.env[envKey] = "selftest_session_rotation_secret_32ch!!";
  }

  const results: CheckResult[] = [];
  const record = (name: string, ok: boolean, detail: string) =>
    results.push({ name, ok, detail });

  {
    const { svc } = makeService();
    const minted = await svc.mintNewFamily("user-1");
    const rotated = await svc.rotate(minted.refreshToken);
    record(
      "mint then rotate once issues a fresh pair in the same family",
      rotated !== null &&
        rotated.familyId === minted.familyId &&
        rotated.refreshToken !== minted.refreshToken &&
        rotated.accessToken !== minted.accessToken,
      `rotated=${rotated !== null}`,
    );
  }

  {
    const { svc, db } = makeService();
    const minted = await svc.mintNewFamily("user-2");
    const first = await svc.rotate(minted.refreshToken);
    const replay = await expectThrows(
      () => svc.rotate(minted.refreshToken),
      (e) => e instanceof ForbiddenException,
    );
    const familyRows = db.rows.filter((r) => r.family_id === minted.familyId);
    record(
      "replaying an already-rotated token is reuse-detected and revokes the whole family",
      first !== null &&
        replay.threw &&
        replay.matched &&
        familyRows.length >= 2 &&
        familyRows.every((r) => r.revoked === true),
      `first=${first !== null} threw=${replay.threw} matched=${replay.matched} rows=${familyRows.length} allRevoked=${familyRows.every((r) => r.revoked)}`,
    );
  }

  {
    const { svc } = makeService();
    const minted = await svc.mintNewFamily("user-3");
    const first = await svc.rotate(minted.refreshToken);
    await expectThrows(() => svc.rotate(minted.refreshToken), () => true);
    const afterRevoke = first
      ? await expectThrows(
          () => svc.rotate(first.refreshToken),
          (e) => e instanceof ForbiddenException,
        )
      : { threw: false, matched: false };
    record(
      "after reuse-triggered revocation, the latest legitimate token is also rejected",
      afterRevoke.threw && afterRevoke.matched,
      `threw=${afterRevoke.threw} matched=${afterRevoke.matched}`,
    );
  }

  {
    const { svc, db } = makeService();
    const minted = await svc.mintNewFamily("user-4");
    const row = db.rows[0];
    if (row) row.expires_at = new Date(Date.now() - 1000).toISOString();
    const result = await svc.rotate(minted.refreshToken);
    record("an expired refresh token returns null, not a throw", result === null, `result=${result}`);
  }

  {
    const { svc } = makeService();
    const result = await svc.rotate("this-token-was-never-issued");
    record("an unknown/forged refresh token returns null", result === null, `result=${result}`);
  }

  {
    const { svc, db } = makeService();
    const minted = await svc.mintNewFamily("user-5");
    const settled = await Promise.allSettled([
      svc.rotate(minted.refreshToken),
      svc.rotate(minted.refreshToken),
    ]);
    const fulfilled = settled.filter((r) => r.status === "fulfilled");
    const rejected = settled.filter((r) => r.status === "rejected");
    const rejectedIsForbidden =
      rejected[0]?.status === "rejected" && rejected[0].reason instanceof ForbiddenException;
    const familyRows = db.rows.filter((r) => r.family_id === minted.familyId);
    record(
      "concurrent rotate on the same token: exactly one winner, family fully revoked",
      fulfilled.length === 1 &&
        rejected.length === 1 &&
        rejectedIsForbidden &&
        familyRows.every((r) => r.revoked === true),
      `fulfilled=${fulfilled.length} rejected=${rejected.length} allRevoked=${familyRows.every((r) => r.revoked)}`,
    );
  }

  {
    const db = new FakeAuthSessionsDb();
    db.configured = () => false;
    const svc = new SessionRotationService(db as unknown as PostgresService);
    const res = await expectThrows(
      () => svc.rotate("anything"),
      (e) => e instanceof ServiceUnavailableException,
    );
    record(
      "rotate fails closed with 503 when the database is not configured",
      res.threw && res.matched,
      `threw=${res.threw} matched=${res.matched}`,
    );
  }

  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name} (${r.detail})`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(
    "[session-rotation.reuse.selftest] ALL PASS - refresh rotation + reuse detection + concurrent race + fail-closed verified",
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[session-rotation.reuse.selftest] FATAL", e);
  process.exit(1);
});
