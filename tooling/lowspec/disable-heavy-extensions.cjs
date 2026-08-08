/** pnpm lowspec:lean-extensions — print manual disable list (no cursor CLI) */
const { spawnSync } = require("child_process");
const path = require("path");

const ps1 = path.join(__dirname, "disable-heavy-extensions.ps1");
const st = spawnSync(
  "powershell",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1],
  { stdio: "inherit", shell: true }
);

process.exit(st.status ?? 1);
