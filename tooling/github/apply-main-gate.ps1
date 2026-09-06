# ADR-016 — apply/update daily main ruleset (gate / verify-gate required)
# S3/3.7: this script is daily T2 only. Live ruleset apply = NOT_RUN in this slice.
# RC/production required checks live in rc-production-merge.required-checks.v1.json.
# Do not treat verify-gate alone as RC mergeable. Do not purchase a paid plan here.
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
