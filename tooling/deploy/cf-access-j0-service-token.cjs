/**
 * 전용 ops Access: 이메일 Allow + service token non_identity.
 * 금지: ai-profit-web-dedicated, app.hiptk.app, pages.dev
 */
"use strict";

const { loadDotEnv } = require("./lib/env.cjs");
loadDotEnv();
const core = require("./lib/cf-access-j0-apply.cjs");

core.main().catch((err) => {
  const msg = String(err && err.message ? err.message : err);
  const blocked = /authentication error|unauthorized|permission/i.test(msg);
  console.error("[cf-access-j0-service-token] " + (blocked ? "BLOCKED_EXTERNAL" : "FAIL") + ": " + msg);
  process.exit(blocked ? 2 : 1);
});
