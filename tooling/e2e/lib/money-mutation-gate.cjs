/**
 * 금융 mutation 테스트 진입점. 가드 PASS 전에 콜백을 실행하지 않는다.
 */
const { assertQaIsolation } = require("./qa-env-isolation-guard.cjs");

function runMoneyMutationTest(fn, opts = {}) {
  assertQaIsolation({ ...opts, purpose: "money_mutation" });
  return fn();
}

module.exports = { runMoneyMutationTest };
