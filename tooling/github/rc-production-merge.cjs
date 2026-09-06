/**
 * RC/production merge required checks — source contract only.
 * Daily main-gate.ruleset.json (verify-gate) is not sufficient.
 * Live GitHub ruleset apply is not this module.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const CONTRACT_REL = "rc-production-merge.required-checks.v1.json";

function loadContract() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, CONTRACT_REL), "utf8"));
}

function requiredContexts(contract) {
  const src = contract || loadContract();
  return (src.required_status_checks || []).map((row) => row.context);
}

function isRcProductionMergeable(completedContexts, contract) {
  const have = new Set(Array.isArray(completedContexts) ? completedContexts : []);
  const required = requiredContexts(contract);
  const missing = required.filter((ctx) => !have.has(ctx));
  return {
    mergeable: required.length > 1 && missing.length === 0,
    missing,
    required,
  };
}

module.exports = {
  CONTRACT_REL,
  loadContract,
  requiredContexts,
  isRcProductionMergeable,
};
