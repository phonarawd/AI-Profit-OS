# ADR-016 — apply/update main ruleset.
# Live PUT is blocked unless AIPO_APPLY_LIVE_RULESET=1 (Founder ACK after
# backend-required is green on main). Draft JSON may be committed without PUT.
# Usage: pwsh tooling/github/apply-main-gate.ps1

$ErrorActionPreference = "Stop"
if ($env:AIPO_APPLY_LIVE_RULESET -ne "1") {
  Write-Error "live ruleset PUT blocked. Set AIPO_APPLY_LIVE_RULESET=1 only after backend-required is green (official-basis 9.1). Draft JSON only."
  exit 1
}
$repo = "phonarawd/AI-Profit-OS"
$bodyPath = Join-Path $PSScriptRoot "main-gate.ruleset.json"

$existing = gh api "repos/$repo/rulesets" --jq '.[] | select(.name=="main-gate-required") | .id'
if ($existing) {
  Write-Host "Updating ruleset $existing ..."
  gh api -X PUT "repos/$repo/rulesets/$existing" -H "Accept: application/vnd.github+json" --input $bodyPath
} else {
  Write-Host "Creating ruleset ..."
  gh api -X POST "repos/$repo/rulesets" -H "Accept: application/vnd.github+json" --input $bodyPath
}

gh api "repos/$repo/rulesets" --jq '.[] | {id,name,enforcement}'
Write-Host "HTML: https://github.com/$repo/rules"
