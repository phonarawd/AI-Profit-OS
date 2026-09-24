#!/usr/bin/env node
/**
 * PUTDUK MINE local development preflight.
 *
 * This mode is development-only and intentionally does not talk to Supabase.
 * It uses the repository's existing local PostgreSQL/Redis Docker stack.
 */
const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..", "..");

function fail(message) {
  console.error(`[mine-local] FAIL: ${message}`);
  process.exit(1);
}

if ((process.env.NODE_ENV || "development").toLowerCase() === "production") {
  fail("NODE_ENV=production에서는 로컬 Mine 모드를 사용할 수 없습니다.");
}

// Supabase 환경변수는 유지해도 된다. 이 스크립트는 Production Supabase를 사용하거나
// 변경하지 않으며, DATABASE_URL이 로컬 PostgreSQL인지 여부만 강제한다.

const expectedDatabaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://aipo:aipo_dev_only@127.0.0.1:5432/aipo";
const expectedRedisUrl =
  process.env.REDIS_URL || "redis://127.0.0.1:6379";

if (!/^(postgres(?:ql)?:\\/\\/127\\.0\\.0\\.1:5432\\/aipo|postgres(?:ql)?:\\/\\/localhost:5432\\/aipo)/i.test(expectedDatabaseUrl)) {
  fail(`DATABASE_URL은 로컬 PostgreSQL이어야 합니다: ${expectedDatabaseUrl}`);
}

if (!/^redis:\\/\\/(127\\.0\\.0\\.1|localhost):6379$/i.test(expectedRedisUrl)) {
  fail(`REDIS_URL은 로컬 Redis여야 합니다: ${expectedRedisUrl}`);
}

if (!existsSync(join(root, "docker-compose.dev.yml"))) {
  fail("docker-compose.dev.yml을 찾을 수 없습니다.");
}

const compose = spawnSync(
  "docker",
  ["compose", "-f", "docker-compose.dev.yml", "config", "--quiet"],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);

if (compose.error || compose.status !== 0) {
  fail("Docker Compose 설정 검증에 실패했습니다.");
}

console.log("[mine-local] PASS");
console.log("[mine-local] DB  :", expectedDatabaseUrl.replace(/:[^:@]+@/, ":[redacted]@"));
console.log("[mine-local] Redis:", expectedRedisUrl);
console.log("[mine-local] Supabase: connected/retained, not touched by this local step");
console.log("[mine-local] 다음 단계: pnpm mine:local:up");
