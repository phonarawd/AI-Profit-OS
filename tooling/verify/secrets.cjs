/** Block staged/tracked secret paths and secret-like blobs (ADR-016) */
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function run(cmd) {
  try {
    return execSync(cmd, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    return (e.stdout || "").toString().trim();
  }
}

function stagedBlob(file) {
  const r = spawnSync("git", ["show", `:${file}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  if (r.status === 0) return r.stdout || "";
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return "";
  const st = fs.statSync(abs);
  if (!st.isFile() || st.size > 2 * 1024 * 1024) return "";
  return fs.readFileSync(abs, "utf8");
}

function stagedNames() {
  return run("git diff --cached --name-only")
    .split(/\r?\n/)
    .filter(Boolean);
}

const SECRET_PATH =
  /(^|\/)\.env($|\.)|(^|\/)\.env\.[^/]+$|\.(pem|key)$|(^|\/)credentials\.json$|(^|\/)service_account\.json$|(^|\/)secrets?\//i;

function isEnvExample(f) {
  return /(^|\/)\.env\.example$|(^|\/)\.env\.[^/]+\.example$/i.test(f);
}

/** Real credential shapes that must never appear in committed templates */
function hasLiveSecret(text) {
  if (!text) return false;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    // D1 remediation note (2026-09-04, REM-D1-6H, CodeQL js/regex/missing-regexp-anchor
    // alert #59): tightened with a right-side boundary so "upstash.io" must end the
    // hostname (end-of-string, whitespace, or a port/path delimiter) rather than merely
    // appear as a substring of a longer, unrelated hostname (e.g. "upstash.ioproxy.evil.com"
    // would no longer false-match). This narrows, not weakens, detection - every real
    // Upstash Redis URL this line was already designed to catch still matches.
    if (/rediss?:\/\/\S*upstash\.io(?=[:/\s"'`]|$)/i.test(t)) {
      if (!/YOUR_UPSTASH_TOKEN|YOUR-ENDPOINT|\*{4,}|xxxx/i.test(t)) return true;
    }
    if (/^REDIS_URL=.*redis-cli\b/i.test(t)) return true;
    if (
      /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@(?:db\.|aws-\d-[a-z0-9-]+\.pooler\.)supabase\.(?:co|com)/i.test(
        t
      ) &&
      !/YOUR_PASSWORD|your-ref/i.test(t)
    ) {
      return true;
    }
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(t)) return true;
    if (
      /(?:SUPABASE_SERVICE_ROLE|service_role)\s*[:=]\s*eyJ[A-Za-z0-9_-]{20,}/i.test(
        t
      )
    ) {
      return true;
    }
    // Google AI Studio / Gemini API keys (AIza…)
    if (/AIza[0-9A-Za-z_-]{20,}/.test(t)) return true;
    if (
      /^GEMINI_API_KEY\s*=\s*(?!YOUR_GEMINI_API_KEY|your-|change_me|xxxx)[^\s#]+/i.test(
        t
      )
    ) {
      return true;
    }
  }
  return false;
}

// Docs may write KEY=... as ellipsis; scanner source must not self-match.
const SECRET_CONTENT =
  /(?:DATABASE_URL|REDIS_URL|SUPABASE_SERVICE_ROLE|JWT_USER_SECRET|JWT_ADMIN_SECRET|RESEND_API_KEY|GEMINI_API_KEY|LLM_API_KEY)\s*=\s*(?!your-|change_me|YOUR_|\.\.\.|xxxx|<|https:\/\/your-project|postgresql:\/\/postgres\.your-ref)[^\s."'`]+|(?:postgres(?:ql)?:\/\/[^:\s]+:(?!YOUR_PASSWORD)[^@\s]+@)|(?:rediss?:\/\/default:(?!YOUR_UPSTASH_TOKEN)[^@\s]+@[^/\s]*upstash\.io)|(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)|(?:AIza[0-9A-Za-z_-]{20,})/i;

const staged = stagedNames();
const badPaths = staged.filter((f) => SECRET_PATH.test(f) && !isEnvExample(f));
if (badPaths.length) {
  fails.push("secret-like staged: " + badPaths.join(", "));
}

const tracked = run(
  'git ls-files ".env" ".env.*" "*.pem" "*.key" "**/credentials.json" "**/service_account.json"'
)
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((f) => !isEnvExample(f));
if (tracked.length) {
  fails.push("tracked secret-like files: " + tracked.join(", "));
}

try {
  const ignore = execSync("git check-ignore -v .env", {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (!ignore) fails.push(".env is not gitignored");
} catch {
  fails.push(".env is not gitignored");
}

// Always scan template files in worktree (even before first commit)
for (const rel of [".env.example"]) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, "utf8");
  if (hasLiveSecret(text)) {
    fails.push(
      rel + " contains a live secret — keep placeholders only; real URL goes in .env"
    );
  }
}

for (const f of staged) {
  if (isEnvExample(f)) {
    const blob = stagedBlob(f);
    if (hasLiveSecret(blob)) {
      fails.push("live secret staged in template: " + f);
    }
    continue;
  }
  // Skip this scanner + binary / huge assets
  if (/(^|\/)secrets\.cjs$/i.test(f)) continue;
  if (/\.(png|jpg|jpeg|webp|gif|ico|woff2?|pdf|zip)$/i.test(f)) continue;
  const blob = stagedBlob(f);
  if (blob && (SECRET_CONTENT.test(blob) || hasLiveSecret(blob))) {
    fails.push("secret-like content staged in: " + f);
  }
}

if (fails.length) {
  console.error("[verify:secrets] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:secrets] PASS");
