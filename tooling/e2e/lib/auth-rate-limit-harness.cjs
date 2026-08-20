/**
 * REL-010 QA harness — 반복 요청을 프로덕션이 아니라 로컬 limiter에만 넣는다.
 */
const {
  assertQaIsolation,
} = require("./qa-env-isolation-guard.cjs");
const limiter = require("../../../services/api-nest/auth-rate-limit.cjs");

function runAuthRateLimitRepeat(opts = {}) {
  assertQaIsolation({
    purpose: opts.purpose || "e2e",
    host: opts.host || "127.0.0.1",
  });
  limiter.resetAuthRateLimitStore();
  const prevMax = process.env.AUTH_RATE_LIMIT_MAX;
  const prevWindow = process.env.AUTH_RATE_LIMIT_WINDOW_MS;
  process.env.AUTH_RATE_LIMIT_MAX = String(opts.max || 3);
  process.env.AUTH_RATE_LIMIT_WINDOW_MS = String(opts.windowMs || 60_000);
  const nowMs = opts.nowMs || Date.now();
  const results = [];
  try {
    const total = (opts.max || 3) + 1;
    for (let i = 0; i < total; i += 1) {
      results.push(
        limiter.decideAuthRateLimit({
          ip: "127.0.0.1",
          account: opts.account || "qa@local",
          route: "POST /api/v1/auth/signup",
          nowMs,
        }),
      );
    }
  } finally {
    if (prevMax == null) delete process.env.AUTH_RATE_LIMIT_MAX;
    else process.env.AUTH_RATE_LIMIT_MAX = prevMax;
    if (prevWindow == null) delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    else process.env.AUTH_RATE_LIMIT_WINDOW_MS = prevWindow;
    limiter.resetAuthRateLimitStore();
  }
  return results;
}

module.exports = { runAuthRateLimitRepeat };
