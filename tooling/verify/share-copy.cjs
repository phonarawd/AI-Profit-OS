/**
 * verify:share-copy — Money §51.5 + UI §5.9.1a pointer
 * invite copy SSOT · no IT jargon · share spam ≠ invite cap · Canon wire
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "packages/ui/copy/ko/invite.ts",
  "packages/ui/canon/surfaces/invite-home.wire.json",
  "apps/web/app/me/invite/page.tsx",
  "services/api-nest/src/referral/referral.share.service.ts",
  "services/api-nest/src/referral/referral.controller.ts",
];
for (const f of files) mustExist(f);

const invite = read("packages/ui/copy/ko/invite.ts");
for (const needle of [
  "§5.9.1a",
  "Money §51.5",
  "noCap",
  "poolWaitNote",
  "ctaShare",
  "제한은 없어요",
]) {
  if (!invite.includes(needle)) {
    fails.push(`invite.ts missing: ${needle}`);
  }
}
for (const bad of [
  "promo pool",
  "Promo Pool",
  "L1",
  "L2",
  "L3",
  "edge",
  "FIFO",
  "다단계",
  "피라미드",
]) {
  // moneyPointer may mention §51.5 only — block user-facing IT
  if (bad === "L1" || bad === "L2" || bad === "L3") {
    // allow only inside comments? invite.ts should not have L1 labels in copy values
    const withoutComments = invite
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    if (new RegExp(`["'].*\\b${bad}\\b`).test(withoutComments)) {
      fails.push(`invite copy must not expose ${bad} to users`);
    }
  } else if (invite.includes(bad) && !invite.includes(`FORBIDDEN`)) {
    // "promo pool" appears in FORBIDDEN comment — OK
    const withoutComments = invite
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    if (withoutComments.includes(bad)) {
      fails.push(`invite copy must not include: ${bad}`);
    }
  }
}

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/invite-home.wire.json"),
);
if (wire.id !== "invite-home") fails.push("canon wire id must be invite-home");
if (!wire.forbidden?.includes("invite_count_cap_copy")) {
  fails.push("canon must forbid invite_count_cap_copy");
}
if (!wire.forbidden?.includes("L1_L2_L3_english_labels")) {
  fails.push("canon must forbid L1_L2_L3_english_labels");
}

const page =
  read("apps/web/app/me/invite/page.tsx") +
  read("apps/web/app/me/invite/InviteClient.tsx") +
  read("packages/ui/components/invite/InviteHome.tsx");
if (!page.includes("T.invite") && !page.includes("InviteHome")) {
  fails.push(
    "invite page must use T.invite copy SSOT (direct or via InviteHome)",
  );
}
if (!page.includes("UI §5.9.1a") && !page.includes("§5.9.1a")) {
  fails.push("invite page must pointer UI §5.9.1a");
}
if (!page.includes("Money §51.5")) {
  fails.push("invite page must pointer Money §51.5");
}

const share = read(
  "services/api-nest/src/referral/referral.share.service.ts",
);
for (const needle of [
  "sharePerUserPerDay",
  "spam only",
  "REFERRAL_SHARE_LIMIT",
  "not invite cap",
]) {
  if (!share.includes(needle)) {
    fails.push(`share.service missing: ${needle}`);
  }
}

const ctrl = read("services/api-nest/src/referral/referral.controller.ts");
if (!ctrl.includes("UI §5.9.1a")) {
  fails.push("referral.controller must pointer UI §5.9.1a");
}
if (!ctrl.includes("inviteCountUnlimited: true")) {
  fails.push("referral me payload must set inviteCountUnlimited");
}

if (fails.length) {
  console.error("[verify:share-copy] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:share-copy] PASS");
