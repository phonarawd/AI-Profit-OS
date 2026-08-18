# ADR-016 — list RAM-heavy Cursor extensions to disable MANUALLY (8GB PC)
# NEVER calls `cursor --disable-extension` — each call opens a new Cursor window.
# Usage: . .\tooling\lowspec\disable-heavy-extensions.ps1
#        pnpm lowspec:lean-extensions

$disable = @(
  "continue.continue",
  "rust-lang.rust-analyzer",
  "anysphere.remote-ssh",
  "anysphere.remote-wsl",
  "anysphere.remote-containers",
  "dbaeumer.vscode-eslint",
  "ms-azuretools.vscode-docker",
  "GitHub.copilot",
  "GitHub.copilot-chat",
  "ms-vscode.vscode-typescript-next"
)

$keep = @(
  "bradlc.vscode-tailwindcss",
  "esbenp.prettier-vscode",
  "davidanson.vscode-markdownlint",
  "editorconfig.editorconfig",
  "cloudflare.cloudflare-workers-bindings-extension"
)

Write-Host "[lowspec:lean-extensions] MANUAL ONLY — do NOT use cursor CLI (opens new windows)."
Write-Host ""
Write-Host "In Cursor: Ctrl+Shift+X -> search each ID -> gear -> Disable (Workspace)"
Write-Host ""
Write-Host "Disable these ($($disable.Count)):"
foreach ($id in $disable) { Write-Host "  - $id" }
Write-Host ""
Write-Host "Keep enabled:"
foreach ($id in $keep) { Write-Host "  + $id" }
Write-Host ""
Write-Host "Then: close extra Cursor windows -> Help -> Reload Window once."
