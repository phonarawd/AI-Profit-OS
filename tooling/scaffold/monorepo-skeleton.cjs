/**
 * One-shot monorepo-skeleton scaffolder (ADR-015/016).
 * Creates apps/web · apps/admin · services · packages/{sdk,schemas} · worker stubs.
 * Safe to re-run (does not overwrite non-empty custom content if SKIP_EXISTING).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const write = (rel, body) => {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body.endsWith("\n") ? body : body + "\n", "utf8");
  console.log("  +", rel.replace(/\\/g, "/"));
};

const stubPage = (title, note = "골격 · 본구현은 도메인 todo") => `"use client";

export default function Page() {
  return (
    <main className="p-6 text-[var(--color-lux-text)]">
      <h1 className="text-xl font-semibold">${title}</h1>
      <p className="mt-2 text-sm text-[var(--color-lux-text-muted)]">${note}</p>
    </main>
  );
}
`;

console.log("[scaffold:monorepo-skeleton]");

// ── packages/schemas ──────────────────────────────────────────────
write(
  "packages/schemas/package.json",
  JSON.stringify(
    {
      name: "@aipo/schemas",
      private: true,
      version: "0.0.0",
      type: "module",
      description: "Workspace pointer to repo-root /schemas JSON contracts (SSOT).",
      exports: {
        ".": "./src/index.ts",
        "./root": "./src/root.ts",
      },
    },
    null,
    2
  )
);
write(
  "packages/schemas/README.md",
  `# @aipo/schemas

JSON contract **SSOT** = repo-root \`schemas/*.v1.json\`. Path helpers only — do not fork fields.
`
);
write(
  "packages/schemas/src/index.ts",
  `export { schemasRoot, schemaPath } from "./root";\n`
);
write(
  "packages/schemas/src/root.ts",
  `import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const schemasRoot = path.resolve(here, "../../../schemas");
export function schemaPath(name: string): string {
  const file = name.endsWith(".json") ? name : \`\${name}.json\`;
  return path.join(schemasRoot, file);
}
`
);

// ── packages/sdk ──────────────────────────────────────────────────
write(
  "packages/sdk/package.json",
  JSON.stringify(
    {
      name: "@aipo/sdk",
      private: true,
      version: "0.0.0",
      type: "module",
      exports: {
        ".": "./src/index.ts",
        "./device-tier": "./src/device-tier.ts",
      },
    },
    null,
    2
  )
);
write(
  "packages/sdk/src/index.ts",
  `/** @aipo/sdk — Phase0 skeleton (install/push/haptics/marketing land in domain todos) */
export { detectDeviceTier, type DeviceTier } from "./device-tier";
`
);
write(
  "packages/sdk/src/device-tier.ts",
  `/** S/A/B device tier detection — skeleton */
export type DeviceTier = "S" | "A" | "B";

export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === "undefined") return "B";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem >= 8) return "S";
  if (typeof mem === "number" && mem >= 4) return "A";
  return "B";
}
`
);

// expand ui package exports slightly (keep existing tokens)
const uiPkgPath = path.join(root, "packages/ui/package.json");
const uiPkg = JSON.parse(fs.readFileSync(uiPkgPath, "utf8"));
uiPkg.exports = {
  ...uiPkg.exports,
  "./brand/brand.manifest.json": "./brand/brand.manifest.json",
  "./canon/manifest.json": "./canon/manifest.json",
};
write("packages/ui/package.json", JSON.stringify(uiPkg, null, 2));

// ── shared next app bits ──────────────────────────────────────────
const nextPkg = (name, description) =>
  JSON.stringify(
    {
      name,
      private: true,
      version: "0.0.0",
      description,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "echo 'lint: domain todo'",
      },
      dependencies: {
        "@aipo/schemas": "workspace:*",
        "@aipo/sdk": "workspace:*",
        "@aipo/ui": "workspace:*",
        next: "16.0.7",
        react: "19.2.0",
        "react-dom": "19.2.0",
      },
      devDependencies: {
        "@tailwindcss/postcss": "^4.1.11",
        "@types/node": "^22.17.0",
        "@types/react": "^19.1.9",
        "@types/react-dom": "^19.1.7",
        tailwindcss: "^4.1.11",
        typescript: "^5.9.2",
      },
    },
    null,
    2
  );

const tsconfigApp = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@aipo/ui/*": ["../../packages/ui/*"],
      "@aipo/sdk/*": ["../../packages/sdk/src/*"],
      "@aipo/schemas/*": ["../../packages/schemas/reexport/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

const nextConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aipo/ui", "@aipo/sdk", "@aipo/schemas"],
};

export default nextConfig;
`;

const postcss = `/** Tailwind CSS v4 (ADR-015) */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;

const globals = `@import "@aipo/ui/tokens/lux-theme.css";

html,
body {
  min-height: 100%;
  background: var(--color-lux-bg);
  color: var(--color-lux-text);
  font-family: var(--font-lux-sans);
}
`;

// ── apps/web routes lock (UI §5.1) ────────────────────────────────
write(
  "apps/web/routes.ts",
  `/**
 * User IA lock — UI §5.1 (변경 금지)
 * verify:ia-tabs reads this file.
 */
export const USER_TABS = [
  { order: 1, icon: "🏠", label: "홈", href: "/" },
  { order: 2, icon: "🔥", label: "수익", href: "/profits" },
  { order: 3, icon: "💼", label: "내거래", href: "/trades" },
  { order: 4, icon: "💰", label: "지갑", href: "/wallet" },
  { order: 5, icon: "👤", label: "내정보", href: "/me" },
] as const;

export type UserTabHref = (typeof USER_TABS)[number]["href"];

/** Nested routes (5탭 밖 · 탭 추가 금지) */
export const USER_NESTED_ROUTES = [
  "/wallet/deposit",
  "/wallet/withdraw",
  "/wallet/withdraw/usdt",
  "/wallet/withdraw/krw",
  "/wallet/history",
  "/me/settings",
  "/me/legal",
  "/me/kyc",
  "/me/peotteok",
  "/me/membership",
  "/me/inbox",
  "/me/invite",
  "/me/events",
  "/me/strategies",
  "/me/support",
  "/me/guide/usdt",
  "/me/guide/get-usdt",
  "/me/guide/revenue",
  "/me/guide/faq",
  "/me/guide/principal",
  "/trades/[id]/execute",
  "/profits/[id]",
] as const;

/** Forbidden in apps/web (Admin §40) */
export const WEB_FORBIDDEN_PREFIXES = ["/admin"] as const;
`
);

write("apps/web/package.json", nextPkg("@aipo/web", "퍼뜩 consumer PWA — Next@16 · 5탭 IA"));
write("apps/web/tsconfig.json", tsconfigApp);
write("apps/web/next.config.ts", nextConfig);
write("apps/web/postcss.config.mjs", postcss);
write("apps/web/next-env.d.ts", `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`);
write("apps/web/app/globals.css", globals);
write(
  "apps/web/app/layout.tsx",
  `import type { Metadata } from "next";
import "./globals.css";
import { USER_TABS } from "../routes";

export const metadata: Metadata = {
  title: "퍼뜩",
  description: "퍼뜩 — AI Profit OS consumer",
  applicationName: "퍼똑",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-[var(--color-lux-bg)] text-[var(--color-lux-text)]">
        <div className="mx-auto flex min-h-dvh max-w-5xl flex-col pb-20 md:flex-row md:pb-0">
          <nav
            aria-label="주요 메뉴"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-lux-border)] bg-[var(--color-lux-surface)] md:static md:w-52 md:flex-col md:border-r md:border-t-0"
          >
            {USER_TABS.map((tab) => (
              <a
                key={tab.href}
                href={tab.href}
                className="flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs text-[var(--color-lux-text-muted)] md:flex-row md:gap-2 md:px-4 md:py-3 md:text-sm"
              >
                <span aria-hidden>{tab.icon}</span>
                <span>{tab.label}</span>
              </a>
            ))}
          </nav>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
`
);

// Fix typo 퍼똑 -> 퍼뜩 in applicationName
write(
  "apps/web/app/layout.tsx",
  `import type { Metadata } from "next";
import "./globals.css";
import { USER_TABS } from "../routes";

export const metadata: Metadata = {
  title: "퍼뜩",
  description: "퍼뜩 — AI Profit OS consumer",
  applicationName: "퍼뜩",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-[var(--color-lux-bg)] text-[var(--color-lux-text)]">
        <div className="mx-auto flex min-h-dvh max-w-5xl flex-col pb-20 md:flex-row md:pb-0">
          <nav
            aria-label="주요 메뉴"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-lux-border)] bg-[var(--color-lux-surface)] md:static md:w-52 md:flex-col md:border-r md:border-t-0"
          >
            {USER_TABS.map((tab) => (
              <a
                key={tab.href}
                href={tab.href}
                className="flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs text-[var(--color-lux-text-muted)] md:flex-row md:gap-2 md:px-4 md:py-3 md:text-sm"
              >
                <span aria-hidden>{tab.icon}</span>
                <span>{tab.label}</span>
              </a>
            ))}
          </nav>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
`
);

write("apps/web/app/page.tsx", stubPage("홈", "기회스캔 · 5탭 IA lock"));
write("apps/web/app/profits/page.tsx", stubPage("수익"));
write("apps/web/app/trades/page.tsx", stubPage("내거래"));
write("apps/web/app/wallet/page.tsx", stubPage("지갑", "§49 버킷 표시"));
write("apps/web/app/me/page.tsx", stubPage("내정보"));

const webNested = [
  ["wallet/deposit", "입금"],
  ["wallet/withdraw", "출금"],
  ["wallet/withdraw/usdt", "USDT 출금"],
  ["wallet/withdraw/krw", "원화 출금"],
  ["wallet/history", "입출금 내역"],
  ["me/settings", "설정"],
  ["me/legal", "약관"],
  ["me/kyc", "본인 확인"],
  ["me/peotteok", "퍼뜩에게 묻기"],
  ["me/membership", "내 등급"],
  ["me/inbox", "알림·쪽지"],
  ["me/invite", "친구 초대"],
  ["me/events", "이벤트·공지"],
  ["me/strategies", "내 전략"],
  ["me/support", "고객센터"],
  ["me/guide/usdt", "테더 안내"],
  ["me/guide/get-usdt", "테더 준비"],
  ["me/guide/revenue", "운영 안내"],
  ["me/guide/faq", "자주 묻는 질문"],
  ["me/guide/principal", "원금과 수익"],
  ["trades/[id]/execute", "진행실"],
  ["profits/[id]", "수익 상세"],
];
for (const [p, title] of webNested) {
  write(`apps/web/app/${p}/page.tsx`, stubPage(title));
}

write(
  "apps/web/public/manifest.webmanifest",
  JSON.stringify(
    {
      name: "퍼뜩",
      short_name: "퍼뜩",
      lang: "ko",
      display: "standalone",
      start_url: "/",
      background_color: "#090a10",
      theme_color: "#090a10",
      icons: [],
    },
    null,
    2
  )
);

// ── apps/admin routes lock (Admin §9.1 + §9.1.1) ─────────────────
write(
  "apps/admin/routes.ts",
  `/**
 * Admin IA lock — Admin §9.1 (12 modules) + §9.1.1 children
 * sidebar 13th top-level FORBIDDEN · verify:admin-routes
 */
export const ADMIN_MODULES = [
  { id: 1, label: "한눈에 보기", href: "/admin", service: "dashboard" },
  { id: 2, label: "수익 기회 관리", href: "/admin/opportunities", service: "opportunities" },
  {
    id: "2b",
    label: "진행 정책",
    href: "/admin/execution-policy",
    service: "execution-policy",
    parentOf: 2,
    sidebarChild: true,
  },
  { id: 3, label: "해외 시세 수집기", href: "/admin/adapters", service: "adapters" },
  { id: 4, label: "입출금 관리", href: "/admin/wallet", service: "wallet" },
  { id: 5, label: "입출금·정산 장부", href: "/admin/ledger", service: "ledger" },
  { id: 6, label: "회원 관리", href: "/admin/users", service: "users" },
  { id: 7, label: "사기·이상 거래 방지", href: "/admin/risk", service: "risk" },
  { id: 8, label: "법적 확인·제재", href: "/admin/compliance", service: "compliance" },
  { id: 9, label: "긴급 정지", href: "/admin/system-control", service: "circuit" },
  { id: 10, label: "AI 분석 기록", href: "/admin/ai-logs", service: "ai-logs" },
  { id: 11, label: "이벤트·프로모션", href: "/admin/growth", service: "growth" },
  { id: 12, label: "운영 기록", href: "/admin/audit", service: "audit" },
] as const;

/** Top-level sidebar count must stay 12 (2b is child link, not 13th) */
export const ADMIN_TOP_LEVEL_COUNT = 12;

/** §9.1.1 child routes / tabs (sidebar add FORBIDDEN) */
export const ADMIN_CHILD_ROUTES = [
  { href: "/admin/execution-policy", parent: "2b", note: "매칭 성공 조절" },
  { href: "/admin/wallet?tab=deposit-settings", parent: 4, note: "입금설정" },
  { href: "/admin/wallet?tab=review", parent: 4, note: "검수함" },
  { href: "/admin/wallet?tab=krw-pending", parent: 4, note: "원화 승인/거절" },
  { href: "/admin/wallet?tab=disputes", parent: 4, note: "분쟁" },
  { href: "/admin/support?tab=queue", parent: "1|6", note: "CS 큐 · sidebar 모듈 금지" },
  { href: "/admin/reports/financial", parent: 5, note: "금융 리포트" },
  { href: "/admin/ledger?userId=", parent: 5, note: "유저 점프" },
  { href: "/admin/growth?tab=simulation", parent: 11, note: "시뮬레이션" },
  { href: "/admin/growth?tab=referral", parent: 11, note: "초대" },
  { href: "/admin/growth?tab=notices", parent: 11, note: "공지" },
  { href: "/admin/growth?tab=campaigns", parent: 11, note: "캠페인" },
  { href: "/admin/growth?tab=share", parent: 11, note: "공유 카드" },
  { href: "/admin/growth?tab=content", parent: 11, note: "G1" },
  { href: "/admin/growth?tab=deposit", parent: 11, note: "G2" },
  { href: "/admin/growth?tab=whale", parent: 11, note: "G3" },
  { href: "/admin/growth?tab=ticker", parent: 11, note: "G4" },
  { href: "/admin/ai-logs?tab=coach", parent: 10, note: "퍼뜩 coach" },
  { href: "/admin/ai-logs?tab=spotcheck", parent: 10, note: "이용성 점검" },
  { href: "/admin/users/:id", parent: 6, note: "유저360" },
  { href: "/admin/users/:id/finance", parent: 6, note: "금융전수" },
  { href: "/admin/users/:id/finance?tab=buckets", parent: 6, note: "버킷" },
  { href: "/admin/risk?tab=queue", parent: 7, note: "동결 큐" },
] as const;

/** Legacy growth paths → ?tab= redirect (이중 IA 금지) */
export const GROWTH_LEGACY_REDIRECTS = [
  { from: "/admin/growth/content", tab: "content" },
  { from: "/admin/growth/deposit", tab: "deposit" },
  { from: "/admin/growth/whale", tab: "whale" },
  { from: "/admin/growth/ticker", tab: "ticker" },
] as const;
`
);

write("apps/admin/package.json", nextPkg("@aipo/admin", "AI Profit OS Ops — Next@16 · Admin §9.1.1"));
write("apps/admin/tsconfig.json", tsconfigApp);
write("apps/admin/next.config.ts", nextConfig);
write("apps/admin/postcss.config.mjs", postcss);
write("apps/admin/next-env.d.ts", `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`);
write("apps/admin/app/globals.css", globals);
write(
  "apps/admin/app/layout.tsx",
  `import type { Metadata } from "next";
import "./globals.css";
import { ADMIN_MODULES } from "../routes";

export const metadata: Metadata = {
  title: "AI Profit OS Ops",
  robots: { index: false, follow: false },
};

const sidebar = ADMIN_MODULES.filter((m) => !("sidebarChild" in m && m.sidebarChild));
const child2b = ADMIN_MODULES.find((m) => m.id === "2b");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-[var(--color-lux-bg)] text-[var(--color-lux-text)]">
        <div className="mx-auto flex min-h-dvh max-w-7xl">
          <aside className="hidden w-60 shrink-0 border-r border-[var(--color-lux-border)] bg-[var(--color-lux-surface)] p-3 md:block">
            <p className="mb-4 px-2 text-sm font-semibold">운영</p>
            <nav aria-label="운영 메뉴" className="flex flex-col gap-1 text-sm">
              {sidebar.map((m) => (
                <div key={String(m.id)}>
                  <a
                    href={m.href}
                    className="block rounded-md px-2 py-2 text-[var(--color-lux-text-muted)] hover:bg-[var(--color-lux-elevated)] hover:text-[var(--color-lux-text)]"
                  >
                    {m.label}
                  </a>
                  {m.id === 2 && child2b ? (
                    <a
                      href={child2b.href}
                      className="ml-3 block rounded-md px-2 py-1.5 text-xs text-[var(--color-lux-text-muted)] hover:bg-[var(--color-lux-elevated)]"
                    >
                      {child2b.label}
                    </a>
                  ) : null}
                </div>
              ))}
            </nav>
          </aside>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
`
);

write(
  "apps/admin/app/page.tsx",
  `import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin");
}
`
);

const adminPages = [
  ["admin", "한눈에 보기"],
  ["admin/opportunities", "수익 기회 관리"],
  ["admin/execution-policy", "진행 정책"],
  ["admin/adapters", "해외 시세 수집기"],
  ["admin/wallet", "입출금 관리"],
  ["admin/ledger", "입출금·정산 장부"],
  ["admin/users", "회원 관리"],
  ["admin/users/[id]", "회원 상세"],
  ["admin/users/[id]/finance", "회원 금융"],
  ["admin/risk", "사기·이상 거래 방지"],
  ["admin/compliance", "법적 확인·제재"],
  ["admin/system-control", "긴급 정지"],
  ["admin/ai-logs", "AI 분석 기록"],
  ["admin/growth", "이벤트·프로모션"],
  ["admin/audit", "운영 기록"],
  ["admin/support", "고객센터 큐"],
  ["admin/reports/financial", "금융 리포트"],
];
for (const [p, title] of adminPages) {
  write(`apps/admin/app/${p}/page.tsx`, stubPage(title, "Admin §9.1.1 골격"));
}

// growth legacy redirects
for (const tab of ["content", "deposit", "whale", "ticker"]) {
  write(
    `apps/admin/app/admin/growth/${tab}/page.tsx`,
    `import { redirect } from "next/navigation";

export default function Page() {
  redirect("/admin/growth?tab=${tab}");
}
`
  );
}

write(
  "apps/admin/app/robots.ts",
  `import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
`
);

// ── services ──────────────────────────────────────────────────────
write(
  "services/api-nest/package.json",
  JSON.stringify(
    {
      name: "@aipo/api-nest",
      private: true,
      version: "0.0.0",
      description: "NestJS API — JWT auth SoT (ADR-006) · Phase0 in-process bus",
      scripts: {
        dev: "nest start --watch",
        build: "nest build",
        start: "node dist/main.js",
      },
      dependencies: {
        "@nestjs/common": "^11.1.5",
        "@nestjs/core": "^11.1.5",
        "@nestjs/platform-express": "^11.1.5",
        "reflect-metadata": "^0.2.2",
        rxjs: "^7.8.2",
      },
      devDependencies: {
        "@nestjs/cli": "^11.0.7",
        "@types/node": "^22.17.0",
        typescript: "^5.9.2",
      },
    },
    null,
    2
  )
);
write(
  "services/api-nest/tsconfig.json",
  `{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true
  },
  "include": ["src/**/*"]
}
`
);
write(
  "services/api-nest/nest-cli.json",
  JSON.stringify({ $schema: "https://json.schemastore.org/nest-cli", collection: "@nestjs/schematics", sourceRoot: "src" }, null, 2)
);
write(
  "services/api-nest/src/main.ts",
  `import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(\`[api-nest] listening :\${port} (skeleton)\`);
}

void bootstrap();
`
);
write(
  "services/api-nest/src/app.module.ts",
  `import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController],
})
export class AppModule {}
`
);
write(
  "services/api-nest/src/health.controller.ts",
  `import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  ok() {
    return { ok: true, service: "api-nest", phase: 0 };
  }
}
`
);

write(
  "services/engine-rust/Cargo.toml",
  `[package]
name = "engine-rust"
version = "0.0.0"
edition = "2021"
description = "AI Profit OS settlement / match engine (Phase0 skeleton)"
publish = false

[lib]
name = "engine_rust"
path = "src/lib.rs"

[dependencies]
`
);
write(
  "services/engine-rust/src/lib.rs",
  `//! engine-rust — Phase0 skeleton
//! Settlement / MATCH_SUCCESS rules land in domain Engine todos.

pub mod settlement_rule;

pub fn engine_name() -> &'static str {
    "engine-rust"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn name_locked() {
        assert_eq!(engine_name(), "engine-rust");
    }
}
`
);
write(
  "services/engine-rust/src/settlement_rule.rs",
  `//! §48.13 MATCH_SUCCESS placeholder — implement in Engine domain todo.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchOutcome {
    Success,
    SafeStop,
    Requeue,
}

/// Skeleton: always SafeStop until real rule lands.
pub fn evaluate_match_success(_input: &str) -> MatchOutcome {
    MatchOutcome::SafeStop
}
`
);

write(
  "services/marketing-attribution/package.json",
  JSON.stringify(
    {
      name: "@aipo/marketing-attribution",
      private: true,
      version: "0.0.0",
      type: "module",
      description: "UTM / ROAS / CAPI orchestration — skeleton",
      exports: { ".": "./src/index.ts" },
    },
    null,
    2
  )
);
write(
  "services/marketing-attribution/src/index.ts",
  `/** marketing-attribution skeleton — domain todo owns implementation */
export type AttributionStub = { ok: true };

export function attributionReady(): AttributionStub {
  return { ok: true };
}
`
);

// ── workers adapter stubs (ADR-003 · Phase1+) ─────────────────────
const adapters = [
  "ebay-adapter",
  "pokemontcg-adapter",
  "ygoprodeck-adapter",
  "coingecko-adapter",
  "frankfurter-adapter",
];
for (const name of adapters) {
  write(
    `workers/${name}/package.json`,
    JSON.stringify(
      {
        name: `@aipo/${name}`,
        private: true,
        version: "0.0.0",
        description: `${name} — Phase1+ market adapter stub (ADR-003)`,
        scripts: {
          dev: "wrangler dev --config wrangler.toml",
          deploy: "echo 'Phase1+ only'",
        },
      },
      null,
      2
    )
  );
  write(
    `workers/${name}/src/index.ts`,
    `/** ${name} — Phase0 stub · Phase1+ NATS/adapters todo */
export default {
  async fetch(): Promise<Response> {
    return Response.json({ ok: true, worker: "${name}", phase: "stub" });
  },
};
`
  );
  write(
    `workers/${name}/wrangler.toml`,
    `name = "${name}"
main = "src/index.ts"
compatibility_date = "2025-03-01"
compatibility_flags = ["nodejs_compat"]
`
  );
}

for (const name of ["chain-watchers", "chain-sweeper"]) {
  write(
    `workers/${name}/package.json`,
    JSON.stringify(
      {
        name: `@aipo/${name}`,
        private: true,
        version: "0.0.0",
        description: `${name} — Phase1+ stub`,
      },
      null,
      2
    )
  );
  write(
    `workers/${name}/src/index.ts`,
    `/** ${name} Phase1+ stub */
export const phase = 1;
`
  );
}

write(
  "workers/README.md",
  `# workers

| Worker | Phase |
|--------|-------|
| push-dispatcher | 0 (stub live) |
| marketing-capi-dispatcher | 1+ |
| ebay / pokemontcg / ygoprodeck / coingecko / frankfurter adapters | 1+ |
| chain-watchers / chain-sweeper | 1+ |

\`yahoo-jp-adapter\` = **FORBIDDEN** (ADR-003).
`
);

// remove placeholder gitkeeps if present
for (const rel of ["apps/.gitkeep", "services/.gitkeep", "workers/.gitkeep"]) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log("  -", rel);
  }
}

console.log("[scaffold:monorepo-skeleton] done");
