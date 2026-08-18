/** pnpm lowspec:status — RAM/CPU pressure for this workstation */
const os = require("os");
const { execSync } = require("child_process");

const totalGB = os.totalmem() / 1024 ** 3;
const freeGB = os.freemem() / 1024 ** 3;
const usedGB = totalGB - freeGB;
const cpus = os.cpus();
const cpuModel = cpus[0]?.model?.trim() || "unknown";
const cores = cpus.length;

function safe(cmd, timeoutMs = 4000) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: timeoutMs,
    }).trim();
  } catch {
    return "";
  }
}

let cursorMB = 0;
let dockerOn = false;
const heavy = [];
if (process.platform === "win32" && freeGB >= 1.5) {
  // docker info hangs when Desktop is installed but OFF — process name only
  const snap = safe(
    "powershell -NoProfile -Command \"$c=(Get-Process Cursor -EA SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum; $d=@(Get-Process 'com.docker.backend','Docker Desktop' -EA SilentlyContinue).Count; $h=@(); foreach($n in 'node','next','nest','rustc','cargo','chrome','msedge'){ $k=@(Get-Process $n -EA SilentlyContinue).Count; if($k -gt 0){ $h += ($n + 'x' + $k) } }; Write-Output (($c.ToString()) + '|' + $d + '|' + ($h -join ','))\"",
    8000
  );
  const [cur, dock, names] = snap.split("|");
  cursorMB = cur ? Math.round(Number(cur) / 1024 ** 2) : 0;
  dockerOn = Number(dock) > 0;
  if (names) {
    for (const part of names.split(",").filter(Boolean)) {
      heavy.push(part.replace(/x(\d+)$/, "×$1"));
    }
  }
} else if (process.platform === "win32") {
  heavy.push("process-scan skipped (free RAM < 1.5GB)");
} else {
  dockerOn = Boolean(safe("docker info -f '{{.ServerVersion}}'", 3000));
}

const level = freeGB < 1.0 ? "CRITICAL" : freeGB < 1.5 ? "WARN" : "OK";

console.log("[lowspec:status]");
console.log(`  cpu: ${cpuModel} (${cores} logical)`);
console.log(`  ram: ${usedGB.toFixed(2)} / ${totalGB.toFixed(2)} GB used · free ${freeGB.toFixed(2)} GB → ${level}`);
console.log(`  cursor: ${cursorMB ? `~${cursorMB} MB` : "(scan skipped)"}`);
console.log(`  docker: ${dockerOn ? "ON (turn OFF on this PC)" : "OFF (good)"}`);
console.log(`  heavy: ${heavy.length ? heavy.join(", ") : "(none spotted)"}`);
console.log("  policy: 1 process only · NODE_OPTIONS=--max-old-space-size=1536 · no parallel agents");

if (level !== "OK") {
  console.log("  action: close browser tabs · run pnpm cleanup:lowspec · keep only Cursor + one of web|api");
  process.exitCode = level === "CRITICAL" ? 2 : 1;
}
