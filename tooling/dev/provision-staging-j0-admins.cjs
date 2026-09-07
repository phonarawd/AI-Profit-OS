#!/usr/bin/env node
/**
 * staging 테스트 관리자 4명. founder.ops 는 회전하지 않는다.
 * production Render srv-da5r1tqjobas73fl16dg 거절.
 * founder.ops 회전 금지.
 */
"use strict";

const { loadDotEnv } = require("../deploy/lib/env.cjs");
loadDotEnv();
require("./lib/provision-j0-run.cjs")
  .main()
  .catch((err) => {
    process.stderr.write("[provision-staging-j0-admins] FAIL\n");
    process.exit(1);
  });
