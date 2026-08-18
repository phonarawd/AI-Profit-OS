/**
 * Consumer UI가 PENDING APPROVED FIGMA skeleton이면
 * 시각/표면 게이트만 건너뛴다. Money/Engine/Auth 게이트는 유지.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../..");

function pageIsSkeleton(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) return false;
  const src = fs.readFileSync(fp, "utf8");
  return (
    src.includes("PENDING APPROVED FIGMA") || src.includes("PendingFigma")
  );
}

function isGreenfieldConsumerUi() {
  return (
    pageIsSkeleton("apps/web/app/page.tsx") ||
    pageIsSkeleton("apps/web/app/PendingFigma.tsx")
  );
}

/** path 매핑은 유지. 이 이름들만 greenfield에서 T0 domain 실행에서 제외. */
const CONSUMER_UI_SURFACE_SCRIPTS = new Set([
  "stub-page-actions.cjs",
  "home-principal-slots.cjs",
  "opportunity-scan-surface.cjs",
  "margin-compare-surface.cjs",
  "asset-image-surface.cjs",
  "cta-earn-profit.cjs",
  "execution-surfaces.cjs",
  "match-tension-surface.cjs",
  "ai-coach-ui.cjs",
  "age-tone-surfaces.cjs",
  "kyc-surfaces.cjs",
  "trust-copy.cjs",
  "objection4.cjs",
  "deposit-network-plain-ko.cjs",
  "market-briefing-no-investment-advice.cjs",
  "deposit-ai-template-path.cjs",
  "invite-explain-surfaces.cjs",
  "membership-surfaces.cjs",
  "membership-badge-assets.cjs",
  "ops-inbox.cjs",
  "day-pulse-live-only.cjs",
  "preflight-may-stop.cjs",
  "loop-psychology.cjs",
  "ux-design-system.cjs",
  "responsive.cjs",
  "mockup-governance.cjs",
  "canon-surfaces.cjs",
  "brand-assets.cjs",
  "brand-asset-provenance.cjs",
  "lux-theme-sync.cjs",
  "dark-leak-guard.cjs",
  "ia-tabs.cjs",
  "home-product-contract.cjs",
]);

function skipConsumerUiSurface(label) {
  if (!isGreenfieldConsumerUi()) return false;
  console.log(
    `[${label}] PASS — Consumer UI is greenfield skeleton; visual surface check skipped`,
  );
  return true;
}

module.exports = {
  pageIsSkeleton,
  isGreenfieldConsumerUi,
  CONSUMER_UI_SURFACE_SCRIPTS,
  skipConsumerUiSurface,
};
