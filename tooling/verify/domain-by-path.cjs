/**
 * T0 — 변경 경로 기준 도메인 verify (슬라이스 빠른 차단)
 * staged → unstaged → HEAD 대비 순으로 파일 목록 수집
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");

/** @type {{ test: (file: string) => boolean, scripts: string[] }[]} */
const RULES = [
  {
    test: (f) => /^(packages\/ui\/|apps\/web\/)/.test(f),
    scripts: ["no-it-jargon.cjs", "mockup-governance.cjs", "canon-surfaces.cjs"],
  },
  {
    test: (f) => /^apps\/admin\//.test(f),
    scripts: ["no-admin-in-web.cjs", "admin-routes.cjs"],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/opportunity/.test(f) ||
      /packages\/ui\/copy\/ko\/(feed|margin)/.test(f) ||
      /packages\/ui\/canon\/surfaces\/opportunity/.test(f),
    scripts: [
      "balance-aware-feed.cjs",
      "opportunity-scan-surface.cjs",
      "margin-compare-surface.cjs",
      "asset-image-surface.cjs",
      "cta-earn-profit.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/execution\//.test(f) ||
      /packages\/ui\/copy\/ko\/execution\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/execution-/.test(f) ||
      /apps\/web\/app\/trades\/.+\/execute\//.test(f),
    scripts: [
      "execution-surfaces.cjs",
      "match-tension-surface.cjs",
      "trade-execution-hook.cjs",
      "asset-image-surface.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/peotteok\//.test(f) ||
      /packages\/ui\/copy\/ko\/peotteok\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/peotteok/.test(f) ||
      /apps\/web\/app\/me\/peotteok\//.test(f) ||
      /packages\/sdk\/src\/peotteok\//.test(f),
    scripts: [
      "ai-coach-ui.cjs",
      "canon-surfaces.cjs",
      "ai-coach-fact-only.cjs",
      "ai-coach-no-autonomy.cjs",
      "age-tone-surfaces.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/kyc\//.test(f) ||
      /packages\/ui\/copy\/ko\/kyc\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/kyc-/.test(f) ||
      /apps\/web\/app\/me\/kyc\//.test(f),
    scripts: ["kyc-surfaces.cjs", "canon-surfaces.cjs"],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/trust\//.test(f) ||
      /packages\/ui\/copy\/ko\/(trust|objections|guide)\.ts/.test(f) ||
      /apps\/web\/app\/me\/guide\//.test(f) ||
      /packages\/ui\/canon\/surfaces\/get-usdt-guide\.wire\.json/.test(f),
    scripts: [
      "trust-copy.cjs",
      "tax-disclaimer.cjs",
      "objection4.cjs",
      "deposit-network-plain-ko.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/invite\//.test(f) ||
      /packages\/ui\/copy\/ko\/invite\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/invite-home\.wire\.json/.test(f) ||
      /apps\/web\/app\/me\/invite\//.test(f),
    scripts: [
      "invite-explain-surfaces.cjs",
      "age-tone-surfaces.cjs",
      "referral-unlimited-invites.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/membership\//.test(f) ||
      /packages\/ui\/copy\/ko\/membership\.ts/.test(f) ||
      /packages\/ui\/brand\/membership\.ts/.test(f) ||
      /packages\/ui\/brand\/assets\/membership\//.test(f) ||
      /packages\/ui\/brand\/brand\.manifest\.json/.test(f) ||
      /packages\/ui\/canon\/surfaces\/membership-home\.wire\.json/.test(f) ||
      /apps\/web\/app\/me\/membership\//.test(f),
    scripts: [
      "membership-surfaces.cjs",
      "membership-badge-assets.cjs",
      "no-fulfill-rate-as-rule.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/inbox\//.test(f) ||
      /packages\/ui\/copy\/ko\/inbox\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/ops-inbox\.wire\.json/.test(f) ||
      /apps\/web\/app\/me\/inbox\//.test(f) ||
      (/^services\/api-nest\/src\/inbox\//.test(f) ||
        /notification-prefs/.test(f)),
    scripts: [
      "ops-inbox.cjs",
      "notification-prefs-default-on.cjs",
    ],
  },

  {
    test: (f) =>
      /^services\/api-nest\//.test(f) &&
      /(money|bucket|withdraw|deposit|ledger|referral|mission|benefit)/i.test(f),
    scripts: ["pg-module-scan.cjs", "bucket-invariant.cjs"],
  },
  {
    test: (f) =>
      /^services\/engine-rust\//.test(f) ||
      (/^services\/api-nest\//.test(f) &&
        /(opportunit|participat|settlement|trade|execution|membership|match)/i.test(f)),
    scripts: ["match-success-rule.cjs", "participate-http.cjs", "execute-rule-loop.cjs"],
  },
  {
    test: (f) =>
      (/^services\/api-nest\//.test(f) && /auth/i.test(f)) ||
      /packages\/.*jwt/i.test(f),
    scripts: ["auth-jwt-runtime.cjs", "auth-flows.cjs"],
  },
  {
    test: (f) => /^tooling\/verify\//.test(f),
    scripts: [],
  },
];

function gitLines(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getChangedFiles() {
  const staged = gitLines("git diff --cached --name-only");
  if (staged.length > 0) return staged.map(normalizePath);

  const unstaged = gitLines("git diff --name-only");
  if (unstaged.length > 0) return unstaged.map(normalizePath);

  return gitLines("git diff --name-only HEAD").map(normalizePath);
}

function normalizePath(file) {
  return file.replace(/\\/g, "/");
}

function scriptsForChangedFiles(files) {
  const scripts = new Set();
  for (const file of files) {
    for (const rule of RULES) {
      if (rule.test(file)) {
        for (const script of rule.scripts) scripts.add(script);
      }
    }
  }
  return [...scripts];
}

if (require.main === module) {
  const files = getChangedFiles();
  const scripts = scriptsForChangedFiles(files);
  if (files.length === 0) {
    console.log("[verify:domain-by-path] SKIP (no changed files)");
    process.exit(0);
  }
  console.log(
    `[verify:domain-by-path] ${files.length} file(s) → ${scripts.length} domain check(s)`,
  );
  if (scripts.length === 0) {
    process.exit(0);
  }
  const { runGateSteps } = require("./gate-runner.cjs");
  runGateSteps(scripts, "verify:domain-by-path");
} else {
  module.exports = { getChangedFiles, scriptsForChangedFiles };
}
