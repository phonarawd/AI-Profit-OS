#!/usr/bin/env node
"use strict";
require("./lib/j0-live-run.cjs")
  .run()
  .catch(() => {
    process.stderr.write("[e2e:j0-admin-auth-live] FAIL\n");
    process.exit(1);
  });
