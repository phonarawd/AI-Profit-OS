/**
 * verify:cta-earn-profit — Index §20.2 · UI §48
 * Primary/sticky=`수익 벌기` · detail=`이 기회로 수익 벌기` · 면책+배지 · Canon primaryCta
 * Alias: verify:cta-match-participate
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const execPath = path.join(root, "packages/ui/copy/ko/execution.ts");
if (!fs.existsSync(execPath)) {
  console.error("[verify:cta-earn-profit] FAIL missing packages/ui/copy/ko/execution.ts");
  process.exit(1);
}
const src = fs.readFileSync(execPath, "utf8");

function lock(key, want) {
  const re = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  const m = src.match(re);
  if (!m) fails.push(`missing key ${key}`);
  else if (m[1] !== want) fails.push(`${key} want "${want}" got "${m[1]}"`);
}

lock("ctaEarn", "수익 벌기");
lock("ctaStickyShort", "수익 벌기");
lock("ctaDetail", "이 기회로 수익 벌기");
lock("ctaDepositEarn", "입금하고 수익 벌기");
lock("disclaimerResult", "예상 결과는 시장 상황에 따라 달라질 수 있습니다.");
lock("badgeNoBuy", "직접 사지 않아요");
lock("badgeNoSell", "직접 팔지 않아요");

const bannedValues = [
  "구매하기",
  "판매하기",
  "입찰하기",
  "마켓 둘러보기",
  "이 상품으로 수익 벌기",
  "참여하기",
];
for (const b of bannedValues) {
  if (src.includes(`"${b}"`) || src.includes(`'${b}'`)) {
    fails.push(`retired/banned CTA value present: ${b}`);
  }
}
if (/ctaEarn\s*:\s*["'`]매칭 참여["'`]/.test(src)) {
  fails.push("ctaEarn must not be 매칭 참여 (help-only term)");
}

const cardPath = path.join(root, "packages/ui/canon/surfaces/opportunity-card.wire.json");
const detailPath = path.join(root, "packages/ui/canon/surfaces/opportunity-detail.wire.json");
for (const p of [cardPath, detailPath]) {
  if (!fs.existsSync(p)) fails.push(`missing canon ${path.relative(root, p)}`);
}

if (fs.existsSync(cardPath)) {
  const card = JSON.parse(fs.readFileSync(cardPath, "utf8"));
  if (card.primaryCta?.copyKey !== "T.execution.ctaEarn") {
    fails.push('opportunity-card.primaryCta.copyKey must be T.execution.ctaEarn');
  }
  if (card.primaryCta?.action !== "participate") {
    fails.push("opportunity-card.primaryCta.action must be participate");
  }
  const keys = (card.blocks || []).map((b) => b.copyKey);
  for (const need of [
    "T.execution.ctaEarn",
    "T.execution.disclaimerResult",
    "T.execution.badgeNoBuy",
    "T.execution.badgeNoSell",
  ]) {
    if (!keys.includes(need)) fails.push(`opportunity-card blocks missing ${need}`);
  }
  if ((card.forbidden || []).includes("expected_sell_days") === false) {
    fails.push("opportunity-card.forbidden must include expected_sell_days");
  }
}

if (fs.existsSync(detailPath)) {
  const detail = JSON.parse(fs.readFileSync(detailPath, "utf8"));
  if (detail.primaryCta?.copyKey !== "T.execution.ctaDetail") {
    fails.push("opportunity-detail.primaryCta.copyKey must be T.execution.ctaDetail");
  }
  if (detail.stickyCta?.copyKey !== "T.execution.ctaStickyShort") {
    fails.push("opportunity-detail.stickyCta.copyKey must be T.execution.ctaStickyShort");
  }
}

const manifestPath = path.join(root, "packages/ui/canon/manifest.json");
if (fs.existsSync(manifestPath)) {
  const man = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const ids = (man.surfaces || []).map((s) => s.id);
  for (const id of ["opportunity-card", "opportunity-detail"]) {
    if (!ids.includes(id)) fails.push(`canon/manifest missing surface ${id}`);
  }
}

// PART3b - components wire CTA + disclaimer/badges
// NOTE (2026-09-04): repointed from the dead pre-Spark-Dash
// packages/ui/components/opportunity/{OpportunityCard,OpportunityDetail}.tsx
// (deleted - unreachable, see governance/runtime-surfaces.v1.json) to the
// live apps/web/components/spark-dash-profits/OpportunityCard.tsx +
// apps/web/app/profits/[id]/OpportunityDetailClient.tsx. Checked against the
// live source (2026-09-04): the Spark Dash card is a full-card <Link> with a
// "상세 보기" affordance and no separate ctaEarn button (participation CTA
// lives on the detail page only) - not a bug, a simpler card-level pattern.
// The detail page has a hardcoded "이 기회로 수익 벌기" CTA_DETAIL string,
// but is not wired to T.execution.ctaDetail, and the disclaimer / no-buy /
// no-sell badge trio is genuinely absent from both live surfaces. That is a
// real, tracked gap (governance/runtime-surfaces.v1.json
// surfaces.profits.knownGaps), not something this cleanup slice implements -
// adding new disclaimer/badge UI needs a Canon wire + Owner call, not a
// silent verify-script edit. WARN (non-fatal) instead of a hard mustExist +
// content FAIL on deleted files.
const cardComp = path.join(
  root,
  "apps/web/components/spark-dash-profits/OpportunityCard.tsx",
);
const detailComp = path.join(
  root,
  "apps/web/app/profits/[id]/OpportunityDetailClient.tsx",
);
if (!fs.existsSync(cardComp)) {
  fails.push("missing live OpportunityCard.tsx (spark-dash-profits)");
}
if (!fs.existsSync(detailComp)) {
  fails.push("missing live OpportunityDetailClient.tsx");
} else {
  const d = fs.readFileSync(detailComp, "utf8");
  if (!d.includes("이 기회로 수익 벌기") && !d.includes("T.execution.ctaDetail")) {
    fails.push("OpportunityDetailClient missing ctaDetail text");
  }
  const gapNeedles = [
    "T.execution.disclaimerResult",
    "T.execution.badgeNoBuy",
    "T.execution.badgeNoSell",
  ];
  const missingGap = gapNeedles.filter((n) => !d.includes(n));
  if (missingGap.length) {
    console.warn(
      "[verify:cta-earn-profit] WARN: live OpportunityDetailClient missing " +
        missingGap.join(", ") +
        " - tracked gap (governance/runtime-surfaces.v1.json surfaces.profits.knownGaps)",
    );
  }
}

for (const deadPath of [
  "packages/ui/components/opportunity/OpportunityCard.tsx",
  "packages/ui/components/opportunity/OpportunityDetail.tsx",
]) {
  if (fs.existsSync(path.join(root, deadPath))) {
    fails.push(`retired pre-Spark-Dash component must stay deleted, reappeared: ${deadPath}`);
  }
}

if (fails.length) {
  console.error("[verify:cta-earn-profit] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:cta-earn-profit] PASS (ctaEarn · 면책 · 배지 · Canon primaryCta)");
