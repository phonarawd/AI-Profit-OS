/**
 * verify:rel-202-admin-users — /admin/users honest empty + jump
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const page = fs.readFileSync(
  path.join(root, "apps/admin/app/admin/users/page.tsx"),
  "utf8",
);

if (page.includes("Admin §9.1.1 골격") && !page.includes("user-list")) {
  fails.push("users list must not stay stub-only");
}
for (const needle of [
  'data-metric="user-list"',
  'data-truth="unavailable"',
  "admin-user-jump",
  "/admin/users/${id}",
  "isUuid",
]) {
  if (!page.includes(needle)) fails.push(`users page missing ${needle}`);
}
if (/fakeUsers|mockUsers|회원 수.*=.*0/.test(page)) {
  fails.push("users page must not invent a member table or zero count");
}

if (fails.length) {
  console.error("[verify:rel-202-admin-users] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-202-admin-users] PASS");
