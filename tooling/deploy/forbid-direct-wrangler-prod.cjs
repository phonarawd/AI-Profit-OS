#!/usr/bin/env node
"use strict";

process.stderr.write(
  "[forbid-direct-wrangler-prod] FAIL_CLOSED:direct_worker_production_wrangler_forbidden\n",
);
process.stderr.write(
  "Production workers deploy only via tooling/release/deploy-from-artifact.cjs after accepted artifact authority.\n",
);
process.exit(1);
