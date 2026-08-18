# One-time: fnm auto-switch via .nvmrc / .node-version in repo dirs
$marker = "# AI Profit OS — fnm Node 22 lock"
$block = @"

$marker
if (Get-Command fnm -ErrorAction SilentlyContinue) {
  fnm env --use-on-cd | Out-String | Invoke-Expression
}
"@

$profiles = @(
  "$env:USERPROFILE\Documents\PowerShell\Microsoft.PowerShell_profile.ps1",
  "$env:USERPROFILE\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
)

foreach ($path in $profiles) {
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  if (Test-Path $path) {
    $existing = Get-Content $path -Raw -ErrorAction SilentlyContinue
    if ($existing -and $existing.Contains($marker)) {
      Write-Host "[setup-fnm] already in $path"
      continue
    }
    Add-Content -Path $path -Value $block
  } else {
    Set-Content -Path $path -Value $block.TrimStart()
  }
  Write-Host "[setup-fnm] updated $path"
}

Write-Host "[setup-fnm] Open a NEW terminal, then: cd AI_PROFIT_OS && node -v  (expect v22.14.x)"
