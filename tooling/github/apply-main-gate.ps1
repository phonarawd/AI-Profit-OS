# ADR-016 — apply/update main ruleset (gate / verify-gate required)
# Repo must be public (or GitHub Pro if private).
# Usage: pwsh tooling/github/apply-main-gate.ps1

$ErrorActionPreference = "Stop"
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
