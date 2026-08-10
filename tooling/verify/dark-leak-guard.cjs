/**
 * verify:dark-leak-guard — ADR-017 · peotteok-light 단일 출시 테마 회귀 방지
 * 다크 테마 노출 0(사용자 명시 요구, PC Home Grid v1.3 재설계 감사에서 확인된 클린 상태를 잠금).
 *
 * 차단 대상:
 *   1) 어떤 CSS에도 `prefers-color-scheme` 재도입 금지 (OS 다크모드 자동 전환 경로 0)
 *   2) `luxFintechLegacyDark` / `luxDarkArchive`(lux-fintech.ts 내 archive export)를
 *      정의 파일 밖에서 import/참조하는 활성 코드 0건 (역사적 보관 export는 유지, 소비만 금지)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const fails = [];

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "target",
  ".wrangler",
  "coverage",
  "playwright-report",
]);

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, fn);
    else fn(p);
  }
}

const LEGACY_DARK_DEFINITION_FILE = path.join(
  root,
  "packages/ui/tokens/lux-fintech.ts",
);

const SCAN_ROOTS = ["packages", "apps"].map((d) => path.join(root, d));

for (const scanRoot of SCAN_ROOTS) {
  walk(scanRoot, (p) => {
    const rel = path.relative(root, p).replace(/\\/g, "/");
    const ext = path.extname(p);

    if (ext === ".css") {
      const css = fs.readFileSync(p, "utf8");
      if (/prefers-color-scheme/.test(css)) {
        fails.push(
          `${rel}: prefers-color-scheme 금지 (다크 테마 노출 0 — 단일 peotteok-light 출시)`,
        );
      }
      return;
    }

    if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
      if (p === LEGACY_DARK_DEFINITION_FILE) return; // 정의 파일 자체는 허용(역사적 보관)
      const src = fs.readFileSync(p, "utf8");
      if (/luxFintechLegacyDark|luxDarkArchive/.test(src)) {
        fails.push(
          `${rel}: luxFintechLegacyDark/luxDarkArchive 활성 참조 금지 (archive export는 소비 0 · lux-fintech.ts 정의만 유지)`,
        );
      }
    }
  });
}

if (!fs.existsSync(LEGACY_DARK_DEFINITION_FILE)) {
  fails.push("packages/ui/tokens/lux-fintech.ts missing (legacy dark archive export must remain for historical reference)");
}

if (fails.length) {
  console.error("[verify:dark-leak-guard] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:dark-leak-guard] PASS (prefers-color-scheme 0건 · lux-dark archive 활성 참조 0건)",
);
