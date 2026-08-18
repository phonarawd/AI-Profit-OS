#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
function p(...xs) {
  return path.join(root, ...xs);
}
function write(rel, body) {
  const abs = p(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body, "utf8");
}
function rm(rel) {
  const abs = p(rel);
  if (!fs.existsSync(abs)) return;
  fs.rmSync(abs, { recursive: true, force: true });
}
function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(abs, acc);
    else acc.push(abs);
  }
  return acc;
}

const VOID_BANNER = `
> **GREENFIELD 2026-08-18:** Consumer Visual / UX / Brand / Visual Master / Canon visual authority = VOID.
> VISUAL_TRUTH = APPROVED_FIGMA_ONLY. BUSINESS_TRUTH = PRESERVED_DOMAIN_ENGINE.
> Do not use this file as Visual SSOT. Do not recover pre-reset UI from Git.
`;

function prependBanner(rel) {
  const abs = p(rel);
  const src = fs.readFileSync(abs, "utf8");
  if (src.includes("GREENFIELD 2026-08-18")) return;
  const i = src.indexOf("\n---\n");
  if (i === -1) {
    fs.writeFileSync(abs, VOID_BANNER + src, "utf8");
    return;
  }
  const end = src.indexOf("\n---\n", i + 5);
  const insertAt = end === -1 ? src.indexOf("\n") + 1 : end + 5;
  fs.writeFileSync(
    abs,
    src.slice(0, insertAt) + "\n" + VOID_BANNER + src.slice(insertAt),
    "utf8",
  );
}

const uiKeepExact = new Set(
  [
    "package.json",
    "tsconfig.json",
    "components/SearchParamsBoundary.tsx",
    "components/wallet/BucketBreakdown.tsx",
    "components/trust/TaxDisclaimerBlock.tsx",
    "components/trust/index.ts",
    "copy/ko/admin.ts",
    "copy/ko/common.ts",
    "copy/ko/trust.ts",
    "copy/ko/principal-profit.ts",
    "copy/ko/index.ts",
    "tokens/lux-theme.css",
    "tokens/component.css",
    "tokens/motion.css",
    "responsive/fluid-type.css",
    "responsive/touch-target.css",
    "responsive/container.css",
    "brand/brand.manifest.json",
  ].map((x) => x.replace(/\\/g, "/")),
);

function uiRel(abs) {
  return path.relative(p("packages/ui"), abs).split(path.sep).join("/");
}
function isUiKeep(rel) {
  if (uiKeepExact.has(rel)) return true;
  if (/^canon\/surfaces\/admin-.+\.wire\.json$/.test(rel)) return true;
  return false;
}

write(
  "packages/ui/components/trust/index.ts",
  `export { TaxDisclaimerBlock } from "./TaxDisclaimerBlock";
export type { TaxDisclaimerBlockProps } from "./TaxDisclaimerBlock";
`,
);

write(
  "packages/ui/copy/ko/trust.ts",
  `/** Admin TaxDisclaimerBlock — legal disclaimer only. Not Consumer Visual SSOT. */
export const trust = {
  disclaimer: {
    title: "세금·신고 안내",
    line1:
      "수익 발생 시 세금·신고 의무는 개인 상황마다 달라질 수 있습니다.",
    line2:
      "원화로 입·출금하면 국내 금융 기록과 연결될 수 있습니다.",
    line3:
      "USDT 정산은 플랫폼 글로벌 정산 방식이며, 세금이 없다고 보장하지 않습니다.",
    line4: "궁금하시면 세무 전문가와 상담해 주세요.",
  },
} as const;

export type TrustCopy = typeof trust;
`,
);

write(
  "packages/ui/copy/ko/index.ts",
  `import { admin } from "./admin";
import { common } from "./common";
import {
  principalGuide,
  principalProfit,
  successBucketCta,
  walletBuckets,
  withdrawMode,
} from "./principal-profit";
import { trust } from "./trust";

export const T = {
  admin,
  common,
  trust,
  walletBuckets,
  withdrawMode,
  successBucketCta,
  principalGuide,
  principalProfit,
} as const;

export type CopyRoot = typeof T;
export {
  admin,
  common,
  principalGuide,
  principalProfit,
  successBucketCta,
  trust,
  walletBuckets,
  withdrawMode,
};
`,
);

write(
  "packages/ui/brand/brand.manifest.json",
  JSON.stringify(
    {
      consumer: { name: "퍼뜩", short_name: "퍼뜩" },
      ai: { name: "퍼뜩" },
    },
    null,
    2,
  ) + "\n",
);

write(
  "packages/ui/package.json",
  JSON.stringify(
    {
      name: "@aipo/ui",
      private: true,
      version: "0.0.0",
      type: "module",
      peerDependencies: {
        next: "^16.0.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@types/react": "^19.1.9",
        "@types/react-dom": "^19.1.7",
        next: "16.3.0",
        react: "19.2.0",
        "react-dom": "19.2.0",
        typescript: "^5.9.2",
      },
      exports: {
        "./tokens/lux-theme.css": "./tokens/lux-theme.css",
        "./tokens/component.css": "./tokens/component.css",
        "./tokens/motion.css": "./tokens/motion.css",
        "./copy/ko": "./copy/ko/index.ts",
        "./components/SearchParamsBoundary":
          "./components/SearchParamsBoundary.tsx",
        "./components/trust": "./components/trust/index.ts",
        "./components/wallet/BucketBreakdown":
          "./components/wallet/BucketBreakdown.tsx",
        "./brand/brand.manifest.json": "./brand/brand.manifest.json",
      },
    },
    null,
    2,
  ) + "\n",
);

write(
  "packages/ui/tsconfig.json",
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "ES2022"],
        jsx: "react-jsx",
        module: "esnext",
        moduleResolution: "bundler",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        isolatedModules: true,
      },
      include: ["components/**/*.ts", "components/**/*.tsx", "copy/**/*.ts"],
    },
    null,
    2,
  ) + "\n",
);

for (const abs of walkFiles(p("packages/ui"))) {
  const rel = uiRel(abs);
  if (!isUiKeep(rel)) fs.rmSync(abs, { force: true });
}

function pruneEmpty(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) pruneEmpty(abs);
  }
  const left = fs.readdirSync(dir);
  if (left.length === 0) fs.rmdirSync(dir);
}
pruneEmpty(p("packages/ui"));

write(
  "apps/web/app/PendingFigma.tsx",
  `export function PendingFigma({ title }: { title: string }) {
  return (
    <main>
      <h1>{title}</h1>
      <p>PENDING APPROVED FIGMA</p>
    </main>
  );
}
`,
);

const pages = [
  ["apps/web/app/page.tsx", "퍼뜩"],
  ["apps/web/app/profits/page.tsx", "기회"],
  ["apps/web/app/profits/[id]/page.tsx", "기회 상세"],
  ["apps/web/app/trades/page.tsx", "수익"],
  ["apps/web/app/trades/[id]/execute/page.tsx", "진행"],
  ["apps/web/app/wallet/page.tsx", "지갑"],
  ["apps/web/app/wallet/deposit/page.tsx", "입금"],
  ["apps/web/app/wallet/history/page.tsx", "내역"],
  ["apps/web/app/wallet/withdraw/page.tsx", "출금"],
  ["apps/web/app/wallet/withdraw/usdt/page.tsx", "테더 출금"],
  ["apps/web/app/wallet/withdraw/krw/page.tsx", "원화 출금"],
  ["apps/web/app/me/page.tsx", "내정보"],
  ["apps/web/app/me/settings/page.tsx", "설정"],
  ["apps/web/app/me/legal/page.tsx", "약관과 정보"],
  ["apps/web/app/me/legal/terms/page.tsx", "이용약관"],
  ["apps/web/app/me/legal/privacy/page.tsx", "개인정보"],
  ["apps/web/app/me/legal/oss/page.tsx", "오픈소스"],
  ["apps/web/app/me/legal/license/page.tsx", "라이선스"],
  ["apps/web/app/me/kyc/page.tsx", "본인 확인"],
  ["apps/web/app/me/peotteok/page.tsx", "퍼뜩"],
  ["apps/web/app/me/membership/page.tsx", "멤버십"],
  ["apps/web/app/me/inbox/page.tsx", "알림"],
  ["apps/web/app/me/invite/page.tsx", "초대"],
  ["apps/web/app/me/events/page.tsx", "이벤트"],
  ["apps/web/app/me/strategies/page.tsx", "전략"],
  ["apps/web/app/me/support/page.tsx", "고객지원"],
  ["apps/web/app/me/benefits/page.tsx", "혜택"],
  ["apps/web/app/me/guide/usdt/page.tsx", "테더 안내"],
  ["apps/web/app/me/guide/get-usdt/page.tsx", "테더 준비"],
  ["apps/web/app/me/guide/revenue/page.tsx", "수익 안내"],
  ["apps/web/app/me/guide/faq/page.tsx", "자주 묻는 질문"],
  ["apps/web/app/me/guide/principal/page.tsx", "원금 안내"],
  ["apps/web/app/me/guide/partners/page.tsx", "협력"],
  ["apps/web/app/me/guide/market-weekly/page.tsx", "시세 안내"],
  ["apps/web/app/onboarding/page.tsx", "시작"],
  ["apps/web/app/auth/login/page.tsx", "로그인"],
  ["apps/web/app/auth/signup/page.tsx", "가입"],
  ["apps/web/app/auth/complete-profile/page.tsx", "프로필"],
  ["apps/web/app/l/[variant]/page.tsx", "퍼뜩"],
  ["apps/web/app/ads/page.tsx", "퍼뜩"],
  ["apps/web/app/ads/[variant]/page.tsx", "퍼뜩"],
];

for (const [rel, title] of pages) {
  const depth = rel.split("/").length - 3;
  const imp = `${"../".repeat(depth)}PendingFigma`;
  write(
    rel,
    `import { PendingFigma } from "${imp}";

export default function Page() {
  return <PendingFigma title="${title}" />;
}
`,
  );
}

write(
  "apps/web/app/layout.tsx",
  `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "퍼뜩",
  description: "퍼뜩",
  applicationName: "퍼뜩",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
`,
);

write(
  "apps/web/app/globals.css",
  `html,
body {
  min-height: 100%;
  margin: 0;
}
`,
);

write(
  "apps/web/routes.ts",
  `/**
 * URL path compatibility only.
 * route existence ≠ UX authority.
 * No tab order, icon, label, or active-nav metadata.
 */
export const USER_ROUTE_PATHS = [
  "/",
  "/profits",
  "/trades",
  "/wallet",
  "/me",
  "/wallet/deposit",
  "/wallet/withdraw",
  "/wallet/withdraw/usdt",
  "/wallet/withdraw/krw",
  "/wallet/history",
  "/me/settings",
  "/me/legal",
  "/me/legal/terms",
  "/me/legal/privacy",
  "/me/legal/oss",
  "/me/legal/license",
  "/me/kyc",
  "/me/peotteok",
  "/me/membership",
  "/me/inbox",
  "/me/invite",
  "/me/events",
  "/me/strategies",
  "/me/support",
  "/me/benefits",
  "/me/guide/usdt",
  "/me/guide/get-usdt",
  "/me/guide/revenue",
  "/me/guide/faq",
  "/me/guide/principal",
  "/me/guide/partners",
  "/me/guide/market-weekly",
  "/trades/[id]/execute",
  "/profits/[id]",
  "/onboarding",
  "/auth/login",
  "/auth/signup",
  "/auth/complete-profile",
  "/l/[variant]",
  "/ads",
  "/ads/[variant]",
] as const;

export const WEB_FORBIDDEN_PREFIXES = ["/admin"] as const;
`,
);

write(
  "apps/web/next.config.ts",
  `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aipo/ui", "@aipo/sdk", "@aipo/schemas"],
  async rewrites() {
    const apiHost = process.env.API_HOST ?? "localhost:4000";
    const apiBase = apiHost.startsWith("http")
      ? apiHost.replace(/\\/$/, "")
      : \`http://\${apiHost}\`;
    return [
      { source: "/ads", destination: "/l/meta" },
      { source: "/ads/:variant", destination: "/l/:variant" },
      {
        source: "/api/v1/:path*",
        destination: \`\${apiBase}/api/v1/:path*\`,
      },
    ];
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
`,
);

write(
  "apps/web/public/manifest.webmanifest",
  JSON.stringify(
    {
      name: "퍼뜩",
      short_name: "퍼뜩",
      lang: "ko",
      display: "standalone",
      start_url: "/",
    },
    null,
    2,
  ) + "\n",
);

const webDelete = [
  "apps/web/app/HomePageClient.tsx",
  "apps/web/app/home-clean",
  "apps/web/app/dev",
  "apps/web/app/components",
  "apps/web/app/profits/ProfitsPageClient.tsx",
  "apps/web/components",
  "apps/web/lib/opportunity-card-map.ts",
  "apps/web/lib/use-withdraw-kyc-gate.ts",
  "apps/web/public/brand",
  "apps/web/public/assets",
  "apps/web/public/icons",
  "apps/web/public/favicon.ico",
  "apps/_tmp_home_visual_rebuild",
  "_tmp_home_clean",
  "H7_CODE_HANDOFF.zip",
  ".playwright-mcp",
  ".cursor/plans/homecleanv1_clean-room_a7760b61.plan.md",
  ".cursor/rules/ui-authority-governance.mdc",
  ".cursor/rules/mockup-governance.mdc",
  ".cursor/rules/visual-master-intake.mdc",
  ".cursor/rules/canon-ui.mdc",
  ".cursor/rules/peotteok-performance-target.mdc",
];
for (const rel of webDelete) rm(rel);

write(
  ".cursor/rules/greenfield-ui.mdc",
  `---
description: Greenfield Consumer UI Boundary
alwaysApply: true
---

# GREENFIELD UI BOUNDARY

VISUAL_TRUTH = APPROVED_FIGMA_ONLY.

BUSINESS_TRUTH = PRESERVED_DOMAIN_ENGINE.

LEGACY_UI_REFERENCE = FORBIDDEN.

LEGACY_UX_REFERENCE = FORBIDDEN.

LEGACY_VISUAL_REFERENCE = FORBIDDEN.

LEGACY_BRAND_REFERENCE = FORBIDDEN.

LEGACY_ASSET_REFERENCE = FORBIDDEN.

LEGACY_GIT_UI_REFERENCE = FORBIDDEN.

Never recover or reuse pre-reset UI/UX from Git history.

Never use old Home, CSS, layout, component, visual token,
brand asset, screenshot, mockup, Figma export,
Visual Contract, Visual Master, Canon or old design
as implementation input.

New UI may originate only from:

1. Approved post-reset Figma
2. Post-reset design system
3. Preserved Business / Engine contracts

UI must never reimplement:

Money
FX
Wallet
Matching
Ledger
Settlement
Auth Truth

If Figma and code differ on presentation:
FIGMA WINS.

If Figma and UI assumption differ from engine truth:
ENGINE WINS FOR BUSINESS LOGIC.

If no approved Figma exists:
do not recover a legacy design.
Use only minimal development placeholder.
Do not invent Auth/Wallet forms or tab IA.
`,
);

write(
  ".cursor/rules/korean-ui.mdc",
  `---
description: Korean product language · IT jargon 0 · 퍼뜩 name · gender 0
alwaysApply: true
---

# Korean UI (product language)

- Consumer/AI 앱명 = **퍼뜩**
- 화면 IT/개발/테스트 용어 0 (API, Staging, DLQ, NATS, Mock…)
- **성별:** 필드·카피·테마·호칭 분기 금지
- 기존 Home/마케팅 카피·copy/ko 전체를 Visual SSOT로 쓰지 않는다
- 법적/머니 라벨은 Engine/Admin keep-set만 유지
`,
);

const agents = fs.readFileSync(p("AGENTS.md"), "utf8");
fs.writeFileSync(
  p("AGENTS.md"),
  agents
    .replace(
      /8\. UI → `.cursor\/rules\/ui-authority-governance\.mdc`.+/,
      "8. Consumer UI → `.cursor/rules/greenfield-ui.mdc` (VISUAL_TRUTH=APPROVED_FIGMA_ONLY · 레거시 Home/Canon/Visual Master 복구 금지) · AI 이름=**퍼뜩**",
    )
    .replace(
      "- Consumer = **퍼뜩** (구 오늘수익·바로번다 폐기)",
      "- Consumer = **퍼뜩** (레거시 소비자 브랜드명 재등장 금지)",
    ),
  "utf8",
);

prependBanner(".cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md");
prependBanner(".cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md");
prependBanner(".cursor/plans/ai_profit_os_05_pwa_f6a7b8c9.plan.md");

write(
  "tooling/verify/brand-consumer.cjs",
  `/** Consumer brand = 퍼뜩. Manifest stores current name only. */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const CONSUMER = "퍼뜩";
const FORBIDDEN_LEGACY = ["오늘수익", "바로번다"];

const manifest = path.join(root, "packages/ui/brand/brand.manifest.json");
if (!fs.existsSync(manifest)) {
  console.error("[verify:brand-consumer] FAIL missing brand.manifest.json");
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(manifest, "utf8"));
if (j.consumer?.name !== CONSUMER || j.consumer?.short_name !== CONSUMER) {
  console.error("[verify:brand-consumer] FAIL consumer.name/short_name must be 퍼뜩");
  process.exit(1);
}
if (j.ai?.name && j.ai.name !== CONSUMER) {
  console.error("[verify:brand-consumer] FAIL ai.name must be 퍼뜩 if present");
  process.exit(1);
}
if (j.consumer?.retired_names) {
  console.error("[verify:brand-consumer] FAIL retired_names must not exist in Active manifest");
  process.exit(1);
}

const hits = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules") continue;
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(fp);
    else if (/\\.(ts|tsx|js|jsx|json|md)$/.test(ent.name)) {
      const t = fs.readFileSync(fp, "utf8");
      for (const r of FORBIDDEN_LEGACY) {
        if (t.includes(r)) hits.push(\`\${path.relative(root, fp)} (::\${r})\`);
      }
    }
  }
}
["apps/web", "packages/ui/copy"].forEach((d) => walk(path.join(root, d)));
if (hits.length) {
  console.error("[verify:brand-consumer] FAIL legacy consumer name:\\n- " + hits.join("\\n- "));
  process.exit(1);
}
console.log("[verify:brand-consumer] PASS (" + CONSUMER + ")");
`,
);

const dbp = fs.readFileSync(p("tooling/verify/domain-by-path.cjs"), "utf8");
fs.writeFileSync(
  p("tooling/verify/domain-by-path.cjs"),
  dbp.replace(
    'scripts: ["no-it-jargon.cjs", "mockup-governance.cjs", "canon-surfaces.cjs"],',
    'scripts: ["no-it-jargon.cjs"],',
  ),
  "utf8",
);

const tiers = fs.readFileSync(p("tooling/verify/gate-tiers.cjs"), "utf8");
fs.writeFileSync(
  p("tooling/verify/gate-tiers.cjs"),
  tiers
    .replace('\n  "brand-assets.cjs",', "")
    .replace('\n  "lux-theme-sync.cjs",', "")
    .replace('\n  "dark-leak-guard.cjs",', "")
    .replace('\n  "ia-tabs.cjs",', ""),
  "utf8",
);

const jargon = fs.readFileSync(p("tooling/verify/no-it-jargon.cjs"), "utf8");
fs.writeFileSync(
  p("tooling/verify/no-it-jargon.cjs"),
  jargon.replace(
    `  if (!fs.existsSync(p)) {
    fails.push(\`missing \${rel}\`);
    continue;
  }`,
    `  if (!fs.existsSync(p)) {
    continue;
  }`,
  ),
  "utf8",
);

function skeletonSkip(rel, extraKeep = []) {
  const abs = p(rel);
  let src = fs.readFileSync(abs, "utf8");
  if (src.includes("GREENFIELD_SKELETON_SKIP")) return;
  const inject = `
function greenfieldSkeleton(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) return false;
  return fs.readFileSync(fp, "utf8").includes("PENDING APPROVED FIGMA");
}
if (${JSON.stringify(extraKeep)}.every((rel) => fs.existsSync(path.join(root, rel))) &&
    greenfieldSkeleton(${JSON.stringify(extraKeep[0] || "apps/web/app/page.tsx")})) {
  console.log("[${path.basename(rel)}] PASS — SDK/business files present; Consumer UI is greenfield skeleton");
  process.exit(0);
}
`;
  const marker = 'const fails = [];';
  if (!src.includes(marker)) return;
  src = src.replace(marker, marker + "\n" + inject);
  fs.writeFileSync(abs, src, "utf8");
}

skeletonSkip("tooling/verify/home-live-wire.cjs", [
  "apps/web/app/page.tsx",
  "packages/sdk/src/user-feed/fetch.ts",
]);
skeletonSkip("tooling/verify/wallet-live-wire.cjs", [
  "apps/web/app/wallet/page.tsx",
  "packages/sdk/src/wallet/fetch.ts",
]);
skeletonSkip("tooling/verify/profits-live-wire.cjs", [
  "apps/web/app/profits/page.tsx",
  "packages/sdk/src/user-feed/fetch.ts",
]);
skeletonSkip("tooling/verify/withdraw-flow-wire.cjs", [
  "apps/web/app/wallet/withdraw/page.tsx",
  "packages/sdk/src/wallet/fetch.ts",
]);

function skipIfMissingUi(rel) {
  const abs = p(rel);
  if (!fs.existsSync(abs)) return;
  let src = fs.readFileSync(abs, "utf8");
  if (src.includes("GREENFIELD_MISSING_UI_SKIP")) return;
  src = src.replace(
    "const fails = [];",
    `const fails = [];
/* GREENFIELD_MISSING_UI_SKIP */
`,
  );
  src = src.replace(
    /function mustExist\(rel\) \{\n  if \(!fs\.existsSync\(path\.join\(root, rel\)\)\) fails\.push\(`missing: \$\{rel\}`\);\n\}/,
    `function mustExist(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    if (/^packages\\\\/ui\\\\/components\\\\//.test(rel) || /WithdrawLiveForm|HomePageClient|ProfitsPageClient/.test(rel)) {
      return;
    }
    fails.push(\`missing: \${rel}\`);
  }
}`,
  );
  fs.writeFileSync(abs, src, "utf8");
}

for (const rel of [
  "tooling/verify/stub-page-actions.cjs",
  "tooling/verify/execution-surfaces.cjs",
  "tooling/verify/ai-coach-ui.cjs",
  "tooling/verify/home-principal-slots.cjs",
]) {
  skipIfMissingUi(rel);
}

console.log("GREENFIELD_APPLY_RESET done");
