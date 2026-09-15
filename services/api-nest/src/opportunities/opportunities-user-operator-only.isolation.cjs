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

assert.match(participate, /mall\.supplySource !== "operator"/);
assert.match(participate, /!mall\.schemaReady/);
assert.match(participate, /NotFoundException\("opportunity not found"\)/);

console.log("[opportunities-user-operator-only.isolation] PASS");
