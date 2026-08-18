#!/usr/bin/env node
/** verify:plans-ssot — workspace .cursor/plans SSOT · home mirror hash match */
"use strict";
process.argv.push("--check");
require("../cursor/sync-plans-ssot.cjs");
