/** J0 테스트 관리자 자격. 값을 출력하지 않는다. */
"use strict";

function envCred(prefix, fallbackId) {
  return {
    identifier: String(process.env[prefix + "_IDENTIFIER"] || "").trim() || fallbackId,
    password: String(process.env[prefix + "_PASSWORD"] || "").trim(),
    totpSecret: String(process.env[prefix + "_TOTP_SECRET"] || "").trim(),
    backups: String(process.env[prefix + "_BACKUP_CODES"] || "")
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean),
  };
}

function j0Accounts() {
  return {
    maker: envCred("STAGING_J0_MAKER", "j0maker.ops"),
    checker: envCred("STAGING_J0_CHECKER", "j0checker.ops"),
    viewer: envCred("STAGING_J0_VIEWER", "j0viewer.ops"),
    idle: envCred("STAGING_J0_IDLE", "j0idle.ops"),
  };
}

function markRange(items, from, to, status, why) {
  for (let i = from; i <= to; i += 1) {
    items[i] = { id: i + 1, status, why };
  }
}

module.exports = { envCred, j0Accounts, markRange };
