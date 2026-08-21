#!/usr/bin/env node
/** verify:plans-ssot — plan integrity + workspace/home mirror hash match */
"use strict";
require("./plans-integrity.cjs");
process.argv.push("--check");
require("../cursor/sync-plans-ssot.cjs");
