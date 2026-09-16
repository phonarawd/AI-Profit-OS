"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const userSvc = fs.readFileSync(
  path.join(__dirname, "opportunities.user.service.ts"),
  "utf8",
);
const participate = fs.readFileSync(
  path.join(__dirname, "participate.service.ts"),
  "utf8",
);

assert.match(userSvc, /supply_source = 'operator'/);
assert.match(userSvc, /COALESCE\(visibility, 'all_public'\) <> 'private'/);
assert.match(userSvc, /selected_members/);
assert.match(userSvc, /code === "42703"/);
assert.equal(userSvc.includes("legacy_external"), false);
assert.equal(userSvc.includes("isV1FeedArbitrageType"), false);
{
  const listSql = userSvc.slice(
    userSvc.indexOf("private async loadFeedCandidateRows"),
    userSvc.indexOf("private async loadRowById"),
  );
  assert.equal(listSql.includes("pricing->>'compareReady'"), false);
  assert.equal(listSql.includes("NULLIF(BTRIM(asset_image_url)"), false);
  assert.equal(listSql.includes("arbitrage_type = ANY"), false);
  assert.equal(listSql.includes("V1_FEED_ARBITRAGE_TYPES"), false);
}

assert.match(participate, /mall\.supplySource !== "operator"/);
assert.match(participate, /!mall\.schemaReady/);
assert.match(participate, /NotFoundException\("opportunity not found"\)/);
assert.match(participate, /resolveParticipateAmountUsdt/);
assert.match(participate, /zeroCapital/);

require("./operator-mall-user-feed.runtime.cjs");

console.log("[opportunities-user-operator-only.isolation] PASS");
