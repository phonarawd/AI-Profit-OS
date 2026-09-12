# ADR-016 — apply/update release-train ruleset (id 21919415).
# Live PUT is blocked unless AIPO_APPLY_LIVE_RULESET=1 (Founder ACK after
# backend-required is green on main). Draft JSON may be committed without PUT.
# Usage: pwsh tooling/github/apply-release-train-gate.ps1
# Official-basis §9.1.4: same rules body as main-gate, conditions only differ.
# GET first, then full-body PUT. Do not overwrite a subset of fields.

$ErrorActionPreference = "Stop"
if ($env:AIPO_APPLY_LIVE_RULESET -ne "1") {
  Write-Error "live ruleset PUT blocked. Set AIPO_APPLY_LIVE_RULESET=1 only after backend-required is green (official-basis 9.1). Draft JSON only."
  exit 1
}
$repo = "phonarawd/AI-Profit-OS"
$bodyPath = Join-Path $PSScriptRoot "release-train-gate.ruleset.json"
$expectedId = "21919415"
$expectedInclude = @(
  "refs/heads/release/train-production-v1",
  "refs/heads/release/auth-wallet-rel502-v1-20260828"
)

if (-not (Test-Path $bodyPath)) {
  Write-Error "missing $bodyPath"
  exit 1
}

$draft = Get-Content -Raw -Path $bodyPath | ConvertFrom-Json
$draftInclude = @($draft.conditions.ref_name.include)
foreach ($ref in $expectedInclude) {
  if ($draftInclude -notcontains $ref) {
    Write-Error "draft include missing $ref — abort PUT"
    exit 1
  }
}
if ($draftInclude.Count -ne $expectedInclude.Count) {
  Write-Error "draft include count $($draftInclude.Count) != $($expectedInclude.Count) — abort PUT"
  exit 1
}

Write-Host "GET live ruleset $expectedId ..."
$before = gh api "repos/$repo/rulesets/$expectedId" -H "Accept: application/vnd.github+json" | ConvertFrom-Json
if (-not $before -or [string]$before.id -ne $expectedId) {
  Write-Error "live ruleset id mismatch"
  exit 1
}
$liveInclude = @($before.conditions.ref_name.include)
foreach ($ref in $expectedInclude) {
  if ($liveInclude -notcontains $ref) {
    Write-Error "live include missing $ref — abort PUT (do not shrink include)"
    exit 1
  }
}

Write-Host "Updating ruleset $expectedId (full body PUT) ..."
gh api -X PUT "repos/$repo/rulesets/$expectedId" -H "Accept: application/vnd.github+json" --input $bodyPath

Write-Host "GET after PUT ..."
gh api "repos/$repo/rulesets/$expectedId" --jq '{id,name,enforcement,include:.conditions.ref_name.include,contexts:[.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context], types:[.rules[].type]}'
Write-Host "HTML: https://github.com/$repo/rules"
