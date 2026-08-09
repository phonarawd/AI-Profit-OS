# Wait until Cursor.exe is fully gone, then run pnpm cleanup:cursor-roaming
# Usage (from external PowerShell OR detached from Cursor):
#   powershell -NoProfile -ExecutionPolicy Bypass -File tooling/cleanup/wait-quit-then-roaming.ps1
$ErrorActionPreference = "Continue"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root "package.json"))) {
  $root = "C:\Users\PC\Desktop\AI_PROFIT_OS"
}

Write-Host "[wait-quit-then-roaming] Waiting for Cursor.exe to exit..."
Write-Host "  Do: Cursor menu File > Exit (all windows). This script continues automatically."

$deadline = (Get-Date).AddMinutes(45)
while ((Get-Process -Name Cursor -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) {
  if ((Get-Date) -gt $deadline) {
    Write-Host "[wait-quit-then-roaming] TIMEOUT — Cursor still running after 45m. Abort."
    exit 3
  }
  Start-Sleep -Seconds 3
}

# Extra settle time for file locks (state.vscdb WAL)
Start-Sleep -Seconds 5
Write-Host "[wait-quit-then-roaming] Cursor gone — running cleanup:cursor-roaming ..."
Set-Location $root
& pnpm cleanup:cursor-roaming
$code = $LASTEXITCODE
Write-Host "[wait-quit-then-roaming] exit=$code"
if ($code -eq 0) {
  Write-Host "OK — reopen Cursor. state.vscdb should be much smaller."
}
exit $code
