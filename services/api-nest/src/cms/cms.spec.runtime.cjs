"use strict";
const core = require("./cms.core.cjs");
const fails = [];
function check(cond, msg) {
  if (!cond) fails.push(msg);
}
const created = core.applyCreate(
  { kind: "notice", title: "점검 안내", body: "내일 새벽" },
  { id: "11111111-1111-4111-8111-111111111111" },
);
check(created.ok === true && created.item.status === "draft", "create draft");
const published = core.applyPublish(created.item);
check(published.ok === true && published.item.status === "published", "publish");
const ended = core.applyEnd(published.item);
check(ended.ok === true && ended.item.status === "ended", "end");
check(core.projectPublic(ended.item) == null, "ended hidden");
const bad = core.applyCreate({ kind: "notice", title: "보장 수익", body: "x" }, {});
check(bad.code === "FORBIDDEN_COPY", "copy rejected");
if (fails.length) {
  console.error("[cms.spec] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[cms.spec] PASS");
