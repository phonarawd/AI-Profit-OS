"use strict";
const { putPolicies } = require("./cf-access-j0-put.cjs");
const { resolveAppAndToken } = require("./cf-access-j0-resolve.cjs");
const { resolveServiceToken } = require("./cf-access-j0-token.cjs");
async function main() {
  const app = await resolveAppAndToken();
  const tok = await resolveServiceToken();
  await putPolicies(Object.assign({}, app, tok));
}
module.exports = { main };
