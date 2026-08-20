/**
 * REL-015 Bootstrap harness — 권한/빈목록/정상목록.
 * 프로덕션 DB 호출 0.
 */
const core = require("../../../services/api-nest/ledger-user-query.core.cjs");

function runLedgerUserQueryCases() {
  const empty = core.listJournalsForUser({ journals: [] }, "user-a", {});
  const listed = core.listJournalsForUser(core.fixtureStore(), "user-a", {
    limit: "20",
    offset: "0",
  });
  const other = core.getJournalForUser(
    core.fixtureStore(),
    "user-a",
    "j-other",
  );
  const unauth = core.listJournalsForUser(core.fixtureStore(), "", {});
  return { empty, listed, other, unauth };
}

module.exports = { runLedgerUserQueryCases };
