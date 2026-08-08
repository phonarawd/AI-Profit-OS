/** pnpm lowspec:status — RAM/CPU pressure for this workstation */
const os = require("os");
const { execSync } = require("child_process");

const totalGB = os.totalmem() / 1024 ** 3;
const freeGB = os.freemem() / 1024 ** 3;
const usedGB = totalGB - freeGB;
const cpus = os.cpus();
const cpuModel = cpus[0]?.model?.trim() || "unknown";
const cores = cpus.length;

function safe(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

let cursorMB = 0;
let dockerOn = false;
if (process.platform === "win32") {
  const cur = safe(
    'powershell -NoProfile -Command "(Get-Process Cursor -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum"'
  );
  cursorMB = cur ? Math.round(Number(cur) / 1024 ** 2) : 0;
  dockerOn = Boolean(safe("docker info -f {{.ServerVersion}}"));
} else {
  dockerOn = Boolean(safe("docker info -f '{{.ServerVersion}}'"));
}

const heavy = [];
for (const name of ["node", "next", "nest", "rustc", "cargo", "chrome", "msedge"]) {
  try {
    if (process.platform === "win32") {
      const n = safe(
        `powershell -NoProfile -Command "(Get-Process ${name} -ErrorAction SilentlyContinue | Measure-Object).Count"`
      );
      if (Number(n) > 0) heavy.push(`${name}×${n}`);
    }
  } catch {
    /* ignore */
  }
}

const level = freeGB < 1.0 ? "CRITICAL" : freeGB < 1.5 ? "WARN" : "OK";

console.log("[lowspec:status]");
console.log(`  cpu: ${cpuModel} (${cores} logical)`);
console.log(`  ram: ${usedGB.toFixed(2)} / ${totalGB.toFixed(2)} GB used · free ${freeGB.toFixed(2)} GB → ${level}`);
console.log(`  cursor: ~${cursorMB} MB`);
console.log(`  docker: ${dockerOn ? "ON (turn OFF on this PC)" : "OFF (good)"}`);
console.log(`  heavy: ${heavy.length ? heavy.join(", ") : "(none spotted)"}`);
console.log("  policy: 1 process only · NODE_OPTIONS=--max-old-space-size=1536 · no parallel agents");

if (level !== "OK") {
  console.log("  action: close browser tabs · run pnpm cleanup:lowspec · keep only Cursor + one of web|api");
  process.exitCode = level === "CRITICAL" ? 2 : 1;
}
