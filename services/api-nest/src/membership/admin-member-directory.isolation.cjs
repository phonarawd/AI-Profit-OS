"use strict";

const { searchMembers, createUnreadyMemberStore, createMemoryMemberStore } = require(
  "./admin-member-directory.core.cjs",
);

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const MISSING = "33333333-3333-4333-8333-333333333333";
const fails = [];
function check(cond, msg) {
  if (!cond) fails.push(msg);
}

async function main() {
  const unready = await searchMembers({ q: USER_A }, createUnreadyMemberStore());
  check(unready.code === "STORE_UNREADY" && unready.applied === false, "unready");

  const store = createMemoryMemberStore([
    { userId: USER_A, membership: "sprout", email: "alpha@example.com", phone: "01012345678" },
    { userId: USER_B, membership: "entry", email: "beta@example.com", phone: "01099998888" },
  ]);

  const badQ = await searchMembers({ q: "not-a-uuid" }, store);
  check(badQ.code === "INVALID_USER" && badQ.httpStatus === 400, "invalid q");

  const nf = await searchMembers({ q: MISSING }, store);
  check(nf.code === "USER_NOT_FOUND" && nf.httpStatus === 404, "404 exact");
  check(nf.substituted === false, "no demo substitute");

  const one = await searchMembers({ q: USER_A }, store);
  check(one.ok === true && one.exact === true && one.items.length === 1, "exact hit");
  check(one.items[0].emailMasked !== "alpha@example.com", "email masked");
  check(one.items[0].phoneMasked !== "01012345678", "phone masked");
  check(one.items[0].userId === USER_A, "id exact");

  const page = await searchMembers({ cursor: "0", limit: 1 }, store);
  check(page.ok === true && page.items.length === 1 && page.nextCursor === "1", "page 1");
  const page2 = await searchMembers({ cursor: "1", limit: 1 }, store);
  check(page2.items[0].userId === USER_B && page2.nextCursor == null, "page 2 end");

  const badCursor = await searchMembers({ cursor: "-1" }, store);
  check(badCursor.code === "INVALID_CURSOR", "bad cursor");

  const src = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "admin-member-directory.core.cjs"),
    "utf8",
  );
  check(!/["'`]\/me\/membership["'`]/.test(src), "does not call /me/membership");

  if (fails.length) {
    console.error("[admin-member-directory.isolation] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[admin-member-directory.isolation] PASS (exact uuid · 404 · mask · page · STORE_UNREADY)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
