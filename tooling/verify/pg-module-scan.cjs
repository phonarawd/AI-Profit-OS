/**
 * verify:pg-module-scan (§41 · ADR-014)
 * PG사(결제대행) SDK/import = 0 · PostgreSQL 드라이버는 허용(용어≠혼동)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

// --- rule SSOT (Auto-Recon ≠ Day-1 · Postgres ≠ PG사) ---
const ruleRel = ".cursor/rules/pg-gateway-ban.mdc";
const rulePath = path.join(root, ruleRel);
if (!fs.existsSync(rulePath)) {
  fails.push(`missing: ${ruleRel}`);
} else {
  const rule = fs.readFileSync(rulePath, "utf8");
  if (!/PostgreSQL/.test(rule) || !/PG사/.test(rule)) {
    fails.push(`${ruleRel}: must lock terminology PostgreSQL ≠ PG사`);
  }
  if (!/Admin\s*승인\/거절/.test(rule)) {
    fails.push(`${ruleRel}: Day-1 KRW must be Admin 승인/거절`);
  }
  if (!/L2\+/.test(rule)) {
    fails.push(`${ruleRel}: CSV Auto-Recon must be L2+ (not Day-1)`);
  }
  // drift: old line treated Auto-Recon as the only KRW path
  if (/입금\s*=\s*USDT[^\n]*원화 Auto-Recon only/i.test(rule)) {
    fails.push(`${ruleRel}: forbidden Day-1 Auto-Recon-only wording`);
  }
  if (!/verify:pg-module-scan/.test(rule)) {
    fails.push(`${ruleRel}: must point CI to verify:pg-module-scan`);
  }
}

// --- payment-gateway import / package name (NOT postgres / pg driver) ---
const denyImport =
  /\b(?:from|require\s*\(\s*|import\s*\(\s*)['"][^'"]*(?:@tosspayments|tosspayments|toss-payments|portone|iamport|inicis|nicepay|nice-pay|paypal|@paypal|stripe-checkout|@stripe\/stripe-js|stripe\.com\/v3)[^'"]*['"]/i;

const denyPkgName =
  /^(?:@tosspayments(?:\/|$)|@portone(?:\/|$)|portone(?:-|\/|$)|iamport(?:-|\/|$)|@iamport(?:\/|$)|nicepay(?:-|\/|$)|@nicepay(?:\/|$)|paypal(?:-|\/|$)|@paypal(?:\/|$)|@stripe\/stripe-js$|stripe-checkout$)/i;

/** Explicit allow — PostgreSQL stack must never trip this gate */
const allowPgDriver =
  /^(?:pg|postgres|postgres\.js|@supabase\/supabase-js|@supabase\/postgrest-js|@neondatabase\/serverless|slonik|pg-promise)$/i;

const scanRoots = ["apps", "services", "packages", "workers"].map((d) =>
  path.join(root, d)
);

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === "dist" ||
      ent.name === ".next" ||
      ent.name === "coverage" ||
      ent.name === "target"
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

const importHits = [];
const pkgHits = [];

function checkSource(file) {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) return;
  const t = fs.readFileSync(file, "utf8");
  if (denyImport.test(t)) importHits.push(path.relative(root, file));
}

function checkPackageJson(file) {
  if (path.basename(file) !== "package.json") return;
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return;
  }
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.optionalDependencies || {}),
    ...(pkg.peerDependencies || {}),
  };
  for (const name of Object.keys(deps)) {
    if (allowPgDriver.test(name)) continue;
    if (denyPkgName.test(name)) {
      pkgHits.push(`${path.relative(root, file)} → ${name}`);
    }
  }
}

// root package.json too
checkPackageJson(path.join(root, "package.json"));
scanRoots.forEach((dir) =>
  walk(dir, (file) => {
    checkSource(file);
    checkPackageJson(file);
  })
);

if (importHits.length) {
  fails.push(
    "payment-gateway imports:\n- " + importHits.join("\n- ")
  );
}
if (pkgHits.length) {
  fails.push(
    "payment-gateway package.json deps:\n- " + pkgHits.join("\n- ")
  );
}

if (fails.length) {
  console.error(
    "[verify:pg-module-scan] FAIL (PG사 SDK / rule lock)\n- " +
      fails.join("\n- ")
  );
  process.exit(1);
}

console.log("[verify:pg-module-scan] PASS (no PG사 SDK · Postgres allowed · Day-1≠Auto-Recon)");
