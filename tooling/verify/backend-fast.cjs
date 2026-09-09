/**
 * 백엔드 슬라이스 로컬 재실행용. husky pre-push를 대체하지 않는다.
 */
"use strict";

const { runGateSteps } = require("./gate-runner.cjs");
const { T0_ALWAYS, domainSteps } = require("./gate-tiers.cjs");
const { T1_CORE_ALWAYS, T1_BACKEND } = require("./lib/t1-by-path.cjs");

runGateSteps(
  [...T0_ALWAYS, ...domainSteps(), ...T1_CORE_ALWAYS, ...T1_BACKEND],
  "verify:backend:fast",
);
