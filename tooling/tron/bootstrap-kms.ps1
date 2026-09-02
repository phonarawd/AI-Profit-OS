#Requires -Version 5.1
$ErrorActionPreference = "Continue"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

$prepOut = & node "tooling/tron/prepare-kms-env.cjs" 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "TATUM_API_KEY_MISSING — run pnpm tron:setup first"
  exit 2
}
$prep = ($prepOut | Out-String).Trim() | ConvertFrom-Json
$KmsHome = $prep.kmsHome
$WalletDir = $prep.walletDir
$EnvFile = $prep.envFile
$Readiness = Join-Path $KmsHome "readiness.json"
$network = $prep.network
# Image runs as uid=node; Windows HOST env HOME must not leak into container.
$TatumnRc = "/home/node/.tatumrc"

function Write-Status($obj) {
  $obj | ConvertTo-Json -Depth 6 | Set-Content -Path $Readiness -Encoding UTF8
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "DOCKER_NOT_INSTALLED"
  exit 3
}
docker info 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "DOCKER_ENGINE_NOT_READY"
  exit 4
}

docker image inspect tatumio/tatum-kms:latest 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Pulling tatumio/tatum-kms ..."
  docker pull tatumio/tatum-kms:latest
  if ($LASTEXITCODE -ne 0) {
    Write-Status @{ ok = $false; error = "DOCKER_PULL_FAILED" }
    exit 5
  }
}

New-Item -ItemType Directory -Force -Path $WalletDir | Out-Null
$walletDat = Join-Path $WalletDir "wallet.dat"

# Orphan guard: signatureId/xpub without wallet.dat cannot sign — regenerate.
if (-not (Test-Path $walletDat)) {
  & node -e "const {LOCAL_ENV_FILE,readEnvFile,writeEnvFile}=require('./tooling/tron/lib/local-env.cjs'); const m=readEnvFile(LOCAL_ENV_FILE); delete m.TATUM_KMS_SIGNATURE_ID; delete m.TRON_HOT_WALLET_XPUB; writeEnvFile(LOCAL_ENV_FILE,m);"
  $dockerArgs = @(
    "run", "--rm", "-i",
    "-e", "HOME=/home/node",
    "--env-file", $EnvFile,
    "-v", "${WalletDir}:${TatumnRc}",
    "tatumio/tatum-kms",
    "generatemanagedwallet", "TRON"
  )
  if ($network -eq "testnet") { $dockerArgs += "--testnet" }
  $out = & docker @dockerArgs 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Write-Status @{ ok = $false; stage = "generatemanagedwallet"; error = "KMS_GENERATE_FAILED" }
    Write-Host "KMS_GENERATE_FAILED"
    exit 6
  }
  if (-not (Test-Path $walletDat)) {
    Write-Status @{ ok = $false; error = "WALLET_DAT_MISSING_AFTER_GENERATE" }
    Write-Host "WALLET_DAT_MISSING_AFTER_GENERATE"
    exit 8
  }
  $sigId = $null
  $xpub = $null
  if ($out -match '\{[\s\S]*"signatureId"[\s\S]*\}') {
    $parsed = $Matches[0] | ConvertFrom-Json
    $sigId = [string]$parsed.signatureId
    $xpub = [string]$parsed.xpub
  }
  if (-not $sigId -or -not $xpub) {
    Write-Status @{ ok = $false; error = "KMS_OUTPUT_PARSE_FAILED" }
    Write-Host "KMS_OUTPUT_PARSE_FAILED"
    exit 7
  }
  $env:AIPO_SIG = $sigId
  $env:AIPO_XPUB = $xpub
  & node -e "const {LOCAL_ENV_FILE,readEnvFile,writeEnvFile,maskStatus}=require('./tooling/tron/lib/local-env.cjs'); const map=readEnvFile(LOCAL_ENV_FILE); map.TATUM_KMS_SIGNATURE_ID=process.env.AIPO_SIG; map.TRON_HOT_WALLET_XPUB=process.env.AIPO_XPUB; if(!map.TRONGRID_BASE_URL) map.TRONGRID_BASE_URL='https://api.trongrid.io'; writeEnvFile(LOCAL_ENV_FILE,map); process.stdout.write(JSON.stringify(maskStatus(map)));"
  Remove-Item Env:AIPO_SIG -ErrorAction SilentlyContinue
  Remove-Item Env:AIPO_XPUB -ErrorAction SilentlyContinue
} else {
  Write-Host "wallet.dat already present — skipping generate"
}

if (-not (Test-Path $walletDat)) {
  Write-Status @{ ok = $false; error = "WALLET_DAT_MISSING" }
  Write-Host "WALLET_DAT_MISSING"
  exit 8
}

Write-Status @{
  ok = $true
  stage = "bootstrap"
  kmsHome = $KmsHome
  walletDat = $true
  signatureIdSet = $true
  xpubSet = $true
  inboundPublicPort = $false
  mount = $TatumnRc
  at = (Get-Date).ToUniversalTime().ToString("o")
}
Write-Host "KMS bootstrap OK (wallet.dat persisted; secrets not printed)"
exit 0
